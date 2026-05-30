/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * Client-side PDF Report Generator — ported from Flask/ReportLab to jsPDF.
 * "Your data, your words, their language."
 */

import jsPDF from 'jspdf'

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

// ICD-10 mapping for tracked SYMPTOMS / CONDITIONS only.
// Deliberately NOT coded: lifestyle/wellness/behavior trackers. Logging a healthy behavior
// or a subjective state is NOT a diagnosis — auto-coding it (food logging → "dietary
// surveillance", self-care → "disability limitation", drinking water → "dehydration",
// sleeping → "sleep disorder") can mislead a clinician, follow a patient through their
// records, and affect insurance. Those trackers render "—" instead.
// Yeeted 2026-05-28 per Ren (behaviors/disorders → "—"): food-choice, self-care(+tracker),
// movement, hydration, sleep, coping, crisis-support, mental-health/mood, anxiety, substance, weather.
// Softened to gentle symptom codes: brain-fog, energy. Real dx will come from the timeline (CHA-241).
const ICD10_MAP: Record<string, string> = {
  // ── Genuine symptom / condition trackers (a clinician wants these) ──
  'pain': 'R52 — Pain, unspecified',
  'head-pain': 'G43.909 — Migraine, unspecified',
  'dysautonomia': 'G90.9 — Disorder of autonomic nervous system, unspecified',
  'seizure': 'R56.9 — Unspecified convulsions / G40.901 — Epilepsy, unspecified',
  'upper-digestive': 'K30 — Functional dyspepsia',
  'bathroom': 'R19.7 — Diarrhea / K59.00 — Constipation / N39.0 — UTI',
  'sensory': 'R44.8 — Sensory perception disturbance',
  'sensory-tracker': 'R44.8 — Sensory perception disturbance',
  'reproductive-health': 'N94.6 — Dysmenorrhea, unspecified',
  'diabetes': 'E11.9 — Type 2 diabetes mellitus without complications',
  'cardiac': 'R00.2 — Palpitations / I49.9 — Cardiac arrhythmia, unspecified',
  'respiratory': 'R06.02 — Shortness of breath / J45.909 — Asthma, unspecified',
  'skin': 'L29.9 — Pruritus / L50.9 — Urticaria, unspecified',
  'joint': 'M25.50 — Pain in unspecified joint',
  'food-allergens': 'T78.40XA — Allergy, unspecified, initial encounter / K90.0 — Celiac disease',
  // ── Subjective SYMPTOM trackers: gentle SYMPTOM codes (R-codes) only — never a disorder dx ──
  'brain-fog': 'R41.840 — Attention and concentration deficit',  // softened from R41.82 "altered mental status"
  'energy': 'R53.83 — Other fatigue',
  // NOTE: mood/Mind&Mood, anxiety, substance, and weather render "—" on purpose. Their only honest
  // codes are disorder diagnoses (F39, F41.9, F10.10) or non-conditions — auto-assigning those from
  // tracker type pathologizes the act of tracking. Substance especially: NEVER auto-flag a use disorder.
  // Real diagnoses will be pulled from the user's medical timeline instead — see CHA-241.
}

// Display names — fixes the "head-pain" → "Head" truncation bug
const TRACKER_DISPLAY_NAMES: Record<string, string> = {
  'pain': 'Pain',
  'head-pain': 'Head Pain',
  'dysautonomia': 'Dysautonomia',
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
  'cardiac': 'Cardiac',
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
  // and strip duplicate-word artifacts like "Hydration Hydration" → "Hydration"
  const dedup = sub.replace(/^(\w+(?:[-\s]\w+)*)\s+\1$/i, '$1')
  return dedup.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Known canonical tracker slugs, longest-first. Trackers like hydration save each
// entry under a UNIQUE per-entry subcategory (e.g. "hydration-hydration-1716..."),
// which spawned a separate "Hydration Hydration" row per entry. Collapsing back to the
// base key ("hydration") makes them aggregate into one row. Longest-match-first protects
// multi-word slugs like "head-pain" from being shortened to "head" (the v1 bug).
const KNOWN_TRACKER_KEYS = Array.from(
  new Set([...Object.keys(TRACKER_DISPLAY_NAMES), ...Object.keys(ICD10_MAP)])
).sort((a, b) => b.length - a.length)

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
  workData?: { missedWork?: any[]; employment?: any[]; applications?: any[] } | null
  medications?: any[]
  appointments?: any[]
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
    this.y += lines.length * 11 + 6 // 9pt text needs ~11pt line height (was 5 → squampy/overlap)
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
    this.checkPage(15)
    this.doc.setFontSize(9)
    this.doc.setTextColor(COLORS.body)
    this.doc.setFont('helvetica', 'normal')
    const lines = this.doc.splitTextToSize(text, this.contentWidth - 10)
    this.doc.text(lines, this.marginLeft + 5, this.y)
    this.y += lines.length * 11 + 4 // 9pt text needs ~11pt line height (was 5 → lines overlapped)
  }

  bulletBody(label: string, value: string) {
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
    this.y += Math.max(1, lines.length) * 11 + 3 // 9pt line height (was 5 → bullet list crammed/overlapped)
  }

  finding(text: string) {
    this.checkPage(15)
    this.doc.setFontSize(9)
    this.doc.setTextColor(COLORS.finding)
    this.doc.setFont('helvetica', 'normal')
    const lines = this.doc.splitTextToSize(text, this.contentWidth - 20)
    this.doc.text(lines, this.marginLeft + 15, this.y)
    this.y += lines.length * 11 + 3 // 9pt line height (was 4.5 → wrapped findings overlapped the next block)
  }

  note(text: string) {
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

    // Data rows
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(COLORS.body)

    rows.forEach((row, ri) => {
      // Page break check
      if (y0 + rowHeight > this.doc.internal.pageSize.getHeight() - this.marginBottom) {
        this.doc.addPage()
        y0 = this.marginTop
      }

      // Alternating background
      if (ri % 2 === 1) {
        this.doc.setFillColor(COLORS.altRow)
        this.doc.rect(x0, y0, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F')
      }

      cx = x0
      row.forEach((cell, ci) => {
        const maxWidth = colWidths[ci] - 8
        const truncated = this.doc.splitTextToSize(cell, maxWidth)[0] || ''
        this.doc.setFontSize(8)
        this.doc.text(truncated, cx + 4, y0 + 10)
        cx += colWidths[ci]
      })

      // Grid lines
      this.doc.setDrawColor(COLORS.gridLine)
      this.doc.setLineWidth(0.3)
      cx = x0
      for (let i = 0; i <= colWidths.length; i++) {
        this.doc.line(cx, y0, cx, y0 + rowHeight)
        cx += colWidths[i] || 0
      }
      this.doc.line(x0, y0 + rowHeight, x0 + colWidths.reduce((a, b) => a + b, 0), y0 + rowHeight)

      y0 += rowHeight
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
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} (${v}×)`).join(', ')
  const meanOf = (a: number[]) => a.length ? (a.reduce((x, y) => x + y, 0) / a.length) : 0

  // === HEADER ===
  w.title('Patient Health Report')

  const demo = data.demographics || {}
  const patientName = demo.legalName || demo.preferredName || 'Patient'
  const dob = demo.dateOfBirth || ''
  const dateRange = data.dateRange || { start: '?', end: '?' }

  const subtitleParts: string[] = []
  if (patientName) subtitleParts.push(`Patient: ${patientName}`)
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

  w.sectionHeader('Executive Summary')
  let summaryText = `This report covers ${uniqueDates.size} days of tracked health data across ${trackerTypes.size} symptom categories. `
  if (labResults.length) summaryText += `${labResults.length} laboratory result set(s) included. `
  w.body(summaryText)

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
  const displayToKey: Record<string, string> = {} // remember a canonical key for ICD lookup

  for (const r of trackerData) {
    const sub = canonicalSub(r.subcategory || '')   // collapse per-entry suffixes to the base tracker
    if (!sub) continue
    const display = displayName(sub)
    trackerCounts[display] = (trackerCounts[display] || 0) + 1
    if (!trackerDayCounts[display]) trackerDayCounts[display] = new Set()
    if (r.date) trackerDayCounts[display].add(r.date)
    // Prefer a key that maps to ICD10_MAP if any
    if (!displayToKey[display] || (ICD10_MAP[sub] && !ICD10_MAP[displayToKey[display]])) {
      displayToKey[display] = sub
    }
  }

  // Helper: pull top symptom/trigger evidence for a given tracker so doctors
  // can validate the ICD-10 suggestion against actual tracked content.
  const collectEvidence = (sub: string): string => {
    const records = trackerData.filter((r: any) => canonicalSub(r.subcategory || '') === sub)
    const counts: Record<string, number> = {}
    for (const r of records) {
      const c = r.content || {}
      const entries = Array.isArray(c.entries) ? c.entries : [c]
      for (const e of entries) {
        const items = [
          ...(e.symptoms || []),
          ...(e.physicalSymptoms || []),
          ...(e.painLocations || e.painLocation || []),
          ...(e.painCharacter || e.painType || []),
          ...(e.triggers || []),
          ...(e.auraSymptoms || []),
          ...(e.associatedSymptoms || []),
        ]
        for (const item of items) {
          if (typeof item === 'string') counts[item] = (counts[item] || 0) + 1
        }
        // Boolean red flags get listed as evidence too
        const flags: [boolean, string][] = [
          [!!e.statusEpilepticus, 'status epilepticus'],
          [!!e.tearingQuality, 'tearing pain'],
          [!!e.thunderclapPattern || !!e.thunderclapOnset, 'thunderclap onset'],
          [!!e.worstHeadacheOfLife, 'worst headache of life'],
          [!!e.epipenUsed, 'EpiPen used'],
          [!!e.suicidalIdeation, 'suicidal ideation flagged'],
        ]
        for (const [present, label] of flags) {
          if (present) counts[label] = (counts[label] || 0) + 1
        }
      }
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4)
    return top.length > 0 ? top.map(([k, v]) => `${k} (${v}×)`).join(', ') : ''
  }

  if (isDoctor) {
    w.sectionHeader('Tracked Conditions (ICD-10)')
    const sorted = Object.entries(trackerCounts).sort((a, b) => b[1] - a[1])
    const rows = sorted.map(([display, count]) => {
      const canonicalKey = displayToKey[display]
      return [
        display,
        ICD10_MAP[canonicalKey] || '—',
        String(trackerDayCounts[display]?.size || 0),
        String(count),
      ]
    })
    w.table(['Condition', 'ICD-10 Code', 'Days', 'Entries'], rows, [110, 230, 50, 50])
    w.note('ICD-10 codes shown are suggestions based on tracked symptoms and may not match official diagnoses. Supporting evidence below.')

    // Supporting evidence subsection — key signals that validate each ICD suggestion
    w.spacer(4)
    w.subSection('Supporting evidence (top symptoms/triggers per tracker)')
    for (const [display] of sorted) {
      const canonicalKey = displayToKey[display]
      const evidence = collectEvidence(canonicalKey)
      if (evidence) {
        w.bulletBody(display, evidence)
      }
    }
    w.spacer(6)
  } else {
    w.sectionHeader('What Was Tracked')
    const sorted = Object.entries(trackerCounts).sort((a, b) => b[1] - a[1])
    for (const [display, count] of sorted) {
      w.bulletBody(display, `${count} entries`)
    }
  }

  // === MEDICATIONS (current + discontinued regimen) — all audiences ===
  // SSDI/attorney AND doctor both need this: a maintained med regimen is
  // treatment-compliance evidence, and current meds are foundational clinical
  // context. From the MANAGE section (per Ren, 2026-05-30, CHA-246).
  const medications = data.medications || []
  if (medications.length) {
    w.sectionHeader('Medications')
    const isStopped = (m: any) => m.active === false || !!m.dateStopped
    const active = medications.filter((m: any) => !isStopped(m))
    const stopped = medications.filter(isStopped)
    const nameOf = (m: any) => (m.brandName || m.genericName || 'Unnamed') + ((m.brandName && m.genericName) ? ` (${m.genericName})` : '')
    if (active.length) {
      w.subSection(`Current medications (${active.length})`)
      const rows = active.map((m: any) => [nameOf(m), m.dose || '', m.time || '', m.conditionTreating || ''])
      w.table(['Medication', 'Dose', 'Schedule', 'Treating'], rows, [180, 70, 75, 115])
      const withReminders = active.filter((m: any) => m.enableReminders && (m.reminderTimes || []).length).length
      if (withReminders > 0) w.body(`${withReminders} of ${active.length} current medications have scheduled reminders set — adherence support in place.`)
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
    w.body(`${reviews.length} appointment(s) attended and reviewed; ${pastPlans.length} additional past appointment(s) on record; ${upcoming.length} upcoming. Documents consistent engagement with medical care.`)
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
        ? `Mean pain severity: ${avg.toFixed(1)}/10 (range ${minP}-${maxP}, n=${painLevels.length} entries)`
        : `Average pain level: ${avg.toFixed(1)}/10 (worst: ${maxP}, best: ${minP}, ${painLevels.length} entries)`)
    }

    // Top locations / character / pattern
    const topN = (obj: Record<string, number>, n = 6) =>
      Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} (${v}×)`).join(', ')
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
      w.body(`${total} episodes. Mean intensity ${avg.toFixed(1)}/10. With aura: ${withAura} (${Math.round(withAura/total*100)}%).`)
    }
    if (whol > 0) w.finding(`"Worst headache of life" reported ${whol}× — SAH workup if not yet done.`)
    if (thunderclap > 0) w.finding(`Thunderclap onset reported ${thunderclap}× — SAH/RCVS differential.`)
    if (multiRescue > 0) w.body(`Multi-rescue migraine days (Nurtec + Imitrex etc.): ${multiRescue} — suggests acute regimen may be undertreated; preventive escalation discussion warranted.`)
    if (flareDeltas.length >= 2) {
      const avgD = flareDeltas.reduce((a, b) => a + b, 0) / flareDeltas.length
      const extreme = flareDeltas.filter(d => d >= 5).length
      w.body(`Baseline-delta tracking: average +${avgD.toFixed(1)} above patient's typical-headache-day baseline (n=${flareDeltas.length}). ${extreme} extreme flares (+5).`)
    }
    const typeRows = Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, c]) => [t, String(c)])
    if (typeRows.length) {
      w.subSection('Episode type distribution')
      w.table(['Type', 'Count'], typeRows, [200, 60])
    }
    const trigEntries = Object.entries(triggers).sort((a, b) => b[1] - a[1]).slice(0, 6)
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
        if (t) types[t] = (types[t] || 0) + 1
        ;(e.triggers || []).forEach((tr: string) => { triggers[tr] = (triggers[tr] || 0) + 1 })
        ;(e.symptoms || e.seizureSymptoms || []).forEach((s: string) => { symptoms[s] = (symptoms[s] || 0) + 1 })
      }
    }
    w.body(`${total} seizure events recorded. Aura present in ${withAura} (${total ? Math.round(withAura/total*100) : 0}%). Rescue med used: ${rescueUsed}×. EMS: ${ems}×. Injuries: ${injuries}×.`)
    if (statusEpi > 0) w.finding(`Status epilepticus events: ${statusEpi} — neurological emergency, neurology follow-up indicated.`)
    if (autonomic >= 3) w.finding(`Autonomic seizure pattern: ${autonomic} events — often misdiagnosed as POTS/MCAS/panic; consider EEG with autonomic monitoring.`)
    const typeRows = Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, c]) => [String(t), String(c)])
    if (typeRows.length) {
      w.subSection('Episode type distribution')
      w.table(['Type', 'Count'], typeRows, [240, 60])
    }
    const symRows = Object.entries(symptoms).sort((a, b) => b[1] - a[1]).slice(0, 8)
    if (symRows.length) w.body(`Top ictal symptoms: ${symRows.map(([s, c]) => `${s} (${c}×)`).join(', ')}`)
    const trigRows = Object.entries(triggers).sort((a, b) => b[1] - a[1]).slice(0, 6)
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
    w.body(`${total} reactions tracked. Anaphylaxis: ${anaphylaxis} (EpiPen used ${epipen}×). Celiac/autoimmune: ${celiac}. Intolerance: ${intolerance}. ER: ${er}. Hospitalized: ${hosp}.`)
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
    const allRows = Object.entries(allergens).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([a, c]) => [a, String(c)])
    if (allRows.length) {
      w.subSection('Top reported triggers')
      w.table(['Allergen / trigger', 'Reactions'], allRows, [240, 80])
    }
    const srcRows = Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 6)
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
    w.body(`${total} cardiac events. Syncope (full LOC): ${syncope}. ER required: ${er}. ECG strips uploaded: ${ecgFiles}.`)
    if (vt > 0) w.finding(`Ventricular tachycardia captured ${vt}× — urgent cardiology / EP consult.`)
    if (syncope >= 2) w.finding(`Recurrent syncope (${syncope}×) — tilt-table or extended Holter indicated.`)
    if (hrPeaks.length) {
      const max = Math.max(...hrPeaks), min = Math.min(...hrPeaks)
      const avg = hrPeaks.reduce((a, b) => a + b, 0) / hrPeaks.length
      w.body(`Heart rate peaks: range ${min}-${max}, avg ${avg.toFixed(0)} bpm (n=${hrPeaks.length} events).`)
    }
    const rhythmRows = Object.entries(rhythms).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([r, c]) => [r, String(c)])
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
      }
    }
    w.body(`${total} respiratory events. Asthma attacks: ${asthma}. Allergic reactions: ${allergic}. Red-zone peak flow: ${redZone}. ER: ${er}.`)
    if (redZone >= 1) w.finding(`Red-zone peak flow recorded ${redZone}× — uncontrolled asthma / step-up therapy discussion.`)
    const typeRows = Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, c]) => [t, String(c)])
    if (typeRows.length) w.table(['Episode type', 'Count'], typeRows, [240, 80])
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
    w.body(`${total} skin events. Photos captured: ${photos} (available in app for dermatology consult). ER: ${er}.`)
    if (throatTight > 0) w.finding(`Throat tightness with skin reaction reported ${throatTight}× — anaphylaxis pattern.`)
    if (mucous > 0) w.finding(`Mucous membrane involvement ${mucous}× — SJS/TEN differential if drug-related.`)
    const typeRows = Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, c]) => [t, String(c)])
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
    let swelling = 0, bruising = 0, erVisits = 0
    for (const r of jointEntries) {
      const entries = Array.isArray(r.content?.entries) ? r.content.entries : [r.content]
      for (const e of entries) {
        if (!e) continue
        total++
        const et = e.episodeType
        if (et) types[et] = (types[et] || 0) + 1
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
    w.body(`${total} MSK events.${sevTxt}`)

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
    if (treatmentResp.length) {
      const avgT = treatmentResp.reduce((a, b) => a + b, 0) / treatmentResp.length
      w.body(`Mean treatment response: ${avgT.toFixed(1)}/10 (n=${treatmentResp.length}).`)
    }

    // Episode-type distribution (weakness, subluxation, dislocation, cramping,
    // fasciculations, muscle-tightness, instability, ROM-restriction, etc.)
    const typeRows = Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, c]) => [t, String(c)])
    if (typeRows.length) {
      w.subSection('Episode type distribution')
      w.table(['Type', 'Count'], typeRows, [240, 80])
    }

    const jointRows = Object.entries(jointFreq).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([j, c]) => [j, String(c)])
    if (jointRows.length) {
      w.subSection('Per-joint frequency (for orthopedic consult)')
      w.table(['Joint', 'Events'], jointRows, [240, 80])
    }

    const muscleRows = Object.entries(muscleFreq).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([m, c]) => [m, String(c)])
    if (muscleRows.length) {
      w.subSection('Per-muscle-group frequency (weakness / cramping / fasciculations)')
      w.table(['Muscle group', 'Events'], muscleRows, [240, 80])
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
    w.body(`${total} entries. Constipation: ${types['constipation'] || 0}. Diarrhea: ${types['diarrhea'] || 0}. Urinary: ${types['urinary'] || 0}.`)
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
      w.body(`${total} entries. Mean anxiety ${avg.toFixed(1)}/10. Panic attacks: ${panicAttacks}. Meltdowns: ${meltdowns}.`)
    }
    if (si > 0 || sh > 0) {
      w.subSection('Crisis-flagged entries')
      if (si > 0) w.finding(`Suicidal ideation flagged: ${si} entries.`)
      if (sh > 0) w.finding(`Self-harm urges flagged: ${sh} entries.`)
      if (hopeless > 0) w.finding(`Hopelessness flagged: ${hopeless} entries.`)
      if (crisisContact > 0) w.body(`Patient reached out for crisis support: ${crisisContact}× (988 / therapist / etc.) — protective factor documented.`)
      if (hospConsidered > 0) w.finding(`Hospitalization considered: ${hospConsidered}×.`)
    }
    const typeRows = Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, c]) => [t, String(c)])
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
    w.body(`${total} check-ins. Mean depression ${avg(depLevels)}/10. Mean mania ${avg(maniaLevels)}/10. Mean energy ${avg(energyLevels)}/10. Mean brain fog ${avg(fogLevels)}/10.`)
    if (mixedState > 0) w.finding(`Mixed-state days (high dep + high mania): ${mixedState} — highest suicide-risk window in mood disorders.`)
    if (rapidCycling > 0) w.finding(`Rapid cycling reported ${rapidCycling}× — affects medication choice; consider discussing with prescriber.`)
    const typeRows = Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, c]) => [t, String(c)])
    if (typeRows.length) w.table(['Check-in focus', 'Count'], typeRows, [240, 80])
  }

  // ============================================================================
  // EXPANDED TRACKER SECTIONS (CHA-246, 2026-05-30) — these trackers save real
  // data the v1 report dropped ENTIRELY (no section at all). Each reads via
  // gatherEntries() so it matches the tracker's true storage shape.
  // NOTE: self-care is deliberately NOT exported — per Ren (disability-law), it's
  // an adverse-inference risk for SSDI ("went to the park → why didn't you work?").
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
      w.body(`${ud.length} upper-GI episodes.${sev.length ? ` Mean severity ${meanOf(sev).toFixed(1)}/10 (peak ${Math.max(...sev)}/10).` : ''}`)
      if (Object.keys(symptoms).length) w.body(`Top symptoms: ${tn(symptoms)}`)
      if (Object.keys(triggers).length) w.body(`Top triggers: ${tn(triggers)}`)
      if (Object.keys(treatments).length) w.body(`Treatments tried: ${tn(treatments)}`)
      const tr = Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, c]) => [t, String(c)])
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
      w.body(`${overloads.length} sensory-overload episodes${lvl.length ? `, mean intensity ${meanOf(lvl).toFixed(1)}/10 (peak ${Math.max(...lvl)}/10)` : ''}. Shutdown after ${shutdowns}.`)
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
      w.body(`${sub.length} entries logged (patient-recorded; not a diagnosis of a use disorder).`)
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
      w.body(`${mv.length} movement sessions. Mean energy before ${meanOf(before).toFixed(1)}/10, after ${meanOf(after).toFixed(1)}/10. Energy dropped after activity on ${worse}/${mv.length} sessions${worse ? ' — exertion-intolerance signal relevant to functional capacity' : ''}.`)
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
      const tr = Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, c]) => [t, String(c)])
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
        const types: Record<string, number> = {}, impact: Record<string, number> = {}
        for (const e of wx) {
          const wts: string[] = e.weatherTypes || (e.weatherType ? [e.weatherType] : [])
          wts.forEach((t: string) => { types[t] = (types[t] || 0) + 1 })
          if (e.impact) impact[e.impact] = (impact[e.impact] || 0) + 1
        }
        w.body(`${wx.length} weather logs. Conditions: ${tn(types)}. Reported symptom impact: ${tn(impact)}.`)
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
        w.body(`${totalMeals} meals logged across ${fc.length} days (${ate} confirmed eaten). Supports nutrition / GI and appetite / ARFID assessment.`)
        if (Object.keys(meals).length) w.body(`Meal timing: ${tn(meals)}`)
        if (Object.keys(moods).length) w.body(`Mood around eating: ${tn(moods)}`)
      }
    }
  }

  // === DETECTED PATTERNS (v2 engine) ===
  if (isDoctor) {
    try {
      const { analyzeV2Patterns } = require('@/lib/pattern-engine-v2')
      const patternsByTracker: Record<string, any[]> = {}
      for (const r of trackerData) {
        if (!r.subcategory) continue
        if (!patternsByTracker[r.subcategory]) patternsByTracker[r.subcategory] = []
        patternsByTracker[r.subcategory].push(r)
      }
      const v2 = analyzeV2Patterns(patternsByTracker, 90)
      const high = v2.insights.filter((i: any) => i.impact === 'high')
      if (high.length > 0) {
        w.sectionHeader('Detected Medical Patterns')
        w.body(`Pattern engine detected ${high.length} high-impact pattern${high.length !== 1 ? 's' : ''} in tracked data:`)
        for (const insight of high.slice(0, 12)) {
          w.subSection(insight.title)
          w.body(insight.description)
        }
        if (high.length > 12) w.note(`(${high.length - 12} additional high-impact patterns shown in app's Patterns → Red Flags tab)`)
      }
    } catch (err) {
      // Pattern engine load failed — non-fatal, just skip the section
      console.error('Pattern engine v2 failed in PDF:', err)
    }
  }

  // === DYSAUTONOMIA / VITALS ===
  const dysEntries = trackerData.filter(r => r.subcategory === 'dysautonomia')
  if (dysEntries.length) {
    w.sectionHeader(isDoctor ? 'Autonomic Assessment' : 'Dysautonomia Summary')
    const hrDeltas: number[] = []

    for (const r of dysEntries) {
      const content = r.content || {}
      const entries = Array.isArray(content.entries) ? content.entries : []
      for (const e of entries) {
        if (e?.restingHeartRate && e?.standingHeartRate) {
          hrDeltas.push(e.standingHeartRate - e.restingHeartRate)
        }
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
  }

  // === SLEEP ===
  const sleepEntries = trackerData.filter(r => (r.subcategory || '').startsWith('sleep'))
  if (sleepEntries.length) {
    w.sectionHeader(isDoctor ? 'Sleep Assessment' : 'Sleep Summary')
    const hoursList: number[] = []

    for (const r of sleepEntries) {
      let content = r.content || {}
      if (typeof content === 'string') { try { content = JSON.parse(content) } catch { continue } }
      if (content.hoursSlept) hoursList.push(Number(content.hoursSlept))
    }

    if (hoursList.length) {
      const avg = hoursList.reduce((a, b) => a + b, 0) / hoursList.length
      if (isDoctor) {
        w.body(`Mean sleep duration: ${avg.toFixed(1)} hours/night (n=${hoursList.length}). Range: ${Math.min(...hoursList).toFixed(1)}-${Math.max(...hoursList).toFixed(1)} hours.`)
      } else {
        w.body(`Averaging ${avg.toFixed(1)} hours of sleep per night over ${hoursList.length} nights (worst: ${Math.min(...hoursList).toFixed(1)}h, best: ${Math.max(...hoursList).toFixed(1)}h).`)
      }
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

    const groups: Record<string, any[]> = {}
    for (const ev of sorted) {
      if (ev.type === 'dismissed_findings') continue
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
        const title = ev.title || '(untitled)'
        const status = ev.status && ev.status !== 'active' ? ` [${String(ev.status).replace(/_/g, ' ')}]` : ''
        const severity = ev.severity && ev.severity !== 'mild' ? ` (${ev.severity})` : ''
        const provider = ev.provider ? ` — ${ev.provider}` : ''
        w.finding(`${date}: ${title}${severity}${status}${provider}`)
        // Description line if present and reasonably short, to keep the
        // report scannable. Long descriptions truncate with an ellipsis.
        if (ev.description && typeof ev.description === 'string') {
          const desc = ev.description.length > 200
            ? ev.description.slice(0, 197).trim() + '…'
            : ev.description
          w.finding(`    ${desc}`)
        }
      }
    }
  }

  // === PATTERNS & CORRELATIONS (Pearson) ===
  // Hoisted function declaration: defined here but CALLED earlier (right after
  // Tracked Conditions / Supporting Evidence) so the correlations render WITH the
  // evidence cluster instead of trailing the entire report. Per Ren, 2026-05-30.
  function renderCorrelations() {
    if (!(data.includePatterns && trackerData.length)) return
    const dayScores: Record<string, Record<string, number[]>> = {}

    for (const r of trackerData) {
      const date = r.date || ''
      const sub = r.subcategory || ''
      const base = sub.includes('-') ? sub.split('-')[0] : sub
      const content = r.content || {}

      if (typeof content === 'object' && content !== null) {
        const entries = Array.isArray(content.entries) ? content.entries : []
        for (const e of entries) {
          if (typeof e === 'object' && e !== null) {
            for (const key of ['painLevel', 'severity', 'intensity', 'level', 'rating', 'fogLevel', 'anxietyLevel', 'nausea', 'bloating']) {
              if (e[key] != null) {
                const val = Number(e[key])
                if (!isNaN(val)) {
                  if (!dayScores[date]) dayScores[date] = {}
                  if (!dayScores[date][base]) dayScores[date][base] = []
                  dayScores[date][base].push(val)
                }
              }
            }
          }
        }
      }
    }

    if (Object.keys(dayScores).length >= 5) {
      const trackerBases = [...new Set(Object.values(dayScores).flatMap(d => Object.keys(d)))].sort()
      const correlations: [string, string, number, number][] = []

      for (let i = 0; i < trackerBases.length; i++) {
        for (let j = i + 1; j < trackerBases.length; j++) {
          const t1 = trackerBases[i], t2 = trackerBases[j]
          const paired: [number, number][] = []

          for (const date of Object.keys(dayScores)) {
            const d = dayScores[date]
            if (d[t1]?.length && d[t2]?.length) {
              const avg1 = d[t1].reduce((a, b) => a + b, 0) / d[t1].length
              const avg2 = d[t2].reduce((a, b) => a + b, 0) / d[t2].length
              paired.push([avg1, avg2])
            }
          }

          if (paired.length >= 5) {
            const n = paired.length
            const x = paired.map(p => p[0])
            const y = paired.map(p => p[1])
            const meanX = x.reduce((a, b) => a + b, 0) / n
            const meanY = y.reduce((a, b) => a + b, 0) / n
            const num = paired.reduce((s, [xi, yi]) => s + (xi - meanX) * (yi - meanY), 0)
            const denX = Math.sqrt(x.reduce((s, xi) => s + (xi - meanX) ** 2, 0))
            const denY = Math.sqrt(y.reduce((s, yi) => s + (yi - meanY) ** 2, 0))
            if (denX > 0 && denY > 0) {
              const rVal = num / (denX * denY)
              if (Math.abs(rVal) >= 0.3) {
                correlations.push([t1, t2, rVal, n])
              }
            }
          }
        }
      }

      if (correlations.length) {
        correlations.sort((a, b) => Math.abs(b[2]) - Math.abs(a[2]))
        w.sectionHeader(isDoctor ? 'Symptom Correlations' : 'Patterns Found')

        if (isDoctor) {
          w.note('Pearson correlations between daily symptom severity scores (|r| >= 0.3):')
        }

        const rows = correlations.slice(0, 10).map(([t1, t2, rVal, n]) => {
          const label1 = t1.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          const label2 = t2.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          const rText = isDoctor
            ? `r=${rVal.toFixed(2)}`
            : `${Math.abs(rVal) >= 0.7 ? 'strong' : 'moderate'} ${rVal > 0 ? 'positive' : 'inverse'}`
          return [label1, label2, rText, String(n)]
        })

        w.table(['Symptom A', 'Symptom B', 'Correlation', 'Days'], rows, [120, 120, 100, 50], COLORS.correlationHeader)
        w.note('Correlations reflect co-occurrence patterns in patient-reported data and do not imply causation.')
        w.spacer(6)
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
