/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Surfaces the lab parser's most recent diagnostic trace so we can debug
 * "why didn't my labs import?" in production builds where devtools aren't
 * available. Reads localStorage[chaos-lab-parser-last-trace] which is
 * written by every extractLabResults() call. Renders an expandable panel
 * that shows: which parsers were tried, why each one passed/failed
 * detection, how many results each found, plus the first 3000 chars of
 * the cleaned input text so you can eyeball what the parser actually saw.
 */
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, FlaskConical, RefreshCw } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import {
  getLastLabParserDiagnostics,
  type LabParserDiagnostics,
} from "@/lib/services/lab-parser"

export default function LabParserDiagnosticsPanel() {
  const [diag, setDiag] = useState<LabParserDiagnostics | null>(null)
  const [open, setOpen] = useState(false)

  const refresh = () => setDiag(getLastLabParserDiagnostics())

  // Read the trace on mount AND poll every 1.5s while the panel is in the
  // DOM. The parser writes its trace mid-upload from a different React tree
  // (the DocumentUploader's effect chain), so we can't rely on prop changes
  // — and same-tab localStorage writes don't fire storage events. Polling
  // is cheap (a single getItem) and means the user just sees the trace
  // appear when they look at the panel after an upload finishes.
  useEffect(() => {
    refresh()
    const interval = setInterval(() => {
      const next = getLastLabParserDiagnostics()
      if (next && (!diag || next.timestamp !== diag.timestamp)) {
        setDiag(next)
      }
    }, 1500)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!diag) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FlaskConical className="h-4 w-4" />
            No lab parser run recorded yet. Upload a lab PDF and check back here.
          </div>
        </CardContent>
      </Card>
    )
  }

  const ageMs = Date.now() - new Date(diag.timestamp).getTime()
  const ageStr = ageMs < 60_000
    ? `${Math.round(ageMs / 1000)}s ago`
    : ageMs < 3_600_000
      ? `${Math.round(ageMs / 60_000)}m ago`
      : `${Math.round(ageMs / 3_600_000)}h ago`

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Last Lab Parser Trace
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={diag.finalResultsCount > 0 ? "default" : "destructive"}>
              {diag.finalResultsCount} result{diag.finalResultsCount === 1 ? '' : 's'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={refresh} title="Reload trace">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Ran {ageStr} • Final parser:{" "}
          <span className="font-mono">{diag.finalParser}</span> • Input length:{" "}
          {diag.textLength.toLocaleString()} chars
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Per-parser attempts */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Parsers attempted</h4>
          <div className="space-y-2">
            {diag.attempts.map((a, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-md border p-3 text-sm",
                  a.resultsFound > 0
                    ? "border-green-200 bg-green-50/50 dark:bg-green-950/20"
                    : a.detectionPassed
                      ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20"
                      : "border-border bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-xs">{a.parser}</span>
                  <Badge variant="outline" className="text-xs">
                    {a.resultsFound} found
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Detection: <strong>{a.detectionPassed ? 'passed' : 'skipped'}</strong> — {a.detectionReason}
                </p>
                {a.sampleResults.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs">
                    {a.sampleResults.map((s, j) => (
                      <li key={j} className="font-mono">• {s}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Cleaned text sample */}
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between border-b border-border/50 pb-2 text-left hover:opacity-80 transition-opacity"
            >
              <span className="text-sm font-medium">
                Cleaned input text (first 3000 chars)
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  open ? "rotate-0" : "-rotate-90"
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <pre className="whitespace-pre-wrap break-words text-xs bg-muted p-3 rounded max-h-96 overflow-y-auto font-mono">
              {diag.textSample || '(empty)'}
            </pre>
            <p className="mt-2 text-xs text-muted-foreground">
              💡 If this text looks broken (e.g., units like <code>mg/d L</code> with
              spaces, or test names split mid-word), the upstream PDF text
              extractor or text cleaner is the culprit, not the parser.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
