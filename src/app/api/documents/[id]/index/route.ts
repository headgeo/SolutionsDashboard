import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getEmbedding } from '@/lib/embeddings'
import { generateSummary } from '@/lib/claude'
import JSZip from 'jszip'
import { execSync } from 'child_process'
import { writeFileSync, readFileSync, readdirSync, mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

/**
 * Check if a command is available on the system.
 */
function isCommandAvailable(cmd: string): boolean {
  try {
    const check = process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`
    execSync(check, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

/**
 * Generate slide thumbnail images from a PPTX file using LibreOffice headless.
 * Returns a map of slide_number -> PNG buffer.
 */
async function generateSlideThumbnails(
  buffer: ArrayBuffer
): Promise<Map<number, Buffer>> {
  const thumbnails = new Map<number, Buffer>()

  if (!isCommandAvailable('libreoffice')) {
    console.warn('Slide thumbnails skipped: LibreOffice is not installed. Install LibreOffice to enable slide thumbnail generation.')
    return thumbnails
  }

  const workDir = join(tmpdir(), `slide-thumbs-${randomUUID()}`)

  try {
    mkdirSync(workDir, { recursive: true })
    const pptxPath = join(workDir, 'presentation.pptx')
    writeFileSync(pptxPath, Buffer.from(buffer))

    // Convert PPTX to PNG images using LibreOffice headless
    execSync(
      `libreoffice --headless --convert-to png --outdir "${workDir}" "${pptxPath}"`,
      { timeout: 120000, stdio: 'pipe' }
    )

    // LibreOffice outputs a single file for single-page, or we need to use PDF intermediate
    // For multi-slide, convert to PDF first then to individual PNGs
    const pdfPath = join(workDir, 'presentation.pdf')

    // Check if PDF conversion gives us individual pages
    execSync(
      `libreoffice --headless --convert-to pdf --outdir "${workDir}" "${pptxPath}"`,
      { timeout: 120000, stdio: 'pipe' }
    )

    if (existsSync(pdfPath)) {
      // Use LibreOffice to get slide count, then extract each page as PNG
      // Use pdftoppm if available, otherwise use ImageMagick convert
      try {
        execSync(
          `pdftoppm -png -r 300 "${pdfPath}" "${join(workDir, 'slide')}"`,
          { timeout: 120000, stdio: 'pipe' }
        )
      } catch {
        // Fallback: try using convert (ImageMagick)
        try {
          execSync(
            `convert -density 200 "${pdfPath}" -quality 90 "${join(workDir, 'slide-%d.png')}"`,
            { timeout: 120000, stdio: 'pipe' }
          )
        } catch {
          // If neither works, just use the single PNG from direct conversion
          const directPng = join(workDir, 'presentation.png')
          if (existsSync(directPng)) {
            thumbnails.set(1, readFileSync(directPng))
          }
          return thumbnails
        }
      }
    }

    // Read generated PNG files
    const files = readdirSync(workDir)
      .filter((f) => f.startsWith('slide') && f.endsWith('.png'))
      .sort((a, b) => {
        // Extract number from filename: slide-01.png, slide-1.png, slide-02.png etc.
        const numA = parseInt(a.match(/(\d+)/)?.[1] || '0')
        const numB = parseInt(b.match(/(\d+)/)?.[1] || '0')
        return numA - numB
      })

    for (let i = 0; i < files.length; i++) {
      const imgPath = join(workDir, files[i])
      thumbnails.set(i + 1, readFileSync(imgPath))
    }
  } catch (err) {
    console.error('Thumbnail generation failed:', err)
  } finally {
    // Cleanup temp directory
    try {
      rmSync(workDir, { recursive: true, force: true })
    } catch {}
  }

  return thumbnails
}

/**
 * Extract text from a PPTX file. Returns one chunk per slide.
 */
async function parsePptx(
  buffer: ArrayBuffer
): Promise<{ content: string; slide_number: number }[]> {
  const zip = await JSZip.loadAsync(buffer)
  const slides: { content: string; slide_number: number }[] = []

  // PPTX stores slides as ppt/slides/slide1.xml, slide2.xml, etc.
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/i)?.[1] || '0')
      const numB = parseInt(b.match(/slide(\d+)/i)?.[1] || '0')
      return numA - numB
    })

  for (const slidePath of slideFiles) {
    const xml = await zip.files[slidePath].async('text')
    const slideNum = parseInt(slidePath.match(/slide(\d+)/i)?.[1] || '0')

    // Extract all text content from <a:t> tags
    const textMatches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/gi) || []
    const texts = textMatches
      .map((m) => m.replace(/<[^>]+>/g, '').trim())
      .filter((t) => t.length > 0)

    const content = texts.join(' ')
    if (content.length > 5) {
      slides.push({ content, slide_number: slideNum })
    }
  }

  return slides
}

/**
 * Extract text from a DOCX file. Returns paragraphs as chunks.
 */
async function parseDocx(
  buffer: ArrayBuffer
): Promise<{ content: string; page_number: number }[]> {
  const zip = await JSZip.loadAsync(buffer)
  const docFile = zip.files['word/document.xml']
  if (!docFile) return []

  const xml = await docFile.async('text')

  // Extract text from <w:t> tags, group by paragraphs (<w:p>)
  const paragraphs: string[] = []
  const paraMatches = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/gi) || []

  for (const para of paraMatches) {
    const textMatches = para.match(/<w:t[^>]*>([^<]*)<\/w:t>/gi) || []
    const text = textMatches
      .map((m) => m.replace(/<[^>]+>/g, ''))
      .join('')
      .trim()
    if (text.length > 10) {
      paragraphs.push(text)
    }
  }

  // Group paragraphs into chunks of ~500 chars
  const chunks: { content: string; page_number: number }[] = []
  let current = ''
  let chunkNum = 1

  for (const para of paragraphs) {
    if (current.length + para.length > 500 && current.length > 50) {
      chunks.push({ content: current, page_number: chunkNum++ })
      current = para
    } else {
      current += (current ? '\n' : '') + para
    }
  }
  if (current.length > 10) {
    chunks.push({ content: current, page_number: chunkNum })
  }

  return chunks
}

/**
 * Extract text from an XLSX file. Returns one chunk per sheet.
 */
async function parseXlsx(
  buffer: ArrayBuffer
): Promise<{ content: string; page_number: number }[]> {
  const zip = await JSZip.loadAsync(buffer)
  const chunks: { content: string; page_number: number }[] = []

  // Read shared strings first (XLSX stores strings in a shared table)
  const sharedStringsFile = zip.files['xl/sharedStrings.xml']
  const sharedStrings: string[] = []
  if (sharedStringsFile) {
    const ssXml = await sharedStringsFile.async('text')
    const siMatches = ssXml.match(/<si>[\s\S]*?<\/si>/gi) || []
    for (const si of siMatches) {
      const tMatches = si.match(/<t[^>]*>([^<]*)<\/t>/gi) || []
      sharedStrings.push(tMatches.map((m) => m.replace(/<[^>]+>/g, '')).join(''))
    }
  }

  // Read each sheet
  const sheetFiles = Object.keys(zip.files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .sort()

  for (let i = 0; i < sheetFiles.length; i++) {
    const xml = await zip.files[sheetFiles[i]].async('text')
    const cellValues: string[] = []

    // Extract cell values - either inline strings or shared string references
    const cellMatches = xml.match(/<c[^>]*>[\s\S]*?<\/c>/gi) || []
    for (const cell of cellMatches) {
      const isSharedString = /t="s"/i.test(cell)
      const valueMatch = cell.match(/<v>([^<]*)<\/v>/i)
      if (valueMatch) {
        if (isSharedString) {
          const idx = parseInt(valueMatch[1])
          if (sharedStrings[idx]) cellValues.push(sharedStrings[idx])
        } else {
          cellValues.push(valueMatch[1])
        }
      }
      // Inline string
      const inlineMatch = cell.match(/<t[^>]*>([^<]*)<\/t>/i)
      if (inlineMatch && inlineMatch[1].trim()) {
        cellValues.push(inlineMatch[1].trim())
      }
    }

    const content = cellValues.filter((v) => v.length > 0).join(', ')
    if (content.length > 10) {
      chunks.push({ content: content.slice(0, 3000), page_number: i + 1 })
    }
  }

  return chunks
}

/**
 * Basic PDF text extraction — extracts readable strings from PDF binary.
 */
function parsePdf(
  buffer: ArrayBuffer
): { content: string; page_number: number }[] {
  const bytes = new Uint8Array(buffer)
  const raw = Array.from(bytes)
    .map((b) => String.fromCharCode(b))
    .join('')

  // Extract text between parentheses (PDF text operators)
  const textMatches = raw.match(/\(([^)]{3,})\)/g) || []
  const texts = textMatches
    .map((m) => m.slice(1, -1))
    .filter((s) => /[a-zA-Z]{2,}/.test(s))
    .map((s) => s.replace(/\\[()\\]/g, (m) => m[1]))

  if (texts.length === 0) return []

  // Group into chunks of ~500 chars
  const chunks: { content: string; page_number: number }[] = []
  let current = ''
  let chunkNum = 1

  for (const text of texts) {
    if (current.length + text.length > 500 && current.length > 50) {
      chunks.push({ content: current, page_number: chunkNum++ })
      current = text
    } else {
      current += (current ? ' ' : '') + text
    }
  }
  if (current.length > 10) {
    chunks.push({ content: current, page_number: chunkNum })
  }

  return chunks
}

async function parseAndChunk(
  file: ArrayBuffer,
  filename: string,
  type: string
): Promise<{ content: string; slide_number?: number; page_number?: number }[]> {
  try {
    if (type === 'pptx') {
      const slides = await parsePptx(file)
      if (slides.length > 0) return slides
    } else if (type === 'docx') {
      const chunks = await parseDocx(file)
      if (chunks.length > 0) return chunks
    } else if (type === 'xlsx') {
      const chunks = await parseXlsx(file)
      if (chunks.length > 0) return chunks
    } else if (type === 'pdf') {
      const chunks = parsePdf(file)
      if (chunks.length > 0) return chunks
    }
  } catch (e) {
    console.error(`Parse error for ${type}:`, e)
  }

  // Fallback: return a single chunk with the filename
  return [{ content: `Document: ${filename} (${type} format)`, page_number: 1 }]
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  try {
    // Delete existing chunks for re-indexing
    await supabase.from('chunks').delete().eq('document_id', doc.id)

    // Download the file from storage
    const filePath = doc.storage_url.split('/documents/')[1]
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(filePath)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
    }

    const buffer = await fileData.arrayBuffer()
    const chunks = await parseAndChunk(buffer, doc.filename, doc.type)

    console.log(`Parsed ${chunks.length} chunks from ${doc.filename} (${doc.type})`)

    // Generate slide thumbnails for PPTX files
    let thumbnails: Map<number, Buffer> = new Map()
    if (doc.type === 'pptx') {
      try {
        thumbnails = await generateSlideThumbnails(buffer)
        console.log(`Generated ${thumbnails.size} slide thumbnails for ${doc.filename}`)
      } catch (e) {
        console.warn('Thumbnail generation failed, continuing without thumbnails:', e)
      }
    }

    // Generate embeddings and insert chunks
    let insertedCount = 0
    for (const chunk of chunks) {
      const chunkType =
        doc.type === 'pptx' ? 'slide' : doc.type === 'xlsx' ? 'section' : 'paragraph'

      const insertData: any = {
        document_id: doc.id,
        chunk_type: chunkType,
        content_text: chunk.content,
        slide_number: chunkType === 'slide' ? (chunk.slide_number || chunk.page_number) : null,
        page_number: chunkType !== 'slide' ? chunk.page_number : null,
      }

      // Generate embedding if Gemini API key is available
      if (process.env.GEMINI_API_KEY) {
        try {
          insertData.embedding = await getEmbedding(chunk.content)
        } catch (e) {
          console.warn('Embedding generation failed for chunk, inserting without embedding:', e)
        }
      }

      const { error: insertError } = await supabase.from('chunks').insert(insertData)
      if (insertError) {
        console.error('Chunk insert error:', insertError)
      } else {
        insertedCount++

        // Upload slide thumbnail if available
        if (chunkType === 'slide' && thumbnails.size > 0) {
          const slideNum = chunk.slide_number || chunk.page_number || 0
          const thumbBuffer = thumbnails.get(slideNum)
          if (thumbBuffer) {
            try {
              // Get the inserted chunk ID
              const { data: insertedChunk } = await supabase
                .from('chunks')
                .select('id')
                .eq('document_id', doc.id)
                .eq('slide_number', slideNum)
                .eq('chunk_type', 'slide')
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

              if (insertedChunk) {
                const thumbPath = `thumbnails/${doc.id}/slide_${slideNum}.png`
                const { error: uploadError } = await supabase.storage
                  .from('documents')
                  .upload(thumbPath, thumbBuffer, {
                    contentType: 'image/png',
                    upsert: true,
                  })

                if (!uploadError) {
                  const { data: urlData } = supabase.storage
                    .from('documents')
                    .getPublicUrl(thumbPath)

                  await supabase.from('slide_images').insert({
                    chunk_id: insertedChunk.id,
                    image_url: urlData.publicUrl,
                    thumbnail_url: urlData.publicUrl,
                  })
                } else {
                  console.warn(`Failed to upload thumbnail for slide ${slideNum}:`, uploadError)
                }
              }
            } catch (e) {
              console.warn(`Failed to save thumbnail for slide ${slideNum}:`, e)
            }
          }
        }
      }
    }

    // Generate AI summary (best effort)
    let summary: string | null = null
    try {
      summary = await generateSummary(
        doc.filename,
        chunks.map((c) => c.content)
      )
    } catch (e) {
      console.warn('Summary generation failed:', e)
    }

    // Update chunk count on document
    const updateData: any = {
      chunk_count: insertedCount,
      updated_at: new Date().toISOString(),
    }
    if (summary) updateData.summary = summary

    await supabase.from('documents').update(updateData).eq('id', doc.id)

    return NextResponse.json({ success: true, chunks: insertedCount, summary })
  } catch (err: any) {
    console.error('Indexing error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
