/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * Lab Results — Upload lab reports, extract values, track trends.
 * "Your ferritin has been 7, 8, 9 for six weeks. This is not 'fine'."
 */
"use client"

import { useState, useEffect, useCallback } from "react"
import AppCanvas from "@/components/app-canvas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDailyData } from "@/lib/database/hooks/use-daily-data"
import { CATEGORIES, SUBCATEGORIES, formatDateForStorage } from "@/lib/database/dexie-db"
import { backendFetch, FLASK_URL } from "@/lib/utils/tauri-fetch"
import {
  Upload, FileText, Search, TestTube, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Calendar, Minus, Trash2,
  ClipboardList, Edit3, Save, X
} from "lucide-react"

interface LabResult {
  test_name: string
  value: number | null
  value_text: string
  unit: string
  reference_low: number | null
  reference_high: number | null
  reference_text: string
  flag: string
  is_abnormal: boolean
  context: string
  confidence: number
  date?: string  // Per-test date override (for multi-date reports)
}

interface LabReport {
  id: string
  date: string
  filename: string
  results: LabResult[]
  addedDate: string
}

export default function LabResultsPage() {
  const { saveData, getAllCategoryData, deleteData } = useDailyData()

  const [reports, setReports] = useState<LabReport[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadDate, setUploadDate] = useState(formatDateForStorage(new Date()))
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedReport, setExpandedReport] = useState<string | null>(null)
  const [filterAbnormal, setFilterAbnormal] = useState(false)
  const [editingTest, setEditingTest] = useState<{ reportId: string; idx: number } | null>(null)
  const [editValues, setEditValues] = useState<Partial<LabResult>>({})

  // Load existing reports
  const loadReports = useCallback(async () => {
    try {
      const records = await getAllCategoryData(CATEGORIES.USER)
      const labRecords = records
        ?.filter((r: any) => r.subcategory === 'lab-results' || r.subcategory.startsWith('lab-results-'))
        ?.map((r: any) => {
          const report = typeof r.content === 'string' ? JSON.parse(r.content) : r.content
          report._subcategory = r.subcategory  // Preserve for delete
          return report
        })
        ?.sort((a: LabReport, b: LabReport) => b.date.localeCompare(a.date)) || []
      setReports(labRecords)
    } catch (e) {
      console.error("Failed to load lab reports:", e)
    }
  }, [getAllCategoryData])

  useEffect(() => { loadReports() }, [loadReports])

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    try {
      // Read file to base64
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      const base64Data = btoa(binary)

      // Fetch demographics for filtering
      let demographics = null
      try {
        const allRecords = await getAllCategoryData(CATEGORIES.USER)
        const demoRecord = allRecords
          ?.filter((r: any) => r.subcategory === 'demographics')
          ?.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''))
          ?.[0]
        if (demoRecord?.content) {
          demographics = typeof demoRecord.content === 'string'
            ? JSON.parse(demoRecord.content)
            : demoRecord.content
        }
      } catch (e) {
        console.log('No demographics data found')
      }

      // Send to Flask for lab parsing
      const response = await backendFetch(`${FLASK_URL}/api/labs/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileType: file.type,
          fileData: base64Data,
          demographics,
          labDate: uploadDate,
        }),
        timeout: 60000,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `Server error ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.labs && result.labs.length > 0) {
        // Use detected lab draw date if available, otherwise use selected date
        const labDate = result.suggestedDate || uploadDate
        if (result.suggestedDate && result.suggestedDate !== uploadDate) {
          console.log(`📅 Using detected lab date: ${result.suggestedDate} (instead of ${uploadDate})`)
        }

        const report: LabReport = {
          id: `lab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date: labDate,
          filename: file.name,
          results: result.labs,
          addedDate: formatDateForStorage(new Date()),
        }

        await saveData(
          labDate,
          CATEGORIES.USER,
          `lab-results-${report.id}`,
          JSON.stringify(report)
        )

        await loadReports()
        console.log(`🧪 Saved ${result.labs.length} lab results from ${file.name}`)
      } else {
        alert(`No lab results found in ${file.name}. Try a different document?`)
      }
    } catch (e: any) {
      console.error("Lab upload failed:", e)
      const msg = e?.message || String(e)
      if (msg.includes('Failed to fetch')) {
        alert(`Could not reach Flask backend. Is it running?\n\nIf the file is very large, it may exceed the request size limit.`)
      } else {
        alert(`Lab parsing failed: ${msg}`)
      }
    } finally {
      setIsUploading(false)
    }
  }

  // Delete a lab report
  const handleDeleteReport = async (report: LabReport) => {
    if (!confirm(`Delete lab report "${report.filename}" from ${report.date}? This cannot be undone.`)) return
    try {
      await deleteData(report.date, CATEGORIES.USER, (report as any)._subcategory || `lab-results-${report.id}`)
      await loadReports()
    } catch (e) {
      console.error("Failed to delete lab report:", e)
      alert('Failed to delete report')
    }
  }

  // Add lab report to medical timeline
  const handleAddToTimeline = async (report: LabReport, abnormalOnly: boolean = false) => {
    try {
      const results = abnormalOnly
        ? report.results.filter(r => r.is_abnormal)
        : report.results

      if (results.length === 0) {
        alert('No abnormal results to add!')
        return
      }

      const summary = results
        .map(r => `${r.test_name}: ${r.value_text} ${r.unit}${r.flag ? ` (${r.flag})` : ''}`)
        .join(', ')

      const now = new Date().toISOString()
      const eventId = `lab-timeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      const timelineEvent = {
        id: eventId,
        type: 'test',
        title: `Lab Results${abnormalOnly ? ' (Abnormal)' : ''}: ${report.filename}`,
        date: report.date,
        description: `${results.length} tests. ${summary}`,
        status: results.some(r => r.is_abnormal) ? 'needs_review' : 'resolved',
        severity: results.some(r => r.flag === 'LL' || r.flag === 'CRITICAL') ? 'severe'
          : results.some(r => r.is_abnormal) ? 'moderate' : 'mild',
        tags: ['lab-results', 'auto-added', ...(abnormalOnly ? ['abnormal-only'] : [])],
        createdAt: now,
        updatedAt: now,
      }

      const subcategory = `${SUBCATEGORIES.MEDICAL_EVENTS}-${eventId}`
      await saveData(
        report.date,
        CATEGORIES.USER,
        subcategory,
        JSON.stringify(timelineEvent)
      )

      console.log(`📋 Added ${results.length} lab results to timeline: ${report.filename}`)
      alert(`Added ${results.length} results to timeline!`)
    } catch (e) {
      console.error('Failed to add to timeline:', e)
      alert('Failed to add to timeline')
    }
  }

  // Start editing a test result
  const startEdit = (reportId: string, idx: number, result: LabResult) => {
    setEditingTest({ reportId, idx })
    setEditValues({ ...result })
  }

  // Save edited test result back to Dexie
  const saveEdit = async (report: LabReport) => {
    if (!editingTest) return
    const { idx } = editingTest
    const updatedResults = [...report.results]

    // Recompute abnormal flag from value vs range
    const val = editValues.value ?? null
    const refLow = editValues.reference_low ?? null
    const refHigh = editValues.reference_high ?? null
    let flag = editValues.flag || ''
    let isAbnormal = !!flag

    if (!isAbnormal && val !== null) {
      if (refLow !== null && val < refLow) { isAbnormal = true; flag = flag || 'L' }
      else if (refHigh !== null && val > refHigh) { isAbnormal = true; flag = flag || 'H' }
    }

    updatedResults[idx] = {
      ...updatedResults[idx],
      test_name: editValues.test_name || updatedResults[idx].test_name,
      value: val,
      value_text: val !== null ? `${val} ${editValues.unit || updatedResults[idx].unit}` : editValues.value_text || '',
      unit: editValues.unit || updatedResults[idx].unit,
      reference_low: refLow,
      reference_high: refHigh,
      reference_text: refLow !== null && refHigh !== null
        ? `${refLow} ${editValues.unit || updatedResults[idx].unit}-${refHigh} ${editValues.unit || updatedResults[idx].unit}`
        : updatedResults[idx].reference_text,
      flag,
      is_abnormal: isAbnormal,
      date: editValues.date,
    }

    const updatedReport = { ...report, results: updatedResults }
    try {
      await saveData(
        report.date,
        CATEGORIES.USER,
        (report as any)._subcategory || `lab-results-${report.id}`,
        JSON.stringify(updatedReport)
      )
      setEditingTest(null)
      setEditValues({})
      await loadReports()
    } catch (e) {
      console.error('Failed to save edit:', e)
    }
  }

  // Delete a single test from a report
  const deleteTest = async (report: LabReport, idx: number) => {
    const updatedResults = report.results.filter((_, i) => i !== idx)
    if (updatedResults.length === 0) {
      // If no tests left, delete the whole report
      await handleDeleteReport(report)
      return
    }
    const updatedReport = { ...report, results: updatedResults }
    try {
      await saveData(
        report.date,
        CATEGORIES.USER,
        (report as any)._subcategory || `lab-results-${report.id}`,
        JSON.stringify(updatedReport)
      )
      await loadReports()
    } catch (e) {
      console.error('Failed to delete test:', e)
    }
  }

  // Get trend for a test across reports (latest 5 values)
  const getTrend = (testName: string): { values: { date: string; value: number }[], direction: string } => {
    const values: { date: string; value: number }[] = []
    for (const report of reports) {
      const result = report.results.find(r =>
        r.test_name.toLowerCase() === testName.toLowerCase() && r.value !== null
      )
      if (result && result.value !== null) {
        values.push({ date: report.date, value: result.value })
      }
    }
    values.sort((a, b) => a.date.localeCompare(b.date))

    let direction = "stable"
    if (values.length >= 2) {
      const last = values[values.length - 1].value
      const prev = values[values.length - 2].value
      if (last > prev * 1.05) direction = "up"
      else if (last < prev * 0.95) direction = "down"
    }

    return { values: values.slice(-5), direction }
  }

  // Get all unique test names across reports
  const allTestNames = [...new Set(reports.flatMap(r => r.results.map(l => l.test_name)))]

  // Filter reports
  const filteredReports = reports.filter(report => {
    if (!searchQuery && !filterAbnormal) return true
    const matchesSearch = !searchQuery ||
      report.results.some(r => r.test_name.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesFilter = !filterAbnormal ||
      report.results.some(r => r.is_abnormal)
    return matchesSearch && matchesFilter
  })

  return (
    <AppCanvas currentPage="manage">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2 flex items-center justify-center gap-2">
            <TestTube className="h-8 w-8 text-blue-500" />
            Lab Results
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Upload lab reports, track trends, catch what "normal" is hiding
          </p>
        </header>

        {/* Upload Section */}
        <Card className="mb-6 border-[var(--border-soft)] bg-[var(--bg-card)]">
          <CardContent className="pt-6">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label className="text-[var(--text-main)]">Lab date</Label>
                <Input
                  type="date"
                  value={uploadDate}
                  onChange={e => setUploadDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label className="text-[var(--text-main)]">Upload lab report</Label>
                <div className="mt-1">
                  <input
                    type="file"
                    accept=".pdf,.txt,.png,.jpg,.jpeg"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file)
                    }}
                    className="block w-full text-sm text-[var(--text-muted)]
                      file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                      file:text-sm file:font-medium file:bg-[var(--accent-primary)]
                      file:text-[var(--text-main)] hover:file:opacity-90"
                    disabled={isUploading}
                  />
                </div>
              </div>
            </div>
            {isUploading && (
              <p className="text-sm text-[var(--text-muted)] mt-2 animate-pulse">
                Parsing lab results...
              </p>
            )}
          </CardContent>
        </Card>

        {/* Search & Filter */}
        {reports.length > 0 && (
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tests..."
                className="pl-9"
              />
            </div>
            <Button
              variant={filterAbnormal ? "default" : "outline"}
              onClick={() => setFilterAbnormal(!filterAbnormal)}
              className={filterAbnormal
                ? "bg-red-100 text-red-800 border-red-300 hover:bg-red-200"
                : "border-[var(--border-soft)] text-[var(--text-muted)]"
              }
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Abnormal Only
            </Button>
          </div>
        )}

        {/* Reports */}
        {filteredReports.length === 0 && reports.length === 0 ? (
          <Card className="border-[var(--border-soft)] bg-[var(--bg-card)]">
            <CardContent className="py-12 text-center">
              <TestTube className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-4 opacity-30" />
              <p className="text-[var(--text-muted)] text-lg mb-2">No lab results yet</p>
              <p className="text-[var(--text-muted)] text-sm">
                Upload a lab report PDF to get started. Values, reference ranges, and trends tracked automatically.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredReports.map(report => {
              const isExpanded = expandedReport === report.id
              const abnormalCount = report.results.filter(r => r.is_abnormal).length

              return (
                <Card key={report.id} className="border-[var(--border-soft)] bg-[var(--bg-card)]">
                  <CardContent className="py-4">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-[var(--text-muted)]" />
                        <div>
                          <h3 className="font-semibold text-[var(--text-main)]">{report.filename}</h3>
                          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                            <Calendar className="h-3 w-3" />
                            {report.date}
                            <span>{report.results.length} tests</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {abnormalCount > 0 && (
                          <Badge className="bg-red-100 text-red-800">
                            {abnormalCount} abnormal
                          </Badge>
                        )}
                        {abnormalCount === 0 && (
                          <Badge className="bg-green-100 text-green-800">
                            All normal
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 h-8 p-0 px-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAddToTimeline(report, false)
                          }}
                          title="Add all results to timeline"
                        >
                          <ClipboardList className="h-3.5 w-3.5 mr-0.5" />All
                        </Button>
                        {report.results.some(r => r.is_abnormal) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 p-0 px-1 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddToTimeline(report, true)
                            }}
                            title="Add only abnormal results to timeline"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 mr-0.5" />Abnormal
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteReport(report)
                          }}
                          title="Delete this lab report"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-[var(--border-soft)]">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-[var(--text-muted)]">
                                <th className="py-2 pr-2">Test</th>
                                <th className="py-2 pr-2">Result</th>
                                <th className="py-2 pr-2">Unit</th>
                                <th className="py-2 pr-2">Reference</th>
                                <th className="py-2 pr-2">Date</th>
                                <th className="py-2 pr-2">Flag</th>
                                <th className="py-2 pr-2">Trend</th>
                                <th className="py-2 w-16"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {report.results
                                .filter(r => !filterAbnormal || r.is_abnormal)
                                .map((result, idx) => {
                                  const trend = getTrend(result.test_name)
                                  const isEditing = editingTest?.reportId === report.id && editingTest?.idx === idx

                                  if (isEditing) {
                                    return (
                                      <tr key={idx} className="border-t border-[var(--border-soft)] bg-blue-50/50 dark:bg-blue-950/20">
                                        <td className="py-1 pr-1">
                                          <Input
                                            value={editValues.test_name || ''}
                                            onChange={e => setEditValues(v => ({ ...v, test_name: e.target.value }))}
                                            className="h-7 text-xs"
                                          />
                                        </td>
                                        <td className="py-1 pr-1">
                                          <Input
                                            type="number"
                                            step="any"
                                            value={editValues.value ?? ''}
                                            onChange={e => setEditValues(v => ({ ...v, value: e.target.value ? parseFloat(e.target.value) : null }))}
                                            className="h-7 text-xs w-20"
                                          />
                                        </td>
                                        <td className="py-1 pr-1">
                                          <Input
                                            value={editValues.unit || ''}
                                            onChange={e => setEditValues(v => ({ ...v, unit: e.target.value }))}
                                            className="h-7 text-xs w-20"
                                          />
                                        </td>
                                        <td className="py-1 pr-1">
                                          <div className="flex gap-1">
                                            <Input
                                              type="number"
                                              step="any"
                                              placeholder="Low"
                                              value={editValues.reference_low ?? ''}
                                              onChange={e => setEditValues(v => ({ ...v, reference_low: e.target.value ? parseFloat(e.target.value) : null }))}
                                              className="h-7 text-xs w-16"
                                            />
                                            <Input
                                              type="number"
                                              step="any"
                                              placeholder="High"
                                              value={editValues.reference_high ?? ''}
                                              onChange={e => setEditValues(v => ({ ...v, reference_high: e.target.value ? parseFloat(e.target.value) : null }))}
                                              className="h-7 text-xs w-16"
                                            />
                                          </div>
                                        </td>
                                        <td className="py-1 pr-1">
                                          <Input
                                            type="date"
                                            value={editValues.date || report.date}
                                            onChange={e => setEditValues(v => ({ ...v, date: e.target.value }))}
                                            className="h-7 text-xs w-28"
                                          />
                                        </td>
                                        <td className="py-1 pr-1">
                                          <Input
                                            value={editValues.flag || ''}
                                            onChange={e => setEditValues(v => ({ ...v, flag: e.target.value }))}
                                            placeholder="L/H/LL"
                                            className="h-7 text-xs w-14"
                                          />
                                        </td>
                                        <td className="py-1"></td>
                                        <td className="py-1">
                                          <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-green-600"
                                              onClick={() => saveEdit(report)} title="Save">
                                              <Save className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-500"
                                              onClick={() => { setEditingTest(null); setEditValues({}) }} title="Cancel">
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    )
                                  }

                                  return (
                                    <tr
                                      key={idx}
                                      className={`border-t border-[var(--border-soft)] ${
                                        result.is_abnormal ? 'bg-red-50/50' : ''
                                      }`}
                                    >
                                      <td className="py-2 pr-2 font-medium text-[var(--text-main)]">
                                        {result.test_name}
                                      </td>
                                      <td className={`py-2 pr-2 ${
                                        result.is_abnormal ? 'font-bold text-red-700' : 'text-[var(--text-main)]'
                                      }`}>
                                        {result.value_text || '—'}
                                      </td>
                                      <td className="py-2 pr-2 text-[var(--text-muted)]">
                                        {result.unit}
                                      </td>
                                      <td className="py-2 pr-2 text-[var(--text-muted)]">
                                        {result.reference_text || '—'}
                                      </td>
                                      <td className="py-2 pr-2 text-[var(--text-muted)] text-xs">
                                        {result.date || report.date}
                                      </td>
                                      <td className="py-2 pr-2">
                                        {result.flag && (
                                          <Badge className={
                                            result.flag.includes('H') || result.flag === 'HIGH' || result.flag === 'CRITICAL'
                                              ? 'bg-red-100 text-red-800'
                                              : result.flag.includes('L') || result.flag === 'LOW'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                          }>
                                            {result.flag}
                                          </Badge>
                                        )}
                                      </td>
                                      <td className="py-2 pr-2">
                                        {trend.values.length >= 2 && (
                                          <div className="flex items-center gap-1 text-xs">
                                            {trend.direction === "up" && <TrendingUp className="h-3 w-3 text-red-500" />}
                                            {trend.direction === "down" && <TrendingDown className="h-3 w-3 text-blue-500" />}
                                            {trend.direction === "stable" && <Minus className="h-3 w-3 text-green-500" />}
                                            <span className="text-[var(--text-muted)]">
                                              {trend.values.map(v => v.value).join(' → ')}
                                            </span>
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-2">
                                        <div className="flex gap-1">
                                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-500"
                                            onClick={() => startEdit(report.id, idx, result)} title="Edit">
                                            <Edit3 className="h-3 w-3" />
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400"
                                            onClick={() => deleteTest(report, idx)} title="Delete test">
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-center gap-4 mt-8 text-sm">
          <Button variant="outline" asChild>
            <a href="/manage">← Back to Manage</a>
          </Button>
        </div>
      </div>
    </AppCanvas>
  )
}
