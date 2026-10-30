/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude Opus 5.5)
 *
 * 📐 mcp-entry-shape.ts — "copy the shape of an existing entry", enforced in CODE.
 *
 * CHA-772 (found 2026-10-29): head-pain episodes added through the MCP showed "🌈 /10"
 * in Episode History. Compared field by field (2026-10-30):
 *   • app-made entry:  { painIntensity: <number>, functionalImpact, treatmentEffectiveness, ... }
 *   • MCP-made entry:  no painIntensity at all, and no other level field either.
 * So it wasn't a renamed field or a string-vs-number. The MCP entries simply had no level
 * (the conversation didn't give one, and an AI must never invent a number about someone's body), the MCP saved
 * them anyway, and the chip printed `${undefined}/10`.
 *
 * The rule this file enforces, learned from the tracker's OWN app-made entries:
 *   a field that is a NUMBER in (nearly) every app-made entry is the kind of thing a page
 *   renders as "N/10". A new entry must either give it as a number, or say null on
 *   purpose ("not recorded"). Missing = refused, with a sentence saying what to do.
 *   A number sent as a string ("7") is refused too, so views never do math on text.
 *
 * Pure: no "@/" imports, so the golden suite runs it with node.
 */

/** A field counts as "always a number" when at least this share of app-made entries have it as one. */
export const NUMERIC_FIELD_THRESHOLD = 0.8

const isAiEntry = (e: any) => e && typeof e === 'object' && e.source === 'ai-mcp'
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v)

/** Number fields the app itself always fills in for this tracker. Learned from data, not hard-coded. */
export function expectedNumericFields(existing: any[]): string[] {
  const appMade = existing.filter(e => e && typeof e === 'object' && !isAiEntry(e))
  if (appMade.length === 0) return []
  const counts = new Map<string, number>()
  for (const e of appMade) {
    for (const [k, v] of Object.entries(e)) {
      if (isNum(v)) counts.set(k, (counts.get(k) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n / appMade.length >= NUMERIC_FIELD_THRESHOLD)
    .map(([k]) => k)
    .filter(k => !['id', 'createdAt', 'updatedAt', 'timestamp'].includes(k))
    .sort()
}

/** Plain-English problems with a new entry; empty means it matches the tracker's shape. */
export function checkEntryShape(entry: Record<string, any>, existing: any[]): string[] {
  const problems: string[] = []
  for (const field of expectedNumericFields(existing)) {
    if (!(field in entry)) {
      problems.push(
        `"${field}" is missing. Every entry the app made in this tracker has it as a number. ` +
        `Add it if the user told you the number; if they didn't, send "${field}": null so it shows as "not recorded". Never guess a number.`,
      )
    } else if (entry[field] !== null && !isNum(entry[field])) {
      problems.push(`"${field}" must be a number (like ${field}: 4) or null, not ${JSON.stringify(entry[field])}.`)
    }
  }
  return problems
}
