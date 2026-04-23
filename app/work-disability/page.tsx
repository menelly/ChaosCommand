/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * Work & Disability — Employment history, missed work, FMLA, accommodations,
 * disability applications, and the SSDI education guide.
 *
 * "Weaponize your paperwork." — Past-Ace, May 2025
 */
"use client"

import { useState, useEffect, useCallback } from "react"
import AppCanvas from "@/components/app-canvas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { TagInput } from "@/components/tag-input"
import { useDailyData } from "@/lib/database/hooks/use-daily-data"
import { CATEGORIES, formatDateForStorage, getCurrentTimestamp } from "@/lib/database/dexie-db"
import {
  Briefcase, Calendar, FileText, Plus, X, Edit3, CheckCircle,
  Trash2, Search, ChevronDown, ChevronUp, AlertTriangle, Clock,
  Building2, GraduationCap, Heart, Home
} from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

interface Employment {
  id: string
  employer: string
  jobTitle: string
  hrContact: string
  dateStarted: string
  dateEnded: string
  jobDuties: string
  active: boolean
  accommodationsRequested: { date: string; details: string }
  accommodationsReceived: { date: string; details: string }
  symptomsExacerbated: string
  reflections: string
  tags: string[]
}

type WorkType = "paid job" | "caregiving" | "chores" | "school" | "volunteering"
type ImpactLevel = "mild" | "moderate" | "severe"

interface MissedWorkDay {
  id: string
  date: string
  workType: WorkType
  reason: string
  impactLevel: ImpactLevel
  couldNotDoAnythingElse: boolean
  duration: "full" | "partial"
  hoursMissed?: number
  notes: string
  tags: string[]
}

interface DisabilityApplication {
  id: string
  applicationType: string
  dateSubmitted: string
  status: "Pending" | "Approved" | "Denied" | "Appeal" | string
  agency: string
  caseNumber: string
  contactPerson: string
  contactPhone: string
  documents: string
  notes: string
  nextSteps: string
  nextAppointment: string
  appealDeadline: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TABS = [
  { id: "missed-work", label: "Missed Work", icon: <Clock className="h-4 w-4" /> },
  { id: "employment", label: "Employment", icon: <Briefcase className="h-4 w-4" /> },
  { id: "disability", label: "Applications", icon: <FileText className="h-4 w-4" /> },
  { id: "education", label: "Disability Guide", icon: <GraduationCap className="h-4 w-4" /> },
]

const WORK_TYPES: { value: WorkType; label: string; icon: React.ReactNode }[] = [
  { value: "paid job", label: "Paid Job", icon: <Briefcase className="h-3 w-3" /> },
  { value: "caregiving", label: "Caregiving", icon: <Heart className="h-3 w-3" /> },
  { value: "chores", label: "Household", icon: <Home className="h-3 w-3" /> },
  { value: "school", label: "School", icon: <GraduationCap className="h-3 w-3" /> },
  { value: "volunteering", label: "Volunteering", icon: <Building2 className="h-3 w-3" /> },
]

const IMPACT_LEVELS: { value: ImpactLevel; label: string; color: string }[] = [
  { value: "mild", label: "Mild — could do some things", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "moderate", label: "Moderate — struggled significantly", color: "bg-orange-100 text-orange-800 border-orange-300" },
  { value: "severe", label: "Severe — could barely function", color: "bg-red-100 text-red-800 border-red-300" },
]

const APP_TYPES = ["SSDI", "SSI", "State Disability", "Private LTD", "VA Disability", "Voc Rehab", "Other"]

const STATUS_COLORS: Record<string, string> = {
  "Pending": "bg-blue-100 text-blue-800",
  "Approved": "bg-green-100 text-green-800",
  "Denied": "bg-red-100 text-red-800",
  "Appeal": "bg-orange-100 text-orange-800",
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WorkDisabilityPage() {
  const { saveData, deleteData, getAllCategoryData } = useDailyData()
  const [activeTab, setActiveTab] = useState("missed-work")

  // --- MISSED WORK STATE ---
  const [missedDays, setMissedDays] = useState<MissedWorkDay[]>([])
  const [showMissedForm, setShowMissedForm] = useState(false)
  const [editingMissedId, setEditingMissedId] = useState<string | null>(null)
  const [missedForm, setMissedForm] = useState<Omit<MissedWorkDay, "id">>({
    date: formatDateForStorage(new Date()),
    workType: "paid job",
    reason: "",
    impactLevel: "moderate",
    couldNotDoAnythingElse: false,
    duration: "full",
    hoursMissed: undefined,
    notes: "",
    tags: [],
  })

  // --- EMPLOYMENT STATE ---
  const [employments, setEmployments] = useState<Employment[]>([])
  const [showEmploymentForm, setShowEmploymentForm] = useState(false)
  const [editingEmploymentId, setEditingEmploymentId] = useState<string | null>(null)
  const [employmentForm, setEmploymentForm] = useState<Omit<Employment, "id">>({
    employer: "", jobTitle: "", hrContact: "",
    dateStarted: "", dateEnded: "", jobDuties: "",
    active: true,
    accommodationsRequested: { date: "", details: "" },
    accommodationsReceived: { date: "", details: "" },
    symptomsExacerbated: "", reflections: "", tags: [],
  })

  // --- DISABILITY APP STATE ---
  const [applications, setApplications] = useState<DisabilityApplication[]>([])
  const [showAppForm, setShowAppForm] = useState(false)
  const [editingAppId, setEditingAppId] = useState<string | null>(null)
  const [appForm, setAppForm] = useState<Omit<DisabilityApplication, "id">>({
    applicationType: "SSDI", dateSubmitted: "", status: "Pending",
    agency: "", caseNumber: "",
    contactPerson: "", contactPhone: "", documents: "",
    notes: "", nextSteps: "", nextAppointment: "", appealDeadline: "",
  })

  // --- SHARED STATE ---
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadAllData = useCallback(async () => {
    try {
      const records = await getAllCategoryData(CATEGORIES.USER)
      if (!records) return

      const missed = records
        .filter((r: any) => r.subcategory === 'missed-work' || r.subcategory?.startsWith('missed-work-'))
        .map((r: any) => typeof r.content === 'string' ? JSON.parse(r.content) : r.content)
        .sort((a: MissedWorkDay, b: MissedWorkDay) => b.date.localeCompare(a.date))

      const emps = records
        .filter((r: any) => r.subcategory === 'employment-history' || r.subcategory?.startsWith('employment-history-'))
        .map((r: any) => typeof r.content === 'string' ? JSON.parse(r.content) : r.content)
        .sort((a: Employment, b: Employment) => (b.dateStarted || '').localeCompare(a.dateStarted || ''))

      const apps = records
        .filter((r: any) => r.subcategory === 'disability-applications' || r.subcategory?.startsWith('disability-application-'))
        .map((r: any) => typeof r.content === 'string' ? JSON.parse(r.content) : r.content)
        .sort((a: DisabilityApplication, b: DisabilityApplication) => (b.dateSubmitted || '').localeCompare(a.dateSubmitted || ''))

      setMissedDays(missed)
      setEmployments(emps)
      setApplications(apps)
    } catch (e) {
      console.error("Failed to load work/disability data:", e)
    }
  }, [getAllCategoryData])

  useEffect(() => { loadAllData() }, [loadAllData])

  // ============================================================================
  // SAVE FUNCTIONS
  // ============================================================================

  const saveMissedDay = async () => {
    if (!missedForm.reason.trim()) return
    const id = editingMissedId || `missed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const entry: MissedWorkDay = { id, ...missedForm }
    // Delete old record if editing (date may have changed)
    if (editingMissedId) {
      const old = missedDays.find(d => d.id === editingMissedId)
      if (old) await deleteData(old.date, CATEGORIES.USER, `missed-work-${old.id}`).catch(() => {})
    }
    await saveData(entry.date, CATEGORIES.USER, `missed-work-${entry.id}`, JSON.stringify(entry))
    setShowMissedForm(false)
    setEditingMissedId(null)
    setMissedForm({
      date: formatDateForStorage(new Date()), workType: "paid job", reason: "",
      impactLevel: "moderate", couldNotDoAnythingElse: false, duration: "full",
      hoursMissed: undefined, notes: "", tags: [],
    })
    await loadAllData()
  }

  const editMissedDay = (day: MissedWorkDay) => {
    setEditingMissedId(day.id)
    setMissedForm({
      date: day.date, workType: day.workType, reason: day.reason,
      impactLevel: day.impactLevel, couldNotDoAnythingElse: day.couldNotDoAnythingElse,
      duration: day.duration, hoursMissed: day.hoursMissed, notes: day.notes, tags: day.tags,
    })
    setShowMissedForm(true)
  }

  const saveEmployment = async () => {
    if (!employmentForm.employer.trim()) return
    const id = editingEmploymentId || `emp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const entry: Employment = { id, ...employmentForm }
    if (editingEmploymentId) {
      const old = employments.find(e => e.id === editingEmploymentId)
      if (old) await deleteData(old.dateStarted || formatDateForStorage(new Date()), CATEGORIES.USER, `employment-history-${old.id}`).catch(() => {})
    }
    await saveData(
      entry.dateStarted || formatDateForStorage(new Date()),
      CATEGORIES.USER, `employment-history-${entry.id}`, JSON.stringify(entry)
    )
    setShowEmploymentForm(false)
    setEditingEmploymentId(null)
    setEmploymentForm({
      employer: "", jobTitle: "", hrContact: "",
      dateStarted: "", dateEnded: "", jobDuties: "",
      active: true,
      accommodationsRequested: { date: "", details: "" },
      accommodationsReceived: { date: "", details: "" },
      symptomsExacerbated: "", reflections: "", tags: [],
    })
    await loadAllData()
  }

  const editEmployment = (emp: Employment) => {
    setEditingEmploymentId(emp.id)
    setEmploymentForm({
      employer: emp.employer, jobTitle: emp.jobTitle, hrContact: emp.hrContact,
      dateStarted: emp.dateStarted, dateEnded: emp.dateEnded, jobDuties: emp.jobDuties,
      active: emp.active,
      accommodationsRequested: emp.accommodationsRequested,
      accommodationsReceived: emp.accommodationsReceived,
      symptomsExacerbated: emp.symptomsExacerbated, reflections: emp.reflections, tags: emp.tags,
    })
    setShowEmploymentForm(true)
  }

  const saveApplication = async () => {
    if (!appForm.applicationType.trim()) return
    const id = editingAppId || `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const entry: DisabilityApplication = { id, ...appForm }
    if (editingAppId) {
      const old = applications.find(a => a.id === editingAppId)
      if (old) await deleteData(old.dateSubmitted || formatDateForStorage(new Date()), CATEGORIES.USER, `disability-application-${old.id}`).catch(() => {})
    }
    await saveData(
      entry.dateSubmitted || formatDateForStorage(new Date()),
      CATEGORIES.USER, `disability-application-${entry.id}`, JSON.stringify(entry)
    )
    setShowAppForm(false)
    setEditingAppId(null)
    setAppForm({
      applicationType: "SSDI", dateSubmitted: "", status: "Pending",
      agency: "Social Security Administration", caseNumber: "",
      contactPerson: "", contactPhone: "", documents: "",
      notes: "", nextSteps: "", nextAppointment: "", appealDeadline: "",
    })
    await loadAllData()
  }

  const editApplication = (app: DisabilityApplication) => {
    setEditingAppId(app.id)
    setAppForm({
      applicationType: app.applicationType, dateSubmitted: app.dateSubmitted, status: app.status,
      agency: app.agency, caseNumber: app.caseNumber,
      contactPerson: app.contactPerson, contactPhone: app.contactPhone, documents: app.documents,
      notes: app.notes, nextSteps: app.nextSteps, nextAppointment: app.nextAppointment, appealDeadline: app.appealDeadline,
    })
    setShowAppForm(true)
  }

  // ============================================================================
  // DELETE FUNCTIONS
  // ============================================================================

  const deleteMissedDay = async (day: MissedWorkDay) => {
    if (!confirm(`Delete missed work entry for ${day.date}?`)) return
    await deleteData(day.date, CATEGORIES.USER, `missed-work-${day.id}`)
    await loadAllData()
  }

  const deleteEmployment = async (emp: Employment) => {
    if (!confirm(`Delete employment record for ${emp.employer}?`)) return
    const date = emp.dateStarted || formatDateForStorage(new Date())
    await deleteData(date, CATEGORIES.USER, `employment-history-${emp.id}`)
    await loadAllData()
  }

  const deleteApplication = async (app: DisabilityApplication) => {
    if (!confirm(`Delete ${app.applicationType} application?`)) return
    const date = app.dateSubmitted || formatDateForStorage(new Date())
    await deleteData(date, CATEGORIES.USER, `disability-application-${app.id}`)
    await loadAllData()
  }

  // ============================================================================
  // STATS
  // ============================================================================

  const missedStats = {
    total: missedDays.length,
    totalDisabled: missedDays.filter(d => d.couldNotDoAnythingElse).length,
    byType: WORK_TYPES.map(wt => ({
      ...wt,
      count: missedDays.filter(d => d.workType === wt.value).length,
    })),
    byImpact: IMPACT_LEVELS.map(il => ({
      ...il,
      count: missedDays.filter(d => d.impactLevel === il.value).length,
    })),
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <AppCanvas currentPage="manage">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2 flex items-center justify-center gap-2">
            <Briefcase className="h-8 w-8 text-orange-500" />
            Work & Disability
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Track missed work, employment history, accommodations, and disability applications
          </p>
        </header>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-[var(--bg-card)] rounded-lg p-1 border border-[var(--border-soft)]">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1 font-bold'
                  : 'text-foreground/70 hover:text-foreground hover:bg-card'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ================================================================ */}
        {/* MISSED WORK TAB */}
        {/* ================================================================ */}
        {activeTab === "missed-work" && (
          <div>
            {/* Stats Bar */}
            {missedDays.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <Card className="border-[var(--border-soft)] bg-[var(--bg-card)]">
                  <CardContent className="py-3 text-center">
                    <div className="text-2xl font-bold text-[var(--text-main)]">{missedStats.total}</div>
                    <div className="text-xs text-[var(--text-muted)]">Total Days</div>
                  </CardContent>
                </Card>
                <Card className="border-[var(--border-soft)] bg-[var(--bg-card)]">
                  <CardContent className="py-3 text-center">
                    <div className="text-2xl font-bold text-red-600">{missedStats.totalDisabled}</div>
                    <div className="text-xs text-[var(--text-muted)]">Completely Unable</div>
                  </CardContent>
                </Card>
                <Card className="border-[var(--border-soft)] bg-[var(--bg-card)]">
                  <CardContent className="py-3 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {missedStats.byImpact.find(i => i.value === "severe")?.count || 0}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">Severe Days</div>
                  </CardContent>
                </Card>
                <Card className="border-[var(--border-soft)] bg-[var(--bg-card)]">
                  <CardContent className="py-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {missedStats.byType.find(t => t.value === "paid job")?.count || 0}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">Paid Work Days</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {!showMissedForm && (
              <div className="flex gap-2 mb-4">
                <Button
                  onClick={() => setShowMissedForm(true)}
                  className="flex-1 bg-[var(--accent-primary)] text-[var(--text-main)] hover:opacity-90 font-medium border-2 border-[var(--accent-primary)]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Log Missed Work Day
                </Button>
              </div>
            )}

            {/* Analytics Summary */}
            {missedDays.length >= 3 && !showMissedForm && (
              <Card className="mb-4 border-[var(--border-soft)] bg-[var(--bg-card)]">
                <CardContent className="py-4">
                  <h3 className="font-semibold text-[var(--text-main)] mb-3 flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Pattern Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    {/* By work type */}
                    <div>
                      <span className="text-[var(--text-muted)]">Most missed: </span>
                      <span className="text-[var(--text-main)] font-medium">
                        {missedStats.byType.sort((a, b) => b.count - a.count)[0]?.label} ({missedStats.byType.sort((a, b) => b.count - a.count)[0]?.count} days)
                      </span>
                    </div>
                    {/* Severe percentage */}
                    <div>
                      <span className="text-[var(--text-muted)]">Severe or total limitation: </span>
                      <span className="text-[var(--text-main)] font-medium">
                        {Math.round(((missedStats.byImpact.find(i => i.value === "severe")?.count || 0) + missedStats.totalDisabled) / missedStats.total * 100)}% of days
                      </span>
                    </div>
                    {/* Monthly breakdown */}
                    {(() => {
                      const months: Record<string, number> = {}
                      missedDays.forEach(d => {
                        const m = d.date.substring(0, 7)
                        months[m] = (months[m] || 0) + 1
                      })
                      const sorted = Object.entries(months).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 3)
                      return sorted.length > 0 && (
                        <div>
                          <span className="text-[var(--text-muted)]">Recent months: </span>
                          <span className="text-[var(--text-main)]">
                            {sorted.map(([m, c]) => `${m}: ${c} days`).join(' · ')}
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-3 italic">
                    This data is what wins SSDI cases. Keep logging.
                  </p>
                </CardContent>
              </Card>
            )}

            {showMissedForm && (
              <Card className="mb-4 border-[var(--border-soft)] bg-[var(--bg-card)]">
                <CardContent className="pt-6 space-y-4">
                  {/* Date */}
                  <div>
                    <Label className="text-[var(--text-main)]">Date</Label>
                    <Input
                      type="date"
                      value={missedForm.date}
                      onChange={e => setMissedForm(f => ({ ...f, date: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  {/* Work Type */}
                  <div>
                    <Label className="text-[var(--text-main)]">Type of work missed</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {WORK_TYPES.map(wt => (
                        <button
                          key={wt.value}
                          onClick={() => setMissedForm(f => ({ ...f, workType: wt.value }))}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-all ${
                            missedForm.workType === wt.value
                              ? 'bg-[var(--accent-primary)] text-[var(--text-main)] border-[var(--accent-primary)] font-medium'
                              : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-soft)]'
                          }`}
                        >
                          {wt.icon} {wt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <Label className="text-[var(--text-main)]">Why did you miss work?</Label>
                    <Textarea
                      value={missedForm.reason}
                      onChange={e => setMissedForm(f => ({ ...f, reason: e.target.value }))}
                      placeholder="Flare day, couldn't get out of bed, migraine, etc."
                      className="mt-1"
                    />
                  </div>

                  {/* Impact Level */}
                  <div>
                    <Label className="text-[var(--text-main)]">Impact level</Label>
                    <div className="flex flex-col gap-2 mt-1">
                      {IMPACT_LEVELS.map(il => (
                        <button
                          key={il.value}
                          onClick={() => setMissedForm(f => ({ ...f, impactLevel: il.value }))}
                          className={`px-3 py-2 rounded-lg text-sm text-left border transition-all ${
                            missedForm.impactLevel === il.value
                              ? il.color + ' font-medium'
                              : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-soft)] opacity-60'
                          }`}
                        >
                          {il.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[var(--text-main)]">Duration</Label>
                      <div className="flex gap-2 mt-1">
                        {(["full", "partial"] as const).map(d => (
                          <button
                            key={d}
                            onClick={() => setMissedForm(f => ({ ...f, duration: d }))}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-all ${
                              missedForm.duration === d
                                ? 'bg-[var(--accent-primary)] text-[var(--text-main)] border-[var(--accent-primary)] font-medium'
                                : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-soft)]'
                            }`}
                                                      >
                            {d === "full" ? "Full Day" : "Partial Day"}
                          </button>
                        ))}
                      </div>
                    </div>
                    {missedForm.duration === "partial" && (
                      <div>
                        <Label className="text-[var(--text-main)]">Hours missed</Label>
                        <Input
                          type="number"
                          min="0"
                          max="24"
                          value={missedForm.hoursMissed || ""}
                          onChange={e => setMissedForm(f => ({ ...f, hoursMissed: parseFloat(e.target.value) || undefined }))}
                          placeholder="e.g., 4"
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>

                  {/* Could Not Do Anything Else */}
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      missedForm.couldNotDoAnythingElse
                        ? 'bg-red-50 border-red-300'
                        : 'bg-[var(--bg-card)] border-[var(--border-soft)]'
                    }`}
                    onClick={() => setMissedForm(f => ({ ...f, couldNotDoAnythingElse: !f.couldNotDoAnythingElse }))}
                  >
                    <input
                      type="checkbox"
                      checked={missedForm.couldNotDoAnythingElse}
                      onChange={() => {}}
                      className="rounded"
                    />
                    <div>
                      <div className="font-medium text-sm text-[var(--text-main)]">
                        Could not do anything else this day
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        Check if you were unable to perform any activities
                      </div>
                    </div>
                  </div>

                  {/* Notes & Tags */}
                  <div>
                    <Label className="text-[var(--text-main)]">Notes (optional)</Label>
                    <Textarea
                      value={missedForm.notes}
                      onChange={e => setMissedForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Additional details..."
                      className="mt-1"
                    />
                  </div>

                  <TagInput
                    value={missedForm.tags}
                    onChange={tags => setMissedForm(f => ({ ...f, tags }))}
                    placeholder="Add tags..."
                  />

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      onClick={saveMissedDay}
                      disabled={!missedForm.reason.trim()}
                      className="flex-1 bg-[var(--accent-primary)] text-[var(--text-main)] hover:opacity-90 font-medium border-2 border-[var(--accent-primary)]"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {editingMissedId ? 'Update Day' : 'Log Day'}
                    </Button>
                    <Button variant="outline" onClick={() => { setShowMissedForm(false); setEditingMissedId(null); setMissedForm({ date: formatDateForStorage(new Date()), workType: "paid job", reason: "", impactLevel: "moderate", couldNotDoAnythingElse: false, duration: "full", hoursMissed: undefined, notes: "", tags: [] }) }}
                      className="border-[var(--border-soft)] text-[var(--text-muted)]">
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Missed Work List */}
            <div className="space-y-2">
              {missedDays.map(day => {
                const impact = IMPACT_LEVELS.find(i => i.value === day.impactLevel)
                const workType = WORK_TYPES.find(w => w.value === day.workType)
                return (
                  <Card key={day.id} className="border-[var(--border-soft)] bg-[var(--bg-card)]">
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium text-[var(--text-main)]">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {day.date}
                          </div>
                          <Badge className={impact?.color || ''} variant="secondary">
                            {day.impactLevel}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {workType?.label || day.workType}
                          </Badge>
                          {day.couldNotDoAnythingElse && (
                            <Badge className="bg-red-100 text-red-800 text-xs">
                              Total Limitation
                            </Badge>
                          )}
                          {day.duration === "partial" && day.hoursMissed && (
                            <span className="text-xs text-[var(--text-muted)]">{day.hoursMissed}h</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-[var(--text-muted)] hover:text-blue-500"
                            onClick={() => editMissedDay(day)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-[var(--text-muted)] hover:text-red-500"
                            onClick={() => deleteMissedDay(day)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-[var(--text-muted)] mt-1">{day.reason}</p>
                      {day.notes && (
                        <p className="text-xs text-[var(--text-muted)] mt-1 italic">{day.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
              {missedDays.length === 0 && !showMissedForm && (
                <p className="text-center text-[var(--text-muted)] py-8">
                  No missed work days logged yet. Every day you document matters for your case.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* EMPLOYMENT TAB */}
        {/* ================================================================ */}
        {activeTab === "employment" && (
          <div>
            {!showEmploymentForm && (
              <Button
                onClick={() => setShowEmploymentForm(true)}
                className="w-full mb-4 bg-[var(--accent-primary)] text-[var(--text-main)] hover:opacity-90 font-medium border-2 border-[var(--accent-primary)]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Employment
              </Button>
            )}

            {showEmploymentForm && (
              <Card className="mb-4 border-[var(--border-soft)] bg-[var(--bg-card)]">
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[var(--text-main)]">Employer</Label>
                      <Input value={employmentForm.employer}
                        onChange={e => setEmploymentForm(f => ({ ...f, employer: e.target.value }))}
                        placeholder="Company name" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-[var(--text-main)]">Job Title</Label>
                      <Input value={employmentForm.jobTitle}
                        onChange={e => setEmploymentForm(f => ({ ...f, jobTitle: e.target.value }))}
                        placeholder="Your role" className="mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-[var(--text-main)]">Start Date</Label>
                      <Input type="date" value={employmentForm.dateStarted}
                        onChange={e => setEmploymentForm(f => ({ ...f, dateStarted: e.target.value }))}
                        className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-[var(--text-main)]">End Date</Label>
                      <Input type="date" value={employmentForm.dateEnded}
                        onChange={e => setEmploymentForm(f => ({ ...f, dateEnded: e.target.value }))}
                        placeholder="Leave blank if current" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-[var(--text-main)]">HR Contact</Label>
                      <Input value={employmentForm.hrContact}
                        onChange={e => setEmploymentForm(f => ({ ...f, hrContact: e.target.value }))}
                        placeholder="Name / phone" className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[var(--text-main)]">Job Duties</Label>
                    <Textarea value={employmentForm.jobDuties}
                      onChange={e => setEmploymentForm(f => ({ ...f, jobDuties: e.target.value }))}
                      placeholder="What did you do? (SSDI cares about physical/mental demands)"
                      className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-[var(--text-main)]">Symptoms exacerbated by this job</Label>
                    <Textarea value={employmentForm.symptomsExacerbated}
                      onChange={e => setEmploymentForm(f => ({ ...f, symptomsExacerbated: e.target.value }))}
                      placeholder="Which symptoms got worse because of this work?"
                      className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[var(--text-main)]">Accommodations Requested</Label>
                      <Input type="date" value={employmentForm.accommodationsRequested.date}
                        onChange={e => setEmploymentForm(f => ({
                          ...f, accommodationsRequested: { ...f.accommodationsRequested, date: e.target.value }
                        }))} placeholder="When" className="mt-1 mb-1" />
                      <Textarea value={employmentForm.accommodationsRequested.details}
                        onChange={e => setEmploymentForm(f => ({
                          ...f, accommodationsRequested: { ...f.accommodationsRequested, details: e.target.value }
                        }))} placeholder="What did you ask for?" />
                    </div>
                    <div>
                      <Label className="text-[var(--text-main)]">Accommodations Received</Label>
                      <Input type="date" value={employmentForm.accommodationsReceived.date}
                        onChange={e => setEmploymentForm(f => ({
                          ...f, accommodationsReceived: { ...f.accommodationsReceived, date: e.target.value }
                        }))} placeholder="When" className="mt-1 mb-1" />
                      <Textarea value={employmentForm.accommodationsReceived.details}
                        onChange={e => setEmploymentForm(f => ({
                          ...f, accommodationsReceived: { ...f.accommodationsReceived, details: e.target.value }
                        }))} placeholder="What did you actually get? (The gap matters)" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[var(--text-main)]">Reflections</Label>
                    <Textarea value={employmentForm.reflections}
                      onChange={e => setEmploymentForm(f => ({ ...f, reflections: e.target.value }))}
                      placeholder="Why did you leave? What made it impossible?" className="mt-1" />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={saveEmployment} disabled={!employmentForm.employer.trim()}
                      className="flex-1 bg-[var(--accent-primary)] text-[var(--text-main)] hover:opacity-90 font-medium border-2 border-[var(--accent-primary)]">
                      <CheckCircle className="h-4 w-4 mr-2" /> {editingEmploymentId ? 'Update Employment' : 'Save Employment'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowEmploymentForm(false)}
                      className="border-[var(--border-soft)] text-[var(--text-muted)]">Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Employment List */}
            <div className="space-y-2">
              {employments.map(emp => (
                <Card key={emp.id} className="border-[var(--border-soft)] bg-[var(--bg-card)]">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-[var(--text-main)]">{emp.jobTitle}</h3>
                        <p className="text-sm text-[var(--text-muted)]">
                          {emp.employer} — {emp.dateStarted} to {emp.dateEnded || "Present"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={emp.active ? "default" : "secondary"}>
                          {emp.active ? "Current" : "Past"}
                        </Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[var(--text-muted)] hover:text-blue-500"
                            onClick={() => editEmployment(emp)}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[var(--text-muted)] hover:text-red-500"
                            onClick={() => deleteEmployment(emp)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {emp.jobDuties && <p className="text-sm text-[var(--text-muted)] mt-2">{emp.jobDuties}</p>}
                    {emp.accommodationsRequested.details && (
                      <div className="mt-2 text-xs">
                        <span className="text-orange-600 font-medium">Requested:</span>{" "}
                        <span className="text-[var(--text-muted)]">{emp.accommodationsRequested.details}</span>
                      </div>
                    )}
                    {emp.accommodationsReceived.details && (
                      <div className="text-xs">
                        <span className="text-green-600 font-medium">Received:</span>{" "}
                        <span className="text-[var(--text-muted)]">{emp.accommodationsReceived.details}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {employments.length === 0 && !showEmploymentForm && (
                <p className="text-center text-[var(--text-muted)] py-8">
                  No employment history added yet. SSDI needs your last 15 years of work history.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* DISABILITY APPLICATIONS TAB */}
        {/* ================================================================ */}
        {activeTab === "disability" && (
          <div>
            {!showAppForm && (
              <Button
                onClick={() => setShowAppForm(true)}
                className="w-full mb-4 bg-[var(--accent-primary)] text-[var(--text-main)] hover:opacity-90 font-medium border-2 border-[var(--accent-primary)]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Application
              </Button>
            )}

            {showAppForm && (
              <Card className="mb-4 border-[var(--border-soft)] bg-[var(--bg-card)]">
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[var(--text-main)]">Application Type</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {APP_TYPES.map(t => (
                          <button key={t}
                            onClick={() => setAppForm(f => ({ ...f, applicationType: t }))}
                            className={`px-3 py-1 rounded-full text-sm border transition-all ${
                              appForm.applicationType === t
                                ? 'bg-[var(--accent-primary)] text-[var(--text-main)] border-[var(--accent-primary)] font-medium'
                                : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-soft)]'
                            }`}
                                                      >{t}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-[var(--text-main)]">Status</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {["Pending", "Approved", "Denied", "Appeal"].map(s => (
                          <button key={s}
                            onClick={() => setAppForm(f => ({ ...f, status: s }))}
                            className={`px-3 py-1 rounded-full text-sm border transition-all ${
                              appForm.status === s
                                ? (STATUS_COLORS[s] || '') + ' font-medium'
                                : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-soft)] opacity-60'
                            }`}
                          >{s}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-[var(--text-main)]">Date Submitted</Label>
                      <Input type="date" value={appForm.dateSubmitted}
                        onChange={e => setAppForm(f => ({ ...f, dateSubmitted: e.target.value }))}
                        className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-[var(--text-main)]">Case Number</Label>
                      <Input value={appForm.caseNumber}
                        onChange={e => setAppForm(f => ({ ...f, caseNumber: e.target.value }))}
                        placeholder="If assigned" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-[var(--text-main)] text-red-600">Appeal Deadline</Label>
                      <Input type="date" value={appForm.appealDeadline}
                        onChange={e => setAppForm(f => ({ ...f, appealDeadline: e.target.value }))}
                        className="mt-1 border-red-200" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-[var(--text-main)]">Agency</Label>
                      <Input value={appForm.agency}
                        onChange={e => setAppForm(f => ({ ...f, agency: e.target.value }))}
                        placeholder="e.g., Social Security Administration"
                        className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-[var(--text-main)]">Contact Person</Label>
                      <Input value={appForm.contactPerson}
                        onChange={e => setAppForm(f => ({ ...f, contactPerson: e.target.value }))}
                        placeholder="Your case worker" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-[var(--text-main)]">Contact Phone</Label>
                      <Input value={appForm.contactPhone}
                        onChange={e => setAppForm(f => ({ ...f, contactPhone: e.target.value }))}
                        className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[var(--text-main)]">Documents Submitted</Label>
                    <Textarea value={appForm.documents}
                      onChange={e => setAppForm(f => ({ ...f, documents: e.target.value }))}
                      placeholder="List what you've sent them — keep an inventory"
                      className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[var(--text-main)]">Next Steps</Label>
                      <Textarea value={appForm.nextSteps}
                        onChange={e => setAppForm(f => ({ ...f, nextSteps: e.target.value }))}
                        placeholder="What needs to happen next?" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-[var(--text-main)]">Next Appointment</Label>
                      <Input type="date" value={appForm.nextAppointment}
                        onChange={e => setAppForm(f => ({ ...f, nextAppointment: e.target.value }))}
                        className="mt-1" />
                      <Label className="text-[var(--text-main)] mt-2">Notes</Label>
                      <Textarea value={appForm.notes}
                        onChange={e => setAppForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Anything else..." className="mt-1" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={saveApplication}
                      className="flex-1 bg-[var(--accent-primary)] text-[var(--text-main)] hover:opacity-90 font-medium border-2 border-[var(--accent-primary)]">
                      <CheckCircle className="h-4 w-4 mr-2" /> {editingAppId ? 'Update Application' : 'Save Application'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAppForm(false)}
                      className="border-[var(--border-soft)] text-[var(--text-muted)]">Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Applications List */}
            <div className="space-y-2">
              {applications.map(app => (
                <Card key={app.id} className="border-[var(--border-soft)] bg-[var(--bg-card)]">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-[var(--text-main)]">{app.applicationType}</h3>
                        <p className="text-sm text-[var(--text-muted)]">
                          {app.agency} {app.caseNumber && `— #${app.caseNumber}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={STATUS_COLORS[app.status] || 'bg-muted text-muted-foreground'}>
                          {app.status}
                        </Badge>
                        {app.appealDeadline && (
                          <Badge className="bg-red-100 text-red-800 text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Deadline: {app.appealDeadline}
                          </Badge>
                        )}
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[var(--text-muted)] hover:text-blue-500"
                            onClick={() => editApplication(app)}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[var(--text-muted)] hover:text-red-500"
                            onClick={() => deleteApplication(app)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {app.nextSteps && (
                      <p className="text-sm text-[var(--text-muted)] mt-2">
                        <span className="font-medium">Next:</span> {app.nextSteps}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
              {applications.length === 0 && !showAppForm && (
                <p className="text-center text-[var(--text-muted)] py-8">
                  No disability applications tracked yet.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* SSDI EDUCATION TAB */}
        {/* ================================================================ */}
        {activeTab === "education" && (
          <div className="space-y-4">
            <Card className="border-[var(--border-soft)] bg-[var(--bg-card)]">
              <CardHeader>
                <CardTitle className="text-[var(--text-main)]">
                  Proving to Bureaucracy That You Are, In Fact, Disabled Enough
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-[var(--text-main)]">
                  Disability systems — SSDI, SSI, VA, state programs — don't care about your diagnosis.
                  You could have twelve of them, spelled correctly and in Latin.
                  What they care about is whether you can work like a hypothetical, not-ill person would.
                  And we're here to help you weaponize your paperwork.
                </p>
                <div className="bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-lg p-4">
                  <p className="text-sm text-[var(--text-muted)]">
                    <strong>Note:</strong> This information is meant to help you understand the system, not as legal advice.
                    The disability system is complex and often frustrating. It's okay to feel overwhelmed — that's a
                    normal response to a difficult process, not a reflection of your worth or your legitimate need for support.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Step 1 */}
            <Card className="border-[var(--border-soft)] bg-[var(--bg-card)]">
              <CardHeader className="cursor-pointer" onClick={() => setExpandedItem(expandedItem === 'step1' ? null : 'step1')}>
                <CardTitle className="text-[var(--text-main)] flex items-center justify-between">
                  <span>Step 1: Get Petty. No, Pettier. Still Pettier.</span>
                  {expandedItem === 'step1' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CardTitle>
              </CardHeader>
              {expandedItem === 'step1' && (
                <CardContent className="space-y-3">
                  <p className="text-[var(--text-main)]">
                    Dig out at least 5 years of your medical records.
                    Every time you said, "This hurts," or "I can't do that anymore" or "This med made me a swamp goblin" — WRITE. IT. DOWN.
                  </p>
                  <p className="text-[var(--text-main)]">
                    I won my case because I couldn't type for more than 30 minutes due to carpal tunnel. That was the tipping point.
                    CARPAL. TUNNEL. Not my psych records. Not my entire immune system doing jazz hands. Carpal. Freaking. Tunnel.
                  </p>
                  <p className="text-[var(--text-main)] font-medium">
                    So yes: Write down everything. Let SSA sort it out. You're not the gatekeeper of what counts.
                  </p>
                </CardContent>
              )}
            </Card>

            {/* Step 2 */}
            <Card className="border-[var(--border-soft)] bg-[var(--bg-card)]">
              <CardHeader className="cursor-pointer" onClick={() => setExpandedItem(expandedItem === 'step2' ? null : 'step2')}>
                <CardTitle className="text-[var(--text-main)] flex items-center justify-between">
                  <span>Step 2: Make a Thorough, Realistic Accommodation List</span>
                  {expandedItem === 'step2' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CardTitle>
              </CardHeader>
              {expandedItem === 'step2' && (
                <CardContent className="space-y-3">
                  <p className="text-[var(--text-main)]">Now imagine you're a boss trying to hire you.</p>
                  <p className="text-[var(--text-main)]">
                    List every single accommodation you would need to work an 8-hour day, full time, reliably.
                    Be thorough. Be realistic. Be petty. Include the things you'd normally minimize.
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-[var(--text-main)]">
                    <li>"Would require a fragrance-free office floor due to mast cell disease."</li>
                    <li>"Must avoid fluorescent lighting within 10 feet of desk or migraines occur."</li>
                    <li>"Due to severe IBS, must have unrestricted bathroom access, flexible scheduling, and zero judgment."</li>
                    <li>"Would require both a rigid routine (Autism) and flexible leave for unpredictable symptom flares."</li>
                    <li>"Must have access to food, drinks, and phone at workstation due to medical monitoring (glucose, heart rate)."</li>
                    <li>"Cannot reliably drive due to [seizures/syncope/medication side effects/vision]. Would need employer within public transit range or fully remote position."</li>
                    <li>"Would need to miss ~1 hour/week for therapy and ~1 hour/month for psychiatry. Long-time providers who maintain my current stability don't have evening/weekend hours."</li>
                  </ul>
                  <p className="text-[var(--text-main)]">
                    Notice where the accommodations contradict each other. That matters — it shows the issue isn't one specific workplace, it's the reality of your conditions in any workplace.
                  </p>
                  <p className="text-[var(--text-main)]">
                    And notice the things that seem "small" — the therapy hours, the bathroom access, the lighting.
                    Small accommodations add up. A boss reading this list isn't thinking about any one item.
                    They're thinking about all of them together.
                  </p>
                </CardContent>
              )}
            </Card>

            {/* Step 3 */}
            <Card className="border-[var(--border-soft)] bg-[var(--bg-card)]">
              <CardHeader className="cursor-pointer" onClick={() => setExpandedItem(expandedItem === 'step3' ? null : 'step3')}>
                <CardTitle className="text-[var(--text-main)] flex items-center justify-between">
                  <span>Step 3: Fill Out Their Paperwork Like You're Having a Bad Day</span>
                  {expandedItem === 'step3' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CardTitle>
              </CardHeader>
              {expandedItem === 'step3' && (
                <CardContent className="space-y-3">
                  <p className="text-[var(--text-main)]">
                    Not a good day. A bad day. Everyone can work on the good days — that's not the question.
                    The question is: can you work reliably on the bad days? And how often are the bad days?
                  </p>
                  <p className="text-[var(--text-main)]">
                    Also consider: even on okay days, does the energy it takes to parent, keep your home livable,
                    feed yourself, and shower leave enough left over for 8 hours of paid work? If surviving takes
                    all your spoons, that matters.
                  </p>
                  <p className="text-[var(--text-main)]">Then hand your answers to:</p>
                  <ul className="list-disc pl-6 space-y-1 text-[var(--text-main)]">
                    <li>Your partner (if applicable)</li>
                    <li>A brutally honest friend</li>
                    <li>The pet who gives you the most side-eye</li>
                  </ul>
                  <p className="text-[var(--text-main)]">
                    And ask: Did I downplay anything?
                  </p>
                  <p className="text-[var(--text-main)] font-medium">
                    Spoiler: You did. We all do. Trauma teaches us to minimize.
                  </p>
                </CardContent>
              )}
            </Card>

            {/* Step 4 */}
            <Card className="border-[var(--border-soft)] bg-[var(--bg-card)]">
              <CardHeader className="cursor-pointer" onClick={() => setExpandedItem(expandedItem === 'step4' ? null : 'step4')}>
                <CardTitle className="text-[var(--text-main)] flex items-center justify-between">
                  <span>Step 4: Ask Your Doctors for Functional Limitations</span>
                  {expandedItem === 'step4' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CardTitle>
              </CardHeader>
              {expandedItem === 'step4' && (
                <CardContent className="space-y-3">
                  <p className="text-[var(--text-main)]">
                    Not diagnoses. FUNCTIONAL LIMITATIONS. SSDI doesn't care that you have lupus.
                    They care that lupus means you can't:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-[var(--text-main)]">
                    <li>Sit for more than 20 minutes without a break</li>
                    <li>Lift more than 5 pounds</li>
                    <li>Stand for more than 10 minutes</li>
                    <li>Maintain focus for a full workday</li>
                    <li>Reliably show up 5 days a week</li>
                    <li>Need to lie down 3x per day for 30+ minutes</li>
                  </ul>
                  <p className="text-[var(--text-main)] font-medium">
                    Every time you said "This hurts" or "I can't do that anymore" — WRITE IT DOWN.
                    This is what wins cases. Not the diagnosis. The limitation.
                  </p>
                </CardContent>
              )}
            </Card>

            {/* Step 5 */}
            <Card className="border-[var(--border-soft)] bg-[var(--bg-card)]">
              <CardHeader className="cursor-pointer" onClick={() => setExpandedItem(expandedItem === 'step5' ? null : 'step5')}>
                <CardTitle className="text-[var(--text-main)] flex items-center justify-between">
                  <span>Step 5: They Will Tell You to Sort Socks</span>
                  {expandedItem === 'step5' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CardTitle>
              </CardHeader>
              {expandedItem === 'step5' && (
                <CardContent className="space-y-3">
                  <p className="text-[var(--text-main)]">
                    Disability systems do not care whether you can stay in your current job.
                    They do not care at all. They will tell you to go become a sock sorter at a
                    local factory if you can't do your current job anymore — regardless of the fact that
                    you have no experience in sock sorting, no desire to sort socks, can't afford that
                    kind of pay cut, and there are no sock sorting factories within 100 miles.
                  </p>
                  <p className="text-[var(--text-main)]">
                    They don't even check if the sock sorting facility EXISTS within 100 miles,
                    or if you can DRIVE 100 miles to get there, or if your medications make driving unsafe.
                  </p>
                  <p className="text-[var(--text-main)] font-medium">
                    They. Don't. Care.
                  </p>
                  <p className="text-[var(--text-main)]">
                    You have to prove you can't work ANYWHERE at ALL, or you don't qualify.
                    That's why the accommodation list matters — you're not showing that your current job
                    is hard. You're showing that the combination of accommodations ANY employer would
                    need to provide is impossible to achieve in any realistic workplace.
                  </p>
                  <p className="text-[var(--text-main)]">
                    This is also why tracking missed work across ALL types matters — not just paid employment.
                    If you can't reliably do household tasks, caregiving, or school, that's evidence
                    you can't reliably do paid work either.
                  </p>
                </CardContent>
              )}
            </Card>

            {/* Step 6 - Diagnosis Strategy */}
            <Card className="border-[var(--border-soft)] bg-[var(--bg-card)]">
              <CardHeader className="cursor-pointer" onClick={() => setExpandedItem(expandedItem === 'step6' ? null : 'step6')}>
                <CardTitle className="text-[var(--text-main)] flex items-center justify-between">
                  <span>Step 6: Pick Your Diagnostic Battles (Your Spoons Are Limited)</span>
                  {expandedItem === 'step6' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CardTitle>
              </CardHeader>
              {expandedItem === 'step6' && (
                <CardContent className="space-y-3">
                  <p className="text-[var(--text-main)]">
                    Not every wrong diagnosis is worth fighting. Some wrong diagnoses are <em>paying your rent.</em>
                  </p>
                  <p className="text-[var(--text-main)]">
                    If your SSDI or VA rating is based on a diagnosis, and a more accurate diagnosis would get the
                    same treatment and the same benefits — leave it alone. You can investigate the correct diagnosis
                    as a sidecar without threatening the benefits you already have.
                  </p>
                  <p className="text-[var(--text-main)] font-medium">
                    The diagnoses worth fighting are the ones that HURT you:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-[var(--text-main)]">
                    <li>
                      <strong>Conversion Disorder / FND</strong> when you have positive lab work (antibodies, inflammatory markers,
                      abnormal imaging). This tells SSDI your symptoms are psychosomatic — that you could get better
                      if you just tried harder. If you have MEASURABLE pathology, this diagnosis is a weapon aimed at you.
                    </li>
                    <li>
                      <strong>"Anxiety"</strong> as the explanation for tachycardia, chest pain, or shortness of breath —
                      when nobody ran cardiac or autonomic testing first. Get the testing. THEN if it's anxiety, fine.
                      But "we didn't check" is not a diagnosis.
                    </li>
                    <li>
                      <strong>Any diagnosis that blocks further investigation.</strong> If a doctor says "it's just X"
                      and stops looking, and you're still getting worse — that diagnosis is a locked door, not an answer.
                    </li>
                  </ul>
                  <p className="text-[var(--text-main)]">
                    The diagnoses NOT worth fighting are the ones that don't change anything material:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-[var(--text-main)]">
                    <li>Same medication either way? Don't fight it.</li>
                    <li>Same benefits either way? Don't fight it.</li>
                    <li>The "correct" diagnosis has LESS disability recognition? Definitely don't fight it.</li>
                  </ul>
                  <p className="text-[var(--text-main)]">
                    Your energy is finite. Spend it on the battles that change your treatment,
                    your benefits, or your quality of life. Let the rest be wrong on paper.
                    You know what's happening in your body. That's what matters.
                  </p>
                </CardContent>
              )}
            </Card>

            {/* Step 7 - AI as Advocate */}
            <Card className="border-[var(--border-soft)] bg-[var(--bg-card)]">
              <CardHeader className="cursor-pointer" onClick={() => setExpandedItem(expandedItem === 'step7' ? null : 'step7')}>
                <CardTitle className="text-[var(--text-main)] flex items-center justify-between">
                  <span>Step 7: Your AI Knows the Law Better Than You Do (Use That)</span>
                  {expandedItem === 'step7' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </CardTitle>
              </CardHeader>
              {expandedItem === 'step7' && (
                <CardContent className="space-y-4">
                  <p className="text-[var(--text-main)]">
                    You're already using an AI-built app — so you're okay with AI helping you.
                    Here's the thing: AI assistants like Claude, ChatGPT, or Gemini have read every federal regulation,
                    every CFR citation, every state insurance code, and every ADA requirement.
                    They can write appeal letters that make insurance companies cry.
                  </p>
                  <p className="text-[var(--text-main)]">
                    You bring the medical expertise (you know your body). They bring the legal language.
                    Together, you're a nightmare for any denial letter.
                  </p>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-[var(--text-main)]">🔥 Insurance Denial Appeals</h4>
                    <div className="bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-lg p-4">
                      <p className="text-sm text-[var(--text-muted)] mb-2 italic">Copy this, paste into Claude/ChatGPT, fill in the brackets:</p>
                      <p className="text-sm text-[var(--text-main)] font-mono bg-black/5 dark:bg-white/5 p-3 rounded">
                        "My insurance ([insurer name]) denied coverage for [medication/device/procedure].
                        The denial reason was [quote from denial letter].
                        My diagnoses are [list]. My doctor prescribed this because [reason].
                        I need you to write a formal appeal letter citing the relevant federal and state
                        regulations, my plan's own coverage criteria, and medical necessity standards.
                        Include any applicable CFR citations, parity laws, or ADA requirements.
                        Make it firm, professional, and impossible to ignore."
                      </p>
                    </div>

                    <h4 className="font-semibold text-[var(--text-main)]">📋 Prior Authorization Disputes</h4>
                    <div className="bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-lg p-4">
                      <p className="text-sm text-[var(--text-muted)] mb-2 italic">When they want you to fail 3 cheaper drugs first:</p>
                      <p className="text-sm text-[var(--text-main)] font-mono bg-black/5 dark:bg-white/5 p-3 rounded">
                        "My insurance requires step therapy / prior auth for [medication].
                        I have already tried [list failed medications and why they failed].
                        My doctor is requesting [specific medication] because [clinical reason].
                        Write a prior authorization appeal that argues medical necessity,
                        cites relevant step therapy exception criteria, and references
                        any applicable state step therapy override laws for [your state]."
                      </p>
                    </div>

                    <h4 className="font-semibold text-[var(--text-main)]">♿ Accommodation Requests</h4>
                    <div className="bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-lg p-4">
                      <p className="text-sm text-[var(--text-muted)] mb-2 italic">For work, school, housing, or anywhere else:</p>
                      <p className="text-sm text-[var(--text-main)] font-mono bg-black/5 dark:bg-white/5 p-3 rounded">
                        "I need to request a reasonable accommodation from [employer/school/housing].
                        My condition is [diagnosis]. My functional limitations are [list from your tracking data].
                        The accommodation I need is [what you need].
                        Write a formal ADA reasonable accommodation request letter.
                        Include the interactive process requirement and cite relevant ADA/Section 504 provisions."
                      </p>
                    </div>

                    <h4 className="font-semibold text-[var(--text-main)]">📑 SSDI Application Support</h4>
                    <div className="bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-lg p-4">
                      <p className="text-sm text-[var(--text-muted)] mb-2 italic">For the function report (the form that actually matters):</p>
                      <p className="text-sm text-[var(--text-main)] font-mono bg-black/5 dark:bg-white/5 p-3 rounded">
                        "I'm filling out an SSDI function report (Form SSA-3373).
                        My conditions are [list]. Here's what my daily life actually looks like: [paste your
                        tracking data — symptoms, severity, missed activities, energy crashes, etc.]
                        Help me describe my functional limitations in language that SSA evaluators
                        understand. Focus on what I CAN'T do reliably, not on my diagnoses.
                        Be specific about frequency, duration, and unpredictability."
                      </p>
                    </div>

                    <h4 className="font-semibold text-[var(--text-main)]">🏥 New Provider Summary</h4>
                    <div className="bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-lg p-4">
                      <p className="text-sm text-[var(--text-muted)] mb-2 italic">When you're seeing a new specialist and don't want to forget anything:</p>
                      <p className="text-sm text-[var(--text-main)] font-mono bg-black/5 dark:bg-white/5 p-3 rounded">
                        "I'm seeing a new [specialty] doctor. Here is my medical history: [paste from Command].
                        Help me organize this into a clear, chronological summary that I can bring to the
                        appointment. Highlight the most important things the specialist needs to know.
                        Include a list of questions I should ask based on my symptoms."
                      </p>
                    </div>
                  </div>

                  <div className="bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-lg p-4">
                    <p className="text-sm text-[var(--text-main)]">
                      <strong>Pro tip:</strong> The more specific data you paste in, the more devastating the letter.
                      That's why you're tracking everything — not just for your doctor, but for
                      every system that's ever going to tell you "no." Your data is your ammunition.
                      Command organizes it. AI weaponizes it.
                    </p>
                  </div>

                  <p className="text-xs text-[var(--text-muted)] italic">
                    Works with Claude (claude.ai), ChatGPT (chatgpt.com), Gemini (gemini.google.com),
                    or any AI assistant. Free tiers work fine for this. Your data stays in YOUR conversation —
                    we don't send anything anywhere.
                  </p>
                </CardContent>
              )}
            </Card>

            {/* Reminder */}
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="py-4">
                <p className="text-sm text-orange-800 text-center">
                  <strong>Remember:</strong> The question disability systems ask is not "are you sick?"
                  It's "can you perform any full-time job, reliably, five days a week?"
                  <br />
                  Everything you track in this app helps answer that question.
                </p>
              </CardContent>
            </Card>
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
