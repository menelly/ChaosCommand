/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude Opus 5.5)
 *
 * ☎️ crisis-contact.ts — turn a crisis number into something you can TAP.
 *
 * Why this file exists (CHA-771, found by Ren 2026-10-29): the 988 card in the
 * Safety Plan showed "📞 988" as text you could look at but not press. In a bad
 * moment, "look at a number and dial it yourself" is one step too many. Every
 * number in the crisis area goes through here so they all behave the same:
 *   • phone numbers  → tel:  (opens the dialer on a phone)
 *   • "Text X to N"  → sms:  (opens the messages app with X already typed)
 *
 * Pure functions only, no React, no Tauri, no "@/" imports, so the golden suite
 * (lib/services/safety-plan.golden.test.ts) can run them with plain node.
 */

/** 🧪 Poison Help, US. Verified against America's Poison Centers (poisoncenters.org,
 * fetched 2026-10-30 07:00 UTC): "Poison emergency? Call 1-800-222-1222 or visit
 * PoisonHelp.org" · "expert advice, 24/7/365 at no cost". The HRSA page
 * (poisonhelp.hrsa.gov) answered 403 to a script, so it was NOT the source checked.
 * If you change this, re-check it at the source; don't type it from memory. (CHA-770) */
export const POISON_HELP = {
  display: '1-800-222-1222',
  tel: '+18002221222',
  website: 'https://poisonhelp.org',
  verifiedAt: '2026-10-30',
  verifiedFrom: 'https://poisoncenters.org/',
} as const

/** Keep a leading + (international numbers) and the digits. Everything else is decoration. */
export function phoneDigits(phone: string | undefined | null): string {
  if (!phone) return ''
  const trimmed = String(phone).trim()
  const digits = trimmed.replace(/\D/g, '')
  return trimmed.startsWith('+') && digits ? `+${digits}` : digits
}

/** tel: link, or '' when there is no number to call (so callers can render plain text). */
export function telHref(phone: string | undefined | null): string {
  const d = phoneDigits(phone)
  return d ? `tel:${d}` : ''
}

/** sms: link with an optional pre-typed message (RFC 5724 `?body=`). */
export function smsHref(number: string | undefined | null, body?: string): string {
  const d = phoneDigits(number)
  if (!d) return ''
  return body ? `sms:${d}?body=${encodeURIComponent(body)}` : `sms:${d}`
}

/** "Text HOME to 741741" → { keyword: 'HOME', number: '741741' }.
 *  "Text 838255" (no keyword, e.g. the Veterans Crisis Line) → { keyword: '', number: '838255' }.
 *  null if it isn't either shape. */
export function parseTextInstruction(text: string | undefined | null): { keyword: string; number: string } | null {
  if (!text) return null
  const m = /text\s+(\S+)\s+to\s+([+\d][\d\s().-]*\d)/i.exec(text)
  if (m) {
    const number = phoneDigits(m[2])
    return number ? { keyword: m[1], number } : null
  }
  // 💬 bare "Text 838255": just open the messages app to that number, nothing pre-typed
  const bare = /^\s*text\s+([+\d][\d\s().-]*\d)\s*$/i.exec(text)
  if (!bare) return null
  const number = phoneDigits(bare[1])
  return number ? { keyword: '', number } : null
}
