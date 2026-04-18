/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * /add — Manual entry for timeline events and lab results.
 * Works on desktop AND mobile. No NER, no model download, no PDF parsing.
 * Writes to Dexie via useDailyData using the same compound-subcategory
 * pattern as /timeline and /lab-results.
 */
"use client"

import { useState } from "react"
import AppCanvas from "@/components/app-canvas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useDailyData,
  CATEGORIES,
  SUBCATEGORIES,
  formatDateForStorage,
} from "@/lib/database"
import {
  CheckCircle,
  FlaskConical,
  Stethoscope,
  Plus,
} from "lucide-react"

// ============================================================================
// TYPES (mirror /timeline and /lab-results so data stays compatible)
// ============================================================================

type EventType =
  | "diagnosis"
  | "surgery"
  | "hospitalization"
  | "treatment"
  | "test"
  | "medication"
  | "appointment"

interface MedicalEvent {
  id: string
  type: EventType
  title: string
  date: string
  endDate?: string
  provider?: string
  location?: string
  description: string
  status: "active" | "resolved" | "ongoing" | "scheduled" | "needs_review"
  severity?: "mild" | "moderate" | "severe" | "critical"
  tags: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

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
  date?: string
}

interface LabReport {
  id: string
  date: string
  filename: string
  results: LabResult[]
  addedDate: string
}

// ============================================================================
// EMPTY FORM STATES
// ============================================================================

const emptyEventForm = () => ({
  type: "diagnosis" as EventType,
  title: "",
  date: formatDateForStorage(new Date()),
  provider: "",
  location: "",
  description: "",
  status: "active" as MedicalEvent["status"],
  severity: "" as "" | NonNullable<MedicalEvent["severity"]>,
  notes: "",
})

const emptyLabForm = () => ({
  test_name: "",
  value: "",
  unit: "",
  reference_low: "",
  reference_high: "",
  flag: "",
  date: formatDateForStorage(new Date()),
})

// ============================================================================
// PAGE
// ============================================================================

export default function AddToTimelinePage() {
  const { saveData } = useDailyData()

  const [eventForm, setEventForm] = useState(emptyEventForm)
  const [labForm, setLabForm] = useState(emptyLabForm)

  const [eventSaving, setEventSaving] = useState(false)
  const [labSaving, setLabSaving] = useState(false)

  const [eventSuccess, setEventSuccess] = useState<string | null>(null)
  const [labSuccess, setLabSuccess] = useState<string | null>(null)

  // --------------------------------------------------------------------------
  // Save: Event
  // --------------------------------------------------------------------------
  const handleSaveEvent = async () => {
    if (!eventForm.title.trim()) {
      setEventSuccess(null)
      return
    }
    setEventSaving(true)
    try {
      const now = new Date().toISOString()
      const id = `medical-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const newEvent: MedicalEvent = {
        id,
        type: eventForm.type,
        title: eventForm.title.trim(),
        date: eventForm.date,
        provider: eventForm.provider.trim() || undefined,
        location: eventForm.location.trim() || undefined,
        description: eventForm.description.trim(),
        status: eventForm.status,
        severity: eventForm.severity || undefined,
        tags: ["manual-entry"],
        notes: eventForm.notes.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      }
      const subcategory = `${SUBCATEGORIES.MEDICAL_EVENTS}-${id}`
      await saveData(
        formatDateForStorage(new Date(eventForm.date)),
        CATEGORIES.USER,
        subcategory,
        JSON.stringify(newEvent)
      )
      setEventSuccess(`Saved: ${newEvent.title}`)
      setEventForm(emptyEventForm())
    } catch (e) {
      console.error("Failed to save event:", e)
      setEventSuccess(null)
      alert(`Failed to save event: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setEventSaving(false)
    }
  }

  // --------------------------------------------------------------------------
  // Save: Lab Result
  // --------------------------------------------------------------------------
  const handleSaveLab = async () => {
    if (!labForm.test_name.trim()) {
      setLabSuccess(null)
      return
    }
    setLabSaving(true)
    try {
      const val = labForm.value ? parseFloat(labForm.value) : null
      const refLow = labForm.reference_low ? parseFloat(labForm.reference_low) : null
      const refHigh = labForm.reference_high ? parseFloat(labForm.reference_high) : null
      let flag = labForm.flag || ""
      let isAbnormal = !!flag
      if (!isAbnormal && val !== null) {
        if (refLow !== null && val < refLow) {
          isAbnormal = true
          flag = flag || "L"
        } else if (refHigh !== null && val > refHigh) {
          isAbnormal = true
          flag = flag || "H"
        }
      }
      const result: LabResult = {
        test_name: labForm.test_name.trim(),
        value: val,
        value_text: val !== null ? `${val}` : "",
        unit: labForm.unit.trim(),
        reference_low: refLow,
        reference_high: refHigh,
        reference_text:
          refLow !== null && refHigh !== null
            ? `${refLow}-${refHigh} ${labForm.unit}`
            : "",
        flag,
        is_abnormal: isAbnormal,
        context: "Manual entry",
        confidence: 1.0,
        date: labForm.date,
      }
      const id = `lab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const report: LabReport = {
        id,
        date: labForm.date,
        filename: "Manual Entry",
        results: [result],
        addedDate: formatDateForStorage(new Date()),
      }
      await saveData(
        labForm.date,
        CATEGORIES.USER,
        `lab-results-${id}`,
        JSON.stringify(report)
      )
      setLabSuccess(`Saved: ${result.test_name}`)
      setLabForm(emptyLabForm())
    } catch (e) {
      console.error("Failed to save lab result:", e)
      setLabSuccess(null)
      alert(`Failed to save lab result: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLabSaving(false)
    }
  }

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  return (
    <AppCanvas currentPage="add">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <Plus className="h-6 w-6" />
            Add to Timeline
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Add a medical event or a lab result by hand. No uploads, no model
            download — works everywhere.
          </p>
        </div>

        <Tabs defaultValue="event" className="w-full">
          <TabsList className="grid grid-cols-2 w-full h-12 bg-[var(--bg-card)] border border-[var(--border-soft)]">
            <TabsTrigger
              value="event"
              className="text-base data-[state=active]:bg-[var(--accent-primary)] data-[state=active]:text-[var(--text-main)]"
            >
              <Stethoscope className="h-4 w-4 mr-2" />
              Event
            </TabsTrigger>
            <TabsTrigger
              value="lab"
              className="text-base data-[state=active]:bg-[var(--accent-primary)] data-[state=active]:text-[var(--text-main)]"
            >
              <FlaskConical className="h-4 w-4 mr-2" />
              Lab Result
            </TabsTrigger>
          </TabsList>

          {/* ===================== EVENT TAB ===================== */}
          <TabsContent value="event">
            <Card className="border-[var(--border-soft)] bg-[var(--bg-card)]">
              <CardHeader>
                <CardTitle className="text-[var(--text-main)]">
                  New Medical Event
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[var(--text-main)]">Type *</Label>
                    <Select
                      value={eventForm.type}
                      onValueChange={(v) =>
                        setEventForm((f) => ({ ...f, type: v as EventType }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diagnosis">Diagnosis</SelectItem>
                        <SelectItem value="medication">Medication</SelectItem>
                        <SelectItem value="surgery">Surgery</SelectItem>
                        <SelectItem value="hospitalization">Hospitalization</SelectItem>
                        <SelectItem value="treatment">Treatment</SelectItem>
                        <SelectItem value="test">Test / Procedure</SelectItem>
                        <SelectItem value="appointment">Appointment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[var(--text-main)]">Date *</Label>
                    <Input
                      type="date"
                      value={eventForm.date}
                      onChange={(e) =>
                        setEventForm((f) => ({ ...f, date: e.target.value }))
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[var(--text-main)]">Title *</Label>
                  <Input
                    value={eventForm.title}
                    onChange={(e) =>
                      setEventForm((f) => ({ ...f, title: e.target.value }))
                    }
                    placeholder="e.g., Hashimoto's diagnosis, Started levothyroxine, ER visit"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[var(--text-main)]">Provider</Label>
                    <Input
                      value={eventForm.provider}
                      onChange={(e) =>
                        setEventForm((f) => ({ ...f, provider: e.target.value }))
                      }
                      placeholder="Dr. Smith"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[var(--text-main)]">Location</Label>
                    <Input
                      value={eventForm.location}
                      onChange={(e) =>
                        setEventForm((f) => ({ ...f, location: e.target.value }))
                      }
                      placeholder="Clinic, ER, hospital"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[var(--text-main)]">Status</Label>
                    <Select
                      value={eventForm.status}
                      onValueChange={(v) =>
                        setEventForm((f) => ({
                          ...f,
                          status: v as MedicalEvent["status"],
                        }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="needs_review">Needs review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[var(--text-main)]">Severity</Label>
                    <Select
                      value={eventForm.severity || "none"}
                      onValueChange={(v) =>
                        setEventForm((f) => ({
                          ...f,
                          severity:
                            v === "none"
                              ? ""
                              : (v as NonNullable<MedicalEvent["severity"]>),
                        }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— not set —</SelectItem>
                        <SelectItem value="mild">Mild</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="severe">Severe</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-[var(--text-main)]">Description</Label>
                  <Textarea
                    value={eventForm.description}
                    onChange={(e) =>
                      setEventForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="What happened? What was said?"
                    className="mt-1 min-h-20"
                  />
                </div>

                <div>
                  <Label className="text-[var(--text-main)]">Notes (private)</Label>
                  <Textarea
                    value={eventForm.notes}
                    onChange={(e) =>
                      setEventForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    placeholder="Your own notes — how you felt, what you suspect, what to follow up on."
                    className="mt-1 min-h-16"
                  />
                </div>

                {eventSuccess && (
                  <div className="flex items-center gap-2 text-sm text-[var(--text-main)] bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-md p-3">
                    <CheckCircle className="h-4 w-4" />
                    <span>{eventSuccess}</span>
                  </div>
                )}

                <Button
                  onClick={handleSaveEvent}
                  disabled={!eventForm.title.trim() || eventSaving}
                  className="w-full h-12 text-base bg-[var(--accent-primary)] text-[var(--text-main)] hover:opacity-90 font-medium border-2 border-[var(--accent-primary)]"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  {eventSaving ? "Saving…" : "Save Event"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===================== LAB TAB ===================== */}
          <TabsContent value="lab">
            <Card className="border-[var(--border-soft)] bg-[var(--bg-card)]">
              <CardHeader>
                <CardTitle className="text-[var(--text-main)]">
                  New Lab Result
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <Label className="text-[var(--text-main)]">Test Name *</Label>
                    <Input
                      value={labForm.test_name}
                      onChange={(e) =>
                        setLabForm((f) => ({ ...f, test_name: e.target.value }))
                      }
                      placeholder="e.g., Ferritin, TSH, Hemoglobin"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[var(--text-main)]">Date *</Label>
                    <Input
                      type="date"
                      value={labForm.date}
                      onChange={(e) =>
                        setLabForm((f) => ({ ...f, date: e.target.value }))
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-[var(--text-main)]">Value</Label>
                    <Input
                      type="number"
                      step="any"
                      value={labForm.value}
                      onChange={(e) =>
                        setLabForm((f) => ({ ...f, value: e.target.value }))
                      }
                      placeholder="7"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[var(--text-main)]">Unit</Label>
                    <Input
                      value={labForm.unit}
                      onChange={(e) =>
                        setLabForm((f) => ({ ...f, unit: e.target.value }))
                      }
                      placeholder="ng/mL"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[var(--text-main)]">Ref Low</Label>
                    <Input
                      type="number"
                      step="any"
                      value={labForm.reference_low}
                      onChange={(e) =>
                        setLabForm((f) => ({
                          ...f,
                          reference_low: e.target.value,
                        }))
                      }
                      placeholder="12"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[var(--text-main)]">Ref High</Label>
                    <Input
                      type="number"
                      step="any"
                      value={labForm.reference_high}
                      onChange={(e) =>
                        setLabForm((f) => ({
                          ...f,
                          reference_high: e.target.value,
                        }))
                      }
                      placeholder="150"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[var(--text-main)]">Flag (optional)</Label>
                  <Select
                    value={labForm.flag || "none"}
                    onValueChange={(v) =>
                      setLabForm((f) => ({ ...f, flag: v === "none" ? "" : v }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— auto-flag from range —</SelectItem>
                      <SelectItem value="L">Low (L)</SelectItem>
                      <SelectItem value="H">High (H)</SelectItem>
                      <SelectItem value="LL">Critical Low (LL)</SelectItem>
                      <SelectItem value="HH">Critical High (HH)</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {labSuccess && (
                  <div className="flex items-center gap-2 text-sm text-[var(--text-main)] bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-md p-3">
                    <CheckCircle className="h-4 w-4" />
                    <span>{labSuccess}</span>
                  </div>
                )}

                <Button
                  onClick={handleSaveLab}
                  disabled={!labForm.test_name.trim() || labSaving}
                  className="w-full h-12 text-base bg-[var(--accent-primary)] text-[var(--text-main)] hover:opacity-90 font-medium border-2 border-[var(--accent-primary)]"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  {labSaving ? "Saving…" : "Save Lab Result"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppCanvas>
  )
}
