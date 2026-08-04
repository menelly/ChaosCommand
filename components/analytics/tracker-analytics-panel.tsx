/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude Opus)
 *
 * TRACKER ANALYTICS PANEL — the shared rendering half of the analytics work.
 *
 * lib/tracker-analytics.ts computes; this draws. Together they replace the
 * per-tracker panels that drifted apart over 33 hand-written files, and a
 * tracker adopting them gets a rate, a histogram, a time-of-day distribution,
 * a trend direction and an honest treatment comparison for the cost of a
 * config entry.
 *
 * ─── WHAT THIS COMPONENT REFUSES TO DO ──────────────────────────────────────
 *
 * 1. It never prints a number the engine marked as unsupported. Where the
 *    sample is too small the card is replaced by a quiet line saying how many
 *    more entries are needed. A missing card is information; a confident wrong
 *    one is a liability in a document a clinician reads.
 *
 * 2. It never states or implies cause. The treatment section is titled by what
 *    it measures, and every comparison carries both sample sizes and an
 *    explicit note about the confound — people reach for a treatment BECAUSE
 *    it is a bad day, which biases observational comparison against whatever
 *    actually works. Wording here is load-bearing, not decoration.
 */

'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingDown, TrendingUp, Minus, Clock, BarChart3, FlaskConical } from 'lucide-react'
import type { TrackerAnalytics } from '@/lib/tracker-analytics'

function Tile({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold ${tone || ''}`}>{value}</div>
      </CardContent>
    </Card>
  )
}

function fmt(v: number | null, digits = 1, suffix = ''): string {
  return v === null ? '—' : `${v.toFixed(digits)}${suffix}`
}

/** Horizontal bars with a real axis, so shape is legible and not just rank. */
function Histogram({ counts, labels }: { counts: number[]; labels?: string[] }) {
  const peak = Math.max(...counts, 1)
  return (
    <div className="flex items-end gap-1 h-28">
      {counts.map((c, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="w-full flex-1 flex items-end">
            <div
              className="w-full rounded-t bg-primary/70"
              style={{ height: `${(c / peak) * 100}%` }}
              title={`${labels?.[i] ?? i}: ${c}`}
            />
          </div>
          <span className="text-[10px] text-muted-foreground truncate">{labels?.[i] ?? i}</span>
        </div>
      ))}
    </div>
  )
}

export interface TrackerAnalyticsPanelProps {
  analytics: TrackerAnalytics
  /** Words for the thing being measured, e.g. 'severity' or 'hours slept'. */
  measureLabel?: string
  /** Map a stored episode-type id to something a human reads. */
  labelFor?: (id: string) => string
}

export function TrackerAnalyticsPanel({
  analytics: a,
  measureLabel = 'severity',
  labelFor = (x: string) => x,
}: TrackerAnalyticsPanelProps) {
  const t = a.trend
  const ft = a.frequencyTrend
  const hasSeverity = a.severityN > 0

  const TrendIcon =
    t.direction === 'improving' ? TrendingDown : t.direction === 'worsening' ? TrendingUp : Minus
  // Colour follows GOOD/BAD, never up/down — on hours slept, down is bad.
  const trendTone =
    t.direction === 'improving'
      ? 'text-green-600'
      : t.direction === 'worsening'
        ? 'text-amber-600'
        : 'text-muted-foreground'

  return (
    <div className="space-y-4">
      {/* ── headline tiles ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Entries" value={a.entries} />
        <Tile
          label="Frequency"
          value={a.ratePerWeek === null ? '—' : `${a.ratePerWeek.toFixed(1)}/wk`}
        />
        {hasSeverity && <Tile label={`Avg ${measureLabel}`} value={fmt(a.severityMean, 1, a.unit ? ` ${a.unit}` : '')} />}
        {hasSeverity && <Tile label="Peak" value={a.severityPeak ?? '—'} tone="text-red-500" />}
        {a.deltaN > 0 && (
          <Tile
            label="Avg change vs baseline"
            value={`${a.deltaMean! >= 0 ? '+' : ''}${a.deltaMean!.toFixed(1)}`}
          />
        )}
        {a.ratio && (
          <Tile
            label={a.ratio.label}
            value={`${(a.ratio.pct * 100).toFixed(0)}%`}
            tone={a.ratio.pct >= 0.8 ? 'text-green-600' : ''}
          />
        )}
        {a.attachments > 0 && <Tile label="Photos stored" value={a.attachments} />}
        {Object.entries(a.flags).map(([label, n]) => (
          <Tile key={label} label={label} value={n} tone={n > 0 ? 'text-amber-600' : ''} />
        ))}
      </div>

      {/* ── direction of travel: the thing none of these panels could say ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendIcon className="h-4 w-4" /> Direction
          </CardTitle>
        </CardHeader>
        <CardContent>
          {t.direction ? (
            <>
              <div className={`text-2xl font-bold capitalize ${trendTone}`}>{t.direction}</div>
              <p className="text-sm text-muted-foreground mt-1">
                Average {measureLabel} moved from{' '}
                <strong>{t.firstHalfMean!.toFixed(1)}</strong> in the earlier half of this window to{' '}
                <strong>{t.secondHalfMean!.toFixed(1)}</strong> in the later half
                {' '}({t.change! >= 0 ? '+' : ''}
                {t.change!.toFixed(1)}, {t.n} entries).
                {a.higherIsBetter && ' Higher is better for this tracker.'}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not enough entries yet to state a direction in {measureLabel} —{' '}
              {t.suppressedBecause}. This stays blank rather than guessing.
            </p>
          )}

          {/* How OFTEN, which for episodic conditions is the question that
              matters. Kept in the same card so the two directions are read
              together — they can disagree, and that disagreement is
              informative: fewer but worse, or more but milder. */}
          {ft.direction && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">How often:</span>
                <span
                  className={`text-sm font-semibold capitalize ${
                    ft.direction === 'improving'
                      ? 'text-green-600'
                      : ft.direction === 'worsening'
                        ? 'text-amber-600'
                        : 'text-muted-foreground'
                  }`}
                >
                  {ft.direction === 'improving'
                    ? 'less often'
                    : ft.direction === 'worsening'
                      ? 'more often'
                      : 'about the same'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {ft.firstHalfMean!.toFixed(1)}/week earlier in this window vs{' '}
                {ft.secondHalfMean!.toFixed(1)}/week more recently.
              </p>
              {/* Non-negotiable caption. This counts LOGGED events, and how
                  much someone logs changes with how much they are using the
                  app — especially in the first months. Without saying so, an
                  adoption curve reads as a worsening condition. */}
              <p className="text-xs text-muted-foreground mt-1">
                Counts entries you logged. If you started tracking this more
                often partway through, that shows up here too.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── parallel scales, each with its own direction ── */}
      {a.series.some(s => s.n > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Each scale, and which way it's going</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {a.series
              .filter(s => s.n > 0)
              .map(s => {
                const d = s.trend.direction
                const tone =
                  d === 'improving'
                    ? 'text-green-600'
                    : d === 'worsening'
                      ? 'text-amber-600'
                      : 'text-muted-foreground'
                return (
                  <div key={s.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{s.label}</span>
                    <span className="flex items-center gap-3 shrink-0">
                      <span className="text-muted-foreground">
                        avg {s.mean!.toFixed(1)} · peak {s.peak}
                      </span>
                      {d ? (
                        <span className={`font-semibold capitalize ${tone}`}>
                          {d === 'stable' ? 'steady' : d}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          not enough yet
                        </span>
                      )}
                    </span>
                  </div>
                )
              })}
            <p className="text-xs text-muted-foreground pt-1 border-t">
              Each scale is judged on its own terms — more energy is good, more mania is not.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── what actually helped, computed honestly ── */}
      {(a.treatmentComparisons.length > 0 || a.treatments.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4" /> {measureLabel} alongside each treatment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {a.treatmentComparisons.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {a.treatments.length} treatment{a.treatments.length === 1 ? '' : 's'} logged, but
                none yet has enough entries both with and without it to compare. Nothing is shown
                rather than ranking them by how often they were mentioned.
              </p>
            ) : (
              <>
                {a.treatmentComparisons.map(c => {
                  const better = a.higherIsBetter ? c.delta > 0 : c.delta < 0
                  return (
                    <div key={c.label} className="space-y-1">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium">{c.label}</span>
                        <Badge variant={better ? 'default' : 'secondary'}>
                          {c.delta >= 0 ? '+' : ''}
                          {c.delta.toFixed(1)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.withMean.toFixed(1)} with it ({c.withN} entries) vs{' '}
                        {c.withoutMean.toFixed(1)} without ({c.withoutN} entries)
                        {c.ratedEffectiveness !== null && (
                          <>
                            {' · '}
                            <strong>you rated it {c.ratedEffectiveness.toFixed(1)}/10</strong> over{' '}
                            {c.ratedN} entries
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
                <p className="text-xs text-muted-foreground pt-1 border-t">
                  This is a comparison, not a verdict. Treatments are reached for on worse days, so
                  a treatment that works can still show a higher average alongside it. Your own
                  ratings, where shown, are the stronger signal.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── shape, not just average ── */}
      {hasSeverity && a.severityHistogram.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> {measureLabel} distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Histogram counts={a.severityHistogram} />
          </CardContent>
        </Card>
      )}

      {a.hourHistogram.some(Boolean) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Time of day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Histogram
              counts={a.hourHistogram}
              labels={a.hourHistogram.map((_, h) => (h % 6 === 0 ? String(h) : ''))}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Only entries recorded with a time of day appear here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── distributions ── */}
      <div className="grid md:grid-cols-2 gap-4">
        <CountedCard title="Episode types" rows={a.episodeTypes} labelFor={labelFor} />
        <CountedCard title="Most affected areas" rows={a.locations} />
        <CountedCard title="Character" rows={a.character} />
        <CountedCard title="Patterns" rows={a.patterns} />
        <CountedCard
          title="Suspected triggers"
          rows={a.triggers}
          note="Co-occurrence, not proof of cause — but worth raising with your specialist."
        />
      </div>
    </div>
  )
}

function CountedCard({
  title,
  rows,
  labelFor = (x: string) => x,
  note,
}: {
  title: string
  rows: { label: string; count: number; share: number }[]
  labelFor?: (id: string) => string
  note?: string
}) {
  if (!rows.length) return null
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.slice(0, 8).map(r => (
          <div key={r.label} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{labelFor(r.label)}</span>
              <span className="text-muted-foreground shrink-0">
                {r.count} ({(r.share * 100).toFixed(0)}%)
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div className="bg-primary h-1.5" style={{ width: `${r.share * 100}%` }} />
            </div>
          </div>
        ))}
        {note && <p className="text-xs text-muted-foreground pt-1">{note}</p>}
      </CardContent>
    </Card>
  )
}
