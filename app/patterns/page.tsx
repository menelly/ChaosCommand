'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Network,
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Sparkles,
  RefreshCw,
  Brain,
  Activity,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Calendar,
  BarChart3,
  AlertTriangle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import AppCanvas from '@/components/app-canvas'
import { useDailyData } from '@/lib/database'
import { analyzeAllPatterns, PatternInsight } from '@/lib/pattern-engine'
import { analyzeV2Patterns } from '@/lib/pattern-engine-v2'
import { db, PatternSnapshot } from '@/lib/database/dexie-db'

const TRACKER_SUBCATEGORIES = [
  'upper-digestive', 'pain', 'sleep', 'mental-health', 'brain-fog',
  'movement', 'hydration', 'energy', 'anxiety', 'sensory', 'self-care',
  'weather', 'food-choice', 'dysautonomia', 'seizure', 'reproductive',
  'food-allergens', 'bathroom', 'head-pain', 'crisis', 'coping',
  // v0.4.x trackers
  'cardiac', 'respiratory', 'skin', 'joint', 'substance',
  'other'
] as const

export default function PatternsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [results, setResults] = useState<ReturnType<typeof analyzeAllPatterns> | null>(null)
  const [v2Insights, setV2Insights] = useState<PatternInsight[]>([])
  const [v2HighPriorityCount, setV2HighPriorityCount] = useState(0)
  const [snapshots, setSnapshots] = useState<PatternSnapshot[]>([])
  const [showHighPriorityOnly, setShowHighPriorityOnly] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const { toast } = useToast()
  const { getDateRange } = useDailyData()

  // === Hydrate latest snapshot on mount (the persistence fix) ===
  useEffect(() => {
    const hydrate = async () => {
      try {
        const all = await db.pattern_snapshots.orderBy('run_at').reverse().limit(20).toArray()
        setSnapshots(all)
        const latest = all[0]
        if (latest) {
          try {
            const parsed = JSON.parse(latest.snapshot_json)
            if (parsed.v1) setResults(parsed.v1)
            if (parsed.v2) {
              setV2Insights(parsed.v2.insights || [])
              setV2HighPriorityCount(parsed.v2.highPriorityCount || 0)
            }
            setLastSync(new Date(latest.run_at))
          } catch (e) {
            console.error('Failed to parse snapshot:', e)
          }
        }
      } catch (e) {
        // Table may not exist yet on first run with old DB version — ignore
        console.log('No existing snapshots found:', e)
      }
    }
    hydrate()
  }, [])

  const syncAndAnalyze = async () => {
    setIsLoading(true)
    try {
      toast({
        title: "🧠 Analyzing Patterns",
        description: "Finding the methods to the madness...",
      })

      const endDate = new Date().toISOString().split('T')[0]
      const startDate = '2000-01-01'  // All time

      // Fetch ALL tracker data in one query, then split by subcategory
      const allRecords = await getDateRange(startDate, endDate, 'tracker')

      // Build tracker data object grouped by subcategory
      const trackerData: Record<string, any[]> = {}
      TRACKER_SUBCATEGORIES.forEach(sub => {
        trackerData[sub] = allRecords.filter(r =>
          r.subcategory === sub || r.subcategory.startsWith(sub + '-')
        )
      })

      // Run BOTH engines — v1 for cross-tracker correlations + v2 for semantic red flags
      const v1Results = analyzeAllPatterns(trackerData)
      const v2Results = analyzeV2Patterns(trackerData, 90)

      setResults(v1Results)
      setV2Insights(v2Results.insights)
      setV2HighPriorityCount(v2Results.highPriorityCount)
      const now = new Date()
      setLastSync(now)

      // === Persist snapshot to Dexie ===
      try {
        const totalInsights = (v1Results.summary.insightCount || 0) + v2Results.insights.length
        const summary = `${totalInsights} insight${totalInsights !== 1 ? 's' : ''} (${v2Results.highPriorityCount} high-priority)`
        await db.pattern_snapshots.add({
          run_at: now.toISOString(),
          window_days: 90,
          insight_count: totalInsights,
          high_priority_count: v2Results.highPriorityCount,
          snapshot_json: JSON.stringify({ v1: v1Results, v2: v2Results }),
          summary,
          is_auto: false,
        })
        // Refresh snapshot list
        const all = await db.pattern_snapshots.orderBy('run_at').reverse().limit(20).toArray()
        setSnapshots(all)
      } catch (e) {
        console.error('Failed to persist snapshot:', e)
      }

      toast({
        title: "✨ Analysis Complete!",
        description: `Found ${v1Results.summary.insightCount + v2Results.insights.length} patterns — ${v2Results.highPriorityCount} high-priority.`,
      })
    } catch (error) {
      console.error('Pattern analysis error:', error)
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze patterns. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-[var(--text-muted)] bg-[var(--surface-1,#f9fafb)]'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'correlation': return <Network className="h-4 w-4" />
      case 'temporal': return <Clock className="h-4 w-4" />
      case 'trigger': return <Zap className="h-4 w-4" />
      case 'treatment': return <Target className="h-4 w-4" />
      case 'trend': return <TrendingUp className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const renderInsightCard = (insight: PatternInsight) => (
    <Card key={insight.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {getTypeIcon(insight.type)}
              <h4 className="font-semibold">{insight.title}</h4>
              <Badge className={getImpactColor(insight.impact)}>
                {insight.impact} impact
              </Badge>
            </div>
            <p className="text-muted-foreground mb-3">{insight.description}</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Confidence:</span>
                <Progress value={insight.confidence} className="w-20" />
                <span className="text-sm font-medium">{insight.confidence}%</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderEmptyState = (message: string) => (
    <Card>
      <CardContent className="p-8 text-center">
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  )

  return (
    <AppCanvas currentPage="patterns">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Pattern Analysis</h1>
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Your body has patterns. You're too busy surviving to find them manually. Let's fix that.
          </p>
        </div>

        {/* Sync Section */}
        <Card className="border-2 border-dashed border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold flex items-center gap-2">
                  <Network className="h-5 w-5 text-primary" />
                  Pattern Analysis Engine
                </h3>
                <p className="text-sm text-muted-foreground">
                  {lastSync
                    ? `Last analyzed: ${lastSync.toLocaleString()} • ${results?.summary.insightCount || 0} patterns found`
                    : 'Analyze your tracker data to discover hidden connections'
                  }
                </p>
              </div>
              <Button
                onClick={syncAndAnalyze}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isLoading ? 'Analyzing...' : 'Find Patterns'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-7 h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="flex items-center gap-1 text-xs sm:text-sm">
              <TrendingUp className="h-4 w-4 shrink-0" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="redflags" className="flex items-center gap-1 text-xs sm:text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
              <span className="hidden sm:inline">Red Flags</span>
              <span className="sm:hidden">🚨</span>
              {v2HighPriorityCount > 0 && <Badge variant="destructive" className="text-[10px] h-4 ml-1">{v2HighPriorityCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="correlations" className="flex items-center gap-1 text-xs sm:text-sm">
              <Network className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Correlations</span>
              <span className="sm:hidden">Corr.</span>
            </TabsTrigger>
            <TabsTrigger value="triggers" className="flex items-center gap-1 text-xs sm:text-sm">
              <Zap className="h-4 w-4 shrink-0" />
              Triggers
            </TabsTrigger>
            <TabsTrigger value="treatments" className="flex items-center gap-1 text-xs sm:text-sm">
              <Target className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Treatments</span>
              <span className="sm:hidden">Treat.</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-1 text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4 shrink-0" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1 text-xs sm:text-sm">
              <Clock className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">History</span>
              <span className="sm:hidden">Hist.</span>
            </TabsTrigger>
          </TabsList>

          {/* RED FLAGS TAB — v2 semantic patterns */}
          <TabsContent value="redflags" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  Medical red-flag patterns (v2 engine)
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Detects status epilepticus, anaphylaxis, mixed-state mood days, multi-rescue migraines, celiac aftermath, dissection/SAH/cauda equina/MI markers, autonomic seizure clusters, and more. Reads the rich v2 fields the original engine doesn't see.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Button
                    variant={showHighPriorityOnly ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowHighPriorityOnly(!showHighPriorityOnly)}
                  >
                    {showHighPriorityOnly ? '✓ ' : ''}High-impact only ({v2HighPriorityCount})
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Total: {v2Insights.length} insight{v2Insights.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {v2Insights.length === 0 ? (
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      No v2 patterns yet — hit "Find Patterns" to analyze. Or, if you just did and got nothing, that's good news: no medical red-flag patterns detected in your tracked data.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {v2Insights
                      .filter(i => !showHighPriorityOnly || i.impact === 'high')
                      .map(renderInsightCard)}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* HISTORY TAB — pattern snapshots over time */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pattern snapshot history
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Every "Find Patterns" run is saved. Use this to see how your patterns shift over weeks — confidence on a correlation rising over time is itself a signal.
                </p>
              </CardHeader>
              <CardContent>
                {snapshots.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">
                    No snapshots yet. Run analysis to build history over time.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {snapshots.map((s) => (
                      <div key={s.id} className="flex items-center justify-between border rounded-lg p-3">
                        <div>
                          <div className="font-medium text-sm">
                            {new Date(s.run_at).toLocaleString()}
                            {s.is_auto && <Badge variant="outline" className="ml-2 text-[10px]">auto</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">{s.summary}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {s.high_priority_count > 0 && (
                            <Badge variant="destructive">{s.high_priority_count} high</Badge>
                          )}
                          <Badge variant="secondary">{s.insight_count} total</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            {!results ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Patterns Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Hit "Find Patterns" to analyze your last 90 days of tracking data
                  </p>
                  <Button onClick={syncAndAnalyze} disabled={isLoading}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Start Analysis
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Brain className="h-8 w-8 text-purple-500" />
                        <div>
                          <p className="text-2xl font-bold">{results.summary.insightCount}</p>
                          <p className="text-xs text-muted-foreground">Patterns Found</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Activity className="h-8 w-8 text-blue-500" />
                        <div>
                          <p className="text-2xl font-bold">{results.summary.activeTrackers}</p>
                          <p className="text-xs text-muted-foreground">Active Trackers</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-8 w-8 text-green-500" />
                        <div>
                          <p className="text-2xl font-bold">{results.summary.daysTracked}</p>
                          <p className="text-xs text-muted-foreground">Days Tracked</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="h-8 w-8 text-orange-500" />
                        <div>
                          <p className="text-2xl font-bold">{results.summary.totalEntries}</p>
                          <p className="text-xs text-muted-foreground">Total Entries</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-8 w-8 text-red-500" />
                        <div>
                          <p className="text-2xl font-bold">
                            {results.all.filter(i => i.impact === 'high').length}
                          </p>
                          <p className="text-xs text-muted-foreground">High Impact</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Insights */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Top Insights</h3>
                  {results.all.length === 0 ? (
                    renderEmptyState("Not enough data yet to find patterns. Keep tracking — the connections will emerge.")
                  ) : (
                    results.all.slice(0, 8).map(renderInsightCard)
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* CORRELATIONS TAB */}
          <TabsContent value="correlations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Cross-Tracker Correlations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  When one thing gets worse, what else changes? These patterns look at severity and co-occurrence across your trackers on the same days.
                </p>
              </CardContent>
            </Card>
            {!results ? (
              renderEmptyState("Run analysis to discover cross-tracker correlations.")
            ) : results.correlations.length === 0 ? (
              renderEmptyState("No significant correlations found yet. This needs multiple trackers with severity data on overlapping days — keep tracking!")
            ) : (
              <div className="space-y-4">
                {results.correlations.map(renderInsightCard)}
              </div>
            )}
          </TabsContent>

          {/* TRIGGERS TAB */}
          <TabsContent value="triggers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Trigger Patterns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  What sets things off? Triggers that appear across multiple body systems are especially important — they suggest a systemic pattern, not just a one-off.
                </p>
              </CardContent>
            </Card>
            {!results ? (
              renderEmptyState("Run analysis to discover trigger patterns.")
            ) : results.triggers.length === 0 ? (
              renderEmptyState("No trigger patterns found yet. Log triggers when you track episodes — the patterns will emerge.")
            ) : (
              <div className="space-y-4">
                {results.triggers.map(renderInsightCard)}
              </div>
            )}
          </TabsContent>

          {/* TREATMENTS TAB */}
          <TabsContent value="treatments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Treatment Effectiveness
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Which interventions actually help? This analyzes your tracked treatments and effectiveness ratings to find what's working (and what isn't).
                </p>
              </CardContent>
            </Card>
            {!results ? (
              renderEmptyState("Run analysis to evaluate treatment effectiveness.")
            ) : results.treatments.length === 0 ? (
              renderEmptyState("No treatment data found yet. When you log episodes, include what interventions you tried — this page will show you what's actually working.")
            ) : (
              <div className="space-y-4">
                {results.treatments.map(renderInsightCard)}
              </div>
            )}
          </TabsContent>

          {/* TRENDS TAB */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Trends & Timing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Are things getting better or worse? Do your symptoms cluster on certain days? Trends need at least 2 weeks of data to be meaningful.
                </p>
              </CardContent>
            </Card>
            {!results ? (
              renderEmptyState("Run analysis to discover trends and temporal patterns.")
            ) : (results.trends.length === 0 && results.temporal.length === 0) ? (
              renderEmptyState("Not enough data for trend detection yet. Keep tracking — trends need at least 2 weeks of entries to emerge.")
            ) : (
              <div className="space-y-4">
                {[...results.trends, ...results.temporal].map(renderInsightCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <div className="mt-8 text-center">
        <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Command Center
        </a>
      </div>
    </AppCanvas>
  )
}
