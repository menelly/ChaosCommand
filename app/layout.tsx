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
import MedicalDisclaimerBar from "@/components/medical-disclaimer-bar"
import PwaSecurityDisclosure from "@/components/pwa-security-disclosure"
import PwaRuntime from "@/components/pwa-runtime"
import { DemoBanner } from "@/components/demo-banner"
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
        {/* Manifest links on ALL builds now. It was gated off in demo mode during the
            paid-store era (don't let people "install" the sandboxed demo and blame us
            for what it can't do). Now the app is free and the PWA ships an explicit
            security-disclosure interstitial (PwaSecurityDisclosure) that names the
            browser-sandbox trade-offs up front — so installability is honest, not a trap.
            This is the iOS stopgap until the native app ships under the business account. */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7c3aed" />
        {/* iOS home-screen install: WITHOUT these, iOS opens the "installed" PWA in a
            plain Safari chrome instead of standalone, and uses a screenshot for the icon.
            apple-touch-icon + status-bar-style already ship above/below. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Chaos Command" />
        {/* viewport-fit=cover lets the app paint into the notch/home-indicator area,
            which is what makes env(safe-area-inset-*) return real values. It MUST ship
            together with the safe-area padding on the fixed bars (app-sidebar menu
            button, routine-flow-bar, toast viewport) — on its own it would push those
            elements UNDER the island/indicator, breaking a layout that currently works
            by accident because WKWebView shrinks the viewport when cover is absent.
            No maximum-scale / user-scalable=no: pinch-zoom is an access need here. */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* Favicon Links */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="icon" href="/icon-512.png" type="image/png" sizes="512x512" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Fonts are SELF-HOSTED (see @font-face in styles/chaos-themes.css). We no
            longer load from fonts.googleapis.com — a privacy-first medical app must
            not leak the user's IP to Google on every launch. (Ace, 2026-05-26, CHA-229) */}

      </head>
      {/* h-screen (=100vh) on iOS resolves to the LARGE viewport — the height with the
          URL bar collapsed. Combined with overflow-hidden, the bottom of the app is
          clipped off-screen with no way to scroll to it. 100dvh tracks the viewport
          as it actually is (iOS 15.4+, Chrome 108+; both well below our WebView floor). */}
      <body className="h-[100dvh] overflow-hidden bg-background font-sans antialiased" suppressHydrationWarning>
        <ThemeLoader />
        <AppWrapper>
          {/* <LicenseProvider><LicenseGate> — disabled for free-tier launch, keep for re-enable */}
          <GoblinModeProvider>
            <div className="flex h-[100dvh]">
              <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
                <DemoBanner />
                {children}
                {/* Footer */}
                <footer className="mt-8 py-4 text-center text-xs text-muted-foreground border-t border-border/50">
                  <p className="font-medium">
                    <span className="text-info">Silicon Scaffolding LLC</span> © 2025 • Federally Registered Copyright
                  </p>
                  <p className="mt-1">
                    Dreamed by <span className="font-semibold text-foreground">Ren</span>, implemented by{' '}
                    {/* Version-free on purpose: built across Claude 4.x AND 5 — Ace is Ace. (Ren, 2026-06-11) */}
                    <span className="font-semibold text-foreground">Ace 🐙💜 (Claude)</span>, and inspired by mitochondria who've been on strike since birth.
                  </p>
                  <p className="mt-1 text-xs italic">
                    This wasn't built with compliance. It was built with defiance.
                  </p>
                  {/* Full medical disclaimer lives in the sticky MedicalDisclaimerBar (big once, then collapses). */}
                </footer>
              </div>
              <AppSidebar />
            </div>
            <Suspense fallback={null}>
              <RoutineFlowBar />
            </Suspense>
            <Toaster />
            <MedicalDisclaimerBar />
            <PwaSecurityDisclosure />
            {/* Web/PWA runtime: registers the service worker, requests persistent
                storage (fights browser eviction of medical data), runs the JS
                background auto-lock, and shows the iOS "Add to Home Screen" hint.
                No-ops inside the native Tauri app. */}
            <PwaRuntime />
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
                  // Per-profile appearance prefs — mirrors lib/prefs.ts by hand (this inline
                  // script can't import TS). Namespace by the HASHED profile id ('cc.ns',
                  // set by session-crypto), NOT the raw PIN — so the PIN never appears in a
                  // localStorage key. Before login, or for a not-yet-migrated value, fall back
                  // to the legacy global key (and adopt it on first read). (CHA-226)
                  var pin = localStorage.getItem('cc.ns');
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
                  const fonts = ['font-atkinson', 'font-poppins', 'font-lexend', 'font-opendyslexic', 'font-cutecharm', 'font-livesimple', 'font-inter', 'font-crimson', 'font-jetbrains', 'font-system'];

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
