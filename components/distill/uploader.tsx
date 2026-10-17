'use client'

import { useRef, useState } from 'react'
import { FileText, Globe, Link2, Loader2, Plus, Sparkles, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const ACCEPT = '.pdf,.docx,.txt,.md,.csv,.json,.html,.xml,.rtf,.png,.jpg,.jpeg,.webp'
const FORMATS = ['PDF', 'DOCX', 'TXT', 'MD', 'CSV', 'JSON', 'HTML', 'PNG', 'JPG']

type UploaderProps = {
  isAnalyzing: boolean
  onAnalyze: (files: File[], urls: string[], text: string) => void
}

function normalizeUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
    return url.hostname.includes('.') ? url.toString() : null
  } catch {
    return null
  }
}

export function Uploader({ isAnalyzing, onAnalyze }: UploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [urls, setUrls] = useState<string[]>([])
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')
  const [text, setText] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  function addUrl() {
    const url = normalizeUrl(urlInput)
    if (!url) {
      setUrlError('Enter a valid web address, like example.com/article')
      return
    }
    if (urls.length >= 5) {
      setUrlError('You can add up to 5 web addresses.')
      return
    }
    setUrls((prev) => (prev.includes(url) ? prev : [...prev, url]))
    setUrlInput('')
    setUrlError('')
  }

  function addFiles(list: FileList | null) {
    if (!list) return
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name))
      return [...prev, ...Array.from(list).filter((f) => !names.has(f.name))].slice(0, 5)
    })
  }

  const pendingUrl = normalizeUrl(urlInput)
  const allUrls = pendingUrl && !urls.includes(pendingUrl) ? [...urls, pendingUrl].slice(0, 5) : urls
  const canSubmit = (files.length > 0 || allUrls.length > 0 || text.trim().length > 0) && !isAnalyzing

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit) onAnalyze(files, allUrls, text)
      }}
    >
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          addFiles(e.dataTransfer.files)
        }}
        className={cn(
          'flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed bg-card px-6 py-10 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-border',
        )}
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="font-medium">Drop your documents here</p>
          <p className="text-sm text-muted-foreground">Up to 5 files, 15 MB each</p>
        </div>
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          Browse files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          aria-label="Upload documents"
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <ul className="flex flex-wrap justify-center gap-1.5" aria-label="Supported formats">
          {FORMATS.map((f) => (
            <li key={f} className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {f}
            </li>
          ))}
        </ul>
      </div>

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file) => (
            <li key={file.name} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm">
              <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="flex-1 truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((f) => f.name !== file.name))}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Remove ${file.name}`}
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="web-address" className="text-sm font-medium text-muted-foreground">
          Or add a web address
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="web-address"
              type="url"
              inputMode="url"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value)
                if (urlError) setUrlError('')
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.keyCode === 229) return
                e.preventDefault()
                addUrl()
              }}
              placeholder="https://example.com/article"
              aria-invalid={Boolean(urlError)}
              aria-describedby={urlError ? 'web-address-error' : undefined}
              className="bg-card pl-9"
            />
          </div>
          <Button type="button" variant="outline" onClick={addUrl} disabled={!urlInput.trim()}>
            <Plus className="size-4" aria-hidden="true" />
            Add
          </Button>
        </div>
        {urlError && (
          <p id="web-address-error" className="text-xs text-destructive">
            {urlError}
          </p>
        )}
        {urls.length > 0 && (
          <ul className="flex flex-col gap-2">
            {urls.map((url) => (
              <li key={url} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm">
                <Link2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="flex-1 truncate">{url}</span>
                <button
                  type="button"
                  onClick={() => setUrls((prev) => prev.filter((u) => u !== url))}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Remove ${url}`}
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="paste" className="text-sm font-medium text-muted-foreground">
          Or paste text
        </label>
        <Textarea
          id="paste"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste an article, notes, or a chapter…"
          className="min-h-24 bg-card"
        />
      </div>

      <Button type="submit" size="lg" disabled={!canSubmit} className="h-11">
        {isAnalyzing ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Reading your material…
          </>
        ) : (
          <>
            <Sparkles className="size-4" aria-hidden="true" />
            Distill knowledge
          </>
        )}
      </Button>
    </form>
  )
}
