/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * /import — Lab extraction from PDFs (plus a line splitter for pasted lists).
 * Desktop only. 🧮 Deterministic: reads values printed in the file's text
 * layer, no AI model (MedGemma + NER removed in CHA-466, 2026-11-02, because a
 * hallucinated lab value is indistinguishable from a real one downstream).
 * Results save to Dexie via useDailyData using the same compound-subcategory
 * pattern as /timeline.
 *
 * Mobile users get a redirect card (see route-level guard).
 */
"use client";
import { useState, useEffect } from "react"
import AppCanvas from "@/components/app-canvas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import DocumentUploader, { ExtractedLabBatch } from "@/components/document-uploader"

// (Web "try me" demo: the DocumentUploader gates itself — see IS_DEMO there.)
// Diagnostics panel — kept on the shelf, uncomment when chasing lab
// parser regressions. See the commented section below for the UI block.
// import LabParserDiagnosticsPanel from "@/components/lab-parser-diagnostics-panel"
import {
  useDailyData,
  CATEGORIES,
  SUBCATEGORIES,
  formatDateForStorage,
} from "@/lib/database"
import { FileText, CheckCircle, Monitor, FlaskConical, Sparkles } from "lucide-react"
import { useIsMobilePlatform } from "@/lib/platform"

import Link from "next/link";

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

  // Lab-only entry point: the Labs dashboard's "Import from PDF" links here with
  // ?mode=lab, so we run the uploader lab-only (results go straight to the Labs
  // dashboard) and show lab-focused copy.
  // Read from window (not useSearchParams) to avoid the static-export Suspense
  // requirement; this route is desktop client-only anyway.
  const [labOnly, setLabOnly] = useState(false)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setLabOnly(new URLSearchParams(window.location.search).get("mode") === "lab")
    }
  }, [])

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
                Importing lab results from PDFs is desktop-only for now.
              </p>
              <p className="text-[var(--text-main)] font-medium">
                What you can still do on this phone:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Add events and lab results by hand from{" "}
                  <Link
                    href="/add"
                    className="underline text-[var(--text-main)] font-medium"
                  >
                    Add to Timeline
                  </Link>
                </li>
                <li>
                  View and filter your full timeline from{" "}
                  <Link
                    href="/timeline"
                    className="underline text-[var(--text-main)] font-medium"
                  >
                    Timeline
                  </Link>
                </li>
                <li>
                  View lab trends from{" "}
                  <Link
                    href="/lab-results"
                    className="underline text-[var(--text-main)] font-medium"
                  >
                    Labs
                  </Link>
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
    );
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
            {labOnly ? <FlaskConical className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
            {labOnly ? "Import Lab Results" : "Import Medical Records"}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {labOnly ? (
              <>
                Lab panels run through a number-anchored parser that reads each
                value, unit, and reference range by its position on the page,
                then land on your Labs dashboard with trends. Nothing is guessed:
                only values printed in the file come through. Runs locally — your
                documents never leave this computer.
              </>
            ) : (
              <>
                Drop your lab reports and other medical PDFs. We read the
                structured lab values deterministically — only what&apos;s
                printed in the file, nothing guessed — and show you each one
                with a checkbox before it lands on your Labs dashboard. Want
                results saved straight away with no review step?{" "}
                <Link href="/import?mode=lab" className="underline text-[var(--text-main)]">
                  Use the lab-only importer
                </Link>
                . Runs locally — your documents never leave this computer.
              </>
            )}
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
                    <Link href="/timeline" className="underline">
                      view timeline
                    </Link>
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
              <Button asChild className="shrink-0">
                <Link href="/lab-results">
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Open Lab Results
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-[var(--text-main)] flex items-center gap-2">
            {labOnly ? <FlaskConical className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            {labOnly ? "Upload Lab Panels" : "Upload Medical Records"}
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            {labOnly
              ? "Drop your LabCorp / Quest / hospital lab PDFs here. We read the columns by position — value, unit, reference range, abnormal flag — and surface them on your Labs dashboard with trends. Upload the PDF (don't paste text): the column positions only exist in the file."
              : "Lab panels, after-visit summaries with results, hospital printouts — drop them here. The number-anchored lab parser reads every value it can find in the text, then shows you a review screen with checkboxes so you can uncheck anything that doesn't belong before it lands on your Lab Results."}
          </p>
          <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-2)] p-3 text-xs text-[var(--text-muted)] flex items-start gap-2">
            <FileText className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <span className="font-medium text-[var(--text-main)]">Large records import best in pieces.</span>{" "}
              Right now each file is read up to about the first{" "}
              <span className="font-medium">50 pages (~100,000 characters)</span> — anything past that
              isn’t imported yet. If your record is longer (a full medical-history export can run 100+
              pages), split it into a few smaller PDFs and upload them one at a time so nothing gets
              missed. (We’re working on lifting this so you won’t have to.)
            </span>
          </div>
          {/* 🧮 HOW IMPORT WORKS NOW (CHA-466, 2026-11-02). This spot used to be
              the "AI parsing" toggle + the MedGemma download. She kept
              hallucinating, and a made-up lab value looks EXACTLY like a real one
              once it's on a trend chart — so she's gone. What's left never
              invents: it reads numbers printed in the file and asks you about
              each one. For freeform notes, the honest tools are your own hands,
              or your own AI (Claude/Codex) adding entries over the MCP. */}
          {!labOnly && (
            <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-2)] p-4 text-xs text-[var(--text-muted)] flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p>
                  <span className="font-medium text-[var(--text-main)]">What the importer reads:</span>{" "}
                  structured lab values — test, value, unit, reference range, flag — straight from
                  the text in your PDF. It never guesses and never makes anything up: if a number
                  isn&apos;t printed in the file, it won&apos;t appear here. You&apos;ll see each one
                  with a checkbox before anything saves.
                </p>
                <p>
                  <span className="font-medium text-[var(--text-main)]">Visit notes, diagnoses, anything freeform?</span>{" "}
                  Add them by hand from{" "}
                  <Link href="/add" className="underline text-[var(--text-main)]">Add to Timeline</Link>, or let
                  your own AI do it: turn on AI Access in Settings and ask Claude or Codex to read the
                  note and add the entries through the Chaos Command MCP. Everything an AI adds is
                  marked as AI-added, so you can always tell.
                </p>
                <p>
                  Scanned PDFs, photos and screenshots have no text layer to read, so the importer
                  will tell you so instead of guessing — that means &ldquo;nothing to read,&rdquo; not
                  &ldquo;nothing there.&rdquo;
                </p>
              </div>
            </div>
          )}
          <DocumentUploader
            mode={labOnly ? "lab" : "auto"}
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
            <Link href="/manage">← Back to Manage</Link>
          </Button>
        </div>
      </div>
    </AppCanvas>
  );
}
