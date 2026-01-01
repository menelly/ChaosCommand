/*
 * Graph Analytics - Pattern Detection Component
 * Part of Chaos Cascade Medical Management System
 *
 * Finds correlations between symptoms and effective interventions
 * using local graph-based analysis.
 */

"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Search, TrendingUp, Brain, Target } from "lucide-react"
import { graphService } from '@/lib/graph-service'

interface CorrelationResult {
  symptom: string
  weight: number
  confidence: number
}

interface InterventionResult {
  intervention: string
  effectiveness: number
  frequency: number
}

export function GraphAnalytics() {
  const [searchSymptom, setSearchSymptom] = useState('')
  const [correlations, setCorrelations] = useState<CorrelationResult[]>([])
  const [interventions, setInterventions] = useState<InterventionResult[]>([])
  const [loading, setLoading] = useState(false)

  // Initialize graph service
  useEffect(() => {
    graphService.initialize().catch(console.error)
  }, [])

  const searchCorrelations = async () => {
    if (!searchSymptom.trim()) return
    
    setLoading(true)
    try {
      const results = await graphService.findCoOccurringSymptoms(searchSymptom, 24)
      setCorrelations(results)
      
      const interventionResults = await graphService.findEffectiveInterventions(searchSymptom)
      setInterventions(interventionResults)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const getWeightColor = (weight: number) => {
    if (weight >= 0.8) return 'bg-red-500'
    if (weight >= 0.6) return 'bg-orange-500'
    if (weight >= 0.4) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getEffectivenessColor = (effectiveness: number) => {
    if (effectiveness >= 0.8) return 'bg-green-500'
    if (effectiveness >= 0.6) return 'bg-blue-500'
    if (effectiveness >= 0.4) return 'bg-yellow-500'
    return 'bg-gray-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Brain className="h-6 w-6" />
          🐙 Pattern Detective
        </h2>
        <p className="text-muted-foreground">
          Your symptoms leave clues. Let's find the connections your doctors might miss!
        </p>
      </div>

      {/* Search Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Symptom Correlation Search
          </CardTitle>
          <CardDescription>
            Enter a symptom to find what co-occurs with it and which interventions help
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter symptom (e.g., migraine, palpitations, nausea)"
              value={searchSymptom}
              onChange={(e) => setSearchSymptom(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchCorrelations()}
            />
            <Button onClick={searchCorrelations} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {(correlations.length > 0 || interventions.length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Co-occurring Symptoms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Co-occurring Symptoms
              </CardTitle>
              <CardDescription>
                Symptoms that appear within 24 hours of "{searchSymptom}"
              </CardDescription>
            </CardHeader>
            <CardContent>
              {correlations.length === 0 ? (
                <p className="text-muted-foreground text-sm">No correlations found yet. Keep tracking to build patterns!</p>
              ) : (
                <div className="space-y-3">
                  {correlations.map((correlation, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{correlation.symptom}</div>
                        <div className="text-sm text-muted-foreground">
                          Confidence: {(correlation.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                      <Badge 
                        className={`${getWeightColor(correlation.weight)} text-white`}
                        variant="secondary"
                      >
                        {(correlation.weight * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Effective Interventions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Effective Interventions
              </CardTitle>
              <CardDescription>
                What helps with "{searchSymptom}" based on your data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {interventions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No intervention data found yet. Track what helps to see patterns!</p>
              ) : (
                <div className="space-y-3">
                  {interventions.map((intervention, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{intervention.intervention}</div>
                        <div className="text-sm text-muted-foreground">
                          Used {intervention.frequency} times
                        </div>
                      </div>
                      <Badge 
                        className={`${getEffectivenessColor(intervention.effectiveness)} text-white`}
                        variant="secondary"
                      >
                        {(intervention.effectiveness * 100).toFixed(0)}% effective
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pro tip */}
      <div className="text-center text-sm text-muted-foreground">
        <p>🔮 The more you track, the smarter the pattern detection gets!</p>
      </div>
    </div>
  )
}
