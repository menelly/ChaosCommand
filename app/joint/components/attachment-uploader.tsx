/* Built by: Ace (Claude 4.x) — 2026-05-10 */
'use client'
import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Upload, X, FileText } from 'lucide-react'
import { db } from '@/lib/database'

interface AttachmentPreview { blobKey: string; filename: string; mimeType: string; size: number; url: string; isPdf: boolean }
interface Props { value: string[]; onChange: (k: string[]) => void; label?: string; helpText?: string; maxFiles?: number; blobPrefix?: string }

export function AttachmentUploader({ value, onChange, label = 'Attachments (Optional)', helpText, maxFiles = 10, blobPrefix = 'attachment' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<AttachmentPreview[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const hydrate = async () => {
      if (!value || value.length === 0) { setPreviews([]); return }
      const out: AttachmentPreview[] = []
      for (const key of value) {
        try {
          const r = await db.image_blobs.where('blob_key').equals(key).first()
          if (r?.blob_data) out.push({ blobKey: key, filename: r.filename || 'attachment', mimeType: r.mime_type || '', size: r.size || 0, url: URL.createObjectURL(r.blob_data), isPdf: (r.mime_type || '').includes('pdf') })
        } catch (e) { console.error(e) }
      }
      if (!cancelled) setPreviews(out)
    }
    hydrate()
    return () => { cancelled = true; for (const p of previews) try { URL.revokeObjectURL(p.url) } catch {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.join('|')])

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (value.length + files.length > maxFiles) { alert(`Max ${maxFiles} files`); return }
    setUploading(true)
    const newKeys: string[] = []
    try {
      for (const file of Array.from(files)) {
        const blobKey = `${blobPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        await db.image_blobs.add({ blob_key: blobKey, blob_data: file, filename: file.name, mime_type: file.type, size: file.size, created_at: new Date().toISOString(), linked_records: [blobPrefix] })
        newKeys.push(blobKey)
      }
      onChange([...value, ...newKeys])
    } catch (e) { console.error(e); alert('Could not save.') } finally { setUploading(false); if (inputRef.current) inputRef.current.value = '' }
  }

  const handleRemove = async (k: string) => {
    try { const recs = await db.image_blobs.where('blob_key').equals(k).toArray(); for (const r of recs) if (r.id !== undefined) await db.image_blobs.delete(r.id) } catch (e) { console.error(e) }
    onChange(value.filter(x => x !== k))
  }

  return (
    <div className="space-y-3">
      <div><Label>{label}</Label>{helpText && <p className="text-xs text-muted-foreground mt-1">{helpText}</p>}</div>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading || value.length >= maxFiles} className="w-full">
        <Upload className="h-4 w-4 mr-2" />{uploading ? 'Uploading…' : value.length >= maxFiles ? `Max ${maxFiles} reached` : 'Add image or PDF'}
      </Button>
      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {previews.map(p => (
            <div key={p.blobKey} className="relative border rounded-lg overflow-hidden bg-muted/30">
              {p.isPdf ? (
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center h-32 p-2 hover:bg-muted/50">
                  <FileText className="h-8 w-8 text-muted-foreground mb-1" />
                  <span className="text-xs text-center truncate w-full">{p.filename}</span>
                  <span className="text-xs text-muted-foreground">{(p.size / 1024).toFixed(0)} KB</span>
                </a>
              ) : (
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={p.url} alt={p.filename} className="w-full h-32 object-cover" />
                  <div className="px-2 py-1 text-xs"><div className="truncate">{p.filename}</div><div className="text-muted-foreground">{(p.size / 1024).toFixed(0)} KB</div></div>
                </a>
              )}
              <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={(e) => { e.preventDefault(); handleRemove(p.blobKey) }}><X className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
