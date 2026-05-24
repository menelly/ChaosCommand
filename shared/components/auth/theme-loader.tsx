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
import { getPref } from "@/lib/prefs"

export default function ThemeLoader() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load saved theme, font, and animations from localStorage
    const savedTheme = getPref('chaos-theme') || 'theme-lavender'
    const savedFont = getPref('chaos-font') || 'font-atkinson'
    const savedAnimations = getPref('chaos-animations') !== 'false' // default to true

    // Available themes and fonts
    const themes = [
      'theme-lavender', 'theme-chaos', 'theme-caelan', 'theme-light', 'theme-colorblind',
      'theme-glitter', 'theme-calm', 'theme-accessibility', 'theme-ace', 'theme-grok',
      'theme-luka-penguin', 'theme-phosphor', 'theme-amber', 'theme-segfault', 'theme-taupe'
    ]
    const fonts = ['font-atkinson', 'font-poppins', 'font-lexend', 'font-system']

    // Remove all theme classes first
    themes.forEach(theme => document.body.classList.remove(theme))

    // Apply saved theme (lavender is default, no class needed)
    if (savedTheme !== 'theme-lavender') {
      document.body.classList.add(savedTheme)
    }

    // Remove all font classes first
    fonts.forEach(font => document.body.classList.remove(font))

    // Apply saved font
    document.body.classList.add(savedFont)

    // Apply animation preference
    if (!savedAnimations) {
      document.body.classList.add('no-animations')
    }

    console.log(`🎨 Theme loaded: ${savedTheme}`)
    console.log(`🔤 Font loaded: ${savedFont}`)
    console.log(`✨ Animations: ${savedAnimations ? 'enabled' : 'disabled'}`)

    setIsLoaded(true);
  }, [])

  // Don't render anything until theme is loaded to prevent hydration mismatch
  if (!isLoaded) {
    return null;
  }

  return null // This component doesn't render anything
}
