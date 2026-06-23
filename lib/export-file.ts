/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude 4.x)
 * Licensed under PolyForm Noncommercial 1.0.0.
 *
 * export-file.ts — ONE correct way to write an exported file to disk across
 * desktop, Android, and the plain browser.
 *
 * WHY THIS EXISTS (the v0.7.1 catastrophe): every export in the app used the
 * browser trick — make a Blob, create an <a download>, click it. That works on
 * desktop but is a SILENT NO-OP in the Android WebView (Android ignores the
 * `download` attribute on a blob: URL), so on mobile the backup export produced
 * NO FILE while still showing a success message. A later "fix" wrote via
 * tauri-plugin-fs to BaseDirectory.Download and opened it with the opener
 * plugin — both ALSO broken on modern Android: you can't raw-write public
 * Downloads under scoped storage (EACCES), and the opener builds a file:// VIEW
 * intent that throws FileUriExposedException. (Both confirmed by reading the
 * plugin Kotlin source, not guessed.)
 *
 * THE CORRECT MECHANISM — Storage Access Framework via tauri-plugin-dialog:
 *   save()  -> on Android fires Intent.ACTION_CREATE_DOCUMENT (the native
 *              "Save As" picker) and returns a writable content:// URI; on
 *              desktop returns a real filesystem path.
 *   writeFile(uri/path, bytes) -> fs plugin writes through the content resolver
 *              (Android) or the path (desktop). Same call, both platforms.
 * The user picks the location (Downloads, Drive, etc.), no storage permission is
 * needed, and it works on every Android version. In a plain browser (dev mode /
 * any web deployment) we fall back to the classic blob download.
 */

import { isTauri } from '@tauri-apps/api/core'

export interface ExportFilterSpec {
  /** Human label for the file type, e.g. "PDF Document". */
  name: string
  /** Extensions WITHOUT the dot, e.g. ['pdf'] or ['ccbackup', 'json']. */
  extensions: string[]
}

export interface SaveExportResult {
  /** true = file written; false = user cancelled the save dialog. */
  saved: boolean
  /**
   * Where it landed, for an honest confirmation message. On Android this is the
   * content:// URI (opaque but truthful); on desktop the chosen path; in the
   * browser the filename. null when cancelled.
   */
  location: string | null
}

/** Normalize text | Uint8Array | Blob to bytes for a binary write. */
async function toBytes(content: string | Uint8Array | Blob): Promise<Uint8Array> {
  if (content instanceof Uint8Array) return content
  if (typeof content === 'string') return new TextEncoder().encode(content)
  return new Uint8Array(await content.arrayBuffer())
}

function inferMimeType(filters?: ExportFilterSpec[]): string {
  const ext = filters?.[0]?.extensions?.[0]?.toLowerCase()
  if (ext === 'pdf') return 'application/pdf'
  if (ext === 'json' || ext === 'ccbackup') return 'application/json'
  return 'application/octet-stream'
}

/**
 * Save an exported file, prompting the user for a location via the native
 * picker on Tauri (desktop + Android) and falling back to a blob download in a
 * plain browser. Returns whether it saved and where.
 *
 * @param suggestedName default filename shown in the picker (e.g. "report.pdf")
 * @param content       the file contents — string, bytes, or a Blob
 * @param filters       file-type filters for the picker (first one's first
 *                      extension also decides the browser-fallback MIME type)
 */
export async function saveExportFile(
  suggestedName: string,
  content: string | Uint8Array | Blob,
  filters?: ExportFilterSpec[],
): Promise<SaveExportResult> {
  // --- Tauri (desktop + Android): native Save As via SAF -------------------
  if (typeof window !== 'undefined' && isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeFile, writeTextFile } = await import('@tauri-apps/plugin-fs')

    const target = await save({
      defaultPath: suggestedName,
      filters: filters && filters.length ? filters : undefined,
    })
    // User backed out of the picker — not an error, just nothing to do.
    if (!target) return { saved: false, location: null }

    // writeFile handles content:// URIs (Android) and real paths (desktop)
    // identically. Use text vs binary write to avoid a needless encode round-trip.
    if (typeof content === 'string') {
      await writeTextFile(target, content)
    } else {
      await writeFile(target, await toBytes(content))
    }
    return { saved: true, location: target }
  }

  // --- Plain browser (dev mode / web): classic blob download ---------------
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content as BlobPart], { type: inferMimeType(filters) })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = suggestedName
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Defer revoke — a synchronous revoke can cancel the still-starting download.
  setTimeout(() => URL.revokeObjectURL(url), 60000)
  return { saved: true, location: suggestedName }
}

export interface ImportFileResult {
  /** Original filename (best-effort on Android — derived from the content URI). */
  name: string
  /** Full text contents of the chosen file. */
  text: string
}

/**
 * Prompt the user to pick a file and return its text contents. Uses the native
 * OPEN picker on Tauri (desktop + Android) and an <input type=file> in a plain
 * browser. Returns null if the user cancels.
 *
 * WHY (the import half of the v0.7.1 catastrophe): the old import used
 * `<input type="file" accept=".ccbackup,.json">`. On Android the WebView filters
 * that picker by MIME type, and `.ccbackup` has no registered MIME — so the
 * backup file was greyed out / unselectable and "import didn't work". The native
 * open() picker uses an unfiltered all-files intent, so .ccbackup is selectable,
 * and reads the chosen content:// URI through the fs plugin's content resolver.
 */
export async function openImportFile(): Promise<ImportFileResult | null> {
  // --- Tauri (desktop + Android): native OPEN picker -----------------------
  if (typeof window !== 'undefined' && isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readTextFile } = await import('@tauri-apps/plugin-fs')
    // No filters → the picker shows ALL files, so an extension-less / unknown
    // type like .ccbackup is selectable (a MIME filter would hide it).
    const selected = await open({ multiple: false })
    if (!selected) return null // user cancelled
    const path = typeof selected === 'string' ? selected : (selected as { path: string }).path
    const text = await readTextFile(path)
    const name = path.split(/[\\/]/).pop() || 'backup'
    return { name, text }
  }

  // --- Plain browser (dev mode / web): <input type=file> -------------------
  return new Promise<ImportFileResult | null>((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.ccbackup,.json,application/json'
    input.style.display = 'none'
    input.onchange = async () => {
      const file = input.files?.[0]
      input.remove()
      if (!file) { resolve(null); return }
      resolve({ name: file.name, text: await file.text() })
    }
    document.body.appendChild(input)
    input.click()
  })
}
