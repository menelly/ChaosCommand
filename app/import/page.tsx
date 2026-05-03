/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * /import — Medical record extraction from PDFs and pasted text.
 * Desktop only. Runs Transformers.js NER locally (64MB ONNX model, cached
 * after first use). Extracted events save to Dexie via useDailyData using
 * the same compound-subcategory pattern as /timeline.
 *
 * Mobile users get a redirect card (see route-level guard).
 */
"use client"

import { useState } from "react"
import AppCanvas from "@/components/app-canvas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import DocumentUploader, { ExtractedLabBatch } from "@/components/document-uploader"
// Diagnostics panel — kept on the shelf, uncomment when chasing lab
// parser regressions. See the commented section below for the UI block.
// import LabParserDiagnosticsPanel from "@/components/lab-parser-diagnostics-panel"
import {
  useDailyData,
  CATEGORIES,
  SUBCATEGORIES,
  formatDateForStorage,
} from "@/lib/database"
import { FileText, CheckCircle, Monitor, FlaskConical } from "lucide-react"
import { useIsMobilePlatform } from "@/lib/platform"

// Shape the uploader hands back (matches components/document-uploader.tsx)
interface ExtractedEvent {
  id?: string
  type?: string
  title: string
  date?: string
  endDate?: string
  provider?: string
  providerId?: string
  location?: string
  description?: string
  status?: string
  severity?: string
  tags?: string[]
  notes?: string
}

export default function ImportRecordsPage() {
  const { saveData } = useDailyData()
  const [savedCount, setSavedCount] = useState(0)
  const [savedLabCount, setSavedLabCount] = useState(0)
  const [lastBatch, setLastBatch] = useState<string | null>(null)
  const [lastLabBatch, setLastLabBatch] = useState<string | null>(null)
  const isMobile = useIsMobilePlatform()

  // Mobile guard — rendered instead of the uploader on mobile builds.
  if (isMobile) {
    return (
      <AppCanvas currentPage="import">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border-[var(--border-soft)] bg-[var(--bg-card)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-main)] flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Desktop-only feature
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-[var(--text-muted)]">
              <p>
                Importing medical records from PDFs uses a 64 MB on-device AI
                model that some mobile browsers block from downloading. To keep
                it reliable, PDF import is desktop-only for now.
              </p>
              <p className="text-[var(--text-main)] font-medium">
                What you can still do on this phone:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Add events and lab results by hand from{" "}
                  <a
                    href="/add"
                    className="underline text-[var(--text-main)] font-medium"
                  >
                    Add to Timeline
                  </a>
                </li>
                <li>
                  View and filter your full timeline from{" "}
                  <a
                    href="/timeline"
                    className="underline text-[var(--text-main)] font-medium"
                  >
                    Timeline
                  </a>
                </li>
                <li>
                  View lab trends from{" "}
                  <a
                    href="/lab-results"
                    className="underline text-[var(--text-main)] font-medium"
                  >
                    Labs
                  </a>
                </li>
              </ul>
              <p>
                Upload PDFs from your desktop when you're ready — everything
                syncs to the same local database.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppCanvas>
    )
  }

  // Desktop: full extraction UI
  const handleEventsExtracted = async (events: ExtractedEvent[]) => {
    const now = new Date().toISOString()
    let saved = 0
    for (const raw of events) {
      const id =
        raw.id ||
        `medical-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const date = raw.date || now.split("T")[0]
      const newEvent = {
        id,
        type: raw.type || "diagnosis",
        title: raw.title,
        date,
        endDate: raw.endDate,
        provider: raw.provider,
        providerId: raw.providerId,
        location: raw.location,
        description: raw.description || "",
        status: raw.status || "needs_review",
        severity: raw.severity,
        tags: raw.tags || ["imported"],
        notes: raw.notes,
        createdAt: now,
        updatedAt: now,
      }
      try {
        const subcategory = `${SUBCATEGORIES.MEDICAL_EVENTS}-${id}`
        await saveData(
          formatDateForStorage(new Date(date)),
          CATEGORIES.USER,
          subcategory,
          JSON.stringify(newEvent)
        )
        saved++
      } catch (error) {
        console.error(`Failed to save event "${raw.title}":`, error)
      }
    }
    setSavedCount((c) => c + saved)
    setLastBatch(`${saved} event${saved === 1 ? "" : "s"} saved to timeline`)
  }

  const handleLabsExtracted = async (batch: ExtractedLabBatch) => {
    if (!batch.results.length) return
    const id = `lab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const report = {
      id,
      date: batch.date,
      filename: batch.filename,
      results: batch.results,
      addedDate: formatDateForStorage(new Date()),
    }
    try {
      await saveData(
        batch.date,
        CATEGORIES.USER,
        `lab-results-${id}`,
        JSON.stringify(report)
      )
      setSavedLabCount((c) => c + batch.results.length)
      setLastLabBatch(
        `${batch.results.length} lab result${batch.results.length === 1 ? "" : "s"} saved to Labs dashboard`
      )
    } catch (e) {
      console.error("Failed to save lab report:", e)
    }
  }

  return (
    <AppCanvas currentPage="import">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Import Medical Records
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Two paths: medical documents (visit notes, summaries, imaging) go
            through the NER extractor and land on your timeline. Lab panels go
            through a number-anchored parser and land on your Labs dashboard.
            Pick the right one — lab panels through the medical parser will
            try to diagnose you with the test name. Runs locally — your
            documents never leave this computer.
          </p>
        </div>

        {lastBatch && (
          <Card className="border-[var(--border-soft)] bg-[var(--bg-card)]">
            <CardContent className="pt-6 flex items-center gap-3 text-[var(--text-main)]">
              <CheckCircle className="h-5 w-5" />
              <div>
                <div className="font-medium">{lastBatch}</div>
                {savedCount > 0 && (
                  <div className="text-sm text-[var(--text-muted)]">
                    {savedCount} total this session —{" "}
                    <a href="/timeline" className="underline">
                      view timeline
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {lastLabBatch && (
          <Card className="border-[var(--border-soft)] bg-[var(--bg-card)]">
            <CardContent className="pt-6 flex items-center justify-between gap-3 text-[var(--text-main)] flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <FlaskConical className="h-5 w-5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium">{lastLabBatch}</div>
                  {savedLabCount > 0 && (
                    <div className="text-sm text-[var(--text-muted)]">
                      {savedLabCount} total lab{savedLabCount === 1 ? '' : 's'} this session — review and edit dates on the Labs dashboard.
                    </div>
                  )}
                </div>
              </div>
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                <a href="/lab-results">
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Open Lab Results
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Medical Records
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Visit notes, after-visit summaries, imaging reports, lab panels —
            drop them all here. The parser runs both medical (NER) and lab
            (number-anchored) extraction on every document, then shows you a
            review screen with checkboxes so you can uncheck anything that
            doesn't belong before it lands on your timeline or Lab Results.
          </p>
          <DocumentUploader
            mode="auto"
            onEventsExtracted={handleEventsExtracted}
            onLabsExtracted={handleLabsExtracted}
          />
        </section>

        {/*
          Parser Diagnostics panel — uncomment when debugging lab parser
          issues. The localStorage write in extractLabResults() and the
          component itself stay shipped so future-Ace can flip this back
          on without a rebuild loop. Was load-bearing during the May 2026
          unified-uploader marathon; commented out for normal use.
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
            🔬 Parser Diagnostics
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            If a lab upload returns 0 results, this panel shows what each
            parser saw and why it gave up. Refresh after each upload.
          </p>
          <LabParserDiagnosticsPanel />
        </section>
        */}

        <div className="flex justify-center gap-4 mt-8 text-sm">
          <Button variant="outline" asChild>
            <a href="/manage">← Back to Manage</a>
          </Button>
        </div>
      </div>
    </AppCanvas>
  )
}
