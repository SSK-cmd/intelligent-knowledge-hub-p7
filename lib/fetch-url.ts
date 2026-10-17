import 'server-only'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const MAX_BYTES = 15 * 1024 * 1024
const MAX_REDIRECTS = 3
const TIMEOUT_MS = 15_000

export type FetchedUrl =
  | { kind: 'text'; url: string; title: string; text: string }
  | { kind: 'pdf'; url: string; bytes: Uint8Array }
  | { kind: 'image'; url: string; bytes: Uint8Array; mediaType: string }

function isPrivateAddress(address: string) {
  if (isIP(address) === 6) {
    const a = address.toLowerCase()
    if (a.startsWith('::ffff:')) return isPrivateAddress(a.slice(7))
    return a === '::1' || a === '::' || a.startsWith('fc') || a.startsWith('fd') || a.startsWith('fe80')
  }
  const [a, b] = address.split('.').map(Number)
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

async function assertPublicUrl(raw: string) {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`"${raw}" is not a valid web address.`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Only http and https addresses are supported: ${raw}`)
  }
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((r) => r.address)
  if (addresses.length === 0) throw new Error(`Could not reach ${url.hostname}.`)
  if (addresses.some(isPrivateAddress)) throw new Error(`${url.hostname} is not a public address.`)
  return url
}

async function readLimited(res: Response) {
  const reader = res.body?.getReader()
  if (!reader) return new Uint8Array()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_BYTES) {
      await reader.cancel()
      throw new Error(`${res.url} is larger than 15 MB.`)
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function htmlToText(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? ''
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html
  const text = body
    .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|h[1-6]|li|tr|br|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1]?.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
        return Number.isFinite(code) ? String.fromCodePoint(code) : m
      }
      return ENTITIES[e.toLowerCase()] ?? m
    })
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
  return { title, text }
}

const BLOCKED_STATUSES = [401, 403, 406, 429, 451, 503]

class BlockedError extends Error {}

async function fetchViaReader(original: URL, maxChars: number): Promise<FetchedUrl> {
  const res = await fetch(`https://r.jina.ai/${original.toString()}`, {
    signal: AbortSignal.timeout(30_000),
    headers: { Accept: 'text/plain', 'X-Return-Format': 'markdown' },
  }).catch(() => null)
  if (!res?.ok) throw new Error(`${original.hostname} blocks automated access. Copy the article text and paste it instead.`)
  const text = new TextDecoder().decode(await readLimited(res))
  const title = text.match(/^Title:\s*(.+)$/m)?.[1]?.trim() ?? ''
  const content = text.split(/^Markdown Content:\s*$/m)[1]?.trim() ?? text
  if (content.length < 50) throw new Error(`Couldn't find readable text at ${original.hostname}.`)
  return { kind: 'text', url: original.toString(), title, text: content.slice(0, maxChars) }
}

export async function fetchUrl(raw: string, maxChars: number): Promise<FetchedUrl> {
  const input = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`
  const original = await assertPublicUrl(input)
  try {
    return await fetchDirect(input, maxChars)
  } catch (error) {
    if (error instanceof BlockedError) return fetchViaReader(original, maxChars)
    throw error
  }
}

async function fetchDirect(raw: string, maxChars: number): Promise<FetchedUrl> {
  let current = raw
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const url = await assertPublicUrl(current)
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/pdf,text/plain,image/*;q=0.8,*/*;q=0.5',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }).catch(() => {
      throw new Error(`Could not load ${url.hostname}.`)
    })

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) throw new Error(`${url.hostname} returned an invalid redirect.`)
      current = new URL(location, url).toString()
      continue
    }
    if (BLOCKED_STATUSES.includes(res.status)) throw new BlockedError(url.hostname)
    if (!res.ok) throw new Error(`${url.hostname} responded with status ${res.status}.`)

    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    const bytes = await readLimited(res)
    const href = url.toString()

    if (type === 'application/pdf' || url.pathname.toLowerCase().endsWith('.pdf')) {
      return { kind: 'pdf', url: href, bytes }
    }
    if (['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(type)) {
      return { kind: 'image', url: href, bytes, mediaType: type }
    }

    const decoded = new TextDecoder().decode(bytes)
    if (type.includes('html') || /^\s*</.test(decoded)) {
      const { title, text } = htmlToText(decoded)
      if (text.length < 50) throw new Error(`Couldn't find readable text at ${url.hostname}.`)
      return { kind: 'text', url: href, title, text: text.slice(0, maxChars) }
    }
    if (type.startsWith('text/') || type.includes('json') || type.includes('xml')) {
      return { kind: 'text', url: href, title: '', text: decoded.slice(0, maxChars) }
    }
    throw new Error(`Unsupported content at ${url.hostname} (${type || 'unknown type'}).`)
  }
  throw new Error('Too many redirects.')
}
