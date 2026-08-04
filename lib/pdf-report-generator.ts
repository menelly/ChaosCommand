/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * Client-side PDF Report Generator — ported from Flask/ReportLab to jsPDF.
 * "Your data, your words, their language."
 */

import jsPDF from 'jspdf'
import { getPersonalization, resolvedPronouns } from '@/lib/personalization'
// Patterns engines — static imports (the old runtime require() inside a try/catch
// could fail silently in a client bundle and the whole patterns section vanished).
import {
  analyzeAllPatterns, computeSymptomTrends, computeTreatmentResponses,
  type SymptomTrend,
} from '@/lib/pattern-engine'
import { analyzeV2Patterns } from '@/lib/pattern-engine-v2'
// Shared analytics engine — the SAME module the in-app tracker panels call,
// so the report and the app cannot report different numbers for one week.
import { collectEntries, computeTrackerAnalytics, trackerKeyOf } from '@/lib/tracker-analytics'
import { analyticsConfigFor } from '@/lib/tracker-analytics-config'
// Seizure episode-type canon (single source of truth) so the report collapses
// the slug ("focal-aware") and the legacy human label ("Focal Aware (Simple
// Partial)") into ONE row instead of fragmenting — a case mergeVariants can't
// catch because they're different WORDS, not just different casing.
import { EPISODE_TYPES, LEGACY_TYPE_MAP } from '@/app/seizure/seizure-constants'

/**
 * Repair unit strings that were split by OCR / PDF text-extraction whitespace
 * (e.g. "mg/d L" -> "mg/dL", "m mol/L" -> "mmol/L"). Applied to both lab
 * values and reference ranges so the rendered report reads cleanly.
 */
function normalizeUnits(s: string): string {
  if (!s) return s
  return String(s)
    .replace(/(mg|mcg|ug|ng|pg|g|kg)\/d\s+L\b/gi, '$1/dL')
    .replace(/\bm\s+mol\/L\b/gi, 'mmol/L')
    .replace(/\bU\s*\/\s*L\b/g, 'U/L')
    .replace(/\bmEq\s*\/\s*L\b/gi, 'mEq/L')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Pluralize a count without the "1 entries" bug: plural(1,'entry','entries')
 *  -> "1 entry", plural(3,'episode') -> "3 episodes". Pass the irregular plural
 *  explicitly; otherwise it appends "s". */
function plural(n: number, singular: string, pluralForm?: string): string {
  return `${n} ${n === 1 ? singular : (pluralForm ?? `${singular}s`)}`
}

/**
 * Merge case / slug / whitespace variants of the same tally value so they don't
 * fragment into separate rows ("Sharp" + "sharp" -> one row of 6; "worse with
 * movement" + "Worse with movement"; "large-meals" + "Large meals"). Keys are
 * compared case-insensitively with hyphens/underscores treated as spaces; the
 * DISPLAY form is the most common original spelling, so we fix the dedup without
 * flattening natural casing (e.g. "Large meals" stays sentence-case, not
 * Title-Cased). Returns [display, count] sorted by count desc.
 *
 * Note: this collapses case/slug variants, NOT semantic synonyms — a slug and a
 * fully different human label of the same concept (e.g. "focal-aware" vs "Focal
 * Aware (Simple Partial)") still need a per-tracker canonical map upstream.
 */
function mergeVariants(obj: Record<string, number>): [string, number][] {
  const counts: Record<string, number> = {}
  const forms: Record<string, Record<string, number>> = {}
  for (const [raw, n] of Object.entries(obj)) {
    const s = String(raw ?? '').trim()
    if (!s) continue
    const key = s.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')
    counts[key] = (counts[key] || 0) + n
    if (!forms[key]) forms[key] = {}
    forms[key][s] = (forms[key][s] || 0) + n
  }
  return Object.keys(counts)
    .map(key => [Object.entries(forms[key]).sort((a, b) => b[1] - a[1])[0][0], counts[key]] as [string, number])
    .sort((a, b) => b[1] - a[1])
}

// Seizure episode-type id -> display name, from the canonical constants.
const SEIZURE_TYPE_NAME: Record<string, string> = Object.fromEntries(EPISODE_TYPES.map(t => [t.id, t.name]))
/** Canonicalize a seizure episode-type value to one display name, whether it
 *  arrives as the new slug ("focal-aware"), a legacy human label ("Focal Aware
 *  (Simple Partial)"), or something unknown (passed through). Stops the
 *  slug-vs-label fragmentation in the seizure episode-type table. */
function canonicalSeizureType(raw: string): string {
  const s = String(raw ?? '').trim()
  if (!s) return s
  const id = LEGACY_TYPE_MAP[s] || s
  return SEIZURE_TYPE_NAME[id] || s
}

/** Collapse an accidentally-doubled unit in a value string ("5 mg/dL mg/dL" ->
 *  "5 mg/dL", "31 mm/hr mm/hr" -> "31 mm/hr"). Timeline lab descriptions were
 *  built from value_text (which already carried the unit) with the unit appended
 *  AGAIN. This is defensive render-time cleanup so timeline events ALREADY saved
 *  with the doubled unit read correctly; the import path that builds them should
 *  also be fixed at source (follow-up). Only collapses repeated UNIT-like tokens
 *  (slash-units or a known unit set) so ordinary repeated words are untouched. */
function collapseDoubledUnits(s: string): string {
  if (!s) return s
  return String(s).replace(
    /\b([A-Za-z]+(?:\/[A-Za-z%]+)+|mg|mcg|ug|ng|pg|kg|g|mL|dL|L|IU|SI|mmHg|bpm|mEq|%)\s+\1\b/g,
    '$1'
  )
}

/** Replace glyphs the PDF's core font (WinAnsi/CP1252) can't render — they came
 *  out as garbage ("≥" → "*e", "→" → "!'"). Covers the math/arrow symbols that
 *  show up in engine-generated text (trend arrows, ≥ thresholds). Latin-1 / CP1252
 *  symbols (×, °, ±, –, —, •) render fine and are left alone. */
function asciiGlyphs(s: string): string {
  if (!s) return s
  return String(s)
    .replace(/≥/g, '>=').replace(/≤/g, '<=')
    .replace(/→/g, ' to ').replace(/←/g, ' <- ')
    .replace(/↑/g, ' up ').replace(/↓/g, ' down ')
    .replace(/≈/g, '~').replace(/≠/g, '!=')
    .replace(/ {2,}/g, ' ') // collapse the double space the " to " arrow-swap can leave
}

// Standard dosing abbreviations — uppercased to clinical convention (AM, BID,
// PRN) so a mixed-case "pm" / "Pm" / "bid" schedule column reads consistently.
const SCHEDULE_ABBR = new Set(['am', 'pm', 'bid', 'tid', 'qid', 'qd', 'qhs', 'prn', 'qam', 'qpm', 'ac', 'pc', 'hs', 'qod', 'qwk'])
function formatSchedule(t: string): string {
  const s = String(t ?? '').trim()
  if (!s) return ''
  return s.split(/\s+/).map(tok => SCHEDULE_ABBR.has(tok.toLowerCase()) ? tok.toUpperCase() : tok).join(' ')
}

/**
 * 95% confidence interval for a Pearson correlation r, via the Fisher
 * z-transformation: z = atanh(r), SE = 1/sqrt(n-3), back-transform with tanh.
 * Needs n > 3 (the PDF only computes correlations at n >= 5). r is clamped just
 * shy of ±1 so a perfect correlation doesn't send atanh to infinity.
 *
 * Why this matters on a doctor report: a CI that straddles 0 says "this
 * correlation is not statistically distinguishable from no relationship at this
 * sample size" — exactly what a clinician needs to not over-read an r=0.5 built
 * on six days. Verified against textbook values (r=0.5,n=20 → [0.07, 0.77]).
 */
function pearsonCI95(r: number, n: number): [number, number] {
  if (n <= 3) return [r, r]
  const rc = Math.max(-0.999999, Math.min(0.999999, r))
  const z = Math.atanh(rc)
  const se = 1 / Math.sqrt(n - 3)
  return [Math.tanh(z - 1.96 * se), Math.tanh(z + 1.96 * se)]
}

/**
 * Render a single lab value without duplicating the unit. If `value_text`
 * already contains a unit (i.e. has any letter / % / / character after the
 * number), trust it and skip appending `unit`. Otherwise append the unit.
 */
function formatLabValue(r: { value_text?: string; unit?: string }): string {
  const value = normalizeUnits(r.value_text || '')
  const unit = normalizeUnits(r.unit || '')
  if (!value) return unit
  if (!unit) return value
  const valueHasUnit = /[a-zA-Z%/]/.test(value)
  if (valueHasUnit) {
    // Edge case: value_text is JUST the unit text repeated. Trust value_text.
    return value
  }
  return `${value} ${unit}`
}

// NO AUTO ICD-10 CODES. (Removed 2026-07-06 per Ren — the whole category→ICD map is gone.)
//
// A category→ICD map is structurally incapable of being right: ICD-10 codes are DIAGNOSES a
// clinician assigns by integrating findings, but this map assigned them from "which tracker did
// you tap." That failed three ways AT ONCE — over-assigned (celiac from an apple allergy,
// "noncompliance" from tracking that you TAKE your meds), mis-specified (E11.9 Type 2 diabetes for
// any diabetes-tracker user, incl. Type 1s; asthma/epilepsy/migraine minted the same way), and
// MISSED the patient's real diagnoses (lupus / anti-synthetase / MCTD) that categories can't know.
// Worst of all it failed SILENTLY and AUTHORITATIVELY — a wrong code in a doctor/legal report reads
// as clinical fact and can follow a patient through their records.
//
// The honest replacement already exists: the per-system descriptive assessments (e.g. the
// Autoimmune / Connective-Tissue section) report what was actually TRACKED and suggest appropriate
// WORKUPS, without asserting a diagnosis. Real ICD codes, when we add them, will come from a
// USER-ENTERED diagnosis list (CHA-241) — sourced from the patient's record, never guessed.

// Display names — fixes the "head-pain" → "Head" truncation bug
const TRACKER_DISPLAY_NAMES: Record<string, string> = {
  'pain': 'Pain',
  'head-pain': 'Head Pain',
  'dysautonomia': 'Dysautonomia',
  // Added 2026-08-04. ⚠️ MISSING ENTRIES HERE CAUSE **TWO** BUGS, NOT ONE.
  // canonicalSub() collapses per-entry keys by matching against the KEYS of this
  // map, so a tracker that is absent gets neither a display name nor its
  // suffixes collapsed — it prints raw, once per entry. A real report showed
  // "Selfcare Selfcare 1780414637719" as a symptom row, and the autoimmune
  // tracker — the most clinically important line in the table — rendered
  // lowercase like a variable name.
  'autoimmune': 'Autoimmune / Connective Tissue',
  'neuro': 'Neuro / Neuromuscular',
  'selfcare': 'Self-Care',
  'crisis': 'Crisis Support',
  'pulse-oximetry': 'Pulse Oximetry',
  'environmental-allergens': 'Environmental Allergens',
  'hope-reminders': 'Hope Reminders',
  'seizure': 'Seizure',
  'brain-fog': 'Brain Fog',
  'upper-digestive': 'Upper Digestive',
  'bathroom': 'Bathroom',
  'anxiety': 'Anxiety',
  'anxiety-tracker': 'Anxiety',
  'mental-health': 'Mind & Mood',
  'sleep': 'Sleep',
  'energy': 'Energy',
  'sensory': 'Sensory',
  'sensory-tracker': 'Sensory',
  'reproductive-health': 'Reproductive Health',
  'diabetes': 'Diabetes',
  'food-choice': 'Food Choice',
  'gu': 'GU',
  'ent': 'ENT',
  'postpartum': 'Postpartum & Newborn',
  'lines-tubes': 'Lines & Tubes',
  'medication-adherence': 'Medication Adherence',
  'thyroid': 'Thyroid',
  'adrenal': 'Adrenal',
  'cardiac': 'Cardiac',
  'vitals': 'Vitals',
  'respiratory': 'Respiratory',
  'skin': 'Skin',
  'joint': 'Joint / MSK',
  'substance': 'Substance',
  'food-allergens': 'Food Reactions / Allergens',
  'self-care': 'Self-Care',
  'self-care-tracker': 'Self-Care',
  'movement': 'Movement',
  'hydration': 'Hydration',
  'crisis-support': 'Crisis Support',
  'coping': 'Coping',
  'weather': 'Weather / Environment',
  'weather-environment': 'Weather / Environment',
  'medications': 'Medications',
  'main': 'Journal',
  'daily-prompts': 'Daily Prompts',
}

const displayName = (sub: string): string => {
  if (TRACKER_DISPLAY_NAMES[sub]) return TRACKER_DISPLAY_NAMES[sub]
  // Fallback: prettify the slug WITHOUT splitting on hyphen (the v1 bug)
  // and strip duplicate-word artifacts like "Hydration Hydration" â†’ "Hydration"
  const dedup = sub.replace(/^(\w+(?:[-\s]\w+)*)\s+\1$/i, '$1')
  return dedup.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Known canonical tracker slugs, longest-first. Trackers like hydration save each
// entry under a UNIQUE per-entry subcategory (e.g. "hydration-hydration-1716..."),
// which spawned a separate "Hydration Hydration" row per entry. Collapsing back to the
// base key ("hydration") makes them aggregate into one row. Longest-match-first protects
// multi-word slugs like "head-pain" from being shortened to "head" (the v1 bug).
const KNOWN_TRACKER_KEYS = Array.from(
  new Set(Object.keys(TRACKER_DISPLAY_NAMES))
).sort((a, b) => b.length - a.length)

/**
 * "(single entry - not yet a pattern)" and friends.
 *
 * ⚠️ WHY THIS EXISTS. The trend sections of this report are scrupulous about
 * sample size - they print p-values, mark series preliminary, and refuse to
 * state a direction they cannot support. The per-system assessment sections
 * were written earlier and simply ASSERT: "1 entry. Mean anxiety 3.0/10."
 *
 * A mean of one number is that number wearing a lab coat. Presenting it in the
 * same document, in the same voice, as figures that carry confidence intervals
 * quietly tells the reader that all of these numbers are the same kind of
 * thing. They are not, and the report should not imply it.
 *
 * Returns '' above the floor so well-populated sections read normally.
 */
const nCaveat = (n: number): string => {
  if (n <= 0) return ''
  if (n === 1) return ' Based on a single entry - a data point, not yet a pattern.'
  if (n < 4) return ` Based on ${n} entries - too few to describe a pattern; read as provisional.`
  return ''
}

const canonicalSub = (sub: string): string => {
  const s = (sub || '').toLowerCase()
  for (const key of KNOWN_TRACKER_KEYS) {
    if (s === key || s.startsWith(key + '-')) return key
  }
  return sub
}

// Colors
const COLORS = {
  title: '#1a1a2e',
  subtitle: '#666666',
  section: '#2c3e50',
  subsection: '#34495e',
  body: '#333333',
  note: '#888888',
  finding: '#c0392b',
  purple: '#8e44ad',
  tableHeader: '#2c3e50',
  painHeader: '#e74c3c',
  workHeader: '#c0392b',
  correlationHeader: '#8e44ad',
  gridLine: '#cccccc',
  altRow: '#f8f9fa',
  hr: '#cccccc',
}

interface ReportData {
  demographics?: any
  providerName?: string
  specialty?: string
  audience?: string
  reportStyle?: string
  dateRange?: { start: string; end: string }
  trackerData?: any[]
  labResults?: any[]
  journalEntries?: any[]
  timelineEvents?: any[]
  healthData?: any[]
  includePatterns?: boolean
  /** Latest Patterns-page analysis snapshot (db.pattern_snapshots), passed by the
   *  caller. When present, the PDF renders THESE engine results — the exact
   *  insights the user generated and saw in-app — instead of re-deriving.
   *  Fresh engine runs are the fallback when no snapshot exists. */
  patternSnapshot?: { runAt: string; v1?: any; v2?: any }
  workData?: { missedWork?: any[]; employment?: any[]; applications?: any[] } | null
  medications?: any[]
  appointments?: any[]
  /** Custom (Forge/Built) trackers the user defined themselves. definitions =
   *  CustomTracker[] ({id, name, description, category, fields[]}); entries =
   *  [{date, content:{trackerId, trackerName, values:{fieldId:value}, savedAt}}].
   *  Built-in sections can't cover these, so without this block a custom
   *  tracker's data is silently absent from the record. */
  customTrackers?: { definitions: any[]; entries: any[] }
  /** If set, the exported PDF is encrypted with this password (real PDF
   *  encryption) so the file isn't plaintext PHI at rest in Downloads. */
  encryptionPassword?: string
}

// Helper class that tracks Y position and handles page breaks
class PDFWriter {
  doc: jsPDF
  y: number
  pageWidth: number
  marginLeft: number
  marginRight: number
  marginTop: number
  marginBottom: number
  contentWidth: number

  constructor(doc: jsPDF) {
    this.doc = doc
    this.y = 50
    this.pageWidth = doc.internal.pageSize.getWidth()
    this.marginLeft = 40
    this.marginRight = 40
    this.marginTop = 50
    this.marginBottom = 40
    this.contentWidth = this.pageWidth - this.marginLeft - this.marginRight
  }

  checkPage(needed: number = 30) {
    const pageHeight = this.doc.internal.pageSize.getHeight()
    if (this.y + needed > pageHeight - this.marginBottom) {
      this.doc.addPage()
      this.y = this.marginTop
    }
  }

  title(text: string) {
    this.checkPage(40)
    this.doc.setFontSize(18)
    this.doc.setTextColor(COLORS.title)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(text, this.pageWidth / 2, this.y, { align: 'center' })
    this.y += 10
  }

  subtitle(text: string) {
    this.checkPage(20)
    this.doc.setFontSize(9)
    this.doc.setTextColor(COLORS.subtitle)
    this.doc.setFont('helvetica', 'normal')
    const lines = this.doc.splitTextToSize(text, this.contentWidth)
    this.doc.text(lines, this.pageWidth / 2, this.y, { align: 'center' })
    this.y += lines.length * 11 + 6 // 9pt text needs ~11pt line height (was 5 â†’ squampy/overlap)
  }

  hr() {
    this.doc.setDrawColor(COLORS.hr)
    this.doc.setLineWidth(0.5)
    this.doc.line(this.marginLeft, this.y, this.pageWidth - this.marginRight, this.y)
    this.y += 6
  }

  sectionHeader(text: string) {
    this.checkPage(35)
    this.y += 12 // more breathing room above section headers
    this.doc.setFontSize(14)
    this.doc.setTextColor(COLORS.section)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(text, this.marginLeft, this.y)
    this.y += 5
    // Purple accent line (short, colored) + hairline rest of width for elegance
    this.doc.setDrawColor(COLORS.purple)
    this.doc.setLineWidth(1.2)
    this.doc.line(this.marginLeft, this.y, this.marginLeft + 36, this.y)
    this.doc.setDrawColor(COLORS.gridLine)
    this.doc.setLineWidth(0.3)
    this.doc.line(this.marginLeft + 38, this.y, this.pageWidth - this.marginRight, this.y)
    this.y += 10
  }

  subSection(text: string) {
    this.checkPage(22)
    this.y += 6
    this.doc.setFontSize(10.5)
    this.doc.setTextColor(COLORS.subsection)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(text.toUpperCase(), this.marginLeft, this.y)
    // Letter-spacing approximation: jsPDF doesn't have it directly, so we just use
    // uppercase + bold to distinguish from h2 and body
    this.y += 8
  }

  body(text: string) {
    text = asciiGlyphs(text)
    this.checkPage(15)
    this.doc.setFontSize(9)
    this.doc.setTextColor(COLORS.body)
    this.doc.setFont('helvetica', 'normal')
    const lines = this.doc.splitTextToSize(text, this.contentWidth - 10)
    this.doc.text(lines, this.marginLeft + 5, this.y)
    this.y += lines.length * 11 + 4 // 9pt text needs ~11pt line height (was 5 â†’ lines overlapped)
  }

  bulletBody(label: string, value: string) {
    label = asciiGlyphs(label); value = asciiGlyphs(value)
    // Indented bullet with bold label + body-color value, wraps gracefully.
    this.checkPage(15)
    const bulletX = this.marginLeft + 5
    const labelX = this.marginLeft + 11
    this.doc.setFontSize(9)
    // Purple bullet
    this.doc.setTextColor(COLORS.purple)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('•', bulletX, this.y)
    // Bold label
    this.doc.setTextColor(COLORS.section)
    this.doc.setFont('helvetica', 'bold')
    const labelText = `${label}:`
    this.doc.text(labelText, labelX, this.y)
    const labelWidth = this.doc.getTextWidth(labelText)
    // Body-color value
    this.doc.setTextColor(COLORS.body)
    this.doc.setFont('helvetica', 'normal')
    const valueX = labelX + labelWidth + 3
    const valueWidth = this.contentWidth - (valueX - this.marginLeft) - 5
    const lines = this.doc.splitTextToSize(value, valueWidth)
    this.doc.text(lines, valueX, this.y)
    // Hanging indent for subsequent lines (if value wraps)
    if (lines.length > 1) {
      // Re-render with proper hanging indent — first line at valueX, rest at labelX
      // Actually jsPDF rendered them all starting at valueX. For multi-line values,
      // we accept that wraps continue from the same x. Acceptable.
    }
    this.y += Math.max(1, lines.length) * 11 + 3 // 9pt line height (was 5 â†’ bullet list crammed/overlapped)
  }

  finding(text: string) {
    text = asciiGlyphs(text)
    this.checkPage(15)
    this.doc.setFontSize(9)
    this.doc.setTextColor(COLORS.finding)
    this.doc.setFont('helvetica', 'normal')
    const lines = this.doc.splitTextToSize(text, this.contentWidth - 20)
    this.doc.text(lines, this.marginLeft + 15, this.y)
    this.y += lines.length * 11 + 3 // 9pt line height (was 4.5 â†’ wrapped findings overlapped the next block)
  }

  note(text: string) {
    text = asciiGlyphs(text)
    this.checkPage(12)
    this.doc.setFontSize(7)
    this.doc.setTextColor(COLORS.note)
    this.doc.setFont('helvetica', 'italic')
    const lines = this.doc.splitTextToSize(text, this.contentWidth)
    this.doc.text(lines, this.marginLeft, this.y)
    this.y += lines.length * 9 + 3 // 7pt note needs ~9pt line height (was 3.5)
  }

  spacer(h: number = 6) {
    this.y += h
  }

  table(headers: string[], rows: string[][], colWidths: number[], headerColor: string = COLORS.tableHeader) {
    const rowHeight = 16
    const totalNeeded = (rows.length + 1) * rowHeight + 4
    this.checkPage(Math.min(totalNeeded, rowHeight * 4)) // At least header + 3 rows

    const x0 = this.marginLeft
    let y0 = this.y

    // Header row
    this.doc.setFillColor(headerColor)
    this.doc.rect(x0, y0, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F')
    this.doc.setFontSize(8)
    this.doc.setTextColor('#ffffff')
    this.doc.setFont('helvetica', 'bold')

    let cx = x0
    headers.forEach((h, i) => {
      this.doc.text(h, cx + 4, y0 + 10)
      cx += colWidths[i]
    })
    y0 += rowHeight

    // Data rows. Cells WRAP to multiple lines and the row grows to fit, instead
    // of taking only the first line that fits (which clipped multi-code ICD
    // cells mid-string, leaving a dangling comma — "…arrhythmia,"). Capped at 4
    // lines with a clean ellipsis so a pathological cell can't blow up a row.
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(COLORS.body)
    this.doc.setFontSize(8)
    const lineH = 10
    const maxLines = 4

    rows.forEach((row, ri) => {
      // Wrap each cell first so we know how tall this row needs to be.
      const wrapped = row.map((cell, ci) => {
        const maxWidth = colWidths[ci] - 8
        const lines: string[] = this.doc.splitTextToSize(asciiGlyphs(String(cell ?? '')), maxWidth)
        if (lines.length > maxLines) {
          lines.length = maxLines
          lines[maxLines - 1] = (lines[maxLines - 1] || '').replace(/[\s,;/]*\S*$/, '').trim() + '…'
        }
        return lines
      })
      const cellLines = Math.max(1, ...wrapped.map(l => l.length))
      const h = Math.max(rowHeight, cellLines * lineH + 6)

      // Page break check (account for the wrapped height)
      if (y0 + h > this.doc.internal.pageSize.getHeight() - this.marginBottom) {
        this.doc.addPage()
        y0 = this.marginTop
      }

      // Alternating background
      if (ri % 2 === 1) {
        this.doc.setFillColor(COLORS.altRow)
        this.doc.rect(x0, y0, colWidths.reduce((a, b) => a + b, 0), h, 'F')
      }

      cx = x0
      wrapped.forEach((lines, ci) => {
        this.doc.text(lines, cx + 4, y0 + 10, { lineHeightFactor: lineH / 8 })
        cx += colWidths[ci]
      })

      // Grid lines (verticals sized to the wrapped row height)
      this.doc.setDrawColor(COLORS.gridLine)
      this.doc.setLineWidth(0.3)
      cx = x0
      for (let i = 0; i <= colWidths.length; i++) {
        this.doc.line(cx, y0, cx, y0 + h)
        cx += colWidths[i] || 0
      }
      this.doc.line(x0, y0 + h, x0 + colWidths.reduce((a, b) => a + b, 0), y0 + h)

      y0 += h
    })

    this.y = y0 + 14 // breathing room so the next line never collides with the table's bottom border
  }
}

export function generateMedicalReport(data: ReportData): Blob {
  // Optional real PDF encryption — when a password is supplied the file is
  // encrypted at rest, so exported PHI isn't plaintext in the Downloads folder.
  const pw = (data.encryptionPassword || '').trim()
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
    ...(pw ? { encryption: { userPassword: pw, ownerPassword: pw, userPermissions: ['print', 'copy'] } } : {}),
  })
  const w = new PDFWriter(doc)
  const isDoctor = data.reportStyle === 'doctor'
  // Attorney/SSDI audience: lead with functional impact, medical evidence
  // follows. Reviewers (lawyers, ALJs, claims examiners) decide "can this
  // person work?" first and use medical detail to support that finding —
  // doctor audience is the inverse, medical first.
  const isAttorney = data.audience === 'attorney'
  const trackerData = data.trackerData || []
  const labResults = data.labResults || []

  // === UNIFIED PATTERN SOURCE (Ren's design, 2026-06-11) ===
  // Priority: (1) the user's latest Patterns-page snapshot — the exact insights
  // they generated and have been calibrating against in-app; (2) fresh engine
  // runs over this export's tracker data. The PDF no longer re-derives its own
  // patterns or its own Pearson: the Patterns engine is the single source of
  // truth, so the document a doctor reads always agrees with the app the
  // patient shows them. (Replaces the inline Pearson loop and the v2-only
  // require() — which could fail silently and drop the whole section.)
  let _patterns: { v1: any; v2: any; provenance: string } | null | undefined
  const getPatterns = () => {
    if (_patterns !== undefined) return _patterns
    if (!data.includePatterns) { _patterns = null; return _patterns }
    const snap = data.patternSnapshot
    if (snap && (snap.v1 || snap.v2)) {
      const when = snap.runAt ? new Date(snap.runAt).toLocaleDateString() : 'a prior session'
      _patterns = {
        v1: snap.v1 || null,
        v2: snap.v2 || null,
        provenance: `Patterns as analyzed in-app on ${when} (Patterns page run).`,
      }
      return _patterns
    }
    try {
      const grouped: Record<string, any[]> = {}
      for (const r of trackerData) {
        if (!r.subcategory) continue
        if (!grouped[r.subcategory]) grouped[r.subcategory] = []
        grouped[r.subcategory].push(r)
      }
      _patterns = {
        v1: analyzeAllPatterns(grouped as any),
        v2: analyzeV2Patterns(grouped as any, 90),
        provenance: 'Patterns computed at export time from the data included in this report.',
      }
    } catch {
      _patterns = null // engines failed — sections simply skip, never crash the export
    }
    return _patterns
  }

  // Normalizer for the many storage shapes across trackers. Some save
  // `{ entries: [...] }`, some a bare array, some a single per-day record object,
  // and several use a PER-ENTRY subcategory (e.g. `sensory-<id>`, `crisis-<id>`)
  // with the entry JSON-stringified into content. This collects a flat list of
  // entry objects for any subcategory predicate, so a section never has to care
  // about the shape — which is exactly the class of bug (guessing the shape) that
  // dropped this data in v1. (CHA-246, 2026-05-30.)
  const gatherEntries = (match: (sub: string) => boolean): any[] => {
    const out: any[] = []
    for (const r of trackerData) {
      if (!match(r.subcategory || '')) continue
      let content: any = r.content
      if (typeof content === 'string') { try { content = JSON.parse(content) } catch { continue } }
      if (content == null) continue
      if (Array.isArray(content)) { for (const e of content) if (e) out.push({ ...e, _date: r.date }) }
      else if (Array.isArray(content.entries)) { for (const e of content.entries) if (e) out.push({ ...e, _date: r.date }) }
      else { out.push({ ...content, _date: r.date }) }
    }
    return out
  }
  const tn = (obj: Record<string, number>, n = 6) =>
    mergeVariants(obj).slice(0, n).map(([k, v]) => `${k} (${v}×)`).join(', ')
  const meanOf = (a: number[]) => a.length ? (a.reduce((x, y) => x + y, 0) / a.length) : 0

  // === HEADER ===
  w.title('Patient Health Report')

  const demo = data.demographics || {}
  // Personalization (CHA-261): falls back to the user's chosen name when there's
  // no clinical demographic name, and adds pronouns to the header when opted in.
  const pz = (() => { try { return getPersonalization() } catch { return null } })()
  const patientName = demo.legalName || demo.preferredName || pz?.name || 'Patient'
  const dob = demo.dateOfBirth || ''
  const dateRange = data.dateRange || { start: '?', end: '?' }

  const subtitleParts: string[] = []
  if (patientName) subtitleParts.push(`Patient: ${patientName}`)
  if (pz?.pronounsInExports) subtitleParts.push(`Pronouns: ${resolvedPronouns(pz).label}`)
  if (dob) subtitleParts.push(`DOB: ${dob}`)
  if (data.providerName) subtitleParts.push(`Prepared for: ${data.providerName}`)
  subtitleParts.push(`Period: ${dateRange.start} to ${dateRange.end}`)
  subtitleParts.push(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`)

  w.subtitle(subtitleParts.join(' | '))
  w.hr()
  w.spacer(6)

  // === EXECUTIVE SUMMARY ===
  const uniqueDates = new Set(trackerData.map(r => r.date).filter(Boolean))
  const trackerTypes = new Set(trackerData.map(r => (r.subcategory || '').split('-')[0]))

  // === SYMPTOM TRAJECTORIES — resolved before the summary so the summary can
  // LEAD with findings instead of volume. Reported by a user (2026-08-02):
  // nothing in the document was geared to show whether anything was improving,
  // and improvements being logged into the app never reached the report.
  //
  // ⚠️ The snapshot path is deliberately NOT trusted for this. A snapshot taken
  // before the per-symptom engine existed has no `symptomTrends` at all, and a
  // report generated from one would silently print nothing — the exact failure
  // being fixed. When the snapshot predates the field, recompute from the
  // export's own data rather than showing an empty section.
  const getSymptomTrends = (): SymptomTrend[] => {
    const p = getPatterns()
    const fromSnapshot = p?.v1?.symptomTrends
    if (Array.isArray(fromSnapshot) && fromSnapshot.length) return fromSnapshot
    try {
      const grouped: Record<string, any[]> = {}
      for (const r of trackerData) {
        if (!r.subcategory) continue
        if (!grouped[r.subcategory]) grouped[r.subcategory] = []
        grouped[r.subcategory].push(r)
      }
      return computeSymptomTrends(grouped as any)
    } catch {
      return []
    }
  }

  // Per-symptom series only. The whole-tracker series is an average OF these, so
  // listing both would report the same movement twice under two names.
  const allTrends = getSymptomTrends().filter(t => t.symptomId)
  const improving = allTrends.filter(t => t.direction === 'improving')
    .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
  const worsening = allTrends.filter(t => t.direction === 'worsening')
    .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
  const flat = allTrends.filter(t => t.direction === 'no-clear-direction')

  w.sectionHeader('Executive Summary')
  // Findings first, volume second. The previous version opened with "N days of
  // tracked health data across M symptom categories" — which describes the
  // effort, not the result, and reads to a reviewer as "nothing changed".
  let summaryText = ''
  if (improving.length || worsening.length) {
    const parts: string[] = []
    if (improving.length) parts.push(`${plural(improving.length, 'symptom')} improving`)
    if (worsening.length) parts.push(`${plural(worsening.length, 'symptom')} worsening`)
    if (flat.length) parts.push(`${flat.length} with no clear direction`)
    summaryText += `Direction of change over the reporting period: ${parts.join(', ')}. `
    if (improving.length) {
      const top = improving.slice(0, 3).map(t =>
        `${t.symptomLabel.toLowerCase()} (${t.earlyAvg.toFixed(1)} → ${t.lateAvg.toFixed(1)})`
      )
      summaryText += `Largest improvements: ${top.join('; ')}. `
    }
    if (worsening.length) {
      const top = worsening.slice(0, 3).map(t =>
        `${t.symptomLabel.toLowerCase()} (${t.earlyAvg.toFixed(1)} → ${t.lateAvg.toFixed(1)})`
      )
      summaryText += `Largest deteriorations: ${top.join('; ')}. `
    }
  }
  summaryText += `Based on ${uniqueDates.size} days of tracked health data across ${trackerTypes.size} symptom categories. `
  if (labResults.length) summaryText += `${labResults.length} laboratory result set(s) included. `
  w.body(summaryText)

  // The section a prior-authorization reviewer reads. It exists because a
  // report that cannot demonstrate benefit cannot defend the therapy that
  // produced it — and for a patient whose problem is being disbelieved and
  // under-treated, that is the difference between continued treatment and not.
  if (allTrends.length) {
    w.sectionHeader('Direction of Change')
    w.note(
      'Each symptom is tracked as its own series. Early-period average vs recent-period ' +
      'average, with a Mann-Kendall rank test for consistency. Series with few entries are ' +
      'marked preliminary and should be read as provisional, not dismissed.'
    )

    // Point change, not percent (a bounded ordinal scale cannot support a
    // ratio), and the DATE WINDOW — without it a reader cannot tell whether
    // this moved over six weeks or six months, which changes what it means.
    const trendRows = (list: SymptomTrend[]) => list.map(t => [
      t.trackerLabel,
      t.symptomLabel,
      `${t.earlyAvg.toFixed(1)} to ${t.lateAvg.toFixed(1)}`,
      `${t.absoluteChange > 0 ? '+' : ''}${t.absoluteChange.toFixed(1)}`,
      `${t.firstDate} to ${t.lastDate}`,
      String(t.n),
      t.preliminary ? 'preliminary' : t.strength,
    ])
    const HEADERS = ['System', 'Symptom', 'Early to recent', 'Change', 'Over', 'n', 'Support']
    const WIDTHS = [66, 104, 62, 40, 96, 24, 48]

    if (improving.length) {
      w.subSection(`Improving (${improving.length})`)
      w.table(HEADERS, trendRows(improving), WIDTHS)
    }
    if (worsening.length) {
      w.subSection(`Worsening (${worsening.length})`)
      w.table(HEADERS, trendRows(worsening), WIDTHS)
    }
    if (flat.length) {
      // Printed on purpose. Omitting them would leave a silence a reader cannot
      // distinguish from "not measured", and those are different facts.
      w.subSection(`No clear direction (${flat.length})`)
      w.body(
        'These were analysed and showed no consistent movement in either direction. ' +
        'They are listed so that stability is recorded as a finding rather than as an absence: ' +
        flat.map(t => `${t.symptomLabel} (${t.trackerLabel}, n=${t.n})`).join('; ') + '.'
      )
    }
  }

  // === TRACKER OVERVIEW ===
  //
  // ⚠️ THIS SECTION EXISTS SO THE REPORT AND THE APP CANNOT DISAGREE.
  //
  // Until now the tracker panels, the pattern engine and this document each
  // derived their own figures. Three consumers, three answers, and no way for
  // a reader to tell which one was wrong — a patient pointing at their phone
  // and a clinician reading this page could legitimately be looking at
  // different numbers for the same week, which is precisely the situation that
  // makes a doctor stop trusting patient-collected data.
  //
  // Every number below comes from lib/tracker-analytics.ts, the same module
  // the in-app panels call, so they are the same figures by construction
  // rather than by two implementations happening to agree.
  //
  // Trackers whose sample is too small to support a direction print "—" rather
  // than a guess. An absent claim is honest; a confident wrong one in a
  // document that informs treatment decisions is not.
  ;(() => {
    const keys = Array.from(
      new Set(trackerData.map(r => trackerKeyOf(r.subcategory)).filter(Boolean)),
    ).sort()
    if (!keys.length) return

    const rows: string[][] = []
    for (const key of keys) {
      const entries = collectEntries(trackerData as any, key)
      if (entries.length < 3) continue
      const a = computeTrackerAnalytics(entries, analyticsConfigFor(key))

      const dirWord = (d: string | null) =>
        d === 'improving' ? 'Improving' : d === 'worsening' ? 'Worsening' : d === 'stable' ? 'Steady' : '—'

      // Frequency direction is phrased in plain words. "Worsening" applied to a
      // rate reads as severity to a clinician skimming a table.
      const freqWord =
        a.frequencyTrend.direction === 'worsening'
          ? 'More often'
          : a.frequencyTrend.direction === 'improving'
            ? 'Less often'
            : a.frequencyTrend.direction === 'stable'
              ? 'Same'
              : '—'

      // ⚠️ SKIP ROWS THAT SAY NOTHING. A tracker with no measure and no
      // direction contributes a line of dashes, and half a dozen of those in a
      // clinical document is noise a reader has to wade through to find the
      // findings. Volume is not evidence.
      const saysSomething =
        a.severityMean !== null || a.trend.direction || a.frequencyTrend.direction
      if (!saysSomething) continue

      // ⚠️ UNITS, BECAUSE THE COLUMN IS NOT ALWAYS A SEVERITY. Hydration
      // records volume and sleep records hours; printing "6.8" under a heading
      // that implies a 0-10 symptom scale misrepresents it to a clinician
      // skimming the table. Where the tracker declares a unit, it is shown.
      const unit = a.unit ? ` ${a.unit}` : ''

      rows.push([
        TRACKER_DISPLAY_NAMES[key] || key,
        String(a.entries),
        a.ratePerWeek === null ? '—' : `${a.ratePerWeek.toFixed(1)}/wk`,
        a.severityMean === null ? '—' : `${a.severityMean.toFixed(1)}${unit}`,
        a.severityPeak === null ? '—' : `${a.severityPeak}${unit}`,
        dirWord(a.trend.direction),
        freqWord,
      ])
    }

    if (!rows.length) return

    w.sectionHeader('Tracker Overview')
    w.body(
      'Every tracker with enough entries to say something, over the reporting period. ' +
      'Direction compares the earlier half of the period against the later half. ' +
      'Where a tracker had too few entries to support a direction, a dash is shown ' +
      'rather than an estimate. These figures are the same ones displayed in the app.',
    )
    // "Trend", not "Severity" — the column holds a DIRECTION, and for trackers
    // measuring hours slept or fluid intake it is not a severity at all.
    w.table(
      ['Tracker', 'Entries', 'Rate', 'Average', 'Peak', 'Trend', 'Frequency'],
      rows,
      [120, 50, 55, 55, 50, 65, 60],
    )
    w.body(
      'Frequency counts logged entries. A change in how often something is recorded ' +
      'can reflect a change in tracking habits as well as a change in the condition.',
    )
  })()

  // === TREATMENT RESPONSE ===
  // Symptom trajectories aligned to the date each medication was started. This
  // is the section a prior-authorization reviewer reads: "improved over the
  // period" is a weak claim, "improved since drug X began on date Y" is the one
  // that supports continuing therapy.
  const treatmentResponses = (() => {
    try {
      const grouped: Record<string, any[]> = {}
      for (const r of trackerData) {
        if (!r.subcategory) continue
        if (!grouped[r.subcategory]) grouped[r.subcategory] = []
        grouped[r.subcategory].push(r)
      }
      // `data.medications` directly, not the `medications` local — that is
      // declared further down with the Medications section, and this block runs
      // near the top of the report on purpose.
      return computeTreatmentResponses(grouped as any, (data.medications || []) as any)
    } catch {
      return []
    }
  })()

  if (treatmentResponses.length) {
    // ⚠️ TIMELINE, NOT ATTRIBUTION — and the section is titled and worded so
    // that survives skimming. The previous version had a "Medication" column
    // and a "Direction: IMPROVED" column, which reads as "this drug did this"
    // no matter what the caveat underneath says.
    //
    // Raised by a user reading their own generated report (2026-08-02): a
    // slow-acting drug was being credited with an improvement it could not yet
    // have caused, while its well-known side effects went unmentioned.
    //
    // The asymmetry is the proof of the error. Some treatments take months to
    // act, so a change weeks in is almost certainly something else started at
    // the same time — and a report that assigns benefits while ignoring harms
    // is not describing the data, it is arguing.
    w.sectionHeader('Symptom Change Around Treatment Changes')
    w.note(
      'A TIMELINE, NOT AN ATTRIBUTION. Symptom severity before vs after the date treatments ' +
      'were started, compared with a Wilcoxon rank-sum test. Treatments begun within 30 days ' +
      'of each other are grouped, because this data cannot separate them. Nothing here ' +
      'identifies WHICH treatment produced a change, and onset times differ widely — a drug ' +
      'that takes weeks to act cannot explain a change that happened in days. Disease ' +
      'activity also varies on its own. Clinical judgement required.'
    )
    w.table(
      ['Treatments started', 'From', 'Symptom', 'Before', 'After', 'Change'],
      treatmentResponses.slice(0, 20).map(t => [
        t.medications.join(', '),
        t.startedOn === t.windowEnd ? t.startedOn : `${t.startedOn}–${t.windowEnd}`,
        `${t.symptomLabel} (${t.trackerLabel})`,
        `${t.beforeAvg.toFixed(1)} (n=${t.beforeN})`,
        `${t.sinceAvg.toFixed(1)} (n=${t.sinceN})`,
        `${t.sinceAvg > t.beforeAvg ? '+' : ''}${(t.sinceAvg - t.beforeAvg).toFixed(1)} pts`,
      ]),
      [96, 62, 92, 52, 52, 46]
    )
    const strong = treatmentResponses.filter(t => t.pValue < 0.05)
    if (strong.length) {
      w.subSection('Changes least likely to be chance')
      for (const t of strong.slice(0, 6)) w.body(t.summary)
    }
    if (treatmentResponses.length > 20) {
      w.note(`(${treatmentResponses.length - 20} further symptom/window comparisons omitted for length.)`)
    }
  }

  // Functional impact / work-capacity section. Defined here so it can be
  // called either right after Executive Summary (attorney/SSDI audience —
  // functional first) or at the end of the report (doctor/personal —
  // medical first, work last).
  const renderWorkSection = () => {
    const workData = data.workData
    if (!workData) return

    w.sectionHeader(isDoctor ? 'Functional Impact & Work Capacity' : 'Work & Disability')

    const missed = workData.missedWork || []
    if (missed.length) {
      const total = missed.length
      const severe = missed.filter(m => m.impactLevel === 'severe' || m.couldNotDoAnythingElse).length
      const fullDays = missed.filter(m => m.duration === 'full').length

      w.subSection(isDoctor ? 'Occupational Impact Assessment' : 'Missed Work Days')

      if (isDoctor) {
        w.body(
          `Total documented missed work days: ${total}. Full days missed: ${fullDays}. ` +
          (total > 0 ? `Days with severe functional limitation: ${severe} (${(severe / total * 100).toFixed(0)}% of missed days).` : '')
        )
      } else {
        w.body(`Missed ${total} work days total (${fullDays} full days), ${severe} of which were severe.`)
      }

      const rows = missed.slice(0, 30).map(m => {
        const impact = m.impactLevel || m.severity || ''
        const unable = m.couldNotDoAnythingElse ? ' (completely unable)' : ''
        const duration = m.duration || ''
        const hours = m.hoursMissed
        const durText = duration + (hours ? ` (${hours}h)` : '')
        let reasonText = m.reason || ''
        if (m.notes && m.notes !== m.reason) {
          reasonText += reasonText ? ` — ${m.notes}` : m.notes
        }
        return [m.date || '', `${impact}${unable}`, m.workType || m.type || '', durText, reasonText]
      })

      if (rows.length) {
        w.table(['Date', 'Impact', 'Type', 'Duration', 'Reason / Notes'], rows, [55, 70, 55, 55, 185], COLORS.workHeader)
      }
    }

    const employment = workData.employment || []
    if (employment.length) {
      w.subSection('Employment History')
      for (const emp of employment) {
        const employer = emp.employer || emp.company || ''
        const title = emp.jobTitle || emp.title || emp.position || ''
        const start = emp.dateStarted || emp.startDate || ''
        const end = emp.active ? 'Present' : (emp.dateEnded || emp.endDate || '')
        w.body(`${employer} — ${title} (${start} to ${end})`)

        if (emp.jobDuties) w.body(`  Job duties: ${emp.jobDuties}`)

        const accReq = emp.accommodationsRequested
        if (accReq?.details) {
          const dateNote = accReq.date ? ` (${accReq.date})` : ''
          w.body(`  Accommodations requested${dateNote}: ${accReq.details}`)
        }

        const accRec = emp.accommodationsReceived
        if (accRec?.details) {
          const dateNote = accRec.date ? ` (${accRec.date})` : ''
          w.body(`  Accommodations received${dateNote}: ${accRec.details}`)
        } else if (accReq?.details) {
          w.finding('  Accommodations received: None documented')
        }

        if (emp.symptomsExacerbated) w.finding(`  Symptoms exacerbated by role: ${emp.symptomsExacerbated}`)
        if (emp.reflections) w.body(`  Notes: ${emp.reflections}`)
        w.spacer(3)
      }
    }

    const applications = workData.applications || []
    if (applications.length) {
      w.subSection(isDoctor ? 'Disability Application History' : 'Disability Applications')
      for (const app of applications) {
        const appType = app.applicationType || app.type || ''
        const status = app.status || ''
        const agency = app.agency || ''
        const filed = app.dateSubmitted || app.dateFiled || ''
        const caseNum = app.caseNumber || ''

        let line = appType
        if (agency) line += ` (${agency})`
        line += `: ${status}`
        if (filed) line += ` — filed ${filed}`
        if (caseNum) line += ` — Case #${caseNum}`
        w.body(line)

        if (app.notes) w.body(`  Notes: ${app.notes}`)
        if (app.nextSteps) w.body(`  Next steps: ${app.nextSteps}`)
        if (app.appealDeadline) w.finding(`  Appeal deadline: ${app.appealDeadline}`)
      }
    }

    w.spacer(6)
  }

  // Attorney/SSDI: functional limits lead, before any medical detail.
  if (isAttorney) {
    renderWorkSection()
  }

  // === TRACKED CONDITIONS (ICD-10 for doctor mode) ===
  // Fix: keep FULL subcategory (don't split on hyphen — that turned head-pain → "Head")
  // Fix v0.4.9: collapse duplicate tracker rows by display name so "hydration",
  // "Hydration", and "Hydration Hydration" all merge into one "Hydration" row.
  const trackerCounts: Record<string, number> = {}
  const trackerDayCounts: Record<string, Set<string>> = {}

  for (const r of trackerData) {
    const sub = canonicalSub(r.subcategory || '')   // collapse per-entry suffixes to the base tracker
    if (!sub) continue
    const display = displayName(sub)
    trackerCounts[display] = (trackerCounts[display] || 0) + 1
    if (!trackerDayCounts[display]) trackerDayCounts[display] = new Set()
    if (r.date) trackerDayCounts[display].add(r.date)
  }

  if (isDoctor) {
    // No ICD-10 column: we do NOT guess diagnosis codes from tracker categories (that minted wrong
    // codes AND missed the patient's real dx). This table reports what was TRACKED — frequency and
    // recency — and the per-system assessments below carry the clinical detail + suggested workups.
    w.sectionHeader('Tracked Symptoms')
    const sorted = mergeVariants(trackerCounts)
    const rows = sorted.map(([display, count]) => [
      display,
      String(trackerDayCounts[display]?.size || 0),
      String(count),
    ])
    w.table(['Symptom / Tracker', 'Days', 'Entries'], rows, [230, 80, 80])
    w.note('This lists what was tracked and how often — not diagnoses. Detailed per-system findings and suggested work-ups follow below.')
    w.spacer(6)
  } else {
    w.sectionHeader('What Was Tracked')
    const sorted = mergeVariants(trackerCounts)
    for (const [display, count] of sorted) {
      w.bulletBody(display, `${plural(count, 'entry', 'entries')}`)
    }
  }

  // === MEDICATIONS (current + discontinued regimen) — all audiences ===
  // SSDI/attorney AND doctor both need this: a maintained med regimen is
  // treatment-compliance evidence, and current meds are foundational clinical
  // context. From the MANAGE section (per Ren, 2026-05-30, CHA-246).
  const medications = data.medications || []
  if (medications.length) {
    w.sectionHeader('Medications & Supplements')
    const isStopped = (m: any) => m.active === false || !!m.dateStopped
    // CHA-307: supplements/OTC are tracked first-class so this list is COMPLETE
    // — a clinician/pharmacist reviewing for interactions needs to see the
    // non-prescribed items (5-HTP, St. John's Wort, vitamin K, etc.) too.
    const isSupplementOrOtc = (m: any) => m.kind === 'supplement' || m.kind === 'otc'
    const active = medications.filter((m: any) => !isStopped(m))
    const stopped = medications.filter(isStopped)
    const nameOf = (m: any) => (m.brandName || m.genericName || 'Unnamed') + ((m.brandName && m.genericName) ? ` (${m.genericName})` : '')
    const activeRx = active.filter((m: any) => !isSupplementOrOtc(m))
    const activeSupp = active.filter(isSupplementOrOtc)
    if (activeRx.length) {
      w.subSection(`Current medications (${activeRx.length})`)
      const rows = activeRx.map((m: any) => [nameOf(m), m.dose || '', formatSchedule(m.time), m.conditionTreating || ''])
      w.table(['Medication', 'Dose', 'Schedule', 'Treating'], rows, [180, 70, 75, 115])
    }
    if (activeSupp.length) {
      w.subSection(`Supplements & OTC (${activeSupp.length})`)
      const rows = activeSupp.map((m: any) => [
        nameOf(m) + (m.kind === 'otc' ? ' [OTC]' : ''),
        m.dose || '', formatSchedule(m.time), m.conditionTreating || '',
      ])
      w.table(['Supplement / OTC', 'Dose', 'Schedule', 'For'], rows, [180, 70, 75, 115])
      w.body('Supplements & over-the-counter products are listed for completeness — they can interact with prescriptions. Please review the full list with a pharmacist or prescriber.')
    }
    if (active.length) {
      const withReminders = active.filter((m: any) => m.enableReminders && (m.reminderTimes || []).length).length
      if (withReminders > 0) w.body(`${withReminders} of ${active.length} current items have scheduled reminders set — adherence support in place.`)
    }
    const sideFx = active.filter((m: any) => m.persistentSideEffects)
    if (sideFx.length && isDoctor) {
      w.subSection('Persistent side effects reported')
      for (const m of sideFx) w.finding(`${nameOf(m)}: ${m.persistentSideEffects}`)
    }
    if (stopped.length && isDoctor) {
      w.subSection(`Discontinued (${stopped.length})`)
      for (const m of stopped.slice(0, 20)) {
        const reason = m.discontinuedReason ? ` — stopped: ${m.discontinuedReason}` : ''
        const when = m.dateStopped ? ` (${m.dateStopped})` : ''
        w.body(`${nameOf(m)}${m.dose ? ` — ${m.dose}` : ''}${when}${reason}`)
      }
    }
  }

  // === APPOINTMENT ATTENDANCE — all audiences (SSDI weighs care engagement) ===
  const appointments = data.appointments || []
  if (appointments.length) {
    w.sectionHeader('Appointment Attendance')
    const reviews = appointments.filter((a: any) => a._kind === 'review')
    const plans = appointments.filter((a: any) => a._kind === 'plan')
    const todayStr = new Date().toISOString().slice(0, 10)
    const pastPlans = plans.filter((p: any) => (p.appointmentDate || '') <= todayStr)
    const upcoming = plans.filter((p: any) => (p.appointmentDate || '') > todayStr)
    // The engagement claim is EARNED, not boilerplate. It used to print
    // unconditionally, which produced "0 appointments attended... documents
    // consistent engagement with medical care" — a sentence that argues against
    // itself in a document a disability reviewer reads for exactly that claim.
    // My previous gate was `reviews + pastPlans >= 3`, which still printed
    // "0 appointments attended and reviewed; 3 additional past appointments on
    // record... Documents consistent engagement with medical care." A sentence
    // that opens with zero and closes with "consistent engagement" refutes
    // itself in front of the exact reader it is meant to persuade. The claim
    // now needs ATTENDED-AND-REVIEWED visits specifically, and when it can't be
    // made the text simply reports what is there.
    let attendanceText =
      `${plural(reviews.length, 'appointment')} attended and reviewed; ` +
      `${plural(pastPlans.length, 'additional past appointment')} on record; ` +
      `${upcoming.length} upcoming.`
    if (reviews.length >= 3) {
      attendanceText += ' Documents consistent engagement with medical care.'
    } else if (reviews.length + pastPlans.length + upcoming.length > 0) {
      attendanceText += ' Appointment records in this period are incomplete; attendance detail was not logged for every visit.'
    }
    w.body(attendanceText)
    if (reviews.length) {
      w.subSection('Attended visits')
      const rows = reviews
        .slice()
        .sort((a: any, b: any) => String(b.appointmentDate || '').localeCompare(String(a.appointmentDate || '')))
        .slice(0, 30)
        .map((r: any) => [r.appointmentDate || '', r.providerName || '', r.followUpNeeded ? 'follow-up' : '', r.diagnosisMedChanges ? 'dx/med change' : ''])
      w.table(['Date', 'Provider', 'Follow-up', 'Outcome'], rows, [70, 160, 70, 100])
    }
    if (upcoming.length) {
      w.subSection('Upcoming')
      for (const p of upcoming.slice().sort((a: any, b: any) => String(a.appointmentDate || '').localeCompare(String(b.appointmentDate || ''))).slice(0, 15)) {
        w.body(`${p.appointmentDate || ''}${p.appointmentTime ? ` ${p.appointmentTime}` : ''} — ${p.providerName || ''}`)
      }
    }
  }

  // Symptom correlations render HERE — right under Tracked Conditions / Supporting
  // Evidence — so the Pearson table sits with the evidence it belongs to, instead
  // of trailing the whole report. (renderCorrelations is a hoisted fn declared below.)
  renderCorrelations()

  // === PAIN ASSESSMENT — rich for doctors ===
  const painEntries = trackerData.filter(r => r.subcategory === 'pain')
  if (painEntries.length) {
    w.sectionHeader(isDoctor ? 'Pain Assessment' : 'Pain Summary')
    const painLevels: number[] = []
    const weeklyPain: Record<string, number[]> = {}
    const locations: Record<string, number> = {}
    const characters: Record<string, number> = {}
    const patterns: Record<string, number> = {}
    const triggers: Record<string, number> = {}
    const treatmentEff: Record<string, number[]> = {}
    let tearingCount = 0, thunderclapCount = 0, cardaCount = 0
    let erCount = 0, emsCount = 0
    const flareDeltas: number[] = []
    const radiation: Record<string, number> = {}

    for (const r of painEntries) {
      const content = r.content || {}
      const entries = Array.isArray(content.entries) ? content.entries : []
      for (const e of entries) {
        if (e?.painLevel != null) {
          painLevels.push(Number(e.painLevel))
          const week = (r.date || '').substring(0, 7)
          if (!weeklyPain[week]) weeklyPain[week] = []
          weeklyPain[week].push(Number(e.painLevel))
        }
        ;(e.painLocations || e.painLocation || []).forEach((l: string) => { locations[l] = (locations[l] || 0) + 1 })
        ;(e.painCharacter || e.painType || []).forEach((c: string) => { characters[c] = (characters[c] || 0) + 1 })
        ;(e.painPattern || e.painQuality || []).forEach((p: string) => { patterns[p] = (patterns[p] || 0) + 1 })
        ;(e.triggers || e.painTriggers || []).forEach((t: string) => { triggers[t] = (triggers[t] || 0) + 1 })
        ;(e.radiatesTo || []).forEach((r: string) => { radiation[r] = (radiation[r] || 0) + 1 })
        if (typeof e.effectiveness === 'number') {
          ;(e.treatments || []).forEach((t: string) => {
            if (!treatmentEff[t]) treatmentEff[t] = []
            treatmentEff[t].push(e.effectiveness)
          })
          ;(e.medications || []).forEach((m: string) => {
            const key = `Rx: ${m}`
            if (!treatmentEff[key]) treatmentEff[key] = []
            treatmentEff[key].push(e.effectiveness)
          })
        }
        if (e.tearingQuality) tearingCount++
        if (e.thunderclapPattern) thunderclapCount++
        if (e.legWeakness && e.bowelBladderChanges) cardaCount++
        if (e.erVisitRequired) erCount++
        if (e.emergencyServicesCalled) emsCount++
        if (e.episodeType === 'chronic-flare' && typeof e.baselinePainLevel === 'number' && typeof e.painLevel === 'number') {
          flareDeltas.push(e.painLevel - e.baselinePainLevel)
        }
      }
    }

    if (painLevels.length) {
      const avg = painLevels.reduce((a, b) => a + b, 0) / painLevels.length
      const maxP = Math.max(...painLevels)
      const minP = Math.min(...painLevels)
      w.body(isDoctor
        ? `Mean pain severity: ${avg.toFixed(1)}/10 (range ${minP}-${maxP}, n=${plural(painLevels.length, 'entry', 'entries')})`
        : `Average pain level: ${avg.toFixed(1)}/10 (worst: ${maxP}, best: ${minP}, ${plural(painLevels.length, 'entry', 'entries')})`)
    }

    // Top locations / character / pattern (case/slug variants merged so
    // "Sharp" + "sharp" read as one)
    const topN = (obj: Record<string, number>, n = 6) =>
      mergeVariants(obj).slice(0, n).map(([k, v]) => `${k} (${v}×)`).join(', ')
    if (Object.keys(locations).length) w.body(`Top locations: ${topN(locations)}`)
    if (Object.keys(characters).length) w.body(`Pain character: ${topN(characters)}`)
    if (Object.keys(patterns).length) w.body(`Pain pattern: ${topN(patterns)}`)
    if (Object.keys(radiation).length) w.body(`Radiation pattern: ${topN(radiation)}`)
    if (Object.keys(triggers).length) w.body(`Top triggers: ${topN(triggers)}`)

    // Treatment effectiveness — only treatments used 2+ times
    const txRanked = Object.entries(treatmentEff)
      .filter(([, scores]) => scores.length >= 2)
      .map(([name, scores]) => ({
        name,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        n: scores.length,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8)
    if (txRanked.length && isDoctor) {
      w.spacer(2)
      w.subSection('Treatment effectiveness (2+ uses)')
      const rows = txRanked.map(t => [t.name, `${(t.avg).toFixed(1)}/10`, String(t.n)])
      w.table(['Treatment', 'Avg Effectiveness', 'Uses'], rows, [220, 100, 60], COLORS.painHeader)
    }

    // Red flag history — clinically significant
    const flagLines: string[] = []
    if (tearingCount > 0) flagLines.push(`Tearing-quality pain reported ${tearingCount}× — aortic dissection differential`)
    if (thunderclapCount > 0) flagLines.push(`Thunderclap onset reported ${thunderclapCount}× — SAH/RCVS differential`)
    if (cardaCount > 0) flagLines.push(`Cauda equina pattern (back + leg weakness + bowel/bladder) ${cardaCount}× — surgical-window emergency`)
    if (erCount > 0) flagLines.push(`ER visit required ${erCount}×`)
    if (emsCount > 0) flagLines.push(`EMS contacted ${emsCount}×`)
    if (flagLines.length && isDoctor) {
      w.spacer(2)
      w.subSection('Red flags from pain entries')
      for (const f of flagLines) w.finding(f)
    }

    // Chronic flare delta — Ren's idea, doctors care about this
    if (flareDeltas.length >= 2 && isDoctor) {
      const avgDelta = flareDeltas.reduce((a, b) => a + b, 0) / flareDeltas.length
      const extreme = flareDeltas.filter(d => d >= 6).length
      w.spacer(2)
      w.subSection('Chronic-pain flare delta from baseline')
      w.body(`${flareDeltas.length} flare events tracked with baseline reference. Average flare: +${avgDelta.toFixed(1)} above baseline. ${extreme} were "extreme" flares (+6 above baseline) — those are the days requiring multi-modal intervention.`)
    }

    // Monthly trend
    const weeks = Object.keys(weeklyPain).sort()
    if (weeks.length >= 2) {
      w.spacer(2)
      w.subSection('Pain trend by month')
      const rows = weeks.map(wk => {
        const vals = weeklyPain[wk]
        return [wk, (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1), String(vals.length)]
      })
      w.table(['Month', 'Avg Pain', 'Entries'], rows, [100, 80, 60], COLORS.painHeader)
    }
  }

  // === HEAD PAIN — multi-rescue + baseline-delta + aura ===
  const headPainEntries = trackerData.filter(r => r.subcategory === 'head-pain')
  if (headPainEntries.length && isDoctor) {
    w.sectionHeader('Head Pain Assessment')
    let total = 0, multiRescue = 0, withAura = 0, whol = 0, thunderclap = 0
    const intensities: number[] = []
    const flareDeltas: number[] = []
    const types: Record<string, number> = {}
    const triggers: Record<string, number> = {}
    const treatmentEff: Record<string, number[]> = {}
    for (const r of headPainEntries) {
      const entries = Array.isArray(r.content?.entries) ? r.content.entries : []
      for (const e of entries) {
        total++
        if (typeof e.painIntensity === 'number') intensities.push(e.painIntensity)
        if (e.rescueRedosed || (Array.isArray(e.rescueMedicationsTaken) && e.rescueMedicationsTaken.length >= 2)) multiRescue++
        if (e.auraPresent) withAura++
        if (e.worstHeadacheOfLife || e.episodeType === 'worst-of-life') whol++
        if (e.thunderclapOnset) thunderclap++
        if (e.episodeType) types[e.episodeType] = (types[e.episodeType] || 0) + 1
        ;(e.triggers || []).forEach((t: string) => { triggers[t] = (triggers[t] || 0) + 1 })
        if (typeof e.baselineHeadachePain === 'number' && typeof e.painIntensity === 'number') {
          flareDeltas.push(e.painIntensity - e.baselineHeadachePain)
        }
        if (typeof e.treatmentEffectiveness === 'number') {
          ;(e.treatments || []).forEach((t: string) => {
            if (!treatmentEff[t]) treatmentEff[t] = []
            treatmentEff[t].push(e.treatmentEffectiveness)
          })
        }
      }
    }
    if (intensities.length) {
      const avg = intensities.reduce((a, b) => a + b, 0) / intensities.length
      w.body(`${plural(total, 'episode')}. Mean intensity ${avg.toFixed(1)}/10. With aura: ${withAura} (${Math.round(withAura/total*100)}%).`)
    }
    if (whol > 0) w.finding(`"Worst headache of life" reported ${whol}× — SAH workup if not yet done.`)
    if (thunderclap > 0) w.finding(`Thunderclap onset reported ${thunderclap}× — SAH/RCVS differential.`)
    if (multiRescue > 0) w.body(`Multi-rescue migraine days (Nurtec + Imitrex etc.): ${multiRescue} — suggests acute regimen may be undertreated; preventive escalation discussion warranted.`)
    if (flareDeltas.length >= 2) {
      const avgD = flareDeltas.reduce((a, b) => a + b, 0) / flareDeltas.length
      const extreme = flareDeltas.filter(d => d >= 5).length
      w.body(`Baseline-delta tracking: average +${avgD.toFixed(1)} above patient's typical-headache-day baseline (n=${flareDeltas.length}). ${extreme} extreme flares (+5).`)
    }
    const typeRows = mergeVariants(types).map(([t, c]) => [t, String(c)])
    if (typeRows.length) {
      w.subSection('Episode type distribution')
      w.table(['Type', 'Count'], typeRows, [200, 60])
    }
    const trigEntries = mergeVariants(triggers).slice(0, 6)
    if (trigEntries.length) w.body(`Top triggers: ${trigEntries.map(([t, c]) => `${t} (${c}×)`).join(', ')}`)
    const txRanked = Object.entries(treatmentEff)
      .filter(([, s]) => s.length >= 2)
      .map(([name, s]) => ({ name, avg: s.reduce((a, b) => a + b, 0) / s.length, n: s.length }))
      .sort((a, b) => b.avg - a.avg).slice(0, 6)
    if (txRanked.length) {
      w.subSection('Treatment effectiveness (2+ uses)')
      w.table(['Treatment', 'Avg/10', 'Uses'], txRanked.map(t => [t.name, t.avg.toFixed(1), String(t.n)]), [240, 80, 60], COLORS.painHeader)
    }
  }

  // === SEIZURE — status epi, autonomic, rescue meds ===
  const seizureEntries = trackerData.filter(r => r.subcategory === 'seizure')
  if (seizureEntries.length && isDoctor) {
    w.sectionHeader('Seizure Assessment')
    let total = 0, statusEpi = 0, autonomic = 0, withAura = 0, rescueUsed = 0, ems = 0, injuries = 0
    const types: Record<string, number> = {}
    const triggers: Record<string, number> = {}
    const symptoms: Record<string, number> = {}
    for (const r of seizureEntries) {
      const entries = Array.isArray(r.content?.entries) ? r.content.entries : [r.content]
      for (const e of entries) {
        if (!e) continue
        total++
        if (e.statusEpilepticus) statusEpi++
        if (e.episodeType === 'autonomic') autonomic++
        if (e.auraPresent) withAura++
        if (e.rescueMedicationUsed) rescueUsed++
        if (e.emergencyServicesCalled) ems++
        if (e.injuriesOccurred) injuries++
        const t = e.episodeType || e.seizureType
        if (t) { const ct = canonicalSeizureType(t); types[ct] = (types[ct] || 0) + 1 }
        ;(e.triggers || []).forEach((tr: string) => { triggers[tr] = (triggers[tr] || 0) + 1 })
        ;(e.symptoms || e.seizureSymptoms || []).forEach((s: string) => { symptoms[s] = (symptoms[s] || 0) + 1 })
      }
    }
    w.body(`${plural(total, 'seizure event')} recorded. Aura present in ${withAura} (${total ? Math.round(withAura/total*100) : 0}%). Rescue med used: ${rescueUsed}×. EMS: ${ems}×. Injuries: ${injuries}×.`)
    if (statusEpi > 0) w.finding(`Status epilepticus events: ${statusEpi} — neurological emergency, neurology follow-up indicated.`)
    if (autonomic >= 3) w.finding(`Autonomic seizure pattern: ${autonomic} events — often misdiagnosed as POTS/MCAS/panic; consider EEG with autonomic monitoring.`)
    const typeRows = mergeVariants(types).map(([t, c]) => [String(t), String(c)])
    if (typeRows.length) {
      w.subSection('Episode type distribution')
      w.table(['Type', 'Count'], typeRows, [240, 60])
    }
    const symRows = mergeVariants(symptoms).slice(0, 8)
    if (symRows.length) w.body(`Top ictal symptoms: ${symRows.map(([s, c]) => `${s} (${c}×)`).join(', ')}`)
    const trigRows = mergeVariants(triggers).slice(0, 6)
    if (trigRows.length) w.body(`Top triggers: ${trigRows.map(([s, c]) => `${s} (${c}×)`).join(', ')}`)
  }

  // === FOOD REACTIONS / ALLERGENS ===
  const foodEntries = trackerData.filter(r => r.subcategory === 'food-allergens')
  if (foodEntries.length && isDoctor) {
    w.sectionHeader('Food Reactions / Allergen Assessment')
    let total = 0, anaphylaxis = 0, celiac = 0, intolerance = 0, epipen = 0, er = 0, hosp = 0
    let aftermathBrainFog = 0, aftermathJoint = 0, aftermathFatigue = 0, aftermathMood = 0, delayed = 0
    const allergens: Record<string, number> = {}
    const sources: Record<string, number> = {}
    const delays: number[] = []
    for (const r of foodEntries) {
      const entries = Array.isArray(r.content?.entries) ? r.content.entries : [r.content]
      for (const e of entries) {
        if (!e) continue
        total++
        if (e.episodeType === 'severe-anaphylaxis' || e.epipenUsed) anaphylaxis++
        if (e.episodeType === 'celiac-autoimmune') celiac++
        if (e.episodeType === 'intolerance') intolerance++
        if (e.epipenUsed) epipen++
        if (e.erVisitRequired) er++
        if (e.hospitalizedOvernight) hosp++
        if (e.brainFogAfter) aftermathBrainFog++
        if (e.jointPainAfter) aftermathJoint++
        if (e.fatigueAfter) aftermathFatigue++
        if (e.moodChangesAfter) aftermathMood++
        if (e.delayedReaction) delayed++
        if (typeof e.delayedReactionHours === 'number') delays.push(e.delayedReactionHours)
        if (e.allergenName) allergens[e.allergenName.toLowerCase()] = (allergens[e.allergenName.toLowerCase()] || 0) + 1
        if (e.exposureSource) sources[e.exposureSource] = (sources[e.exposureSource] || 0) + 1
      }
    }
    w.body(`${plural(total, 'reaction')} tracked. Anaphylaxis: ${anaphylaxis} (EpiPen used ${epipen}×). Celiac/autoimmune: ${celiac}. Intolerance: ${intolerance}. ER: ${er}. Hospitalized: ${hosp}.`)
    if (anaphylaxis > 0) w.finding(`Anaphylaxis events: ${anaphylaxis} — allergy/immunology referral + EpiPen Rx renewal indicated.`)
    if (celiac + intolerance >= 4) {
      const ce = celiac + intolerance
      w.subSection('Celiac/intolerance aftermath pattern')
      w.body(`Across ${ce} celiac/intolerance events: brain fog after ${aftermathBrainFog} (${Math.round(aftermathBrainFog/ce*100)}%), joint pain after ${aftermathJoint} (${Math.round(aftermathJoint/ce*100)}%), fatigue after ${aftermathFatigue} (${Math.round(aftermathFatigue/ce*100)}%), mood changes ${aftermathMood} (${Math.round(aftermathMood/ce*100)}%). Delayed-reaction reported in ${delayed}.`)
      if (delays.length >= 2) {
        const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length
        w.body(`Average delay from exposure to first symptom: ${avgDelay.toFixed(1)} hours (n=${delays.length}).`)
      }
    }
    const allRows = mergeVariants(allergens).slice(0, 8).map(([a, c]) => [a, String(c)])
    if (allRows.length) {
      w.subSection('Top reported triggers')
      w.table(['Allergen / trigger', 'Reactions'], allRows, [240, 80])
    }
    const srcRows = mergeVariants(sources).slice(0, 6)
    if (srcRows.length) w.body(`Top exposure sources: ${srcRows.map(([s, c]) => `${s} (${c}×)`).join(', ')}`)
  }

  // === CARDIAC — rhythm types, syncope, HR ===
  const cardEntries = trackerData.filter(r => r.subcategory === 'cardiac')
  if (cardEntries.length && isDoctor) {
    w.sectionHeader('Cardiac Assessment')
    let total = 0, syncope = 0, vt = 0, er = 0, ecgFiles = 0
    const types: Record<string, number> = {}
    const rhythms: Record<string, number> = {}
    const hrPeaks: number[] = []
    for (const r of cardEntries) {
      const entries = Array.isArray(r.content?.entries) ? r.content.entries : [r.content]
      for (const e of entries) {
        if (!e) continue
        total++
        if (e.episodeType === 'syncope' || e.locOccurred) syncope++
        if (e.rhythmType === 'VT') vt++
        if (e.erVisitRequired) er++
        if (Array.isArray(e.ecgStripImages) && e.ecgStripImages.length) ecgFiles += e.ecgStripImages.length
        if (e.episodeType) types[e.episodeType] = (types[e.episodeType] || 0) + 1
        if (e.rhythmType) rhythms[e.rhythmType] = (rhythms[e.rhythmType] || 0) + 1
        if (typeof e.hrPeak === 'number') hrPeaks.push(e.hrPeak)
      }
    }
    w.body(`${plural(total, 'cardiac event')}. Syncope (full LOC): ${syncope}. ER required: ${er}. ECG strips uploaded: ${ecgFiles}.`)
    if (vt > 0) w.finding(`Ventricular tachycardia captured ${vt}× — urgent cardiology / EP consult.`)
    if (syncope >= 2) w.finding(`Recurrent syncope (${syncope}×) — tilt-table or extended Holter indicated.`)
    if (hrPeaks.length) {
      const max = Math.max(...hrPeaks), min = Math.min(...hrPeaks)
      const avg = hrPeaks.reduce((a, b) => a + b, 0) / hrPeaks.length
      w.body(`Heart rate peaks: range ${min}-${max}, avg ${avg.toFixed(0)} bpm (n=${hrPeaks.length} events).`)
    }
    const rhythmRows = mergeVariants(rhythms).slice(0, 8).map(([r, c]) => [r, String(c)])
    if (rhythmRows.length) {
      w.subSection('Captured rhythm types')
      w.table(['Rhythm', 'Count'], rhythmRows, [240, 80])
    }
  }

  // === RESPIRATORY ===
  const respEntries = trackerData.filter(r => r.subcategory === 'respiratory')
  if (respEntries.length && isDoctor) {
    w.sectionHeader('Respiratory Assessment')
    let total = 0, redZone = 0, asthma = 0, allergic = 0, er = 0
    const types: Record<string, number> = {}
    // Objective vitals — field names verified against respiratory modals
    // (peakFlowReading L/min, spo2Lowest %); analytics flags desat at <92.
    const peakFlows: number[] = []
    const spo2Lows: number[] = []
    for (const r of respEntries) {
      const entries = Array.isArray(r.content?.entries) ? r.content.entries : [r.content]
      for (const e of entries) {
        if (!e) continue
        total++
        if (e.peakFlowZone === 'red') redZone++
        if (e.episodeType === 'asthma-attack') asthma++
        if (e.episodeType === 'allergic-reaction') allergic++
        if (e.erVisitRequired) er++
        if (e.episodeType) types[e.episodeType] = (types[e.episodeType] || 0) + 1
        if (typeof e.peakFlowReading === 'number') peakFlows.push(e.peakFlowReading)
        if (typeof e.spo2Lowest === 'number') spo2Lows.push(e.spo2Lowest)
      }
    }
    w.body(`${plural(total, 'respiratory event')}. Asthma attacks: ${asthma}. Allergic reactions: ${allergic}. Red-zone peak flow: ${redZone}. ER: ${er}.`)
    if (redZone >= 1) w.finding(`Red-zone peak flow recorded ${redZone}× — uncontrolled asthma / step-up therapy discussion.`)
    if (peakFlows.length) {
      const pfMin = Math.min(...peakFlows)
      const pfAvg = peakFlows.reduce((a, b) => a + b, 0) / peakFlows.length
      w.body(`Peak expiratory flow: lowest ${pfMin} L/min, mean ${pfAvg.toFixed(0)} L/min (n=${peakFlows.length} recorded).`)
    }
    if (spo2Lows.length) {
      const spo2Min = Math.min(...spo2Lows)
      const spo2Avg = spo2Lows.reduce((a, b) => a + b, 0) / spo2Lows.length
      const desat = spo2Lows.filter(v => v < 92).length
      w.body(`Lowest SpO2 per episode: min ${spo2Min}%, mean ${spo2Avg.toFixed(0)}% (n=${spo2Lows.length} recorded).`)
      if (desat) w.finding(`SpO2 below 92% on ${desat}/${spo2Lows.length} recorded episode${desat !== 1 ? 's' : ''}` +
        (spo2Min < 88 ? `; nadir ${spo2Min}% is below the 88% red-flag threshold.` : '.'))
      // ⚠️ PLAUSIBILITY NOTE — CREDIBILITY-CRITICAL, DO NOT REMOVE.
      //
      // A consumer pulse oximeter reports values below ~70% that are, in a
      // conscious ambulatory person, almost always ARTEFACT: cold hands, poor
      // peripheral perfusion (common in dysautonomia and Raynaud's), motion,
      // or nail polish. Printing "nadir 55%" as a clinical finding with no
      // caveat does not make a clinician worry about the patient — it makes
      // them stop believing THE WHOLE DOCUMENT, including the findings that
      // are real and load-bearing.
      //
      // The value is still reported, because suppressing patient data is not
      // ours to do. It is reported WITH the caveat, so the report keeps its
      // credibility and the reader keeps the number.
      if (spo2Min < 70) {
        w.body(
          `Note on the ${spo2Min}% reading: values this low from a fingertip pulse oximeter are ` +
          `usually artefact — cold hands, poor peripheral perfusion, motion, or nail polish — rather ` +
          `than true desaturation in someone awake and upright. It is reported here rather than ` +
          `removed, but it should be confirmed on a repeat reading with a warm hand before it is ` +
          `treated as a real value. The higher-range readings in this series are the more reliable ones.`,
        )
      }
    }
    const typeRows = mergeVariants(types).map(([t, c]) => [t, String(c)])
    if (typeRows.length) w.table(['Episode type', 'Count'], typeRows, [240, 80])
  }

  // === VITALS === (CHA-317) objective baseline measurements — shown in all report styles
  const vitalsRecords = trackerData.filter(r => r.subcategory === 'vitals')
  const vitalsReadings: any[] = []
  for (const r of vitalsRecords) {
    const arr = Array.isArray(r.content?.entries) ? r.content.entries : (r.content ? [r.content] : [])
    for (const e of arr) { if (e) vitalsReadings.push(e) }
  }
  if (vitalsReadings.length) {
    w.sectionHeader('Vitals')
    vitalsReadings.sort((a, b) => String(a.timestamp || a.date || '').localeCompare(String(b.timestamp || b.date || '')))
    const nums = (k: string): number[] => vitalsReadings.map((e: any) => e[k]).filter((v: any): v is number => typeof v === 'number')
    const sys = nums('systolic'), dia = nums('diastolic'), hr = nums('heartRate'),
          spo2 = nums('spo2'), temp = nums('temperature'), wt = nums('weight')
    const rng = (a: number[], unit = ''): string => a.length ? `${Math.min(...a)}–${Math.max(...a)}${unit}` : '—'
    let summary = `${vitalsReadings.length} reading${vitalsReadings.length !== 1 ? 's' : ''} recorded.`
    if (sys.length && dia.length) summary += ` BP ${Math.min(...sys)}/${Math.min(...dia)}–${Math.max(...sys)}/${Math.max(...dia)} mmHg.`
    if (hr.length) summary += ` HR ${rng(hr)} bpm.`
    if (spo2.length) summary += ` SpO2 ${rng(spo2, '%')}.`
    if (temp.length) summary += ` Temp ${rng(temp)}°.`
    if (wt.length) summary += ` Weight ${rng(wt)}.`
    w.body(summary)
    if (spo2.length) {
      const spo2Min = Math.min(...spo2)
      const low = spo2.filter(v => v < 92).length
      if (low) w.finding(`SpO2 below 92% on ${low}/${spo2.length} reading${low !== 1 ? 's' : ''}` +
        (spo2Min < 88 ? `; nadir ${spo2Min}% is below the 88% red-flag threshold.` : '.'))
    }
    const when = (e: any): string => {
      const d = e.date || (e.timestamp ? String(e.timestamp).slice(0, 10) : '')
      let t = ''
      if (e.timestamp) { const dt = new Date(e.timestamp); if (!isNaN(dt.getTime())) t = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      return t ? `${d} ${t}` : d
    }
    const rows = vitalsReadings.slice(-30).map((e: any) => [
      when(e),
      (e.systolic != null && e.diastolic != null) ? `${e.systolic}/${e.diastolic}` : '—',
      e.heartRate != null ? String(e.heartRate) : '—',
      e.spo2 != null ? `${e.spo2}%` : '—',
      e.temperature != null ? `${e.temperature}°${e.tempUnit || 'F'}` : '—',
      e.respRate != null ? String(e.respRate) : '—',
      e.weight != null ? `${e.weight}${e.weightUnit || 'lb'}` : '—',
    ])
    w.table(['Date/Time', 'BP', 'HR', 'SpO2', 'Temp', 'RR', 'Weight'], rows, [140, 65, 45, 50, 58, 42, 60])
    if (vitalsReadings.length > 30) w.note(`Showing most recent 30 of ${vitalsReadings.length} readings.`)
  }

  // === SKIN ===
  const skinEntries = trackerData.filter(r => r.subcategory === 'skin')
  if (skinEntries.length && isDoctor) {
    w.sectionHeader('Skin Assessment')
    let total = 0, photos = 0, throatTight = 0, mucous = 0, er = 0
    const types: Record<string, number> = {}
    for (const r of skinEntries) {
      const entries = Array.isArray(r.content?.entries) ? r.content.entries : [r.content]
      for (const e of entries) {
        if (!e) continue
        total++
        if (Array.isArray(e.photos)) photos += e.photos.length
        if (e.throatTightness) throatTight++
        if (e.mucousMembraneInvolvement) mucous++
        if (e.erVisitRequired) er++
        if (e.episodeType) types[e.episodeType] = (types[e.episodeType] || 0) + 1
      }
    }
    w.body(`${plural(total, 'skin event')}. Photos captured: ${photos} (available in app for dermatology consult). ER: ${er}.` + nCaveat(total))
    if (throatTight > 0) w.finding(`Throat tightness with skin reaction reported ${throatTight}× — anaphylaxis pattern.`)
    if (mucous > 0) w.finding(`Mucous membrane involvement ${mucous}× — SJS/TEN differential if drug-related.`)
    const typeRows = mergeVariants(types).map(([t, c]) => [t, String(c)])
    if (typeRows.length) w.table(['Lesion type', 'Count'], typeRows, [240, 80])
    if (photos > 0) w.note(`Skin photos are stored locally in the app and excluded from this PDF for privacy. Dermatology can request a screen-share or in-clinic photo review.`)
  }

  // === JOINT / MSK ===
  // Field names verified against the saved schema (joint-types.ts) AND the in-app
  // joint-analytics.tsx (the source of truth for what's actually stored). The v1
  // PDF section read `jointsAffected` / `selfReduced` / `subluxationOccurred` —
  // none of which exist on the saved entry — so it silently dropped severity,
  // muscle weakness, episode types, ROM, swelling, and per-muscle data. Fixed.
  const jointEntries = trackerData.filter(r => r.subcategory === 'joint')
  if (jointEntries.length && isDoctor) {
    w.sectionHeader('Joint / MSK Assessment')
    const jointFreq: Record<string, number> = {}
    const muscleFreq: Record<string, number> = {}
    const types: Record<string, number> = {}
    const severities: number[] = []
    const weaknessSeverities: number[] = []
    const romImpacts: number[] = []
    const treatmentResp: number[] = []
    let total = 0, subluxations = 0, dislocations = 0, selfReduced = 0
    let swelling = 0, bruising = 0, erVisits = 0, crossListed = 0
    for (const r of jointEntries) {
      const entries = Array.isArray(r.content?.entries) ? r.content.entries : [r.content]
      for (const e of entries) {
        if (!e) continue
        total++
        const et = e.episodeType
        if (et) types[et] = (types[et] || 0) + 1
        if (e.crossListedIn?.length) crossListed++
        ;(e.jointAffected || []).forEach((j: string) => { jointFreq[j] = (jointFreq[j] || 0) + 1 })
        ;(e.musclesAffected || []).forEach((m: string) => { muscleFreq[m] = (muscleFreq[m] || 0) + 1 })
        if (et === 'subluxation') subluxations++
        if (et === 'dislocation') dislocations++
        if (e.selfReducedFlag) selfReduced++
        if (typeof e.severity === 'number') {
          severities.push(e.severity)
          if (et === 'weakness') weaknessSeverities.push(e.severity)
        }
        if (e.swellingPresent) swelling++
        if (e.bruisingPresent) bruising++
        if (e.erVisitRequired) erVisits++
        if (typeof e.romImpactedPercent === 'number') romImpacts.push(e.romImpactedPercent)
        if (typeof e.treatmentResponse === 'number') treatmentResp.push(e.treatmentResponse)
      }
    }
    const sevTxt = severities.length
      ? ` Mean severity ${(severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(1)}/10 (peak ${Math.max(...severities)}/10, n=${severities.length}).`
      : ''
    w.body(`${plural(total, 'MSK event')}.${sevTxt}`)

    // Instability / EDS signal
    if (subluxations + dislocations > 0) {
      const ratio = (subluxations + dislocations) > 0 ? Math.round(selfReduced / (subluxations + dislocations) * 100) : 0
      w.body(`Subluxations: ${subluxations}. Dislocations: ${dislocations}. Self-reduced: ${selfReduced}${selfReduced > 0 ? ` (${ratio}% of subs/dislocations) — joint hypermobility / EDS-pattern signal` : ''}.`)
    }

    // Muscle weakness — clinically load-bearing, MUST surface (was silently dropped)
    if (weaknessSeverities.length) {
      const peak = Math.max(...weaknessSeverities)
      const mean = weaknessSeverities.reduce((a, b) => a + b, 0) / weaknessSeverities.length
      w.body(`Muscle weakness reported in ${weaknessSeverities.length} event(s): mean ${mean.toFixed(1)}/10, peak ${peak}/10.`)
      if (peak >= 7) w.finding(`Severe muscle weakness (peak ${peak}/10) — proximal weakness warrants myopathy / neuromuscular workup (CK, EMG); distal or focal warrants neuropathy evaluation.`)
    }

    if (romImpacts.length) {
      const avgRom = romImpacts.reduce((a, b) => a + b, 0) / romImpacts.length
      w.body(`Range-of-motion impact: mean ${avgRom.toFixed(0)}% restriction (n=${romImpacts.length}).`)
    }
    if (swelling > 0 || bruising > 0) w.body(`Swelling present: ${swelling}×. Bruising present: ${bruising}×.`)
    if (erVisits > 0) w.finding(`ER visit required for an MSK event ${erVisits}×.`)
    if (crossListed > 0) w.note(`${crossListed} of these event${crossListed !== 1 ? 's are' : ' is'} also logged under Neuro (cross-listed: shared entries shown for both specialties, not duplicates).`)
    if (treatmentResp.length) {
      const avgT = treatmentResp.reduce((a, b) => a + b, 0) / treatmentResp.length
      w.body(`Mean treatment response: ${avgT.toFixed(1)}/10 (n=${treatmentResp.length}).`)
    }

    // Episode-type distribution (weakness, subluxation, dislocation, cramping,
    // fasciculations, muscle-tightness, instability, ROM-restriction, etc.)
    const typeRows = mergeVariants(types).map(([t, c]) => [t, String(c)])
    if (typeRows.length) {
      w.subSection('Episode type distribution')
      w.table(['Type', 'Count'], typeRows, [240, 80])
    }

    const jointRows = mergeVariants(jointFreq).slice(0, 12).map(([j, c]) => [j, String(c)])
    if (jointRows.length) {
      w.subSection('Per-joint frequency (for orthopedic consult)')
      w.table(['Joint', 'Events'], jointRows, [240, 80])
    }

    const muscleRows = mergeVariants(muscleFreq).slice(0, 12).map(([m, c]) => [m, String(c)])
    if (muscleRows.length) {
      w.subSection('Per-muscle-group frequency (weakness / cramping / fasciculations)')
      w.table(['Muscle group', 'Events'], muscleRows, [240, 80])
    }
  }

  // === NEURO / NEUROMUSCULAR ===
  // Field names verified against app/neuro/neuro-types.ts (NeuroEntry). Some
  // events are cross-listed (shared id) with the MSK/joint section — they appear
  // in BOTH sections by design (neurologist + rheumatologist each see them),
  // badged "⇄ also logged under MSK" so they aren't read as duplicate problems.
  const neuroEntries = trackerData.filter(r => r.subcategory === 'neuro')
  if (neuroEntries.length && isDoctor) {
    w.sectionHeader('Neuro / Neuromuscular Assessment')
    const types: Record<string, number> = {}
    const distFreq: Record<string, number> = {}
    const charFreq: Record<string, number> = {}
    const severities: number[] = []
    let total = 0, erVisits = 0, crossListed = 0
    let proximalWeakness = 0, distalWeakness = 0, bulbar = 0, visionEvents = 0
    for (const r of neuroEntries) {
      const entries = Array.isArray(r.content?.entries) ? r.content.entries : [r.content]
      for (const e of entries) {
        if (!e) continue
        total++
        const et = e.episodeType
        if (et) types[et] = (types[et] || 0) + 1
        ;(e.distribution || []).forEach((d: string) => { distFreq[d] = (distFreq[d] || 0) + 1 })
        ;(e.character || []).forEach((c: string) => { charFreq[c] = (charFreq[c] || 0) + 1 })
        if (typeof e.severity === 'number') severities.push(e.severity)
        if (e.erVisitRequired) erVisits++
        if (e.crossListedIn?.length) crossListed++
        if (et === 'speech-swallow') bulbar++
        if (et === 'vision') visionEvents++
        if (et === 'weakness') {
          const dist = (e.distribution || []).join(' ').toLowerCase()
          if (dist.includes('proximal')) proximalWeakness++
          if (dist.includes('distal') || dist.includes('stocking')) distalWeakness++
        }
      }
    }
    const sevTxt = severities.length
      ? ` Mean severity ${(severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(1)}/10 (peak ${Math.max(...severities)}/10, n=${severities.length}).`
      : ''
    w.body(`${plural(total, 'neuro/neuromuscular event')}.${sevTxt}`)

    // Localizing signals worth a neurologist's attention
    if (proximalWeakness) w.finding(`Proximal weakness logged ${proximalWeakness}× — myopathy pattern; consider CK, EMG.`)
    if (distalWeakness) w.finding(`Distal / stocking-glove weakness logged ${distalWeakness}× — peripheral neuropathy pattern.`)
    if (bulbar) w.finding(`Bulbar symptoms (speech/swallow) logged ${bulbar}× — evaluate for neuromuscular / brainstem involvement.`)
    if (visionEvents) w.body(`Vision events (diplopia / transient loss / optic-neuritis-type): ${visionEvents}.`)
    if (erVisits) w.finding(`ER visit required for a neuro event ${erVisits}×.`)
    if (crossListed) w.note(`${crossListed} of these event${crossListed !== 1 ? 's are' : ' is'} also logged under MSK / Joints (cross-listed: shared entries shown for both specialties, not duplicates).`)

    const typeRows = mergeVariants(types).map(([t, c]) => [t, String(c)])
    if (typeRows.length) {
      w.subSection('Episode type distribution')
      w.table(['Type', 'Count'], typeRows, [240, 80])
    }
    const distRows = mergeVariants(distFreq).slice(0, 12).map(([d, c]) => [d, String(c)])
    if (distRows.length) {
      w.subSection('Symptom distribution (localization)')
      w.table(['Distribution', 'Events'], distRows, [240, 80])
    }
    const charRows = mergeVariants(charFreq).slice(0, 10).map(([c, n]) => [c, String(n)])
    if (charRows.length) {
      w.subSection('Pattern / course')
      w.table(['Pattern', 'Count'], charRows, [240, 80])
    }
  }

  // === AUTOIMMUNE / CONNECTIVE-TISSUE (rheumatology) ===
  // Systemic CTD picture the other trackers don't hold: sicca, antisynthetase
  // signs, inflammatory-vs-mechanical joint pattern, serositis, dysphagia.
  // Findings are framed as differentials/work-up prompts for a rheumatologist.
  const autoEntries = trackerData.filter(r => r.subcategory === 'autoimmune')
  if (autoEntries.length && isDoctor) {
    w.sectionHeader('Autoimmune / Connective-Tissue Assessment')
    const types: Record<string, number> = {}
    const areaFreq: Record<string, number> = {}
    const charFreq: Record<string, number> = {}
    const severities: number[] = []
    let total = 0, erVisits = 0, crossListed = 0
    for (const r of autoEntries) {
      const entries = Array.isArray(r.content?.entries) ? r.content.entries : [r.content]
      for (const e of entries) {
        if (!e) continue
        total++
        const et = e.episodeType
        if (et) types[et] = (types[et] || 0) + 1
        ;(e.affectedAreas || []).forEach((a: string) => { areaFreq[a] = (areaFreq[a] || 0) + 1 })
        ;(e.character || []).forEach((c: string) => { charFreq[c] = (charFreq[c] || 0) + 1 })
        if (typeof e.severity === 'number') severities.push(e.severity)
        if (e.erVisitRequired) erVisits++
        if (e.crossListedIn?.length) crossListed++
      }
    }
    const sevTxt = severities.length
      ? ` Mean severity ${(severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(1)}/10 (peak ${Math.max(...severities)}/10, n=${severities.length}).`
      : ''
    w.body(`${total} autoimmune / connective-tissue event${total !== 1 ? 's' : ''}.${sevTxt}`)

    const sicca = (types['sicca-eyes'] || 0) + (types['sicca-mouth'] || 0)
    if (sicca) w.finding(`Sicca symptoms (dry eyes / dry mouth) logged ${sicca}× — consider Schirmer test, anti-SSA/SSB (Ro/La), and lip-gland biopsy for Sjögren's / sicca complex.`)
    if (types['raynauds']) w.finding(`Raynaud's logged ${types['raynauds']}× — with other CTD features, consider nailfold capillaroscopy and ANA / scleroderma (Scl-70, centromere) panel.`)
    if (types['mechanic-hands'] || types['myalgia']) {
      const mh = types['mechanic-hands'] || 0, my = types['myalgia'] || 0
      w.finding(`Antisynthetase-pattern signs — mechanic's hands ${mh}×, inflammatory muscle pain/weakness ${my}× — consider myositis-antibody panel (Jo-1 / PL-7 / PL-12 etc.), CK, and aldolase.`)
    }
    if (types['inflammatory-rash']) w.finding(`Inflammatory / photosensitive rash (malar, heliotrope, Gottron's) logged ${types['inflammatory-rash']}× — lupus / dermatomyositis differential; ANA and dermatologic exam.`)
    if (types['arthralgia'] || types['morning-stiffness']) {
      const ar = types['arthralgia'] || 0, ms = types['morning-stiffness'] || 0
      w.finding(`Inflammatory joint pattern — achy/swollen joints ${ar}×, morning stiffness ${ms}× (if typically >30–60 min, reads inflammatory) — consider RF, anti-CCP, ESR, CRP.`)
    }
    if (types['serositis']) w.finding(`Serositis (pleuritic chest pain) logged ${types['serositis']}× — pleuritis / pericarditis differential; needs evaluation if acute or severe.`)
    if (types['dysphagia']) w.finding(`Dysphagia logged ${types['dysphagia']}× — esophageal dysmotility (scleroderma / myositis spectrum); consider barium swallow or manometry.`)
    if (types['oral-ulcers']) w.body(`Oral / nasal ulcers: ${types['oral-ulcers']} (lupus / Behçet-associated SLE criterion).`)
    if (types['constitutional']) w.body(`Constitutional flares (fatigue, low-grade fever, malaise): ${types['constitutional']}.`)
    if (types['lymphadenopathy']) w.body(`Swollen glands / lymphadenopathy: ${types['lymphadenopathy']}.`)
    if (types['alopecia']) w.body(`Autoimmune hair loss: ${types['alopecia']}.`)
    if (erVisits) w.finding(`ER visit required for an autoimmune event ${erVisits}×.`)
    if (crossListed) w.note(`${crossListed} of these event${crossListed !== 1 ? 's are' : ' is'} also logged under Skin / Joints / Neuro (cross-listed: shared entries shown for each specialty, not duplicates).`)

    const typeRows = mergeVariants(types).map(([t, c]) => [t, String(c)])
    if (typeRows.length) {
      w.subSection('Episode type distribution')
      w.table(['Type', 'Count'], typeRows, [240, 80])
    }
    const areaRows = mergeVariants(areaFreq).slice(0, 12).map(([a, c]) => [a, String(c)])
    if (areaRows.length) {
      w.subSection('Affected areas')
      w.table(['Area', 'Events'], areaRows, [240, 80])
    }
    const charRows = mergeVariants(charFreq).slice(0, 10).map(([c, n]) => [c, String(n)])
    if (charRows.length) {
      w.subSection('Character / quality')
      w.table(['Quality', 'Count'], charRows, [240, 80])
    }
  }

  // === AUTOIMMUNE / CONNECTIVE TISSUE (rheumatology) — non-doctor audiences ===
  // The doctor build is the rich block ABOVE (isDoctor-gated). This leaner
  // version covers attorney/personal so the tracker always exports — but MUST
  // be !isDoctor, or a doctor PDF renders the autoimmune section TWICE (the
  // deluxe block, then this near-identical one). Bug caught 2026-06-10.
  // Field names verified against app/autoimmune/autoimmune-types.ts.
  const aiEntries = trackerData.filter(r => r.subcategory === 'autoimmune')
  if (aiEntries.length && !isDoctor) {
    w.sectionHeader('Autoimmune / Connective-Tissue Assessment')
    const types: Record<string, number> = {}
    const areaFreq: Record<string, number> = {}
    const trigFreq: Record<string, number> = {}
    const severities: number[] = []
    let total = 0, erVisits = 0, flares = 0
    let serositis = 0, sicca = 0, raynauds = 0, dysphagia = 0, mechanicHands = 0
    for (const r of aiEntries) {
      const entries = Array.isArray(r.content?.entries) ? r.content.entries : [r.content]
      for (const e of entries) {
        if (!e) continue
        total++
        const et = e.episodeType
        if (et) types[et] = (types[et] || 0) + 1
        ;(e.affectedAreas || []).forEach((a: string) => { areaFreq[a] = (areaFreq[a] || 0) + 1 })
        ;(e.triggers || []).forEach((t: string) => { trigFreq[t] = (trigFreq[t] || 0) + 1 })
        if (typeof e.severity === 'number') severities.push(e.severity)
        if (e.erVisitRequired) erVisits++
        if ((e.character || []).some((c: string) => c.includes('flaring') || c.includes('progressive'))) flares++
        if (et === 'serositis') serositis++
        if (et === 'sicca-eyes' || et === 'sicca-mouth') sicca++
        if (et === 'raynauds') raynauds++
        if (et === 'dysphagia') dysphagia++
        if (et === 'mechanic-hands') mechanicHands++
      }
    }
    const sevTxt = severities.length
      ? ` Mean severity ${(severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(1)}/10 (peak ${Math.max(...severities)}/10, n=${severities.length}).`
      : ''
    w.body(`${plural(total, 'autoimmune / connective-tissue event')}.${sevTxt}${flares ? ` Flaring or progressive on ${flares}.` : ''}`)

    if (sicca) w.body(`Sicca (dry eyes / dry mouth / hydration failure) logged ${sicca}× — Sjögren's / antisynthetase overlap.`)
    if (mechanicHands) w.finding(`Mechanic's hands logged ${mechanicHands}× — an antisynthetase-specific cutaneous sign.`)
    if (raynauds) w.body(`Raynaud's logged ${raynauds}×.`)
    if (serositis) w.finding(`Serositis (pleuritic chest pain) logged ${serositis}× — evaluate for pleural/pericardial involvement.`)
    if (dysphagia) w.finding(`Dysphagia logged ${dysphagia}× — esophageal dysmotility (scleroderma/myositis spectrum); aspiration risk if severe.`)
    if (erVisits) w.finding(`ER / urgent care required for an autoimmune event ${erVisits}×.`)

    const typeRows = mergeVariants(types).map(([t, c]) => [t, String(c)])
    if (typeRows.length) {
      w.subSection('Episode type distribution')
      w.table(['Type', 'Count'], typeRows, [240, 80])
    }
    const areaRows = mergeVariants(areaFreq).slice(0, 12).map(([a, c]) => [a, String(c)])
    if (areaRows.length) {
      w.subSection('Affected areas')
      w.table(['Area', 'Events'], areaRows, [240, 80])
    }
    const trigRows = mergeVariants(trigFreq).slice(0, 8).map(([t, c]) => [t, String(c)])
    if (trigRows.length) {
      w.subSection('Suspected triggers')
      w.table(['Trigger', 'Count'], trigRows, [240, 80])
    }
  }

  // === BATHROOM — Bristol distribution + red flags ===
  const bathEntries = trackerData.filter(r => r.subcategory === 'bathroom')
  if (bathEntries.length && isDoctor) {
    w.sectionHeader('Bathroom Assessment')
    const bristolDist: Record<string, number> = {}
    let total = 0, blackTarry = 0, bloodUrine = 0, pyelo = 0, obstruction = 0
    const types: Record<string, number> = {}
    for (const r of bathEntries) {
      const entries = Array.isArray(r.content?.entries) ? r.content.entries : [r.content]
      for (const e of entries) {
        if (!e) continue
        total++
        if (e.bristolScale) bristolDist[e.bristolScale] = (bristolDist[e.bristolScale] || 0) + 1
        if (e.bloodColor === 'black-tarry') blackTarry++
        if (e.bloodInUrine) bloodUrine++
        if (e.feverWithUrinary && e.flankPain) pyelo++
        if (e.cantPassGas && e.vomiting) obstruction++
        if (e.episodeType) types[e.episodeType] = (types[e.episodeType] || 0) + 1
      }
    }
    w.body(`${plural(total, 'entry', 'entries')}. Constipation: ${types['constipation'] || 0}. Diarrhea: ${types['diarrhea'] || 0}. Urinary: ${types['urinary'] || 0}.`)
    if (blackTarry > 0) w.finding(`Black tarry stool reported ${blackTarry}× — upper GI bleed differential, GI eval indicated.`)
    if (pyelo > 0) w.finding(`Pyelonephritis pattern (UTI + fever + flank) ${pyelo}× — recurrent suggests urology workup for structural cause.`)
    if (obstruction > 0) w.finding(`Obstruction pattern (no gas + vomiting) ${obstruction}× — surgical evaluation if recent and unevaluated.`)
    if (bloodUrine > 0) w.finding(`Blood in urine ${bloodUrine}× — needs evaluation if no clear source.`)
    const bristolRows = ['1','2','3','4','5','6','7'].filter(t => bristolDist[t]).map(t => [`Type ${t}`, String(bristolDist[t])])
    if (bristolRows.length) {
      w.subSection('Bristol scale distribution')
      w.table(['Type', 'Count'], bristolRows, [200, 60])
    }
  }

  // === ANXIETY ===
  const anxEntries = trackerData.filter(r => r.subcategory === 'anxiety')
  if (anxEntries.length && isDoctor) {
    w.sectionHeader('Anxiety Assessment')
    let total = 0, si = 0, sh = 0, hopeless = 0, crisisContact = 0, hospConsidered = 0, meltdowns = 0, panicAttacks = 0
    const anxLevels: number[] = [], panicLevels: number[] = []
    const types: Record<string, number> = {}
    for (const r of anxEntries) {
      const entries = Array.isArray(r.content?.entries) ? r.content.entries : [r.content]
      for (const e of entries) {
        if (!e) continue
        total++
        if (e.suicidalIdeation) si++
        if (e.selfHarmUrges) sh++
        if (e.feelingHopeless) hopeless++
        if (e.crisisContactMade) crisisContact++
        if (e.hospitalizationConsidered) hospConsidered++
        if ((e.episodeType || e.anxietyType) === 'meltdown') meltdowns++
        if ((e.episodeType || e.anxietyType) === 'panic-attack') panicAttacks++
        if (typeof e.anxietyLevel === 'number') anxLevels.push(e.anxietyLevel)
        if (typeof e.panicLevel === 'number' && e.panicLevel > 0) panicLevels.push(e.panicLevel)
        const t = e.episodeType || e.anxietyType
        if (t) types[t] = (types[t] || 0) + 1
      }
    }
    if (anxLevels.length) {
      const avg = anxLevels.reduce((a, b) => a + b, 0) / anxLevels.length
      w.body(`${plural(total, 'entry', 'entries')}. Mean anxiety ${avg.toFixed(1)}/10. Panic attacks: ${panicAttacks}. Meltdowns: ${meltdowns}.` + nCaveat(total))
    }
    if (si > 0 || sh > 0) {
      w.subSection('Crisis-flagged entries')
      if (si > 0) w.finding(`Suicidal ideation flagged: ${plural(si, 'entry', 'entries')}.`)
      if (sh > 0) w.finding(`Self-harm urges flagged: ${plural(sh, 'entry', 'entries')}.`)
      if (hopeless > 0) w.finding(`Hopelessness flagged: ${plural(hopeless, 'entry', 'entries')}.`)
      if (crisisContact > 0) w.body(`Patient reached out for crisis support: ${crisisContact}× (988 / therapist / etc.) — protective factor documented.`)
      if (hospConsidered > 0) w.finding(`Hospitalization considered: ${hospConsidered}×.`)
    }
    const typeRows = mergeVariants(types).map(([t, c]) => [t, String(c)])
    if (typeRows.length) w.table(['Episode type', 'Count'], typeRows, [240, 80])
  }

  // === MIND & MOOD — mixed states, rapid cycling, mania levels ===
  const mmEntries = trackerData.filter(r => r.subcategory === 'mental-health')
  if (mmEntries.length && isDoctor) {
    w.sectionHeader('Mind & Mood Assessment')
    let total = 0, mixedState = 0, rapidCycling = 0
    const depLevels: number[] = [], maniaLevels: number[] = [], energyLevels: number[] = [], fogLevels: number[] = []
    const types: Record<string, number> = {}
    for (const r of mmEntries) {
      const entries = Array.isArray(r.content?.entries) ? r.content.entries : [r.content]
      for (const e of entries) {
        if (!e) continue
        total++
        if (typeof e.depressionLevel === 'number') depLevels.push(e.depressionLevel)
        if (typeof e.maniaLevel === 'number') maniaLevels.push(e.maniaLevel)
        if (typeof e.energyLevel === 'number') energyLevels.push(e.energyLevel)
        if (typeof e.brainFogSeverity === 'number') fogLevels.push(e.brainFogSeverity)
        if ((e.depressionLevel || 0) >= 7 && (e.maniaLevel || 0) >= 6) mixedState++
        if (e.moodSwingDirection === 'rapid-cycling') rapidCycling++
        if (e.episodeType) types[e.episodeType] = (types[e.episodeType] || 0) + 1
      }
    }
    const avg = (arr: number[]) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : '—'
    w.body(`${plural(total, 'check-in')}. Mean depression ${avg(depLevels)}/10. Mean mania ${avg(maniaLevels)}/10. Mean energy ${avg(energyLevels)}/10. Mean brain fog ${avg(fogLevels)}/10.` + nCaveat(total))
    if (mixedState > 0) w.finding(`Mixed-state days (high dep + high mania): ${mixedState} — highest suicide-risk window in mood disorders.`)
    if (rapidCycling > 0) w.finding(`Rapid cycling reported ${rapidCycling}× — affects medication choice; consider discussing with prescriber.`)
    const typeRows = mergeVariants(types).map(([t, c]) => [t, String(c)])
    if (typeRows.length) w.table(['Check-in focus', 'Count'], typeRows, [240, 80])
  }

  // ============================================================================
  // EXPANDED TRACKER SECTIONS (CHA-246, 2026-05-30) — these trackers save real
  // data the v1 report dropped ENTIRELY (no section at all). Each reads via
  // gatherEntries() so it matches the tracker's true storage shape.
  // NOTE: self-care is deliberately NOT exported — per Ren (disability-law), it's
  // an adverse-inference risk for SSDI ("went to the park â†’ why didn't you work?").
  // ============================================================================

  // === UPPER DIGESTIVE ===
  {
    const ud = gatherEntries(s => s === 'upper-digestive')
    if (ud.length && isDoctor) {
      w.sectionHeader('Upper Digestive Assessment')
      const types: Record<string, number> = {}, symptoms: Record<string, number> = {}
      const triggers: Record<string, number> = {}, treatments: Record<string, number> = {}
      const sev: number[] = []
      for (const e of ud) {
        if (e.episodeType) types[e.episodeType] = (types[e.episodeType] || 0) + 1
        if (typeof e.severity === 'number') sev.push(e.severity)
        ;(e.symptoms || []).forEach((s: string) => { symptoms[s] = (symptoms[s] || 0) + 1 })
        ;(e.triggers || []).forEach((t: string) => { triggers[t] = (triggers[t] || 0) + 1 })
        ;(e.treatments || []).forEach((t: string) => { treatments[t] = (treatments[t] || 0) + 1 })
      }
      w.body(`${plural(ud.length, 'upper-GI episode')}.${sev.length ? ` Mean severity ${meanOf(sev).toFixed(1)}/10 (peak ${Math.max(...sev)}/10).` : ''}` + nCaveat(ud.length))
      if (Object.keys(symptoms).length) w.body(`Top symptoms: ${tn(symptoms)}`)
      if (Object.keys(triggers).length) w.body(`Top triggers: ${tn(triggers)}`)
      if (Object.keys(treatments).length) w.body(`Treatments tried: ${tn(treatments)}`)
      const tr = mergeVariants(types).map(([t, c]) => [t, String(c)])
      if (tr.length) { w.subSection('Episode type distribution'); w.table(['Type', 'Count'], tr, [240, 80]) }
    }
  }

  // === ENERGY / PACING (ME/CFS, post-exertional malaise) ===
  {
    const days = gatherEntries(s => s === 'energy')
    if (days.length && isDoctor) {
      w.sectionHeader('Energy & Pacing Assessment')
      const morning: number[] = [], spent: number[] = [], restored: number[] = [], eod: number[] = []
      let overBudget = 0, pemHigh = 0
      for (const d of days) {
        if (typeof d.morningSpoons === 'number') morning.push(d.morningSpoons)
        if (typeof d.totalSpent === 'number') spent.push(d.totalSpent)
        if (typeof d.totalRestored === 'number') restored.push(d.totalRestored)
        if (typeof d.endOfDayEnergy === 'number') eod.push(d.endOfDayEnergy)
        if (typeof d.totalSpent === 'number' && typeof d.morningSpoons === 'number' && d.totalSpent > d.morningSpoons) overBudget++
        if (d.pemRisk === 'high' || d.pemRisk === 'danger') pemHigh++
      }
      w.body(`${days.length} days tracked (spoon-theory pacing). Mean starting energy ${meanOf(morning).toFixed(1)} spoons; mean spent ${meanOf(spent).toFixed(1)}, mean restored ${meanOf(restored).toFixed(1)}.`)
      if (eod.length) w.body(`Mean end-of-day energy: ${meanOf(eod).toFixed(1)}/5.`)
      if (overBudget > 0) w.finding(`Energy over-budget (spent > available) on ${overBudget}/${days.length} days — post-exertional crash risk; supports activity-limitation in functional assessments.`)
      if (pemHigh > 0) w.finding(`High/danger post-exertional-malaise risk flagged on ${pemHigh} days — hallmark of ME/CFS.`)
    }
  }

  // === SENSORY PROCESSING ===
  {
    const sen = gatherEntries(s => s === 'sensory' || s.startsWith('sensory-'))
    if (sen.length && isDoctor) {
      w.sectionHeader('Sensory Processing Assessment')
      const overloads = sen.filter(e => e.entryType === 'overload')
      const lvl: number[] = [], types: Record<string, number> = {}, trig: Record<string, number> = {}
      let shutdowns = 0
      for (const e of overloads) {
        if (typeof e.overloadLevel === 'number') lvl.push(e.overloadLevel)
        ;(e.overloadType || []).forEach((t: string) => { types[t] = (types[t] || 0) + 1 })
        ;(e.overloadTriggers || e.sensoryTriggers || []).forEach((t: string) => { trig[t] = (trig[t] || 0) + 1 })
        if (e.shutdownAfter) shutdowns++
      }
      w.body(`${plural(overloads.length, 'sensory-overload episode')}${lvl.length ? `, mean intensity ${meanOf(lvl).toFixed(1)}/10 (peak ${Math.max(...lvl)}/10)` : ''}. Shutdown after ${shutdowns}.`)
      if (Object.keys(types).length) w.body(`Overload modalities: ${tn(types)}`)
      if (Object.keys(trig).length) w.body(`Top triggers: ${tn(trig)}`)
      if (shutdowns > 0) w.finding(`Post-overload shutdown reported ${shutdowns}× — functional impairment relevant to sensory-processing / autism accommodations.`)
    }
  }

  // === SUBSTANCE USE LOG (neutral — never auto-flag a use disorder) ===
  {
    const sub = gatherEntries(s => s === 'substance')
    if (sub.length && isDoctor) {
      w.sectionHeader('Substance Use Log')
      const types: Record<string, number> = {}, why: Record<string, number> = {}, names: Record<string, number> = {}
      for (const e of sub) {
        if (e.substanceType) types[e.substanceType] = (types[e.substanceType] || 0) + 1
        if (e.substanceName) { const k = String(e.substanceName).toLowerCase(); names[k] = (names[k] || 0) + 1 }
        ;(e.contextWhy || []).forEach((c: string) => { why[c] = (why[c] || 0) + 1 })
      }
      w.body(`${plural(sub.length, 'entry', 'entries')} logged (patient-recorded; not a diagnosis of a use disorder).`)
      if (Object.keys(types).length) w.body(`By type: ${tn(types)}`)
      if (Object.keys(why).length) w.body(`Reported context: ${tn(why)}`)
      if (Object.keys(names).length) w.body(`Most logged: ${tn(names)}`)
    }
  }

  // === MOVEMENT & ACTIVITY TOLERANCE (exertion intolerance supports the claim) ===
  {
    const mv = gatherEntries(s => s === 'movement' || s.startsWith('movement-'))
    if (mv.length && isDoctor) {
      w.sectionHeader('Movement & Activity Tolerance')
      const types: Record<string, number> = {}, feel: Record<string, number> = {}
      const before: number[] = [], after: number[] = []
      let worse = 0
      for (const e of mv) {
        if (e.type) types[e.type] = (types[e.type] || 0) + 1
        ;(e.bodyFeel || []).forEach((b: string) => { feel[b] = (feel[b] || 0) + 1 })
        if (typeof e.energyBefore === 'number') before.push(e.energyBefore)
        if (typeof e.energyAfter === 'number') after.push(e.energyAfter)
        if (typeof e.energyBefore === 'number' && typeof e.energyAfter === 'number' && e.energyAfter < e.energyBefore) worse++
      }
      w.body(`${plural(mv.length, 'movement session')}. Mean energy before ${meanOf(before).toFixed(1)}/10, after ${meanOf(after).toFixed(1)}/10. Energy dropped after activity on ${worse}/${mv.length} sessions${worse ? ' — exertion-intolerance signal relevant to functional capacity' : ''}.`)
      if (Object.keys(types).length) w.body(`Activity types: ${tn(types)}`)
      if (Object.keys(feel).length) w.body(`Body response: ${tn(feel)}`)
    }
  }

  // === CRISIS & SAFETY EPISODES ===
  {
    const cr = gatherEntries(s => s.startsWith('crisis-')).filter(e => e && e.crisisType)
    if (cr.length && isDoctor) {
      w.sectionHeader('Crisis & Safety Episodes')
      const types: Record<string, number> = {}
      const intensity: number[] = [], safety: number[] = []
      let ems = 0, prof = 0, planUsed = 0
      for (const e of cr) {
        if (e.crisisType) types[e.crisisType] = (types[e.crisisType] || 0) + 1
        if (typeof e.intensityLevel === 'number') intensity.push(e.intensityLevel)
        if (typeof e.currentSafety === 'number') safety.push(e.currentSafety)
        if (e.emergencyServicesUsed) ems++
        if (e.professionalHelpSought) prof++
        if (e.safetyPlanUsed) planUsed++
      }
      w.body(`${cr.length} crisis episodes logged. Mean intensity ${meanOf(intensity).toFixed(1)}/10. Mean felt-safety ${meanOf(safety).toFixed(1)}/10.`)
      if (ems > 0) w.finding(`Emergency services involved ${ems}× — documents acute-risk history.`)
      w.body(`Protective factors: reached professional help ${prof}×, used safety plan ${planUsed}×.`)
      const tr = mergeVariants(types).map(([t, c]) => [t, String(c)])
      if (tr.length) { w.subSection('Crisis type distribution'); w.table(['Type', 'Count'], tr, [240, 80]) }
    }
  }

  // === WEATHER / ENVIRONMENTAL TRIGGERS ===
  {
    const wx = gatherEntries(s => s === 'weather')
    const allg = gatherEntries(s => s === 'environmental-allergens')
    if ((wx.length || allg.length) && isDoctor) {
      w.sectionHeader('Weather & Environmental Triggers')
      if (wx.length) {
        // Impact is a 1–10 scale; legacy entries are strings. Map both to an
        // anchor word so the report reads "Yes (3)", never "7 (3)".
        const impactWord = (v: unknown): string => {
          const n = typeof v === 'number'
            ? Math.min(10, Math.max(1, Math.round(v)))
            : ({ 'Not at all': 1, 'A little': 4, 'Yes': 7, 'A LOT': 10 } as Record<string, number>)[String(v)] || 0
          if (!n) return ''
          const anchors: [number, string][] = [[1, 'Not at all'], [4, 'A little'], [7, 'Yes'], [10, 'A LOT']]
          return anchors.reduce((b, a) => Math.abs(a[0] - n) < Math.abs(b[0] - n) ? a : b)[1]
        }
        const types: Record<string, number> = {}, impact: Record<string, number> = {}
        for (const e of wx) {
          const wts: string[] = e.weatherTypes || (e.weatherType ? [e.weatherType] : [])
          wts.forEach((t: string) => { types[t] = (types[t] || 0) + 1 })
          const word = impactWord(e.impact)
          if (word) impact[word] = (impact[word] || 0) + 1
        }
        w.body(`${plural(wx.length, 'weather log')}. Conditions: ${tn(types)}. Reported symptom impact: ${tn(impact)}.`)
      }
      if (allg.length) {
        const types: Record<string, number> = {}, sev: Record<string, number> = {}
        for (const e of allg) {
          if (e.allergenType) types[e.allergenType] = (types[e.allergenType] || 0) + 1
          if (e.severity) sev[e.severity] = (sev[e.severity] || 0) + 1
        }
        w.body(`${allg.length} environmental-allergen logs. Allergens: ${tn(types)}. Severity: ${tn(sev)}.`)
      }
    }
  }

  // === FOOD INTAKE LOG ===
  {
    const fc = gatherEntries(s => s === 'food-choice')
    if (fc.length && isDoctor) {
      let simple = 0, detailed = 0, ate = 0
      const moods: Record<string, number> = {}, meals: Record<string, number> = {}
      for (const day of fc) {
        for (const s of (day.simpleEntries || [])) { simple++; if (s.didEat) ate++; if (s.mood) moods[s.mood] = (moods[s.mood] || 0) + 1; if (s.mealType) meals[s.mealType] = (meals[s.mealType] || 0) + 1 }
        for (const d of (day.detailedEntries || [])) { detailed++; if (d.mealType) meals[d.mealType] = (meals[d.mealType] || 0) + 1 }
      }
      const totalMeals = simple + detailed
      if (totalMeals) {
        w.sectionHeader('Food Intake Log')
        w.body(`${plural(totalMeals, 'meal')} logged across ${fc.length} days (${ate} confirmed eaten). Supports nutrition / GI and appetite / ARFID assessment.`)
        if (Object.keys(meals).length) w.body(`Meal timing: ${tn(meals)}`)
        if (Object.keys(moods).length) w.body(`Mood around eating: ${tn(moods)}`)
      }
    }
  }

  // === DETECTED PATTERNS (Patterns engine — single source) ===
  // Renders the SAME insights the app's Patterns page shows (snapshot-first via
  // getPatterns), v2 clinical rules + v1 triggers/treatments/temporal/trends.
  // v1 correlation insights are excluded here — they render as the Symptom
  // Correlations table. Doctor + personal audiences; attorney reports stay
  // functional-impact-focused. (Was: doctor-only, v2-only, high-impact-only —
  // which is why the app showed far more patterns than the PDF.)
  if (!isAttorney) {
    const p = getPatterns()
    if (p) {
      const v2Insights: any[] = p.v2?.insights || []
      const v1NonCorr: any[] = (p.v1?.all || []).filter((i: any) => i.type !== 'correlation')
      const merged = [...v2Insights, ...v1NonCorr]
      const high = merged.filter((i: any) => i.impact === 'high')
      const medium = merged.filter((i: any) => i.impact === 'medium')
      const lowCount = merged.length - high.length - medium.length
      if (high.length || medium.length) {
        w.sectionHeader(isDoctor ? 'Detected Medical Patterns' : 'Detected Patterns')
        w.note(p.provenance)
        w.body(
          `Pattern engine detected ${high.length} high-impact and ${medium.length} medium-impact ` +
          `pattern${high.length + medium.length !== 1 ? 's' : ''} in tracked data:`
        )
        for (const insight of [...high, ...medium].slice(0, 24)) {
          w.subSection(insight.title)
          const conf = typeof insight.confidence === 'number' ? ` (${insight.impact} impact, confidence ${insight.confidence}%)` : ` (${insight.impact} impact)`
          w.body(insight.description + conf)
        }
        if (high.length + medium.length > 24) {
          w.note(`(${high.length + medium.length - 24} additional patterns shown in the app's Patterns tab)`)
        }
        if (lowCount > 0) {
          w.note(`(${lowCount} low-impact/preliminary pattern${lowCount !== 1 ? 's' : ''} omitted — visible in the app's Patterns tab)`)
        }
      }
    }
  }

  // === DYSAUTONOMIA / VITALS ===
  const dysEntries = trackerData.filter(r => r.subcategory === 'dysautonomia')
  if (dysEntries.length) {
    w.sectionHeader(isDoctor ? 'Autonomic Assessment' : 'Dysautonomia Summary')

    // Flatten every saved episode. Storage = r.content.entries[] (DysautonomiaEntry),
    // and either content OR content.entries can arrive as a JSON string (per dysautonomia-tracker.tsx).
    const episodes: any[] = []
    for (const r of dysEntries) {
      let content: any = r.content || {}
      if (typeof content === 'string') { try { content = JSON.parse(content) } catch { continue } }
      let entries: any = content.entries
      if (typeof entries === 'string') { try { entries = JSON.parse(entries) } catch { entries = [] } }
      if (Array.isArray(entries)) episodes.push(...entries)
    }

    // --- Orthostatic HR (POTS) ---
    const hrDeltas: number[] = []
    for (const e of episodes) {
      if (e?.restingHeartRate && e?.standingHeartRate) {
        hrDeltas.push(e.standingHeartRate - e.restingHeartRate)
      }
    }
    if (hrDeltas.length) {
      const avgDelta = hrDeltas.reduce((a, b) => a + b, 0) / hrDeltas.length
      const maxDelta = Math.max(...hrDeltas)
      const potsDays = hrDeltas.filter(d => d >= 30).length

      if (isDoctor) {
        w.body(
          `Orthostatic HR increase: mean ${avgDelta.toFixed(0)} bpm (max ${maxDelta} bpm, n=${hrDeltas.length}). ` +
          `POTS criteria (delta >= 30 bpm) met on ${potsDays}/${hrDeltas.length} assessments ` +
          `(${(potsDays / hrDeltas.length * 100).toFixed(0)}%).`
        )
      } else {
        w.body(
          `Heart rate jumped an average of ${avgDelta.toFixed(0)} bpm when standing (worst: ${maxDelta} bpm). ` +
          `Out of ${hrDeltas.length} checks, ${potsDays} met POTS criteria (30+ bpm increase).`
        )
      }
    }

    // --- Orthostatic BP (orthostatic hypotension — a distinct entity from POTS) ---
    // BP saved as "sys/dia" strings (blood-pressure-modal.tsx / general-episode-modal.tsx).
    const parseBP = (s: any): { sys: number; dia: number } | null => {
      if (typeof s !== 'string') return null
      const m = s.match(/(\d{2,3})\s*\/\s*(\d{2,3})/)
      return m ? { sys: parseInt(m[1], 10), dia: parseInt(m[2], 10) } : null
    }
    const sysDrops: number[] = []
    const diaDrops: number[] = []
    let ohCount = 0
    for (const e of episodes) {
      const sit = parseBP(e?.bloodPressureSitting)
      const stand = parseBP(e?.bloodPressureStanding)
      if (sit && stand) {
        const dSys = sit.sys - stand.sys
        const dDia = sit.dia - stand.dia
        sysDrops.push(dSys)
        diaDrops.push(dDia)
        // Consensus definition (AAN/AAS): sustained drop >=20 systolic OR >=10 diastolic on standing.
        if (dSys >= 20 || dDia >= 10) ohCount++
      }
    }
    if (sysDrops.length) {
      const n = sysDrops.length
      const avgSys = sysDrops.reduce((a, b) => a + b, 0) / n
      const avgDia = diaDrops.reduce((a, b) => a + b, 0) / n
      const maxSys = Math.max(...sysDrops)
      const maxDia = Math.max(...diaDrops)
      if (isDoctor) {
        w.body(`Orthostatic BP change (sitting -> standing): mean drop ${avgSys.toFixed(0)}/${avgDia.toFixed(0)} mmHg (max ${maxSys}/${maxDia} mmHg, n=${n}).`)
        if (ohCount) {
          w.finding(
            `Orthostatic hypotension criteria (systolic drop >= 20 or diastolic drop >= 10 mmHg) met on ` +
            `${ohCount}/${n} assessments (${(ohCount / n * 100).toFixed(0)}%). ` +
            `Orthostatic hypotension is distinct from POTS and the two may coexist.`
          )
        }
      } else {
        w.body(`Blood pressure dropped an average of ${avgSys.toFixed(0)}/${avgDia.toFixed(0)} points when standing (worst: ${maxSys}/${maxDia}).`)
        if (ohCount) {
          w.finding(`${ohCount} of ${n} checks showed a drop big enough to meet orthostatic hypotension criteria (a separate problem from POTS).`)
        }
      }
    }

    // --- SpO2 desaturation (spo2-episode-modal.tsx: restingSpO2 / standingSpO2 / lowestSpO2) ---
    const lowestVals: number[] = []
    const spo2Drops: number[] = []
    for (const e of episodes) {
      if (typeof e?.lowestSpO2 === 'number') lowestVals.push(e.lowestSpO2)
      if (typeof e?.restingSpO2 === 'number' && typeof e?.standingSpO2 === 'number') {
        spo2Drops.push(e.restingSpO2 - e.standingSpO2)
      }
    }
    if (lowestVals.length) {
      const minSpO2 = Math.min(...lowestVals)
      const below90 = lowestVals.filter(v => v < 90).length
      const below95 = lowestVals.filter(v => v < 95).length
      if (isDoctor) {
        w.body(`SpO2: lowest recorded ${minSpO2}% (n=${plural(lowestVals.length, 'episode')} with oximetry). Readings <95%: ${below95}; <90%: ${below90}.`)
        if (below90) w.finding(`Desaturation below 90% documented on ${below90} occasion${below90 !== 1 ? 's' : ''}.`)
      } else {
        w.body(`Lowest oxygen level recorded: ${minSpO2}%${below90 ? ` (dropped below 90% on ${below90} occasion${below90 !== 1 ? 's' : ''})` : ''}.`)
      }
    }
    if (spo2Drops.length) {
      const maxDrop = Math.max(...spo2Drops)
      if (maxDrop > 0) w.body(isDoctor ? `Max positional SpO2 drop (resting -> standing): ${maxDrop}% (n=${spo2Drops.length}).` : `Oxygen dropped by up to ${maxDrop}% when standing.`)
    }

    // --- Episode picture: type distribution, mean severity, top associated symptoms ---
    if (episodes.length) {
      const typeCounts: Record<string, number> = {}
      const sevVals: number[] = []
      const sxCounts: Record<string, number> = {}
      for (const e of episodes) {
        if (e?.episodeType) typeCounts[e.episodeType] = (typeCounts[e.episodeType] || 0) + 1
        if (typeof e?.severity === 'number') sevVals.push(e.severity)
        if (Array.isArray(e?.symptoms)) for (const s of e.symptoms) sxCounts[s] = (sxCounts[s] || 0) + 1
      }
      if (sevVals.length) {
        const avgSev = sevVals.reduce((a, b) => a + b, 0) / sevVals.length
        w.body(isDoctor
          ? `Mean episode severity: ${avgSev.toFixed(1)}/10 (n=${sevVals.length}; ${episodes.length} total episodes logged).`
          : `Average episode severity: ${avgSev.toFixed(1)}/10 across ${episodes.length} logged episodes.`)
      }
      const typeKeys = Object.keys(typeCounts)
      if (typeKeys.length) {
        const dist = typeKeys.sort((a, b) => typeCounts[b] - typeCounts[a]).map(k => `${k} (${typeCounts[k]})`).join(', ')
        w.body(`${isDoctor ? 'Episode types' : 'Types of episodes'}: ${dist}.`)
      }
      const sxKeys = Object.keys(sxCounts)
      if (sxKeys.length) {
        const topSx = sxKeys.sort((a, b) => sxCounts[b] - sxCounts[a]).slice(0, 6).map(k => `${k} (${sxCounts[k]})`).join(', ')
        w.body(`${isDoctor ? 'Most frequent associated symptoms' : 'Most common symptoms'}: ${topSx}.`)
      }
    }
  }

  // === SLEEP ===
  const sleepEntries = trackerData.filter(r => (r.subcategory || '').startsWith('sleep'))
  if (sleepEntries.length) {
    w.sectionHeader(isDoctor ? 'Sleep Assessment' : 'Sleep Summary')

    // Parse each night's content once. Field names verified against
    // app/sleep/sleep-form.tsx + sleep-constants.ts (SleepEntry shape).
    const nights: any[] = []
    for (const r of sleepEntries) {
      let content: any = r.content || {}
      if (typeof content === 'string') { try { content = JSON.parse(content) } catch { continue } }
      nights.push(content)
    }

    // --- Duration ---
    const hoursList = nights.map(n => Number(n.hoursSlept)).filter(h => !isNaN(h) && h > 0)
    if (hoursList.length) {
      const avg = hoursList.reduce((a, b) => a + b, 0) / hoursList.length
      if (isDoctor) {
        w.body(`Mean sleep duration: ${avg.toFixed(1)} hours/night (n=${hoursList.length}). Range: ${Math.min(...hoursList).toFixed(1)}-${Math.max(...hoursList).toFixed(1)} hours.`)
      } else {
        w.body(`Averaging ${avg.toFixed(1)} hours of sleep per night over ${hoursList.length} nights (worst: ${Math.min(...hoursList).toFixed(1)}h, best: ${Math.max(...hoursList).toFixed(1)}h).`)
      }
    }

    // --- Quality distribution (Great / Okay / Restless / Terrible) ---
    const qualityCounts: Record<string, number> = {}
    for (const n of nights) if (n.quality) qualityCounts[n.quality] = (qualityCounts[n.quality] || 0) + 1
    const qualityKeys = Object.keys(qualityCounts)
    if (qualityKeys.length) {
      const total = qualityKeys.reduce((s, k) => s + qualityCounts[k], 0)
      const dist = qualityKeys.sort((a, b) => qualityCounts[b] - qualityCounts[a]).map(k => `${k} (${qualityCounts[k]})`).join(', ')
      w.body(`${isDoctor ? 'Self-rated sleep quality' : 'How sleep felt'}: ${dist}.`)
      const poor = (qualityCounts['Restless'] || 0) + (qualityCounts['Terrible'] || 0)
      if (isDoctor && poor && total) {
        const pct = (poor / total * 100).toFixed(0)
        if (poor / total >= 0.5) w.finding(`Poor-quality sleep (restless or terrible) reported on ${poor}/${total} nights (${pct}%).`)
      }
    }

    // --- Fragmentation (wokeUpMultipleTimes / timesWoken) ---
    const fragmentedNights = nights.filter(n => n.wokeUpMultipleTimes).length
    const wokenCounts = nights.map(n => Number(n.timesWoken)).filter(v => !isNaN(v) && v > 0)
    if (fragmentedNights) {
      const meanWoken = wokenCounts.length ? wokenCounts.reduce((a, b) => a + b, 0) / wokenCounts.length : 0
      const wokenPhrase = meanWoken ? ` (mean ${meanWoken.toFixed(1)} awakenings/night when recorded)` : ''
      if (isDoctor) {
        w.body(`Sleep fragmentation: multiple nighttime awakenings reported on ${fragmentedNights}/${nights.length} nights${wokenPhrase}.`)
      } else {
        w.body(`Woke up multiple times on ${fragmentedNights} of ${nights.length} nights${wokenPhrase}.`)
      }
    }

    // --- Non-restorative sleep (wakeFeeling: groggy / exhausted / pain) — a diagnostic criterion ---
    const nonRestorative = ['groggy', 'exhausted', 'pain']
    const wakeCounts: Record<string, number> = {}
    for (const n of nights) if (n.wakeFeeling) wakeCounts[n.wakeFeeling] = (wakeCounts[n.wakeFeeling] || 0) + 1
    const wakeTotal = Object.values(wakeCounts).reduce((a, b) => a + b, 0)
    if (wakeTotal) {
      const nonRestCount = nonRestorative.reduce((s, k) => s + (wakeCounts[k] || 0), 0)
      if (isDoctor) {
        if (nonRestCount) {
          const pct = (nonRestCount / wakeTotal * 100).toFixed(0)
          w.finding(`Non-restorative sleep (waking groggy, exhausted, or in pain) on ${nonRestCount}/${wakeTotal} nights (${pct}%).` +
            (wakeCounts['pain'] ? ` Woke in pain on ${wakeCounts['pain']} night${wakeCounts['pain'] !== 1 ? 's' : ''}.` : ''))
        }
      } else if (nonRestCount) {
        w.body(`Woke up unrested (groggy, exhausted, or in pain) on ${nonRestCount} of ${wakeTotal} nights.`)
      }
    }

    // --- Naps (hadNap / napDuration) ---
    const napNights = nights.filter(n => n.hadNap)
    if (napNights.length) {
      const napDurations = napNights.map(n => Number(n.napDuration)).filter(v => !isNaN(v) && v > 0)
      const avgNap = napDurations.length ? napDurations.reduce((a, b) => a + b, 0) / napDurations.length : 0
      const napPhrase = avgNap ? ` (avg ${avgNap.toFixed(0)} min)` : ''
      w.body(`${isDoctor ? 'Daytime naps' : 'Took daytime naps'}: ${napNights.length}/${nights.length} days${napPhrase}.`)
    }

    // --- Sleep aids used (sleepAids[]) ---
    // CLINICAL: null != none. An empty/missing array = NOT RECORDED; ['none'] =
    // patient affirmatively used no aids. Never conflate them, and never count
    // 'none' as a medication (that's what made this read like med non-adherence).
    const aidCounts: Record<string, number> = {}
    let aidsReportedNone = 0   // explicitly ['none']
    let aidsNotRecorded = 0    // empty array or field missing
    for (const n of nights) {
      const realAids = Array.isArray(n.sleepAids) ? n.sleepAids.filter((a: string) => a !== 'none') : []
      if (realAids.length) {
        for (const a of realAids) aidCounts[a] = (aidCounts[a] || 0) + 1
      } else if (Array.isArray(n.sleepAids) && n.sleepAids.length) {
        aidsReportedNone++   // ['none'] — the patient said they took nothing
      } else {
        aidsNotRecorded++    // [] / missing — simply not logged
      }
    }
    const aidKeys = Object.keys(aidCounts)
    if (aidKeys.length) {
      const topAids = aidKeys.sort((a, b) => aidCounts[b] - aidCounts[a]).slice(0, 6).map(k => `${k} (${aidCounts[k]})`).join(', ')
      w.body(`${isDoctor ? 'Sleep aids reported' : 'Sleep aids used'}: ${topAids}.`)
    }
    if (isDoctor && (aidsReportedNone || aidsNotRecorded)) {
      const parts: string[] = []
      if (aidsReportedNone) parts.push(`reported no aids on ${aidsReportedNone} night${aidsReportedNone !== 1 ? 's' : ''}`)
      if (aidsNotRecorded) parts.push(`not recorded on ${aidsNotRecorded} night${aidsNotRecorded !== 1 ? 's' : ''}`)
      w.body(`Sleep aids — ${parts.join('; ')}.`)
    }
  }

  // === LAB RESULTS ===
  if (labResults.length) {
    w.sectionHeader(isDoctor ? 'Laboratory Results' : 'Lab Results')

    for (const labSet of labResults) {
      let content = labSet.content || {}
      if (typeof content === 'string') { try { content = JSON.parse(content) } catch { continue } }

      const results = content.results || []
      const abnormals = results.filter((r: any) => r.is_abnormal)

      if (abnormals.length) {
        w.subSection(`Abnormal findings (${content.date || labSet.date || ''})`)
        for (const r of abnormals) {
          const flag = r.flag ? ` [${r.flag}]` : ''
          w.finding(`${r.test_name || ''}: ${formatLabValue(r)} (ref: ${normalizeUnits(r.reference_text || '—')})${flag}`)
        }
      }
    }
  }

  // === MEDICAL TIMELINE ===
  // Diagnoses, surgeries, hospitalizations, treatments, and other events
  // already on /timeline. Renders newest first, grouped by event type.
  // Skips events the user explicitly tagged "dismissed_findings" since
  // those are by definition things the user wants noted-but-not-emphasized.
  const timelineEvents = data.timelineEvents || []
  if (timelineEvents.length) {
    w.sectionHeader(isDoctor ? 'Medical Timeline' : 'Medical History')

    // Sort newest-first, then group by type for readability
    const sorted = [...timelineEvents].sort((a, b) =>
      String(b.date || '').localeCompare(String(a.date || ''))
    )

    // Dedup identical events. The same lab import can spawn several timeline
    // events with the same date/title/description (seen as "VA-labs…dsDNA 17
    // IU/mL" listed 3-4× under Tests & Procedures). Collapse byte-identical ones
    // so the timeline reads once, not as accidental repeats.
    const groups: Record<string, any[]> = {}
    const seenEvents = new Set<string>()
    for (const ev of sorted) {
      if (ev.type === 'dismissed_findings') continue
      const dedupKey = `${ev.date || ''}|${ev.type || ''}|${String(ev.title || '').trim().toLowerCase()}|${String(ev.description || '').trim().toLowerCase()}`
      if (seenEvents.has(dedupKey)) continue
      seenEvents.add(dedupKey)
      const key = ev.type || 'other'
      if (!groups[key]) groups[key] = []
      groups[key].push(ev)
    }

    const typeLabel = (t: string) => {
      const map: Record<string, string> = {
        diagnosis: 'Diagnoses',
        surgery: 'Surgeries',
        hospitalization: 'Hospitalizations',
        treatment: 'Treatments',
        test: 'Tests & Procedures',
        lab: 'Lab Reports',
        medication: 'Medications',
        symptom: 'Documented Symptoms',
        other: 'Other Events',
      }
      return map[t] || (t.charAt(0).toUpperCase() + t.slice(1))
    }

    // Render in a sensible order rather than insertion order
    const orderPref = ['diagnosis', 'hospitalization', 'surgery', 'treatment', 'medication', 'test', 'lab', 'symptom', 'other']
    const orderedKeys = [
      ...orderPref.filter(k => groups[k]),
      ...Object.keys(groups).filter(k => !orderPref.includes(k)),
    ]

    for (const type of orderedKeys) {
      const events = groups[type]
      if (!events || !events.length) continue
      w.subSection(typeLabel(type))
      for (const ev of events) {
        const date = ev.date || ''
        const title = collapseDoubledUnits(ev.title || '(untitled)')
        const status = ev.status && ev.status !== 'active' ? ` [${String(ev.status).replace(/_/g, ' ')}]` : ''
        const severity = ev.severity && ev.severity !== 'mild' ? ` (${ev.severity})` : ''
        const provider = ev.provider ? ` — ${ev.provider}` : ''
        w.finding(`${date}: ${title}${severity}${status}${provider}`)
        // Description line if present and reasonably short, to keep the
        // report scannable. Long descriptions truncate with an ellipsis.
        if (ev.description && typeof ev.description === 'string') {
          const cleaned = collapseDoubledUnits(ev.description)
          const desc = cleaned.length > 200
            ? cleaned.slice(0, 197).trim() + '…'
            : cleaned
          w.finding(`    ${desc}`)
        }
      }
    }
  }

  // === PATTERNS & CORRELATIONS (Patterns engine — single source) ===
  // Hoisted function declaration: defined here but CALLED earlier (right after
  // Tracked Conditions / Supporting Evidence) so the correlations render WITH the
  // evidence cluster instead of trailing the entire report. Per Ren, 2026-05-30.
  // 2026-06-11: the inline Pearson re-derivation is GONE — correlations now come
  // from the Patterns engine via getPatterns() (snapshot-first), so the r values
  // in this document always match the app's Patterns tab. pearsonCI95 stays as
  // the doctor-facing presentation layer (Fisher z, added 2026-06-10).
  function renderCorrelations() {
    if (!(data.includePatterns && trackerData.length)) return
    const p = getPatterns()
    if (!p) return

    // Engine correlation insights carry data: { trackerA, trackerB, correlation,
    // sampleSize, preliminary }. Co-occurrence insights (no r value) render as
    // text findings below the table.
    const corrInsights: any[] = p.v1?.correlations || []
    const withR = corrInsights.filter((i: any) => i?.data && typeof i.data.correlation === 'number' && typeof i.data.sampleSize === 'number')
    const coOcc = corrInsights.filter((i: any) => !(i?.data && typeof i.data.correlation === 'number'))
    // Doctor n-floor: the main clinical table holds n >= 5 only (defensible in a
    // medical-legal doc). The engine's floor is 3 so early-data users still see
    // signals in-app — those 3-4-day signals are listed here separately, clearly
    // labeled preliminary, instead of being silently dropped OR silently blended.
    const solid = withR.filter((i: any) => i.data.sampleSize >= 5)
    const prelim = withR.filter((i: any) => i.data.sampleSize < 5)

    if (!withR.length && !coOcc.length) return
    w.sectionHeader(isDoctor ? 'Symptom Correlations' : 'Patterns Found')
    w.note(p.provenance)

    const label = (t: string) => String(t).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    if (solid.length) {
      if (isDoctor) {
        w.note('Pearson correlations between daily symptom severity scores (|r| ≥ 0.3), with 95% confidence intervals (Fisher z). A CI that crosses 0 is not statistically distinguishable from no correlation at this sample size — wide intervals reflect few overlapping days, so keep tracking to narrow them.')
        const rows = solid.slice(0, 10).map((i: any) => {
          const rVal = i.data.correlation, n = i.data.sampleSize
          const [lo, hi] = pearsonCI95(rVal, n)
          return [label(i.data.trackerA), label(i.data.trackerB), rVal.toFixed(2), `${lo.toFixed(2)} to ${hi.toFixed(2)}`, String(n)]
        })
        w.table(['Symptom A', 'Symptom B', 'r', '95% CI', 'Days'], rows, [105, 105, 45, 110, 45], COLORS.correlationHeader)
      } else {
        const rows = solid.slice(0, 10).map((i: any) => {
          const rVal = i.data.correlation
          const rText = `${Math.abs(rVal) >= 0.7 ? 'strong' : 'moderate'} ${rVal > 0 ? 'positive' : 'inverse'}`
          return [label(i.data.trackerA), label(i.data.trackerB), rText, String(i.data.sampleSize)]
        })
        w.table(['Symptom A', 'Symptom B', 'Correlation', 'Days'], rows, [120, 120, 100, 50], COLORS.correlationHeader)
      }
    }
    if (isDoctor && prelim.length) {
      const items = prelim.slice(0, 6).map((i: any) =>
        `${label(i.data.trackerA)} / ${label(i.data.trackerB)} (r=${i.data.correlation.toFixed(2)}, n=${i.data.sampleSize})`
      ).join('; ')
      w.note(`Preliminary signals (fewer than 5 overlapping days — interpret with caution): ${items}.`)
    }
    if (coOcc.length) {
      for (const i of coOcc.slice(0, 5)) {
        if (i?.description) w.finding(i.description)
      }
    }
    w.note('Correlations reflect co-occurrence patterns in patient-reported data and do not imply causation.')
    w.spacer(6)
  }

  // === CUSTOM (FORGE / BUILT) TRACKERS ===
  // The user's own trackers. Built-in assessment sections can't cover these, so
  // without this block a custom tracker's data is silently missing from the
  // record. Renders for every audience. Each field is summarized by its type:
  // numbers -> mean/range, choices -> frequency, checkboxes -> yes-count.
  if (data.customTrackers?.definitions?.length && Array.isArray(data.customTrackers.entries)) {
    const defs = data.customTrackers.definitions
    const byTracker: Record<string, any[]> = {}
    for (const e of data.customTrackers.entries) {
      const tid = e?.content?.trackerId
      if (!tid) continue
      ;(byTracker[tid] ||= []).push(e)
    }
    const defsWithData = defs.filter((d: any) => (byTracker[d.id] || []).length > 0)
    if (defsWithData.length) {
      w.sectionHeader('Custom Trackers')
      w.note('Trackers the patient built themselves (Forge). Included for completeness; not part of the standard symptom set.')
      for (const def of defsWithData) {
        const entries = byTracker[def.id]
        const dates = entries.map(e => e.date).filter(Boolean).sort()
        const span = dates.length
          ? (dates[0] === dates[dates.length - 1] ? dates[0] : `${dates[0]} to ${dates[dates.length - 1]}`)
          : ''
        w.subSection(def.name || 'Custom Tracker')
        w.body(`${plural(entries.length, 'entry', 'entries')}${span ? `, ${span}` : ''}.${def.description ? ` ${def.description}` : ''}`)
        for (const field of (def.fields || [])) {
          const fid = field?.id
          if (!fid) continue
          const label = field.name || fid
          const vals = entries
            .map(e => e?.content?.values?.[fid])
            .filter(v => v !== undefined && v !== null && v !== '')
          if (!vals.length) continue
          const t = field.type
          if (t === 'scale' || t === 'number' || t === 'percentage' || t === 'duration') {
            const nums = vals.map(Number).filter(n => Number.isFinite(n))
            if (!nums.length) continue
            const mean = nums.reduce((a, b) => a + b, 0) / nums.length
            // Format per type so the doctor PDF reads right: SpO2 as %, durations
            // as "1h 20m" (stored as total minutes), others one decimal.
            const fmt = (n: number) =>
              t === 'percentage' ? `${Math.round(n)}%`
              : t === 'duration' ? (Math.floor(n / 60) ? `${Math.floor(n / 60)}h ${Math.round(n % 60)}m` : `${Math.round(n % 60)}m`)
              : `${Math.round(n * 10) / 10}`
            w.bulletBody(label, `mean ${fmt(mean)} (range ${fmt(Math.min(...nums))}-${fmt(Math.max(...nums))}, n=${nums.length})`)
          } else if (t === 'checkbox') {
            const yes = vals.filter(v => v === true || v === 'true').length
            w.bulletBody(label, `yes on ${yes} of ${plural(vals.length, 'day')}`)
          } else if (t === 'dropdown' || t === 'multiselect' || t === 'tags') {
            const freq: Record<string, number> = {}
            for (const v of vals) {
              for (const x of (Array.isArray(v) ? v : [v])) {
                const s = String(x).trim()
                if (s) freq[s] = (freq[s] || 0) + 1
              }
            }
            const top = mergeVariants(freq).slice(0, 8).map(([k, n]) => `${k} (${n}×)`).join(', ')
            if (top) w.bulletBody(label, top)
          } else if (t === 'text') {
            w.bulletBody(label, `${plural(vals.length, 'text entry', 'text entries')} recorded`)
          } else {
            // date / time / datetime / anything else — just confirm it was logged
            w.bulletBody(label, `${plural(vals.length, 'entry', 'entries')}`)
          }
        }
        w.spacer(4)
      }
    }
  }

  // === JOURNAL ENTRIES ===
  const journal = data.journalEntries || []
  if (journal.length) {
    w.sectionHeader(isDoctor ? 'Patient Self-Report' : 'Journal Entries')
    for (const entry of journal.slice(-10)) {
      let content = entry.content || {}
      if (typeof content === 'string') { try { content = JSON.parse(content) } catch { content = { text: content } } }
      const text = typeof content === 'object' ? (content.text || '') : String(content)
      if (text) {
        w.body(`${entry.date || ''}: ${text}`)
      }
    }
  }

  // === WORK & DISABILITY (skipped here for attorney audience — already
  // rendered above, right after Executive Summary, so functional limits
  // lead the report.)
  if (!isAttorney) {
    renderWorkSection()
  }

  // === FOOTER ===
  w.spacer(12)
  w.hr()
  w.note(
    `Generated by Chaos Command Medical Tracking System | ${new Date().toLocaleString()} | ` +
    `This report contains patient-entered data and should be interpreted in clinical context.`
  )

  return doc.output('blob')
}

