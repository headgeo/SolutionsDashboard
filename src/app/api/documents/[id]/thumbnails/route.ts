import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { execSync } from 'child_process'
import { writeFileSync, readFileSync, readdirSync, mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

/**
 * Generate slide thumbnail images from a PPTX file using LibreOffice headless.
 */
async function generateSlideThumbnails(
  buffer: ArrayBuffer
): Promise<Map<number, Buffer>> {
  const thumbnails = new Map<number, Buffer>()
  const workDir = join(tmpdir(), `slide-thumbs-${randomUUID()}`)

  try {
    mkdirSync(workDir, { recursive: true })
    const pptxPath = join(workDir, 'presentation.pptx')
    writeFileSync(pptxPath, Buffer.from(buffer))

    // Convert PPTX to PDF then to individual slide PNGs
    execSync(
      `libreoffice --headless --convert-to pdf --outdir "${workDir}" "${pptxPath}"`,
      { timeout: 120000, stdio: 'pipe' }
    )

    const pdfPath = join(workDir, 'presentation.pdf')
    if (existsSync(pdfPath)) {
      try {
        execSync(
          `pdftoppm -png -r 300 "${pdfPath}" "${join(workDir, 'slide')}"`,
          { timeout: 120000, stdio: 'pipe' }
        )
      } catch {
        try {
          execSync(
            `convert -density 200 "${pdfPath}" -quality 90 "${join(workDir, 'slide-%d.png')}"`,
            { timeout: 120000, stdio: 'pipe' }
          )
        } catch {
          const directPng = join(workDir, 'presentation.png')
          if (existsSync(directPng)) {
            thumbnails.set(1, readFileSync(directPng))
          }
          return thumbnails
        }
      }
    }

    const files = readdirSync(workDir)
      .filter((f) => f.startsWith('slide') && f.endsWith('.png'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/(\d+)/)?.[1] || '0')
        const numB = parseInt(b.match(/(\d+)/)?.[1] || '0')
        return numA - numB
      })

    for (let i = 0; i < files.length; i++) {
      thumbnails.set(i + 1, readFileSync(join(workDir, files[i])))
    }
  } catch (err) {
    console.error('Thumbnail generation failed:', err)
  } finally {
    try {
      rmSync(workDir, { recursive: true, force: true })
    } catch {}
  }

  return thumbnails
}

/**
 * POST /api/documents/[id]/thumbnails
 * Regenerate slide thumbnails for an existing PPTX document.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  if (doc.type !== 'pptx') return NextResponse.json({ error: 'Only PPTX files support thumbnails' }, { status: 400 })

  try {
    // Download the file from storage
    const filePath = doc.storage_url.split('/documents/')[1]
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(filePath)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
    }

    const buffer = await fileData.arrayBuffer()
    const thumbnails = await generateSlideThumbnails(buffer)

    if (thumbnails.size === 0) {
      return NextResponse.json({ error: 'No thumbnails could be generated' }, { status: 500 })
    }

    // Get existing chunks for this document
    const { data: chunks } = await supabase
      .from('chunks')
      .select('id, slide_number')
      .eq('document_id', doc.id)
      .eq('chunk_type', 'slide')

    if (!chunks?.length) {
      return NextResponse.json({ error: 'No slide chunks found for this document' }, { status: 404 })
    }

    let uploadedCount = 0
    for (const chunk of chunks) {
      const slideNum = chunk.slide_number || 0
      const thumbBuffer = thumbnails.get(slideNum)
      if (!thumbBuffer) continue

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

        // Upsert slide_images record
        await supabase
          .from('slide_images')
          .delete()
          .eq('chunk_id', chunk.id)

        await supabase.from('slide_images').insert({
          chunk_id: chunk.id,
          image_url: urlData.publicUrl,
          thumbnail_url: urlData.publicUrl,
        })

        uploadedCount++
      }
    }

    return NextResponse.json({
      success: true,
      thumbnails_generated: thumbnails.size,
      thumbnails_uploaded: uploadedCount,
    })
  } catch (err: any) {
    console.error('Thumbnail generation error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
