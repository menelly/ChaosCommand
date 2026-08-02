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
"use client";
import { useState, useEffect } from "react"
import AppCanvas from "@/components/app-canvas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import DocumentUploader, { ExtractedLabBatch } from "@/components/document-uploader"

// Web "try me" demo: hide the on-device AI-model loader (it would pull ~315MB
// into a visitor's browser). The DocumentUploader is gated separately.
const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
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
import {
  initTauriLlmRunner,
  getLlmModelStatus,
  downloadLlmModel,
  loadLlmModel,
  isLlmReady,
  MODEL_TOTAL_BYTES,
  type LlmDownloadProgress,
} from "@/lib/services/llm-tauri"

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
  // ?mode=lab, so we run the uploader lab-only (NER skipped — a panel name like
  // "Myositis Panel" can't be misread as a diagnosis) and show lab-focused copy.
  // Read from window (not useSearchParams) to avoid the static-export Suspense
  // requirement; this route is desktop client-only anyway.
  const [labOnly, setLabOnly] = useState(false)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setLabOnly(new URLSearchParams(window.location.search).get("mode") === "lab")
    }
  }, [])

  // AI parsing = ONE native model, MedGemma-4B (~2GB, one-time download, runs
  // entirely on-device). It replaces the old two-model transformers.js stack
  // (d4data NER + Qwen validator) — MedGemma has real medical vocabulary, so
  // the extractor and the reviewer are the same competent model instead of a
  // dumb tagger needing a babysitter. The "download at setup, not at upload"
  // rule (Ren, 2026-07-01): the ~2GB fetch happens when you flip AI parsing on,
  // WITH a progress bar — "5 minutes to install" is normal software; "5 minutes
  // to upload my PDF" is not. When OFF, the lab number-parser + manual entry
  // still work with no model at all.
  //   downloading → fetching the GGUF (bar); loading → reading it into RAM;
  //   ready → upload unlocked; failed → retry.
  type AiState = 'idle' | 'downloading' | 'loading' | 'ready' | 'failed'
  const AI_ENABLED_KEY = 'chaos-ai-enabled'
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiState, setAiState] = useState<AiState>('idle')
  const [dlPct, setDlPct] = useState(0)
  const aiReady = aiState === 'ready'

  // Register the native runner once so the extraction services can reach it.
  useEffect(() => { initTauriLlmRunner() }, [])

  // Bring the model up: download (if needed) → load into RAM. Idempotent and
  // resumable — a partial download continues where it left off.
  const startLoad = async () => {
    try {
      const status = await getLlmModelStatus()
      if (!status) { setAiState('failed'); return } // not in the desktop app
      if (!status.downloaded) {
        setAiState('downloading')
        setDlPct(status.partial_bytes > 0
          ? Math.floor((status.partial_bytes / MODEL_TOTAL_BYTES) * 100)
          : 0)
        await downloadLlmModel((p: LlmDownloadProgress) => setDlPct(p.pct))
      }
      setAiState('loading')
      await loadLlmModel()
      setAiState('ready')
    } catch (e) {
      console.warn('MedGemma bring-up failed:', e)
      setAiState('failed')
    }
  }

  // Flip the toggle. ON → persist + bring the model up (or mark ready if it's
  // already resident this session). OFF → persist; the model stays in RAM
  // (cheap) but is simply not used.
  const toggleAi = (next: boolean) => {
    setAiEnabled(next)
    if (typeof window !== 'undefined') localStorage.setItem(AI_ENABLED_KEY, next ? '1' : '0')
    if (next) {
      if (isLlmReady()) setAiState('ready')
      else void startLoad()
    }
  }

  // On mount: restore the toggle; if it was ON, resume/establish model state.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const enabled = localStorage.getItem(AI_ENABLED_KEY) === '1'
    setAiEnabled(enabled)
    if (!enabled) return
    if (isLlmReady()) { setAiState('ready'); return }
    void startLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                then land on your Labs dashboard with trends. NER is skipped here
                so a panel name like “Myositis Panel” can’t be misread as a
                diagnosis. Runs locally — your documents never leave this computer.
              </>
            ) : (
              <>
                Drop any medical document — visit notes, summaries, imaging,
                even lab panels. Every file runs through both the NER extractor
                and the lab parser, then a review screen lets you uncheck anything
                that doesn’t belong before it lands on your timeline or Labs
                dashboard. Have a pure lab panel?{" "}
                <Link href="/import?mode=lab" className="underline text-[var(--text-main)]">
                  Use the lab-only importer
                </Link>{" "}
                to skip NER. Runs locally — your documents never leave this computer.
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
              : "Visit notes, after-visit summaries, imaging reports, lab panels — drop them all here. The parser runs the lab (number-anchored) extractor on every document, plus the medical (NER) extractor when AI parsing is on, then shows you a review screen with checkboxes so you can uncheck anything that doesn't belong before it lands on your timeline or Lab Results."}
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
          {!labOnly && !IS_DEMO && (
            <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-2)] p-4 space-y-2">
              <div className="flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-1" />
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-[var(--text-main)]">AI parsing</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={aiEnabled}
                      aria-label="Toggle AI parsing"
                      onClick={() => toggleAi(!aiEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${aiEnabled ? 'bg-primary' : 'bg-[var(--border-soft)]'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${aiEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Turn this on to pull diagnoses, findings, and labs out of your documents automatically.
                    The first time you switch it on it downloads a medical AI model
                    (<span className="font-medium">MedGemma, ~2&nbsp;GB, one time</span>) that then runs{" "}
                    <span className="font-medium">entirely on your own computer</span> — your records never leave this device.
                    Like installing any app, the download takes a few minutes; once it’s done, uploads are quick.
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Works best on a computer from roughly the last 8 years with a few&nbsp;GB of free memory. On
                    older or low-memory machines it may run slowly — if so, just leave it off and add events by
                    hand; nothing about the app needs it.
                  </p>

                  {aiEnabled && (
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      {aiState === 'idle' && (
                        <Button onClick={() => void startLoad()} size="sm" className="shrink-0">Set up AI model</Button>
                      )}
                      {aiState === 'downloading' && (
                        <div className="w-full space-y-1">
                          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                            <span>⬇️ Downloading MedGemma (one-time setup, ~2&nbsp;GB)…</span>
                            <span className="font-medium tabular-nums">{dlPct}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border-soft)]">
                            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${dlPct}%` }} />
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)]">You can leave this page open and come back — it resumes if interrupted.</p>
                        </div>
                      )}
                      {aiState === 'loading' && (
                        <span className="text-xs text-[var(--text-muted)]">
                          🧠 Starting the AI model… the upload unlocks automatically once it’s ready.
                        </span>
                      )}
                      {aiState === 'ready' && (
                        <>
                          <span className="text-xs text-[var(--text-main)] font-medium">🧠 AI model ready — upload unlocked.</span>
                        </>
                      )}
                      {aiState === 'failed' && (
                        <>
                          <span className="text-xs text-destructive font-medium">❌ AI model setup failed.</span>
                          <Button onClick={() => void startLoad()} size="sm" variant="outline" className="shrink-0">Retry</Button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Small-local-model reality check. MedGemma is medically
                      trained but it's a 4B model running on your own computer —
                      it will sometimes miss a finding or word one oddly. This
                      is a first-pass assist to review, never a substitute for
                      your own eyes or your clinician's. */}
                  {aiEnabled && aiState === 'ready' && (
                    <div className="mt-3 rounded-lg border border-[var(--accent-orange)]/40 bg-[var(--accent-orange)]/10 p-3 text-xs text-[var(--text-main)] flex items-start gap-2">
                      <span aria-hidden className="mt-0.5">⚠️</span>
                      <span>
                        <span className="font-medium">Double-check everything before you save it.</span>{" "}
                        MedGemma is a medically trained AI, but she’s small and runs entirely on your
                        computer — she can miss a finding or word one oddly. Treat the results as a
                        <span className="font-medium"> first-pass draft to review</span>, not a diagnosis.
                        You’ll get a checkbox screen to confirm each item before anything lands on your
                        timeline — read it, and never pass results to your doctors without checking them
                        against the original document yourself.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {!labOnly && aiEnabled && !aiReady ? (
            <div className="rounded-lg border border-dashed border-[var(--border-soft)] bg-[var(--bg-card)] p-6 text-center text-sm text-[var(--text-muted)]">
              {aiState === 'failed'
                ? 'The AI model setup failed. Retry above, switch AI parsing off to import lab panels, or add events by hand from Add to Timeline.'
                : 'Setting up the AI model — the uploader unlocks automatically once it’s ready. (Prefer not to wait? Switch AI parsing off above to import lab panels now, or add events by hand.)'}
            </div>
          ) : (
            <DocumentUploader
              mode={labOnly ? "lab" : "auto"}
              aiEnabled={aiEnabled}
              onEventsExtracted={handleEventsExtracted}
              onLabsExtracted={handleLabsExtracted}
            />
          )}
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
