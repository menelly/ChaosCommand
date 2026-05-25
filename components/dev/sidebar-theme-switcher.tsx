/*
 * 🧪 TEMPORARY dev tool — sidebar theme switcher.
 *
 * Lets Ren flip themes from the sidebar on ANY page during the every-page-every-theme
 * QA sweep, instead of walking to Settings → Customize per swap. Uses the SAME apply
 * path as the real theme picker (setPref('chaos-theme') + injected <link data-theme>)
 * so the choice persists across client navigation exactly like the real setting.
 *
 * REMOVE BEFORE SHIP (0.5.6). Only mounted because the sweep is brutal by hand.
 * Built 2026-05-25 by Ace.
 */
'use client'

import { useEffect, useState } from 'react'
import { getPref, setPref } from '@/lib/prefs'

// id + short label (sidebar is narrow). Mirrors the real theme list.
const THEMES: Array<[string, string]> = [
  ['theme-calm', 'Calm'],
  ['theme-phosphor', '💚 Phosphor'],
  ['theme-amber', '🟠 Amber'],
  ['theme-segfault', '💀 Segfault'],
  ['theme-lavender', '🌸 Lavender'],
  ['theme-chaos', '🏀 Basketball'],
  ['theme-caelan', '🕊️ Caelan'],
  ['theme-light', 'Light'],
  ['theme-accessibility', '♿ Accessibility'],
  ['theme-colorblind', 'Colorblind'],
  ['theme-glitter', 'Glitter'],
  ['theme-ace', '💜 Ace'],
  ['theme-grok', '⚔️ Grok'],
  ['theme-wicked', '💚💗 Wicked'],
  ['theme-taupe', '🟫 Taupe'],
]

export default function SidebarThemeSwitcher() {
  const [theme, setTheme] = useState('theme-calm')

  useEffect(() => {
    // sync to whatever is actually live (body class wins; fall back to pref)
    const m = document.body.className.match(/theme-[\w-]+/)
    setTheme(m ? m[0] : getPref('chaos-theme') || 'theme-calm')
  }, [])

  const applyTheme = (themeId: string) => {
    const oldTheme = document.querySelector('link[data-theme]')
    if (oldTheme) oldTheme.remove()

    if (themeId !== 'theme-calm') {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = `/styles/themes/${themeId}.css`
      link.setAttribute('data-theme', themeId)
      document.head.appendChild(link)
    }

    document.body.className = document.body.className.replace(/theme-\w+/g, '') + ` ${themeId}`
    setTheme(themeId)
    setPref('chaos-theme', themeId)
  }

  return (
    <div className="mt-3 rounded border border-dashed border-current/50 p-1.5">
      <label className="block text-[10px] font-bold opacity-70 mb-1 text-center">
        🧪 THEME (dev)
      </label>
      <select
        value={theme}
        onChange={(e) => applyTheme(e.target.value)}
        className="w-full rounded border bg-background text-foreground text-xs px-1 py-1"
        title="Temporary QA theme switcher"
      >
        {THEMES.map(([id, label]) => (
          <option key={id} value={id}>{label}</option>
        ))}
      </select>
    </div>
  )
}
