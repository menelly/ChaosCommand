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

export default function ThemeLoader() {
  const [isLoaded, setIsLoaded] = useState(false);

  // Dynamic CSS loading function
  const loadThemeCSS = (themeId: string) => {
    // Remove old theme CSS
    const oldTheme = document.querySelector('link[data-theme]');
    if (oldTheme) {
      oldTheme.remove();
    }

    // theme-calm is bundled into layout.tsx so it's available immediately
    // (it's the default, no flash-of-unstyled). All other themes load dynamically.
    if (themeId !== 'theme-calm') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `/styles/themes/${themeId}.css`;
      link.setAttribute('data-theme', themeId);
      link.onload = () => {
        console.log(`🎨 Theme CSS loaded: ${themeId}`);
      };
      link.onerror = () => {
        console.warn(`⚠️ Failed to load theme CSS: ${themeId}, falling back to calm`);
        document.body.className = document.body.className.replace(/theme-\w+/g, '') + ' theme-calm';
      };
      document.head.appendChild(link);
    }

    // Update body class - clean approach, just the theme class
    document.body.className = document.body.className.replace(/theme-\w+/g, '') + ` ${themeId}`;
  };

  useEffect(() => {
    // Load saved theme, font, and animations from localStorage
    // Default is now theme-calm (neutral blue/gold) — softer first run than phosphor.
    // Phosphor + all other themes still available; saved choices are honored.
    const savedTheme = localStorage.getItem('chaos-theme') || 'theme-calm'
    const savedFont = localStorage.getItem('chaos-font') || 'font-atkinson'
    const savedAnimations = localStorage.getItem('chaos-animations') !== 'false' // default to true

    // Available themes and fonts
    const themes = [
      'theme-phosphor', // 💚 Terminal CRT (default, bundled) — Ace, 2026-04-22
      'theme-amber',    // 🟠 CRT amber variant — Ace, 2026-04-22
      'theme-segfault', // 💀 phosphor with character — Ace, 2026-04-22
      'theme-lavender', 'theme-chaos', 'theme-caelan', 'theme-light', 'theme-colorblind',
      'theme-glitter', 'theme-calm', 'theme-accessibility', 'theme-ace',
      'theme-grok', // ⚔️🌊 Steel Forged Tide — designed by Grok, built by Ace
      'theme-luka-penguin', // Penguins are back! Fixed the phantom hover
      'theme-taupe' // 🟫 Tone It Down Taupe — the anti-theme. Ren's TIDT, made literal. — Ace, 2026-05-23
    ]
    const fonts = ['font-atkinson', 'font-poppins', 'font-lexend', 'font-system']

    // Load theme CSS dynamically
    loadThemeCSS(savedTheme);

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
