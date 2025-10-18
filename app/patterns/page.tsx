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
  Calendar, 
  Clock, 
  Target,
  Sparkles,
  RefreshCw,
  Brain,
  Activity,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import AppCanvas from '@/components/app-canvas'
import { useDailyData } from '@/lib/database'

interface PatternInsight {
  id: string
  type: 'correlation' | 'temporal' | 'trigger' | 'treatment'
  title: string
  description: string
  confidence: number
  impact: 'high' | 'medium' | 'low'
  data: any
}

interface GraphData {
  nodes: Array<{
    id: string
    label: string
    type: 'symptom' | 'trigger' | 'treatment' | 'tracker'
    frequency: number
    severity?: number
  }>
  edges: Array<{
    source: string
    target: string
    weight: number
    type: 'causes' | 'helps' | 'correlates'
  }>
}

// Real pattern analysis function
const analyzeRealPatterns = (trackerData: any): PatternInsight[] => {
  const insights: PatternInsight[] = []

  // Count total entries across all trackers
  const totalEntries = Object.values(trackerData).reduce((sum: number, data: any) => sum + (data?.length || 0), 0)

  if (totalEntries === 0) {
    return []
  }

  // Find most active trackers
  const trackerActivity = Object.entries(trackerData)
    .map(([name, data]: [string, any]) => ({ name, count: data?.length || 0 }))
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count)

  if (trackerActivity.length > 0) {
    const topTracker = trackerActivity[0]
    insights.push({
      id: 'activity-1',
      type: 'temporal',
      title: `${topTracker.name.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Most Active`,
      description: `You've tracked ${topTracker.count} entries in ${topTracker.name}, making it your most monitored health area`,
      confidence: 100,
      impact: 'medium',
      data: { tracker: topTracker.name, count: topTracker.count }
    })
  }

  // Look for patterns in upper digestive data
  if (trackerData.upperDigestive?.length > 0) {
    const symptoms = trackerData.upperDigestive.flatMap((entry: any) => entry.symptoms || [])
    const triggers = trackerData.upperDigestive.flatMap((entry: any) => entry.triggers || [])

    if (symptoms.length > 0) {
      const symptomCounts = symptoms.reduce((acc: any, symptom: string) => {
        acc[symptom] = (acc[symptom] || 0) + 1
        return acc
      }, {})

      const topSymptom = Object.entries(symptomCounts).sort(([,a]: any, [,b]: any) => b - a)[0]
      if (topSymptom) {
        insights.push({
          id: 'digestive-1',
          type: 'correlation',
          title: `${topSymptom[0]} Pattern Detected`,
          description: `${topSymptom[0]} appears in ${topSymptom[1]} of your digestive entries (${Math.round((topSymptom[1] as number / trackerData.upperDigestive.length) * 100)}%)`,
          confidence: Math.min(95, Math.round((topSymptom[1] as number / trackerData.upperDigestive.length) * 100)),
          impact: (topSymptom[1] as number) > trackerData.upperDigestive.length * 0.5 ? 'high' : 'medium',
          data: { symptom: topSymptom[0], frequency: topSymptom[1], total: trackerData.upperDigestive.length }
        })
      }
    }

    if (triggers.length > 0) {
      const triggerCounts = triggers.reduce((acc: any, trigger: string) => {
        acc[trigger] = (acc[trigger] || 0) + 1
        return acc
      }, {})

      const topTrigger = Object.entries(triggerCounts).sort(([,a]: any, [,b]: any) => b - a)[0]
      if (topTrigger) {
        insights.push({
          id: 'trigger-1',
          type: 'trigger',
          title: `${topTrigger[0]} Trigger Identified`,
          description: `${topTrigger[0]} appears as a trigger in ${topTrigger[1]} digestive episodes`,
          confidence: Math.min(90, Math.round((topTrigger[1] as number / trackerData.upperDigestive.length) * 100)),
          impact: (topTrigger[1] as number) > 2 ? 'high' : 'medium',
          data: { trigger: topTrigger[0], frequency: topTrigger[1] }
        })
      }
    }
  }

  // Look for cross-tracker patterns
  const trackersWithData = trackerActivity.filter(t => t.count >= 3) // Need at least 3 entries
  if (trackersWithData.length >= 2) {
    insights.push({
      id: 'cross-1',
      type: 'correlation',
      title: 'Multi-System Tracking',
      description: `You're actively monitoring ${trackersWithData.length} different health areas, enabling comprehensive pattern analysis`,
      confidence: 85,
      impact: 'high',
      data: { trackers: trackersWithData.map(t => t.name), count: trackersWithData.length }
    })
  }

  return insights
}

export default function PatternsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [insights, setInsights] = useState<PatternInsight[]>([])
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const { toast } = useToast()
  const { getDateRange } = useDailyData()

  const syncToGraph = async () => {
    setIsLoading(true)
    try {
      toast({
        title: "🧠 Syncing to Graph",
        description: "Analyzing patterns across all your trackers...",
      })

      // Calculate date range for last 90 days
      const endDate = new Date().toISOString().split('T')[0] // Today
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 90 days ago

      // Get data from all trackers
      const allData = await Promise.all([
        getDateRange(startDate, endDate, 'upper-digestive'), // Last 90 days
        getDateRange(startDate, endDate, 'pain'),
        getDateRange(startDate, endDate, 'sleep'),
        getDateRange(startDate, endDate, 'mental-health'),
        getDateRange(startDate, endDate, 'brain-fog'),
        getDateRange(startDate, endDate, 'movement'),
        getDateRange(startDate, endDate, 'hydration'),
        getDateRange(startDate, endDate, 'energy'),
        getDateRange(startDate, endDate, 'anxiety'),
        getDateRange(startDate, endDate, 'sensory'),
        getDateRange(startDate, endDate, 'self-care'),
        getDateRange(startDate, endDate, 'weather'),
        getDateRange(startDate, endDate, 'food-choice'),
        getDateRange(startDate, endDate, 'dysautonomia'),
        getDateRange(startDate, endDate, 'seizure'),
        getDateRange(startDate, endDate, 'reproductive'),
        getDateRange(startDate, endDate, 'food-allergens'),
        getDateRange(startDate, endDate, 'bathroom'),
        getDateRange(startDate, endDate, 'head-pain'),
        getDateRange(startDate, endDate, 'crisis'),
        getDateRange(startDate, endDate, 'coping'),
        getDateRange(startDate, endDate, 'other')
      ])

      const [
        upperDigestive, pain, sleep, mentalHealth, brainFog, movement,
        hydration, energy, anxiety, sensory, selfCare, weather,
        foodChoice, dysautonomia, seizure, reproductive, foodAllergens,
        bathroom, headPain, crisis, coping, other
      ] = allData

      console.log('🔍 Analyzing data from all trackers:', {
        upperDigestive: upperDigestive.length,
        pain: pain.length,
        sleep: sleep.length,
        mentalHealth: mentalHealth.length,
        brainFog: brainFog.length,
        movement: movement.length,
        hydration: hydration.length,
        energy: energy.length,
        anxiety: anxiety.length,
        sensory: sensory.length,
        selfCare: selfCare.length,
        weather: weather.length,
        foodChoice: foodChoice.length,
        dysautonomia: dysautonomia.length,
        seizure: seizure.length,
        reproductive: reproductive.length,
        foodAllergens: foodAllergens.length,
        bathroom: bathroom.length,
        headPain: headPain.length,
        crisis: crisis.length,
        coping: coping.length,
        other: other.length
      })

      // Analyze patterns in the real data
      const realInsights = analyzeRealPatterns({
        upperDigestive, pain, sleep, mentalHealth, brainFog, movement,
        hydration, energy, anxiety, sensory, selfCare, weather,
        foodChoice, dysautonomia, seizure, reproductive, foodAllergens,
        bathroom, headPain, crisis, coping, other
      })

      setInsights(realInsights)
      setLastSync(new Date())

      toast({
        title: "✨ Sync Complete!",
        description: `Found ${realInsights.length} patterns in your real data!`,
      })

    } catch (error) {
      console.error('Pattern analysis error:', error)
      toast({
        title: "Sync Failed",
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
      default: return <Activity className="h-4 w-4" />
    }
  }

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
            Discover hidden connections and patterns across all your health data using advanced graph analysis
          </p>
        </div>

        {/* Sync Section */}
        <Card className="border-2 border-dashed border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold flex items-center gap-2">
                  <Network className="h-5 w-5 text-primary" />
                  Graph Database Sync
                </h3>
                <p className="text-sm text-muted-foreground">
                  {lastSync 
                    ? `Last synced: ${lastSync.toLocaleString()}`
                    : 'Sync your tracker data to discover patterns'
                  }
                </p>
              </div>
              <Button 
                onClick={syncToGraph} 
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isLoading ? 'Analyzing...' : 'Sync to Graph'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
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
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {insights.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Patterns Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Sync your tracker data to start discovering patterns and connections
                  </p>
                  <Button onClick={syncToGraph} disabled={isLoading}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Start Analysis
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <Network className="h-8 w-8 text-blue-500" />
                        <div>
                          <p className="text-2xl font-bold">{insights.length}</p>
                          <p className="text-sm text-muted-foreground">Patterns Found</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-green-500" />
                        <div>
                          <p className="text-2xl font-bold">
                            {insights.filter(i => i.impact === 'high').length}
                          </p>
                          <p className="text-sm text-muted-foreground">High Impact</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <Activity className="h-8 w-8 text-purple-500" />
                        <div>
                          <p className="text-2xl font-bold">
                            {Math.round(insights.reduce((acc, i) => acc + i.confidence, 0) / insights.length)}%
                          </p>
                          <p className="text-sm text-muted-foreground">Avg Confidence</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Insights List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Key Insights</h3>
                  {insights.map((insight) => (
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
                          <Button variant="ghost" size="sm">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="correlations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Cross-Tracker Correlations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Correlation analysis will appear here after syncing your data.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="triggers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Trigger Patterns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Trigger analysis will appear here after syncing your data.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="treatments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Treatment Effectiveness
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Treatment analysis will appear here after syncing your data.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppCanvas>
  )
}
