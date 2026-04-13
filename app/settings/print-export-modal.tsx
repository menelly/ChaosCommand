/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * Print / Export — Generate filtered medical reports for doctors, lawyers, or yourself.
 * "My endo does not need my panic attacks but maybe mood and maybe not poop pictures."
 */
"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Printer, FileText, Stethoscope, Scale, ChevronRight, ChevronLeft, Download, Loader2, User, X } from "lucide-react"
import { useDailyData } from "@/lib/database/hooks/use-daily-data"
import { CATEGORIES, formatDateForStorage } from "@/lib/database/dexie-db"
import { generateMedicalReport } from "@/lib/pdf-report-generator"

interface PrintExportModalProps {
  isOpen: boolean
  onClose: () => void
}

type Audience = 'doctor' | 'attorney' | 'personal'

// Tracker categories with display names
const TRACKER_OPTIONS = [
  { id: 'pain', label: 'Pain', category: 'body' },
  { id: 'sleep', label: 'Sleep', category: 'body' },
  { id: 'energy', label: 'Energy / Spoons', category: 'body' },
  { id: 'dysautonomia', label: 'Dysautonomia', category: 'body' },
  { id: 'head-pain', label: 'Head Pain / Migraine', category: 'body' },
  { id: 'seizure', label: 'Seizure', category: 'body' },
  { id: 'upper-digestive', label: 'Upper Digestive', category: 'body' },
  { id: 'bathroom', label: 'Lower Digestive', category: 'body' },
  { id: 'reproductive-health', label: 'Reproductive Health', category: 'body' },
  { id: 'brain-fog', label: 'Brain Fog', category: 'mind' },
  { id: 'mental-health', label: 'Mental Health', category: 'mind' },
  { id: 'anxiety', label: 'Anxiety', category: 'mind' },
  { id: 'sensory', label: 'Sensory', category: 'mind' },
  { id: 'food-choice', label: 'Food / Nutrition', category: 'choice' },
  { id: 'hydration', label: 'Hydration', category: 'choice' },
  { id: 'movement', label: 'Movement', category: 'choice' },
  { id: 'self-care', label: 'Self-Care', category: 'choice' },
  { id: 'weather', label: 'Weather Impact', category: 'other' },
  { id: 'diabetes', label: 'Diabetes', category: 'body' },
]

// Smart defaults by specialty
const SPECIALTY_DEFAULTS: Record<string, string[]> = {
  'primary': TRACKER_OPTIONS.map(t => t.id),
  'endocrinologist': ['diabetes', 'energy', 'food-choice', 'sleep', 'weight', 'lab-results'],
  'neurologist': ['seizure', 'head-pain', 'brain-fog', 'dysautonomia', 'sleep', 'sensory'],
  'gastroenterologist': ['upper-digestive', 'bathroom', 'food-choice', 'pain'],
  'rheumatologist': ['pain', 'energy', 'sleep', 'brain-fog', 'movement', 'weather'],
  'psychiatrist': ['mental-health', 'anxiety', 'sleep', 'brain-fog', 'self-care'],
  'therapist': ['mental-health', 'anxiety', 'self-care', 'sleep'],
  'cardiologist': ['dysautonomia', 'energy', 'movement', 'sleep'],
  'obgyn': ['reproductive-health', 'pain', 'mental-health'],
  'ssdi': TRACKER_OPTIONS.map(t => t.id), // attorneys get everything
  'other': TRACKER_OPTIONS.map(t => t.id),
}

const SPECIALTIES = [
  { value: 'primary', label: 'Primary Care (everything)' },
  { value: 'endocrinologist', label: 'Endocrinologist' },
  { value: 'neurologist', label: 'Neurologist' },
  { value: 'gastroenterologist', label: 'Gastroenterologist' },
  { value: 'rheumatologist', label: 'Rheumatologist' },
  { value: 'psychiatrist', label: 'Psychiatrist' },
  { value: 'therapist', label: 'Therapist / Counselor' },
  { value: 'cardiologist', label: 'Cardiologist' },
  { value: 'obgyn', label: 'OB/GYN' },
  { value: 'other', label: 'Other (select all)' },
]

export function PrintExportModal({ isOpen, onClose }: PrintExportModalProps) {
  const { getDateRange, getAllCategoryData } = useDailyData()

  // Wizard step
  const [step, setStep] = useState(1)

  // Step 1: Audience + Details
  const [audience, setAudience] = useState<Audience>('doctor')
  const [providerName, setProviderName] = useState('')
  const [specialty, setSpecialty] = useState('primary')
  const [savedProviders, setSavedProviders] = useState<any[]>([])

  // Step 2: Content selection
  const [selectedTrackers, setSelectedTrackers] = useState<string[]>(TRACKER_OPTIONS.map(t => t.id))
  const [includePatterns, setIncludePatterns] = useState(true)
  const [includeJournal, setIncludeJournal] = useState(false)
  const [includeLabs, setIncludeLabs] = useState(true)
  const [includeTimeline, setIncludeTimeline] = useState(true)
  const [includeWorkDisability, setIncludeWorkDisability] = useState(false)
  const [dateRangeStart, setDateRangeStart] = useState('')
  const [dateRangeEnd, setDateRangeEnd] = useState(formatDateForStorage(new Date()))
  const [excludedTags, setExcludedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])

  // Step 3: Generate
  const [isGenerating, setIsGenerating] = useState(false)

  // Derived report style from audience
  const reportStyle = audience === 'personal' ? 'human' : 'doctor'

  // Load providers + set default date range
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      const start = new Date()
      start.setDate(start.getDate() - 90)
      setDateRangeStart(formatDateForStorage(start))

      getAllCategoryData(CATEGORIES.USER).then(records => {
        const providers = records
          ?.filter((r: any) => r.subcategory?.startsWith('providers'))
          ?.map((r: any) => typeof r.content === 'string' ? JSON.parse(r.content) : r.content)
          || []
        setSavedProviders(providers)
      }).catch(() => {})
    }
  }, [isOpen])

  // When audience changes, update defaults
  useEffect(() => {
    if (audience === 'attorney') {
      setIncludeWorkDisability(true)
      setIncludeJournal(false)
      setIncludePatterns(true)
      setIncludeLabs(true)
      setIncludeTimeline(true)
      setSelectedTrackers(TRACKER_OPTIONS.map(t => t.id))
    } else if (audience === 'personal') {
      setIncludeWorkDisability(false)
      setIncludeJournal(true)
      setSelectedTrackers(TRACKER_OPTIONS.map(t => t.id))
    } else {
      setIncludeWorkDisability(false)
    }
  }, [audience])

  // When specialty changes (doctor mode), update smart defaults
  useEffect(() => {
    if (audience === 'doctor') {
      const defaults = SPECIALTY_DEFAULTS[specialty] || TRACKER_OPTIONS.map(t => t.id)
      setSelectedTrackers(defaults)
      setIncludeJournal(specialty === 'therapist' || specialty === 'psychiatrist')
    }
  }, [specialty, audience])

  // Scan for available tags when entering step 2
  useEffect(() => {
    if (step === 2) {
      getDateRange(dateRangeStart, dateRangeEnd, 'tracker').then(records => {
        const tagSet = new Set<string>()
        for (const r of records) {
          const content = r.content
          if (typeof content === 'object' && content) {
            const entries = (content as any).entries || []
            for (const e of entries) {
              if (e?.tags && Array.isArray(e.tags)) {
                for (const tag of e.tags) {
                  if (tag) tagSet.add(tag)
                }
              }
            }
          }
        }
        setAvailableTags(Array.from(tagSet).sort())
      }).catch(() => {})
    }
  }, [step, dateRangeStart, dateRangeEnd])

  const toggleTracker = (id: string) => {
    setSelectedTrackers(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  const toggleExcludedTag = (tag: string) => {
    setExcludedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      // Gather all selected data
      const allTrackerData = await getDateRange(dateRangeStart, dateRangeEnd, 'tracker')
      const allUserData = await getDateRange(dateRangeStart, dateRangeEnd, 'user')
      const allJournalData = includeJournal
        ? await getDateRange(dateRangeStart, dateRangeEnd, 'journal')
        : []
      const allHealthData = await getDateRange(dateRangeStart, dateRangeEnd, 'health')

      // Filter tracker data to selected trackers
      let filteredTrackers = allTrackerData.filter(r =>
        selectedTrackers.some(t => r.subcategory === t || r.subcategory.startsWith(t + '-'))
      )

      // Apply tag exclusions — filter out entries with excluded tags
      if (excludedTags.length > 0) {
        filteredTrackers = filteredTrackers.map(r => {
          const content = r.content
          if (typeof content === 'object' && content && (content as any).entries) {
            const filtered = (content as any).entries.filter((e: any) => {
              if (!e?.tags || !Array.isArray(e.tags)) return true
              return !e.tags.some((t: string) => excludedTags.includes(t))
            })
            return { ...r, content: { ...(content as any), entries: filtered } }
          }
          return r
        }).filter(r => {
          // Remove records that now have zero entries
          const content = r.content
          if (typeof content === 'object' && content && (content as any).entries) {
            return (content as any).entries.length > 0
          }
          return true
        })
      }

      // Get demographics
      const allUserDataFull = await getAllCategoryData(CATEGORIES.USER)
      const demoRecords = (allUserDataFull || []).filter((r: any) => r.subcategory === 'demographics')
      const demographics = demoRecords.length > 0
        ? (typeof demoRecords[0].content === 'string' ? JSON.parse(demoRecords[0].content) : demoRecords[0].content)
        : null

      // Get lab results
      const labRecords = includeLabs
        ? allUserData.filter((r: any) => r.subcategory?.startsWith('lab-results'))
        : []

      // Get timeline events
      const timelineRecords = includeTimeline
        ? allUserData.filter((r: any) => r.subcategory?.startsWith('medical-events'))
        : []

      // Get work & disability data
      let workData = null
      if (includeWorkDisability) {
        const allUserRecords = allUserDataFull || []
        const missedWork = allUserRecords
          .filter((r: any) => r.subcategory === 'missed-work')
          .map((r: any) => typeof r.content === 'string' ? JSON.parse(r.content) : r.content)
        const employment = allUserRecords
          .filter((r: any) => r.subcategory === 'employment-history')
          .map((r: any) => typeof r.content === 'string' ? JSON.parse(r.content) : r.content)
        const applications = allUserRecords
          .filter((r: any) => r.subcategory === 'disability-applications')
          .map((r: any) => typeof r.content === 'string' ? JSON.parse(r.content) : r.content)
        workData = { missedWork, employment, applications }
      }

      // Generate PDF client-side (no Flask needed!)
      const blob = generateMedicalReport({
        demographics,
        providerName,
        specialty: audience === 'attorney' ? 'ssdi' : specialty,
        audience,
        reportStyle,
        dateRange: { start: dateRangeStart, end: dateRangeEnd },
        trackerData: filteredTrackers.map(r => ({
          date: r.date,
          subcategory: r.subcategory,
          content: r.content,
        })),
        labResults: labRecords.map(r => ({
          date: r.date,
          content: typeof r.content === 'string' ? JSON.parse(r.content) : r.content,
        })),
        journalEntries: allJournalData.map(r => {
          let content = r.content
          if (typeof content === 'string') {
            try { content = JSON.parse(content) } catch { content = { text: content } }
          }
          return { date: r.date, content }
        }),
        includePatterns,
        workData,
      })

      // Download or share the PDF
      const audienceLabel = audience === 'attorney' ? 'legal' : audience === 'personal' ? 'personal' : 'medical'
      const filename = `${audienceLabel}-report-${providerName || 'export'}-${dateRangeEnd}.pdf`
      const file = new File([blob], filename, { type: 'application/pdf' })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'Medical Report', files: [file] })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }

      alert('Report generated!')
      onClose()

    } catch (e: any) {
      console.error('Export failed:', e)
      alert(`Export failed: ${e.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const audienceLabel = audience === 'doctor'
    ? (SPECIALTIES.find(s => s.value === specialty)?.label || 'Doctor')
    : audience === 'attorney' ? 'Attorney / SSDI' : 'Personal'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print / Export Report
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map(s => (
              <div key={s} className={`flex items-center gap-2 ${s <= step ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${s === step ? 'bg-primary text-primary-foreground' : s < step ? 'bg-primary/30 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {s}
                </div>
                <span className="text-sm hidden sm:inline">
                  {s === 1 ? 'Who' : s === 2 ? 'What' : 'Generate'}
                </span>
                {s < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            ))}
          </div>

          {/* Step 1: Audience + Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Who is this report for?</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Button
                    variant={audience === 'doctor' ? 'default' : 'outline'}
                    onClick={() => setAudience('doctor')}
                    className="flex flex-col h-auto py-3 gap-1"
                  >
                    <Stethoscope className="h-5 w-5" />
                    <span className="text-xs">My Doctor</span>
                  </Button>
                  <Button
                    variant={audience === 'attorney' ? 'default' : 'outline'}
                    onClick={() => setAudience('attorney')}
                    className="flex flex-col h-auto py-3 gap-1"
                  >
                    <Scale className="h-5 w-5" />
                    <span className="text-xs">My Attorney</span>
                  </Button>
                  <Button
                    variant={audience === 'personal' ? 'default' : 'outline'}
                    onClick={() => setAudience('personal')}
                    className="flex flex-col h-auto py-3 gap-1"
                  >
                    <User className="h-5 w-5" />
                    <span className="text-xs">Just Me</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {audience === 'doctor'
                    ? 'ICD-10 codes, clinical stats, medical language your doctor speaks'
                    : audience === 'attorney'
                    ? 'Functional limitations, missed work, disability impact — SSDI ready'
                    : 'Plain language summary for your own records'}
                </p>
              </div>

              {/* Doctor-specific: provider name + specialty */}
              {audience === 'doctor' && (
                <>
                  <div>
                    <Label>Provider Name</Label>
                    <Input
                      value={providerName}
                      onChange={e => setProviderName(e.target.value)}
                      placeholder="Dr. Smith, Mayo Clinic Neurology, etc."
                      className="mt-1"
                    />
                    {savedProviders.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {savedProviders.slice(0, 6).map((p: any, i: number) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="cursor-pointer hover:bg-primary/10"
                            onClick={() => {
                              setProviderName(p.name || p.providerName || '')
                              if (p.specialty) {
                                const match = SPECIALTIES.find(s =>
                                  p.specialty.toLowerCase().includes(s.value) ||
                                  s.label.toLowerCase().includes(p.specialty.toLowerCase())
                                )
                                if (match) setSpecialty(match.value)
                              }
                            }}
                          >
                            {p.name || p.providerName}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Specialty (determines smart defaults)</Label>
                    <Select value={specialty} onValueChange={setSpecialty}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SPECIALTIES.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Attorney-specific */}
              {audience === 'attorney' && (
                <div>
                  <Label>Attorney / Firm Name</Label>
                  <Input
                    value={providerName}
                    onChange={e => setProviderName(e.target.value)}
                    placeholder="Smith & Associates, SSDI case file, etc."
                    className="mt-1"
                  />
                </div>
              )}

              <Button onClick={() => setStep(2)} className="w-full">
                Next: Choose Content <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Content Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Date Range</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="date" value={dateRangeStart} onChange={e => setDateRangeStart(e.target.value)} />
                  <span className="self-center text-muted-foreground">to</span>
                  <Input type="date" value={dateRangeEnd} onChange={e => setDateRangeEnd(e.target.value)} />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Include Trackers</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {TRACKER_OPTIONS.map(tracker => (
                    <Button
                      key={tracker.id}
                      variant={selectedTrackers.includes(tracker.id) ? 'default' : 'outline'}
                      size="sm"
                      className="justify-start h-auto py-1.5 text-xs"
                      onClick={() => toggleTracker(tracker.id)}
                    >
                      {tracker.label}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedTrackers(TRACKER_OPTIONS.map(t => t.id))}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedTrackers([])}>
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Tag exclusions */}
              {availableTags.length > 0 && (
                <div className="p-3 border rounded-lg">
                  <Label className="mb-2 block">Exclude entries with these tags</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Hide specific entries from your report (e.g., hide that cake from your endo)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTags.map(tag => (
                      <Badge
                        key={tag}
                        variant={excludedTags.includes(tag) ? 'destructive' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleExcludedTag(tag)}
                      >
                        {excludedTags.includes(tag) && <X className="h-3 w-3 mr-1" />}
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label>Include Patterns & Correlations</Label>
                  <Switch checked={includePatterns} onCheckedChange={setIncludePatterns} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Include Journal Entries</Label>
                    <p className="text-xs text-muted-foreground">Contains personal thoughts — review carefully</p>
                  </div>
                  <Switch checked={includeJournal} onCheckedChange={setIncludeJournal} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Include Lab Results</Label>
                  <Switch checked={includeLabs} onCheckedChange={setIncludeLabs} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Include Timeline Events</Label>
                  <Switch checked={includeTimeline} onCheckedChange={setIncludeTimeline} />
                </div>
                {(audience === 'attorney' || audience === 'personal') && (
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Include Work & Disability</Label>
                      <p className="text-xs text-muted-foreground">Missed work days, employment history, applications</p>
                    </div>
                    <Switch checked={includeWorkDisability} onCheckedChange={setIncludeWorkDisability} />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ChevronLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1" disabled={selectedTrackers.length === 0}>
                  Next: Generate <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Generate */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h3 className="font-semibold">Report Summary</h3>
                <div className="text-sm space-y-1">
                  <p><strong>For:</strong> {providerName || 'Not specified'} ({audienceLabel})</p>
                  <p><strong>Style:</strong> {reportStyle === 'doctor' ? 'Medical Language' : 'Human Readable'}</p>
                  <p><strong>Date Range:</strong> {dateRangeStart} to {dateRangeEnd}</p>
                  <p><strong>Trackers:</strong> {selectedTrackers.length} selected</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTrackers.map(t => (
                      <Badge key={t} variant="outline" className="text-xs">
                        {TRACKER_OPTIONS.find(o => o.id === t)?.label || t}
                      </Badge>
                    ))}
                  </div>
                  {excludedTags.length > 0 && (
                    <p className="mt-1">
                      <strong>Excluding tags:</strong>{' '}
                      {excludedTags.map(t => (
                        <Badge key={t} variant="destructive" className="text-xs mr-1">{t}</Badge>
                      ))}
                    </p>
                  )}
                  <p className="mt-2">
                    <strong>Includes:</strong>{' '}
                    {[
                      includePatterns && 'Patterns',
                      includeJournal && 'Journal',
                      includeLabs && 'Labs',
                      includeTimeline && 'Timeline',
                      includeWorkDisability && 'Work & Disability',
                    ].filter(Boolean).join(', ') || 'Tracker data only'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Your report will be saved to your Downloads folder
              </p>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  <ChevronLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button
                  onClick={handleGenerate}
                  className="flex-1"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    <><Download className="h-4 w-4 mr-2" /> Generate PDF</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
