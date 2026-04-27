/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * Client-side PDF Report Generator — ported from Flask/ReportLab to jsPDF.
 * "Your data, your words, their language."
 */

import jsPDF from 'jspdf'

// ICD-10 mapping for common tracked symptoms
const ICD10_MAP: Record<string, string> = {
  'pain': 'R52 — Pain, unspecified',
  'head-pain': 'G43.909 — Migraine, unspecified',
  'dysautonomia': 'G90.9 — Disorder of autonomic nervous system, unspecified',
  'seizure': 'R56.9 — Unspecified convulsions',
  'brain-fog': 'R41.82 — Altered mental status, unspecified',
  'upper-digestive': 'K30 — Functional dyspepsia',
  'bathroom': 'R19.7 — Diarrhea, unspecified / K59.00 — Constipation',
  'anxiety': 'F41.9 — Anxiety disorder, unspecified',
  'mental-health': 'F39 — Unspecified mood [affective] disorder',
  'sleep': 'G47.9 — Sleep disorder, unspecified',
  'energy': 'R53.83 — Other fatigue',
  'sensory': 'R44.8 — Other symptoms involving sensations and perceptions',
  'reproductive-health': 'N94.6 — Dysmenorrhea, unspecified',
  'diabetes': 'E11.9 — Type 2 diabetes mellitus without complications',
  'food-choice': 'Z71.3 — Dietary counseling and surveillance',
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
    this.y += lines.length * 5 + 6
  }

  hr() {
    this.doc.setDrawColor(COLORS.hr)
    this.doc.setLineWidth(0.5)
    this.doc.line(this.marginLeft, this.y, this.pageWidth - this.marginRight, this.y)
    this.y += 6
  }

  sectionHeader(text: string) {
    this.checkPage(30)
    this.y += 8
    this.doc.setFontSize(13)
    this.doc.setTextColor(COLORS.section)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(text, this.marginLeft, this.y)
    this.y += 4
    this.doc.setDrawColor(COLORS.gridLine)
    this.doc.setLineWidth(0.3)
    this.doc.line(this.marginLeft, this.y, this.pageWidth - this.marginRight, this.y)
    this.y += 8
  }

  subSection(text: string) {
    this.checkPage(20)
    this.y += 4
    this.doc.setFontSize(11)
    this.doc.setTextColor(COLORS.subsection)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(text, this.marginLeft, this.y)
    this.y += 7
  }

  body(text: string) {
    this.checkPage(15)
    this.doc.setFontSize(9)
    this.doc.setTextColor(COLORS.body)
    this.doc.setFont('helvetica', 'normal')
    const lines = this.doc.splitTextToSize(text, this.contentWidth - 10)
    this.doc.text(lines, this.marginLeft + 5, this.y)
    this.y += lines.length * 4.5 + 3
  }

  finding(text: string) {
    this.checkPage(15)
    this.doc.setFontSize(9)
    this.doc.setTextColor(COLORS.finding)
    this.doc.setFont('helvetica', 'normal')
    const lines = this.doc.splitTextToSize(text, this.contentWidth - 20)
    this.doc.text(lines, this.marginLeft + 15, this.y)
    this.y += lines.length * 4.5 + 3
  }

  note(text: string) {
    this.checkPage(12)
    this.doc.setFontSize(7)
    this.doc.setTextColor(COLORS.note)
    this.doc.setFont('helvetica', 'italic')
    const lines = this.doc.splitTextToSize(text, this.contentWidth)
    this.doc.text(lines, this.marginLeft, this.y)
    this.y += lines.length * 3.5 + 3
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

    this.y = y0 + 4
  }
}

export function generateMedicalReport(data: ReportData): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
  const w = new PDFWriter(doc)
  const isDoctor = data.reportStyle === 'doctor'
  // Attorney/SSDI audience: lead with functional impact, medical evidence
  // follows. Reviewers (lawyers, ALJs, claims examiners) decide "can this
  // person work?" first and use medical detail to support that finding —
  // doctor audience is the inverse, medical first.
  const isAttorney = data.audience === 'attorney'
  const trackerData = data.trackerData || []
  const labResults = data.labResults || []

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
  const trackerCounts: Record<string, number> = {}
  const trackerDayCounts: Record<string, Set<string>> = {}

  for (const r of trackerData) {
    const sub = r.subcategory || ''
    const base = sub.includes('-') ? sub.split('-')[0] : sub
    trackerCounts[base] = (trackerCounts[base] || 0) + 1
    if (!trackerDayCounts[base]) trackerDayCounts[base] = new Set()
    if (r.date) trackerDayCounts[base].add(r.date)
  }

  if (isDoctor) {
    w.sectionHeader('Tracked Conditions (ICD-10)')
    const sorted = Object.entries(trackerCounts).sort((a, b) => b[1] - a[1])
    const rows = sorted.map(([id, count]) => [
      id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      ICD10_MAP[id] || '—',
      String(trackerDayCounts[id]?.size || 0),
      String(count),
    ])
    w.table(['Condition', 'ICD-10 Code', 'Days', 'Entries'], rows, [100, 200, 60, 60])
    w.note('ICD-10 codes shown are suggestions based on tracked symptoms and may not match official diagnoses.')
    w.spacer(6)
  } else {
    w.sectionHeader('What Was Tracked')
    const sorted = Object.entries(trackerCounts).sort((a, b) => b[1] - a[1])
    for (const [id, count] of sorted) {
      const label = id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      w.body(`${label}: ${count} entries`)
    }
  }

  // === PAIN SUMMARY ===
  const painEntries = trackerData.filter(r => r.subcategory === 'pain')
  if (painEntries.length) {
    w.sectionHeader(isDoctor ? 'Pain Assessment' : 'Pain Summary')
    const painLevels: number[] = []
    const weeklyPain: Record<string, number[]> = {}

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
      }
    }

    if (painLevels.length) {
      const avg = painLevels.reduce((a, b) => a + b, 0) / painLevels.length
      const maxP = Math.max(...painLevels)
      const minP = Math.min(...painLevels)

      if (isDoctor) {
        w.body(`Mean pain severity: ${avg.toFixed(1)}/10 (range ${minP}-${maxP}, n=${painLevels.length})`)
      } else {
        w.body(`Average pain level: ${avg.toFixed(1)} out of 10 (worst: ${maxP}, best: ${minP}, over ${painLevels.length} entries)`)
      }

      const weeks = Object.keys(weeklyPain).sort()
      if (weeks.length >= 2) {
        const rows = weeks.map(wk => {
          const vals = weeklyPain[wk]
          return [wk, (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1), String(vals.length)]
        })
        w.table(['Month', 'Avg Pain', 'Entries'], rows, [100, 80, 60], COLORS.painHeader)
      }
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
          w.finding(`${r.test_name || ''}: ${r.value_text || ''} ${r.unit || ''} (ref: ${r.reference_text || '—'})${flag}`)
        }
      }
    }
  }

  // === PATTERNS & CORRELATIONS (Pearson) ===
  if (data.includePatterns && trackerData.length) {
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
