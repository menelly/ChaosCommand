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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import DocumentUploader from "@/components/document-uploader"
import {
  useDailyData,
  CATEGORIES,
  SUBCATEGORIES,
  formatDateForStorage,
} from "@/lib/database"
import { FileText, CheckCircle, Monitor } from "lucide-react"
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
  const [lastBatch, setLastBatch] = useState<string | null>(null)
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

  return (
    <AppCanvas currentPage="import">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Import Medical Records
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Upload PDFs or paste notes. The extractor pulls diagnoses, meds,
            procedures, and lab results into your timeline. Runs locally — your
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

        <DocumentUploader onEventsExtracted={handleEventsExtracted} />
      </div>
    </AppCanvas>
  )
}
