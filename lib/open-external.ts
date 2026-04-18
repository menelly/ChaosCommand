import { openUrl } from '@tauri-apps/plugin-opener'

/**
 * Open a URL externally (system browser, phone dialer, maps, etc.)
 * Falls back to window.open for non-Tauri environments (dev mode).
 */
export async function openExternal(url: string) {
  // Normalize: if it looks like a web URL without a protocol, add https://
  let normalized = url.trim()
  if (normalized && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(normalized)) {
    normalized = `https://${normalized}`
  }

  try {
    await openUrl(normalized)
  } catch {
    // Fallback for dev mode / non-Tauri
    window.open(normalized, '_blank')
  }
}
