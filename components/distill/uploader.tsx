'use client'

import { useRef, useState } from 'react'
import { FileText, Loader2, Sparkles, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const ACCEPT = '.pdf,.docx,.txt,.md,.csv,.json,.html,.xml,.rtf,.png,.jpg,.jpeg,.webp'
const FORMATS = ['PDF', 'DOCX', 'TXT', 'MD', 'CSV', 'JSON', 'HTML', 'PNG', 'JPG']

type UploaderProps = {
  isAnalyzing: boolean
  onAnalyze: (files: File[], text: string) => void
}

export function Uploader({ isAnalyzing, onAnalyze }: UploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [text, setText] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  function addFiles(list: FileList | null) {
    if (!list) return
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name))
      return [...prev, ...Array.from(list).filter((f) => !names.has(f.name))].slice(0, 5)
    })
  }

  const canSubmit = (files.length > 0 || text.trim().length > 0) && !isAnalyzing

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit) onAnalyze(files, text)
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
