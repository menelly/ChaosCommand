/*
 * Color conversion + contrast helpers.  (Ace, 2026-05-24)
 *
 * The "customize my colors" picker speaks HEX (native <input type="color">), but
 * the shadcn theme tokens speak HSL triples ("H S% L%", consumed as
 * `hsl(var(--token))`). So we convert both ways: hex → triple to WRITE a custom
 * color into a token, and triple → hex to SEED the picker from the base theme's
 * current value (read off getComputedStyle).
 *
 * Also a WCAG contrast ratio so the picker can warn (softly — never block) when
 * someone's about to make, say, white text on a white card.
 */

/** "#rrggbb" or "#rgb" → {r,g,b} 0–255. Returns null if unparseable. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const l = (max + min) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/** Hex → shadcn token triple, e.g. "#ff8000" → "30 100% 50%". null if bad input. */
export function hexToHslTriple(hex: string): string | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b)
  return `${h} ${s}% ${l}%`
}

/** shadcn token triple → "#rrggbb", to seed a color input from the base theme.
 *  Accepts "H S% L%" (the only valid token form). null if unparseable. */
export function hslTripleToHex(triple: string): string | null {
  const m = triple.trim().match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/)
  if (!m) return null
  const h = ((parseFloat(m[1]) % 360) + 360) % 360
  const s = Math.min(100, Math.max(0, parseFloat(m[2]))) / 100
  const l = Math.min(100, Math.max(0, parseFloat(m[3]))) / 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const mm = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else { r = c; b = x }

  const toHex = (v: number) => Math.round((v + mm) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** WCAG relative luminance of an sRGB hex color (0–1). */
function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const chan = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * chan(rgb.r) + 0.7152 * chan(rgb.g) + 0.0722 * chan(rgb.b)
}

/** WCAG contrast ratio between two hex colors (1–21). null if either is bad. */
export function contrastRatio(hexA: string, hexB: string): number | null {
  const la = relativeLuminance(hexA)
  const lb = relativeLuminance(hexB)
  if (la === null || lb === null) return null
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
}

/** Read the live value of a shadcn token off <body> as a hex string, to seed a
 *  picker from whatever the current (base) theme paints. Browser-only. */
export function readTokenHex(tokenVar: string): string | null {
  if (typeof window === 'undefined') return null
  const triple = getComputedStyle(document.body).getPropertyValue(tokenVar).trim()
  return triple ? hslTripleToHex(triple) : null
}
