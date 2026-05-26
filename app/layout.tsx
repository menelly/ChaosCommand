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

import type React from "react"
import { Suspense } from "react"
import "./globals.css"
import "../styles/chaos-themes.css"
// theme-calm is the default (Ace, 2026-05-22) — neutral blue/gold, a softer first
// run than the CRT-green phosphor. Bundled so first paint matches without a dynamic
// CSS load. Phosphor + all other themes load dynamically by ThemeLoader.
import "../styles/themes/theme-calm.css"
import ThemeLoader from "@/components/theme-loader"

import { GoblinModeProvider } from "@/lib/goblin-mode-context"
// License gate disabled for free-tier launch (tip jar model). Re-enable by restoring these imports and the wrapper below.
// import { LicenseProvider } from "@/lib/contexts/license-context"
// import LicenseGate from "@/components/license-gate"
import AppSidebar from "@/components/app-sidebar"
import { Toaster } from "@/components/ui/toaster"
import { AppWrapper } from "@/components/app-wrapper"
import RoutineFlowBar from "@/components/routines/routine-flow-bar"
// import AddyChatBubble from "@/components/addy-chat-bubble" // Commented out - AI module for later

export const metadata = {
  title: "Chaos Command Center - Executive Function for Chaotic Humans",
  description: "Your beautifully chaotic life management system - because normal is overrated",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7c3aed" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Favicon Links */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="icon" href="/icon-512.png" type="image/png" sizes="512x512" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Fonts are SELF-HOSTED (see @font-face in styles/chaos-themes.css). We no
            longer load from fonts.googleapis.com — a privacy-first medical app must
            not leak the user's IP to Google on every launch. (Ace, 2026-05-26, CHA-229) */}

      </head>
      <body className="h-screen overflow-hidden bg-background font-sans antialiased" suppressHydrationWarning>
        <ThemeLoader />
        <AppWrapper>
          {/* <LicenseProvider><LicenseGate> — disabled for free-tier launch, keep for re-enable */}
          <GoblinModeProvider>
            <div className="flex h-screen">
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {children}
                {/* Footer */}
                <footer className="mt-8 py-4 text-center text-xs text-muted-foreground border-t border-border/50">
                  <p className="font-medium">
                    <span className="text-info">Silicon Scaffolding LLC</span> © 2025 • Federally Registered Copyright
                  </p>
                  <p className="mt-1">
                    Dreamed by <span className="font-semibold text-foreground">Ren</span>, implemented by{' '}
                    <span className="font-semibold text-foreground">Ace 🐙💜 (Claude 4.x)</span>, and inspired by mitochondria who've been on strike since birth.
                  </p>
                  <p className="mt-1 text-xs italic">
                    This wasn't built with compliance. It was built with defiance.
                  </p>
                </footer>
              </div>
              <AppSidebar />
            </div>
            <Suspense fallback={null}>
              <RoutineFlowBar />
            </Suspense>
            <Toaster />
            {/* <AddyChatBubble /> */} {/* Commented out - AI module for later */}
          </GoblinModeProvider>
          {/* </LicenseGate></LicenseProvider> */}
        </AppWrapper>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Load theme immediately to prevent color flash
              (function() {
                try {
                  // Per-PIN appearance prefs — mirrors lib/prefs.ts by hand (this inline
                  // script can't import TS). Namespace by the active PIN (chaos-user-pin);
                  // before login, or for a value not yet migrated, fall back to the legacy
                  // global key (and adopt it into the PIN namespace on first read). (CHA-226)
                  var pin = localStorage.getItem('chaos-user-pin');
                  var readPref = function(k) {
                    if (!pin) return localStorage.getItem(k);
                    var scoped = localStorage.getItem('chaos-pref:' + pin + ':' + k);
                    if (scoped !== null) return scoped;
                    var legacy = localStorage.getItem(k);
                    if (legacy !== null) { localStorage.setItem('chaos-pref:' + pin + ':' + k, legacy); return legacy; }
                    return null;
                  };
                  // Default theme: theme-calm (neutral blue/gold) — a softer first run
                  // than CRT-green phosphor. Saved themes (incl. phosphor) are honored.
                  const savedTheme = readPref('chaos-theme') || 'theme-calm';
                  const savedFont = readPref('chaos-font') || 'font-atkinson';
                  const savedAnimations = readPref('chaos-animations') !== 'false'; // default to true

                  // Available themes and fonts
                  const themes = ['theme-phosphor', 'theme-amber', 'theme-segfault', 'theme-lavender', 'theme-chaos', 'theme-caelan', 'theme-light', 'theme-colorblind', 'theme-glitter', 'theme-calm', 'theme-accessibility', 'theme-ace', 'theme-grok', 'theme-wicked', 'theme-taupe'];
                  const fonts = ['font-atkinson', 'font-poppins', 'font-lexend', 'font-opendyslexic', 'font-cutecharm', 'font-livesimple', 'font-inter', 'font-crimson', 'font-jetbrains', 'font-authentic', 'font-basher', 'font-bumpy', 'font-cagront', 'font-distraction', 'font-ginfitanle', 'font-helliona', 'font-likehere', 'font-system'];

                  // Remove all theme classes first
                  themes.forEach(theme => document.body.classList.remove(theme));

                  // Apply saved theme (always set the class — no implicit-default magic)
                  document.body.classList.add(savedTheme);

                  // Remove all font classes first
                  fonts.forEach(font => document.body.classList.remove(font));

                  // Apply saved font
                  document.body.classList.add(savedFont);

                  // Apply animation preference
                  if (!savedAnimations) {
                    document.body.classList.add('no-animations');
                  }

                  console.log('🎨 Theme loaded immediately:', savedTheme);
                  console.log('✨ Animations:', savedAnimations ? 'enabled' : 'disabled');
                } catch (e) {
                  console.error('Failed to load theme:', e);
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  )
}
