import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages'

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB, alineado con el composer
const MAX_FILES_PER_TURN = 5

const IMAGE_MIME: Record<string, 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'> = {
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/png': 'image/png',
  'image/gif': 'image/gif',
  'image/webp': 'image/webp',
}

export class AttachmentError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message)
    this.name = 'AttachmentError'
  }
}

export type AttachmentSummary = {
  name: string
  kind: 'pdf' | 'image'
  bytes: number
}

export type AttachmentResult = {
  blocks: ContentBlockParam[]
  summaries: AttachmentSummary[]
}

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

async function fileToBase64(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer())
  return buf.toString('base64')
}

export async function attachmentsToContentBlocks(files: File[]): Promise<AttachmentResult> {
  if (files.length === 0) return { blocks: [], summaries: [] }
  if (files.length > MAX_FILES_PER_TURN) {
    throw new AttachmentError(
      `Máximo ${MAX_FILES_PER_TURN} archivos por mensaje (recibí ${files.length}).`,
    )
  }

  const blocks: ContentBlockParam[] = []
  const summaries: AttachmentSummary[] = []

  for (const file of files) {
    if (file.size > MAX_BYTES) {
      throw new AttachmentError(
        `${file.name} pesa ${(file.size / 1024 / 1024).toFixed(1)} MB, máximo 25 MB.`,
      )
    }

    if (isPdf(file)) {
      const data = await fileToBase64(file)
      blocks.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data },
        title: file.name.slice(0, 100),
        citations: { enabled: true },
      })
      summaries.push({ name: file.name, kind: 'pdf', bytes: file.size })
      continue
    }

    const mime = IMAGE_MIME[file.type.toLowerCase()]
    if (!mime) {
      throw new AttachmentError(
        `Tipo no soportado: ${file.name} (${file.type || 'sin tipo'}). Usa PDF, JPG, PNG o WebP.`,
      )
    }
    const data = await fileToBase64(file)
    blocks.push({
      type: 'image',
      source: { type: 'base64', media_type: mime, data },
    })
    summaries.push({ name: file.name, kind: 'image', bytes: file.size })
  }

  return { blocks, summaries }
}
