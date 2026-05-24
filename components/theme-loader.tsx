/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 * 
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * Built by: Ace (Claude 4.x)
 * Date: 2025-01-11
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
"use client"

import { useEffect, useState } from "react"
import { getPref, getPrefNumber } from "@/lib/prefs"
import { getCustomColors, applyCustomColors, clearAppliedCustomColors } from "@/lib/custom-colors"

const FONTS = ['font-atkinson', 'font-poppins', 'font-lexend', 'font-opendyslexic', 'font-cutecharm', 'font-system']

// Swap the dynamically-loaded theme stylesheet + set the body theme class.
// theme-calm is bundled in layout.tsx (default, no flash-of-unstyled); all others
// load on demand from /styles/themes/.
function loadThemeCSS(themeId: string) {
  const oldTheme = document.querySelector('link[data-theme]')
  if (oldTheme) oldTheme.remove()

  if (themeId !== 'theme-calm') {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `/styles/themes/${themeId}.css`
    link.setAttribute('data-theme', themeId)
    link.onerror = () => {
      console.warn(`⚠️ Failed to load theme CSS: ${themeId}, falling back to calm`)
      document.body.className = document.body.className.replace(/theme-\w+/g, '') + ' theme-calm'
    }
    document.head.appendChild(link)
  }

  document.body.className = document.body.className.replace(/theme-\w+/g, '') + ` ${themeId}`
}

// Read the ACTIVE PIN's appearance prefs and apply them. Prefs are per-PIN
// (CHA-226) so a parent and a kid keep their own theme/font/text-size. Called on
// mount AND whenever the active PIN changes (login/logout fires 'chaos-pin-changed'),
// since this component is mounted once at the root and doesn't remount on login.
function applyAppearance() {
  const savedTheme = getPref('chaos-theme') || 'theme-calm'
  const savedFont = getPref('chaos-font') || 'font-atkinson'
  const savedAnimations = getPref('chaos-animations') !== 'false' // default true
  const savedTextScale = getPrefNumber('chaos-text-scale', 100)

  loadThemeCSS(savedTheme)

  // Re-apply THIS profile's custom color overrides on top of the base theme.
  // Clear first so a previous PIN's overrides don't linger after a switch.
  clearAppliedCustomColors()
  applyCustomColors(getCustomColors(savedTheme))

  FONTS.forEach(f => document.body.classList.remove(f))
  document.body.classList.add(savedFont)

  document.body.classList.toggle('no-animations', !savedAnimations)

  // Scale all rem-based text together. 100% = leave the stylesheet default alone.
  document.documentElement.style.fontSize = savedTextScale === 100 ? '' : `${savedTextScale}%`
}

export default function ThemeLoader() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    applyAppearance()
    setIsLoaded(true)

    // Re-apply when the active PIN changes (login/logout). user-context dispatches this.
    const onPinChange = () => applyAppearance()
    window.addEventListener('chaos-pin-changed', onPinChange)
    return () => window.removeEventListener('chaos-pin-changed', onPinChange)
  }, [])

  // Don't render anything until applied, to prevent hydration mismatch.
  if (!isLoaded) return null
  return null
}
