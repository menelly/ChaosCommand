/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * platform.ts — Detect whether we're running on a mobile platform so pages
 * with heavy/unsupported features (e.g. 64MB ONNX NER model) can gate their UI.
 *
 * Strategy: Android user-agent OR (narrow viewport AND no hover capability).
 * The second half catches iOS builds and catches devs who resize their browser.
 * Runs client-side only to avoid hydration mismatches — see useIsMobilePlatform.
 */

"use client"

import { useEffect, useState } from "react"

/**
 * Synchronous check. Safe to call from anywhere, but returns `false` during
 * SSR and the first render. Use `useIsMobilePlatform` in React components to
 * avoid hydration warnings.
 */
export function isMobilePlatform(): boolean {
  if (typeof window === "undefined") return false
  const android = /android/i.test(window.navigator.userAgent)
  const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
  const narrow = window.innerWidth < 768
  const touchOnly =
    typeof window.matchMedia === "function"
      ? !window.matchMedia("(hover: hover)").matches
      : false
  return android || ios || (narrow && touchOnly)
}

/**
 * React hook. Always returns `false` on the server and the first client
 * render, then flips to the real value after mount. Safe for conditional
 * rendering without hydration mismatches.
 */
export function useIsMobilePlatform(): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(isMobilePlatform())
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])
  return isMobile
}

/**
 * Phone-only check (stricter than isMobilePlatform): mobile UA AND narrow
 * viewport. Tablets (mobile UA, wider viewport) return false — use this
 * for features that want to allow tablet + desktop but block phone
 * because tap targets are too cramped.
 *
 * Threshold: 768px. Anything narrower is treated as phone.
 */
export function isPhoneOnly(): boolean {
  if (typeof window === "undefined") return false
  const mobileUA = /android|iphone|ipad|ipod/i.test(window.navigator.userAgent)
  const ipadLike = /ipad/i.test(window.navigator.userAgent)
  if (ipadLike) return false // iPad is tablet
  const narrow = window.innerWidth < 768
  return mobileUA && narrow
}

/** React hook form of `isPhoneOnly`. SSR-safe. */
export function useIsPhoneOnly(): boolean {
  const [phone, setPhone] = useState(false)
  useEffect(() => {
    const check = () => setPhone(isPhoneOnly())
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])
  return phone
}
