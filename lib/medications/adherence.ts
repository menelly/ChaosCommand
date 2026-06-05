/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04  (CHA-272)
 *
 * Medication adherence as a REAL tracker. The daily "taken today" checklist
 * (Maintain → Medications) writes a durable per-day record into daily_data here,
 * in ADDITION to the lightweight localStorage pref that drives the instant UI.
 *
 * Why daily_data and not just the pref: a pref is a phone-only glance. A real
 * record SYNCS across devices, flows into the PDF a prescriber reads, and powers
 * History + Analytics + the Patterns correlation engine. That's the difference
 * between "did I take it this week" and "I've skipped Abilify 9 times since
 * February and my function tracked it." One record per date (saveData upserts
 * on [date+category+subcategory]); each record snapshots which meds were
 * EXPECTED that day so "missed" stays computable even if the med list changes.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

export const ADHERENCE_SUBCATEGORY = "medication-adherence"

export interface AdherenceExpectedMed {
  id: string
  name: string
  dose?: string
}

export interface AdherenceRecord {
  date: string
  expected: AdherenceExpectedMed[]
  taken: Record<string, string> // medId -> ISO timestamp ("" if no time)
}

/** Parse a daily_data record's content into an AdherenceRecord (tolerant of
 *  string- or object-shaped content). Returns null if it isn't adherence data. */
export function parseAdherence(content: any): AdherenceRecord | null {
  try {
    const c = typeof content === "string" ? JSON.parse(content) : content
    if (!c || typeof c !== "object") return null
    if (!Array.isArray(c.expected) || typeof c.taken !== "object") return null
    return { date: c.date, expected: c.expected, taken: c.taken || {} }
  } catch {
    return null
  }
}

export interface MedAdherenceSummary {
  id: string
  name: string
  expectedDays: number
  takenDays: number
  missedDates: string[]
  rate: number // 0..1 over logged days where this med was expected
}

/** Roll a set of adherence records up into per-med stats. Only counts days the
 *  med was actually EXPECTED (so adding a med later doesn't retroactively ding
 *  it), and only days the user actually logged (a never-opened day is unknown,
 *  not a miss). */
export function summarizeAdherence(records: AdherenceRecord[]): {
  perMed: MedAdherenceSummary[]
  overallRate: number
  loggedDays: number
} {
  const byMed = new Map<string, MedAdherenceSummary>()
  let expectedTotal = 0
  let takenTotal = 0
  const loggedDates = new Set<string>()

  for (const rec of records) {
    loggedDates.add(rec.date)
    for (const med of rec.expected) {
      let s = byMed.get(med.id)
      if (!s) {
        s = { id: med.id, name: med.name, expectedDays: 0, takenDays: 0, missedDates: [], rate: 0 }
        byMed.set(med.id, s)
      }
      s.name = med.name // keep latest known name
      s.expectedDays++
      expectedTotal++
      if (med.id in rec.taken) {
        s.takenDays++
        takenTotal++
      } else {
        s.missedDates.push(rec.date)
      }
    }
  }

  const perMed = [...byMed.values()].map(s => ({ ...s, rate: s.expectedDays ? s.takenDays / s.expectedDays : 0 }))
  perMed.sort((a, b) => a.rate - b.rate) // worst adherence first — that's the clinically interesting end
  return {
    perMed,
    overallRate: expectedTotal ? takenTotal / expectedTotal : 0,
    loggedDays: loggedDates.size,
  }
}
