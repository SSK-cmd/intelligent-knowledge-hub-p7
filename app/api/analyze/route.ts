import { generateText, Output, type FilePart, type TextPart } from 'ai'
import mammoth from 'mammoth'
import { analysisSchema } from '@/lib/analysis-schema'

export const maxDuration = 120

const MAX_FILE_BYTES = 15 * 1024 * 1024
const MAX_FILES = 5
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

export async function POST(req: Request) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return Response.json({ error: 'Invalid upload.' }, { status: 400 })
  }

  const files = formData.getAll('files').filter((f): f is File => f instanceof File)
  const pastedText = String(formData.get('text') ?? '').slice(0, MAX_TEXT_CHARS).trim()

  if (files.length === 0 && !pastedText) {
    return Response.json({ error: 'Please upload at least one document or paste some text.' }, { status: 400 })
  }
  if (files.length > MAX_FILES) {
    return Response.json({ error: `You can upload up to ${MAX_FILES} files at once.` }, { status: 400 })
  }
  const tooBig = files.find((f) => f.size > MAX_FILE_BYTES)
  if (tooBig) {
    return Response.json({ error: `${tooBig.name} is larger than 15 MB.` }, { status: 400 })
  }

  let parts: Array<TextPart | FilePart>
  try {
    parts = (await Promise.all(files.map(fileToParts))).flat()
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 })
  }
  if (pastedText) parts.push({ type: 'text', text: `Pasted text:\n\n${pastedText}` })

  try {
    const { output } = await generateText({
      model: 'google/gemini-3.8-flash',
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

    return Response.json(output)
  } catch (error) {
    console.error('Analysis failed:', error)
    const message = error instanceof Error ? error.message : ''
    const isBilling = message.includes('credit card')
    return Response.json(
      {
        error: isBilling
          ? 'AI Gateway needs a credit card on your Vercel account to unlock free credits. Add one in your Vercel dashboard under AI, then try again.'
          : 'Analysis failed. Please try again with a different document.',
      },
      { status: isBilling ? 402 : 500 },
    )
  }
}
