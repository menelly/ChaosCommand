/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10
 *
 * This code is part of a deliberately-unpatented medical management system.
 * Patentable technology, but we chose not to patent — the Patent Office doesn't
 * yet recognize AI co-inventors, and Ren refused to claim sole credit for work
 * we built together. Open source under PolyForm Noncommercial 1.0.0 instead.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 *
 * This wasn't built with compliance. It was built with defiance.
 *
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * ECG STRIP UPLOADER
 * Reusable component for attaching ECG strip screenshots, lab PDFs, or other
 * cardiac event documentation. Stores blobs in Dexie image_blobs table.
 * Returns array of blob keys for inclusion in the cardiac entry.
 */

'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Upload, X, FileText, ImageIcon } from 'lucide-react'
import { db } from '@/lib/database'

interface AttachmentPreview {
  blobKey: string
  filename: string
  mimeType: string
  size: number
  url: string // object URL for preview
  isPdf: boolean
}

interface EcgStripUploaderProps {
  value: string[] // current blob keys
  onChange: (blobKeys: string[]) => void
  label?: string
  helpText?: string
  maxFiles?: number
}

export function EcgStripUploader({
  value,
  onChange,
  label = 'ECG strips, lab PDFs, photos (Optional)',
  helpText = 'Attach ECG screenshots from your home device, lab result PDFs, or photos relevant to the event.',
  maxFiles = 10
}: EcgStripUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<AttachmentPreview[]>([])
  const [uploading, setUploading] = useState(false)

  // Hydrate previews from existing blob keys (when editing an entry)
  useEffect(() => {
    let cancelled = false
    const hydrate = async () => {
      if (!value || value.length === 0) {
        setPreviews([])
        return
      }
      const out: AttachmentPreview[] = []
      for (const key of value) {
        try {
          const record = await db.image_blobs.where('blob_key').equals(key).first()
          if (record && record.blob_data) {
            out.push({
              blobKey: key,
              filename: record.filename || 'attachment',
              mimeType: record.mime_type || 'application/octet-stream',
              size: record.size || 0,
              url: URL.createObjectURL(record.blob_data),
              isPdf: (record.mime_type || '').includes('pdf')
            })
          }
        } catch (e) {
          console.error('Failed to hydrate blob', key, e)
        }
      }
      if (!cancelled) setPreviews(out)
    }
    hydrate()
    return () => {
      cancelled = true
      // Revoke URLs to prevent memory leaks
      for (const p of previews) {
        try { URL.revokeObjectURL(p.url) } catch {}
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.join('|')])

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (value.length + files.length > maxFiles) {
      alert(`Maximum ${maxFiles} attachments per event.`)
      return
    }

    setUploading(true)
    const newKeys: string[] = []
    try {
      for (const file of Array.from(files)) {
        const blobKey = `cardiac-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        await db.image_blobs.add({
          blob_key: blobKey,
          blob_data: file,
          filename: file.name || 'attachment',
          mime_type: file.type || 'application/octet-stream',
          size: file.size,
          created_at: new Date().toISOString(),
          linked_records: ['cardiac']
        })
        newKeys.push(blobKey)
      }
      onChange([...value, ...newKeys])
    } catch (e) {
      console.error('Failed to save attachment(s):', e)
      alert('Could not save attachment. Try a smaller file.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = async (blobKey: string) => {
    try {
      // Remove from Dexie
      const records = await db.image_blobs.where('blob_key').equals(blobKey).toArray()
      for (const r of records) {
        if (r.id !== undefined) await db.image_blobs.delete(r.id)
      }
    } catch (e) {
      console.error('Failed to delete blob:', e)
    }
    onChange(value.filter(k => k !== blobKey))
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>{label}</Label>
        {helpText && <p className="text-xs text-muted-foreground mt-1">{helpText}</p>}
      </div>

      {/* Upload button */}
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || value.length >= maxFiles}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading…' : value.length >= maxFiles ? `Max ${maxFiles} reached` : 'Add image or PDF'}
        </Button>
      </div>

      {/* Previews grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {previews.map((p) => (
            <div key={p.blobKey} className="relative border rounded-lg overflow-hidden bg-muted/30">
              {p.isPdf ? (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center h-32 p-2 hover:bg-muted/50"
                >
                  <FileText className="h-8 w-8 text-muted-foreground mb-1" />
                  <span className="text-xs text-center truncate w-full">{p.filename}</span>
                  <span className="text-xs text-muted-foreground">{(p.size / 1024).toFixed(0)} KB</span>
                </a>
              ) : (
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={p.url}
                    alt={p.filename}
                    className="w-full h-32 object-cover"
                  />
                  <div className="px-2 py-1 text-xs">
                    <div className="truncate">{p.filename}</div>
                    <div className="text-muted-foreground">{(p.size / 1024).toFixed(0)} KB</div>
                  </div>
                </a>
              )}

              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={(e) => { e.preventDefault(); handleRemove(p.blobKey) }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
