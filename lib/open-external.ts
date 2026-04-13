import { openUrl } from '@tauri-apps/plugin-opener'

/**
 * Open a URL externally (system browser, phone dialer, maps, etc.)
 * Falls back to window.open for non-Tauri environments (dev mode).
 */
export async function openExternal(url: string) {
  try {
    await openUrl(url)
  } catch {
    // Fallback for dev mode / non-Tauri
    window.open(url, '_blank')
  }
}
