import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'

/**
 * Assembles a real PPTX file from selected slides, preserving original formatting.
 * Groups slides by source document, downloads each source PPTX from Supabase Storage,
 * extracts the specific slides, and combines them into a single output PPTX.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slides: chunkIds, name } = await request.json()
  if (!chunkIds?.length) return NextResponse.json({ error: 'No slides provided' }, { status: 400 })

  // Fetch chunk details with source documents
  const { data: chunks } = await supabase
    .from('chunks')
    .select('*, documents(*)')
    .in('id', chunkIds)

  if (!chunks?.length) return NextResponse.json({ error: 'Slides not found' }, { status: 404 })

  // Order chunks by the original chunkIds order (user's deck order)
  const orderedChunks = chunkIds
    .map((id: string) => chunks.find((c) => c.id === id))
    .filter(Boolean)

  // Group by source document
  const byDocument: Record<string, { doc: any; slideNumbers: number[] }> = {}
  for (const chunk of orderedChunks) {
    const docId = chunk.document_id
    if (!byDocument[docId]) {
      byDocument[docId] = { doc: chunk.documents, slideNumbers: [] }
    }
    byDocument[docId].slideNumbers.push(chunk.slide_number || 1)
  }

  try {
    // Download and parse each source PPTX
    const sourceZips: Record<string, JSZip> = {}
    for (const [docId, { doc }] of Object.entries(byDocument)) {
      if (doc.type !== 'pptx') continue
      const filePath = doc.storage_url.split('/documents/')[1]
      if (!filePath) continue

      const { data: fileData, error: dlError } = await supabase.storage
        .from('documents')
        .download(filePath)

      if (dlError || !fileData) {
        console.error(`Failed to download ${doc.filename}:`, dlError)
        continue
      }

      const buffer = await fileData.arrayBuffer()
      sourceZips[docId] = await JSZip.loadAsync(buffer)
    }

    if (Object.keys(sourceZips).length === 0) {
      return NextResponse.json({ error: 'No source PPTX files could be loaded' }, { status: 400 })
    }

    // Build the output PPTX
    // Strategy: Use the first source PPTX as a base template (keeps theme, masters, layouts)
    // then replace its slides with only the selected ones in order
    const firstDocId = Object.keys(sourceZips)[0]
    const outputZip = sourceZips[firstDocId]

    // Collect all slide files from the base to understand the structure
    const allSlideFiles = Object.keys(outputZip.files)
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
      .sort((a, b) => {
        const na = parseInt(a.match(/slide(\d+)/i)?.[1] || '0')
        const nb = parseInt(b.match(/slide(\d+)/i)?.[1] || '0')
        return na - nb
      })

    // Remove ALL existing slides, their rels, and notes from the base
    for (const slideFile of allSlideFiles) {
      const slideNum = slideFile.match(/slide(\d+)/i)?.[1]
      outputZip.remove(slideFile)
      // Remove slide relationships
      const relPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`
      if (outputZip.files[relPath]) outputZip.remove(relPath)
      // Remove slide notes
      const notePath = `ppt/notesSlides/notesSlide${slideNum}.xml`
      if (outputZip.files[notePath]) outputZip.remove(notePath)
      const noteRelPath = `ppt/notesSlides/_rels/notesSlide${slideNum}.xml.rels`
      if (outputZip.files[noteRelPath]) outputZip.remove(noteRelPath)
    }

    // Now add selected slides in order
    let outputSlideIdx = 1
    const mediaFiles = new Set<string>()

    // Track which media files are already in the output
    for (const key of Object.keys(outputZip.files)) {
      if (key.startsWith('ppt/media/')) mediaFiles.add(key)
    }

    for (const chunk of orderedChunks) {
      const docId = chunk.document_id
      const srcZip = sourceZips[docId]
      if (!srcZip) continue

      const srcSlideNum = chunk.slide_number || 1
      const srcSlidePath = `ppt/slides/slide${srcSlideNum}.xml`
      const srcSlideFile = srcZip.files[srcSlidePath]
      if (!srcSlideFile) continue

      // Copy slide XML (rename to sequential number)
      let slideXml = await srcSlideFile.async('text')

      // If this slide comes from a different source than the base, we need to handle
      // layout/master references carefully. For same-source slides, just copy directly.
      const destSlidePath = `ppt/slides/slide${outputSlideIdx}.xml`
      outputZip.file(destSlidePath, slideXml)

      // Copy slide relationships
      const srcRelPath = `ppt/slides/_rels/slide${srcSlideNum}.xml.rels`
      const srcRelFile = srcZip.files[srcRelPath]
      if (srcRelFile) {
        let relXml = await srcRelFile.async('text')

        // Copy any referenced media files from the source
        const mediaRefs = relXml.match(/Target="[^"]*?\/media\/[^"]+"/g) || []
        for (const ref of mediaRefs) {
          const mediaPath = ref.match(/Target="(.*?)"/)?.[1]
          if (mediaPath) {
            // Resolve relative path from ppt/slides/ to absolute
            const absPath = mediaPath.startsWith('../')
              ? 'ppt/' + mediaPath.replace('../', '')
              : mediaPath
            if (!mediaFiles.has(absPath) && srcZip.files[absPath]) {
              const mediaData = await srcZip.files[absPath].async('uint8array')
              outputZip.file(absPath, mediaData)
              mediaFiles.add(absPath)
            }
          }
        }

        // Copy any referenced chart files
        const chartRefs = relXml.match(/Target="[^"]*?\/charts\/[^"]+"/g) || []
        for (const ref of chartRefs) {
          const chartPath = ref.match(/Target="(.*?)"/)?.[1]
          if (chartPath) {
            const absPath = chartPath.startsWith('../')
              ? 'ppt/' + chartPath.replace('../', '')
              : chartPath
            if (!outputZip.files[absPath] && srcZip.files[absPath]) {
              const chartData = await srcZip.files[absPath].async('uint8array')
              outputZip.file(absPath, chartData)
              // Also copy chart rels if any
              const chartRelPath = absPath.replace('/charts/', '/charts/_rels/') + '.rels'
              if (srcZip.files[chartRelPath]) {
                const chartRelData = await srcZip.files[chartRelPath].async('text')
                outputZip.file(chartRelPath, chartRelData)
              }
            }
          }
        }

        outputZip.file(`ppt/slides/_rels/slide${outputSlideIdx}.xml.rels`, relXml)
      }

      outputSlideIdx++
    }

    const totalSlides = outputSlideIdx - 1

    // Update presentation.xml — rebuild slide list
    const presFile = outputZip.files['ppt/presentation.xml']
    if (presFile) {
      let presXml = await presFile.async('text')

      // Remove existing slide list
      presXml = presXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/i, '<p:sldIdLst/>')
      // Also handle self-closing
      presXml = presXml.replace(/<p:sldIdLst\s*\/>/i, () => {
        const entries = Array.from({ length: totalSlides }, (_, i) => {
          const slideIdx = i + 1
          const rId = `rId${100 + slideIdx}`
          const id = 256 + slideIdx
          return `<p:sldId id="${id}" r:id="${rId}"/>`
        }).join('')
        return `<p:sldIdLst>${entries}</p:sldIdLst>`
      })

      outputZip.file('ppt/presentation.xml', presXml)
    }

    // Update presentation.xml.rels — add slide relationships
    const presRelPath = 'ppt/_rels/presentation.xml.rels'
    const presRelFile = outputZip.files[presRelPath]
    if (presRelFile) {
      let presRelXml = await presRelFile.async('text')

      // Remove existing slide relationships
      presRelXml = presRelXml.replace(
        /<Relationship[^>]*Type="[^"]*\/slide"[^>]*\/>/gi,
        ''
      )

      // Add new slide relationships before closing tag
      const newRels = Array.from({ length: totalSlides }, (_, i) => {
        const slideIdx = i + 1
        const rId = `rId${100 + slideIdx}`
        return `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${slideIdx}.xml"/>`
      }).join('')

      presRelXml = presRelXml.replace('</Relationships>', newRels + '</Relationships>')
      outputZip.file(presRelPath, presRelXml)
    }

    // Update [Content_Types].xml
    const ctFile = outputZip.files['[Content_Types].xml']
    if (ctFile) {
      let ctXml = await ctFile.async('text')

      // Remove existing slide overrides
      ctXml = ctXml.replace(
        /<Override[^>]*PartName="\/ppt\/slides\/slide\d+\.xml"[^>]*\/>/gi,
        ''
      )

      // Add new slide overrides
      const overrides = Array.from({ length: totalSlides }, (_, i) => {
        return `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
      }).join('')

      ctXml = ctXml.replace('</Types>', overrides + '</Types>')
      outputZip.file('[Content_Types].xml', ctXml)
    }

    // Generate the PPTX binary
    const pptxBuffer = await outputZip.generateAsync({
      type: 'arraybuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })

    const filename = `${(name || 'deck').replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_')}.pptx`

    return new NextResponse(pptxBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pptxBuffer.byteLength.toString(),
      },
    })
  } catch (err: any) {
    console.error('PPTX assembly error:', err)
    return NextResponse.json({ error: 'Failed to assemble PPTX: ' + err.message }, { status: 500 })
  }
}
