'use client'

import React, { useState } from 'react'
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

const TRACKER_SUBCATEGORIES = [
  'upper-digestive', 'pain', 'sleep', 'mental-health', 'brain-fog',
  'movement', 'hydration', 'energy', 'anxiety', 'sensory', 'self-care',
  'weather', 'food-choice', 'dysautonomia', 'seizure', 'reproductive',
  'food-allergens', 'bathroom', 'head-pain', 'crisis', 'coping', 'other'
] as const

export default function PatternsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [results, setResults] = useState<ReturnType<typeof analyzeAllPatterns> | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const { toast } = useToast()
  const { getDateRange } = useDailyData()

  const syncAndAnalyze = async () => {
    setIsLoading(true)
    try {
      toast({
        title: "🧠 Analyzing Patterns",
        description: "Finding the methods to the madness...",
      })

      const endDate = new Date().toISOString().split('T')[0]
      const startDate = '2000-01-01'  // All time

      // Fetch all tracker data in parallel
      const allData = await Promise.all(
        TRACKER_SUBCATEGORIES.map(sub => getDateRange(startDate, endDate, sub))
      )

      // Build tracker data object
      const trackerData: Record<string, any[]> = {}
      TRACKER_SUBCATEGORIES.forEach((sub, i) => {
        trackerData[sub] = allData[i]
      })

      const analysisResults = analyzeAllPatterns(trackerData)
      setResults(analysisResults)
      setLastSync(new Date())

      toast({
        title: "✨ Analysis Complete!",
        description: `Found ${analysisResults.summary.insightCount} patterns across ${analysisResults.summary.activeTrackers} trackers!`,
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
      default: return 'text-gray-600 bg-gray-50'
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="correlations" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Correlations
            </TabsTrigger>
            <TabsTrigger value="triggers" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Triggers
            </TabsTrigger>
            <TabsTrigger value="treatments" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Treatments
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Trends
            </TabsTrigger>
          </TabsList>

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
    </AppCanvas>
  )
}
