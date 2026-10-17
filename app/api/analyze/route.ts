import { generateText, Output, type FilePart, type TextPart } from 'ai'
import mammoth from 'mammoth'
import { analysisSchema } from '@/lib/analysis-schema'
import { analysisError } from '@/lib/analysis-error'
import { fetchUrl } from '@/lib/fetch-url'

export const maxDuration = 120

const MAX_FILE_BYTES = 15 * 1024 * 1024
const MAX_FILES = 5
const MAX_URLS = 5
const MAX_TEXT_CHARS = 200_000

const TEXT_EXTENSIONS = ['txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'html', 'htm', 'xml', 'rtf', 'log']
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

function extension(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

async function fileToParts(file: File): Promise<Array<TextPart | FilePart>> {
  const ext = extension(file.name)
  const bytes = new Uint8Array(await file.arrayBuffer())

  if (file.type === 'application/pdf' || ext === 'pdf') {
    return [
      { type: 'text', text: `Document: ${file.name}` },
      { type: 'file', data: bytes, mediaType: 'application/pdf', filename: file.name },
    ]
  }

  if (IMAGE_TYPES.includes(file.type)) {
    return [
      { type: 'text', text: `Image document: ${file.name}` },
      { type: 'file', data: bytes, mediaType: file.type },
    ]
  }

  if (ext === 'docx') {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
    return [{ type: 'text', text: `Document: ${file.name}\n\n${value.slice(0, MAX_TEXT_CHARS)}` }]
  }

  if (TEXT_EXTENSIONS.includes(ext) || file.type.startsWith('text/')) {
    const text = new TextDecoder().decode(bytes)
    return [{ type: 'text', text: `Document: ${file.name}\n\n${text.slice(0, MAX_TEXT_CHARS)}` }]
  }

  throw new Error(`Unsupported file type: ${file.name}`)
}

async function urlToParts(raw: string): Promise<Array<TextPart | FilePart>> {
  const page = await fetchUrl(raw, MAX_TEXT_CHARS)
  if (page.kind === 'pdf') {
    return [
      { type: 'text', text: `Web document: ${page.url}` },
      { type: 'file', data: page.bytes, mediaType: 'application/pdf' },
    ]
  }
  if (page.kind === 'image') {
    return [
      { type: 'text', text: `Web image: ${page.url}` },
      { type: 'file', data: page.bytes, mediaType: page.mediaType },
    ]
  }
  const heading = page.title ? `${page.title} (${page.url})` : page.url
  return [{ type: 'text', text: `Web page: ${heading}\n\n${page.text}` }]
}

export async function POST(req: Request) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return Response.json({ error: 'Invalid upload.' }, { status: 400 })
  }

  const files = formData.getAll('files').filter((f): f is File => f instanceof File)
  const pastedText = String(formData.get('text') ?? '').slice(0, MAX_TEXT_CHARS).trim()
  const urls = formData
    .getAll('urls')
    .map((u) => String(u).trim())
    .filter(Boolean)

  if (files.length === 0 && !pastedText && urls.length === 0) {
    return Response.json(
      { error: 'Please upload a document, add a web address, or paste some text.' },
      { status: 400 },
    )
  }
  if (files.length > MAX_FILES) {
    return Response.json({ error: `You can upload up to ${MAX_FILES} files at once.` }, { status: 400 })
  }
  if (urls.length > MAX_URLS) {
    return Response.json({ error: `You can add up to ${MAX_URLS} web addresses at once.` }, { status: 400 })
  }
  const tooBig = files.find((f) => f.size > MAX_FILE_BYTES)
  if (tooBig) {
    return Response.json({ error: `${tooBig.name} is larger than 15 MB.` }, { status: 400 })
  }

  const settled = await Promise.allSettled([...files.map(fileToParts), ...urls.map(urlToParts)])
  const parts: Array<TextPart | FilePart> = []
  const warnings: string[] = []
  for (const result of settled) {
    if (result.status === 'fulfilled') parts.push(...result.value)
    else warnings.push(result.reason instanceof Error ? result.reason.message : 'A source could not be read.')
  }
  if (pastedText) parts.push({ type: 'text', text: `Pasted text:\n\n${pastedText}` })
  if (parts.length === 0) {
    return Response.json({ error: warnings.join(' ') || 'No readable content found.' }, { status: 400 })
  }

  try {
    const { output } = await generateText({
      model: process.env.AI_MODEL?.trim() || 'google/gemini-3.8-flash',
      system:
        'You are an expert teacher and analyst. Read the provided material carefully and produce a faithful, accurate study pack grounded strictly in the material. Do not invent facts or statistics that are not supported by the material. Write in the same language as the material.',
      messages: [
        {
          role: 'user',
          content: [
            ...parts,
            {
              type: 'text',
              text: 'Analyze all the material above and produce the complete study pack: summary, insights, knowledge, keywords, acronyms, a concept flow chart, emoji watchword cards, statistics charts, and a quiz.',
            },
          ],
        },
      ],
      output: Output.object({ schema: analysisSchema }),
    })

    return Response.json({ ...output, warnings })
  } catch (error) {
    const { status, code, error: message } = analysisError(error)
    const requestId = crypto.randomUUID()
    console.error('Analysis failed:', { requestId, code }, error)
    return Response.json(
      { error: message, code, requestId },
      { status },
    )
  }
}
