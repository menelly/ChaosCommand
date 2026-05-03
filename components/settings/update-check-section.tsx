/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Opt-in update checker. Lives in Settings → Data Management next to the
 * Device Sync card. Privacy-first by design: this component DOES NOT make
 * any network request on mount, on focus, or on any timer. The single
 * fetch fires only when the user clicks the "Check for Updates" button,
 * and the request goes to the public, static version manifest defined in
 * lib/app-version.ts. No telemetry, no identifiers, no automatic phone-
 * home — same posture as the rest of the app.
 */
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Cloud, CheckCircle, AlertCircle, ExternalLink, Loader2 } from "lucide-react"
import { APP_VERSION, UPDATE_MANIFEST_URL, isNewerVersion } from "@/lib/app-version"
import { openExternal } from "@/lib/open-external"

interface ManifestPayload {
  version: string
  released?: string
  url?: string
  notes?: string
}

type CheckState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'up-to-date' }
  | { kind: 'update-available'; latest: ManifestPayload }
  | { kind: 'error'; message: string }

const FETCH_TIMEOUT_MS = 8000

async function fetchManifest(): Promise<ManifestPayload> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(UPDATE_MANIFEST_URL, {
      method: 'GET',
      signal: ctl.signal,
      // Cache-bust so we don't get yesterday's manifest from a CDN edge
      cache: 'no-store',
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) {
      throw new Error(`Update server responded with ${res.status}`)
    }
    const data = (await res.json()) as Partial<ManifestPayload>
    if (!data || typeof data.version !== 'string') {
      throw new Error('Update manifest is malformed')
    }
    return {
      version: data.version,
      released: typeof data.released === 'string' ? data.released : undefined,
      url: typeof data.url === 'string' ? data.url : undefined,
      notes: typeof data.notes === 'string' ? data.notes : undefined,
    }
  } finally {
    clearTimeout(timer)
  }
}

export default function UpdateCheckSection() {
  const [state, setState] = useState<CheckState>({ kind: 'idle' })

  const runCheck = async () => {
    setState({ kind: 'checking' })
    try {
      const latest = await fetchManifest()
      if (isNewerVersion(APP_VERSION, latest.version)) {
        setState({ kind: 'update-available', latest })
      } else {
        setState({ kind: 'up-to-date' })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not reach the update server'
      // Distinguish offline / blocked from server errors for a friendlier message
      const friendly = /Failed to fetch|NetworkError|aborted/i.test(msg)
        ? 'Could not reach chaoscommand.center. Check your internet connection and try again.'
        : msg
      setState({ kind: 'error', message: friendly })
    }
  }

  return (
    <div className="p-4 border rounded-lg border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
      <div className="flex items-center gap-2 mb-3">
        <Cloud className="h-4 w-4 text-blue-600" />
        <Label className="text-sm font-medium">Check for Updates</Label>
        <Badge variant="outline" className="text-xs">Opt-in</Badge>
      </div>

      <p className="text-sm text-muted-foreground mb-3">
        Manually check whether a newer version is available on{" "}
        <span className="font-medium">chaoscommand.center</span>. Nothing
        happens unless you press the button — no automatic phone-home, no
        telemetry. You're on <span className="font-mono">v{APP_VERSION}</span>.
      </p>

      <Button
        onClick={runCheck}
        disabled={state.kind === 'checking'}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {state.kind === 'checking' ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Checking…
          </>
        ) : (
          <>
            <Cloud className="h-4 w-4 mr-2" />
            Check for Updates
          </>
        )}
      </Button>

      {state.kind === 'up-to-date' && (
        <div className="mt-3 flex items-start gap-2 text-sm">
          <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
          <span>You're on the latest version.</span>
        </div>
      )}

      {state.kind === 'update-available' && (
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">
                Update available: v{state.latest.version}
              </div>
              {state.latest.released && (
                <div className="text-xs text-muted-foreground">
                  Released {state.latest.released}
                </div>
              )}
              {state.latest.notes && (
                <p className="text-xs text-muted-foreground mt-1">
                  {state.latest.notes}
                </p>
              )}
            </div>
          </div>
          {state.latest.url && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => openExternal(state.latest.url!)}
            >
              Open Download Page
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          )}
        </div>
      )}

      {state.kind === 'error' && (
        <div className="mt-3 flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{state.message}</span>
        </div>
      )}
    </div>
  )
}
