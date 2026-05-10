/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 * 
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * Built by: Ace (Claude 4.x)
 * Date: 2025-01-11
 *
 * This code is part of a deliberately-unpatented medical management system.
 * Patentable technology, but we chose not to patent — the Patent Office doesn't
 * yet recognize AI co-inventors, and Ren refused to claim sole credit for work
 * we built together. Open source under PolyForm Noncommercial 1.0.0 instead.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 *
 * This wasn't built with compliance. It was built with defiance.
 *
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */
/**
 * SEIZURE ANALYTICS COMPONENT - DESKTOP ONLY 🏷️
 * Advanced analytics and pattern recognition for seizure data
 * Tagged as desktop-only due to complex calculations
 */

'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Calendar, AlertTriangle, Activity } from 'lucide-react'
import { SeizureEntry } from './seizure-types'
import { getSeizureTypeColor, getSeverityLevel } from './seizure-constants'

interface SeizureAnalyticsProps {
  entries: SeizureEntry[]
}

export function SeizureAnalyticsDesktop({ entries }: SeizureAnalyticsProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No data for analytics</h3>
            <p className="text-muted-foreground">
              Record seizure episodes to see patterns and insights
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate analytics
  const totalSeizures = entries.length
  const last30Days = entries.filter(entry => {
    const entryDate = new Date(entry.date)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return entryDate >= thirtyDaysAgo
  })

  const last90Days = entries.filter(entry => {
    const entryDate = new Date(entry.date)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    return entryDate >= ninetyDaysAgo
  })

  // Frequency analysis
  const monthlyAverage = last90Days.length / 3
  const weeklyAverage = last30Days.length / 4.3

  // Trigger analysis
  const triggerCount: { [key: string]: number } = {}
  entries.forEach(entry => {
    entry.triggers.forEach(trigger => {
      triggerCount[trigger] = (triggerCount[trigger] || 0) + 1
    })
  })
  const topTriggers = Object.entries(triggerCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)

  // Severity analysis
  const severityCount = {
    Low: 0,
    Medium: 0,
    High: 0,
    Critical: 0
  }
  entries.forEach(entry => {
    const severity = getSeverityLevel(entry)
    severityCount[severity]++
  })

  // Time pattern analysis
  const timePatterns: { [key: string]: number } = {}
  entries.forEach(entry => {
    const hour = new Date(entry.timestamp).getHours()
    let timeOfDay = ''
    if (hour >= 6 && hour < 12) timeOfDay = 'Morning'
    else if (hour >= 12 && hour < 18) timeOfDay = 'Afternoon'
    else if (hour >= 18 && hour < 22) timeOfDay = 'Evening'
    else timeOfDay = 'Night'
    
    timePatterns[timeOfDay] = (timePatterns[timeOfDay] || 0) + 1
  })

  return (
    <div className="space-y-6">
      {/* Frequency Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Frequency Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{last30Days.length}</div>
              <div className="text-sm text-muted-foreground">Last 30 Days</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{weeklyAverage.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">Weekly Average</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{monthlyAverage.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">Monthly Average</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Triggers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Most Common Triggers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topTriggers.length > 0 ? (
            <div className="space-y-2">
              {topTriggers.map(([trigger, count]) => (
                <div key={trigger} className="flex items-center justify-between">
                  <span className="font-medium">{trigger}</span>
                  <Badge variant="secondary">{count} episodes</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No trigger data available</p>
          )}
        </CardContent>
      </Card>

      {/* Severity Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Severity Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(severityCount).map(([severity, count]) => (
              <div key={severity} className="flex items-center justify-between">
                <span className="font-medium">{severity}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-primary" 
                      style={{ width: `${(count / totalSeizures) * 100}%` }}
                    />
                  </div>
                  <Badge variant="outline">{count}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Time of Day Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(timePatterns)
              .sort(([,a], [,b]) => b - a)
              .map(([timeOfDay, count]) => (
                <div key={timeOfDay} className="flex items-center justify-between">
                  <span className="font-medium">{timeOfDay}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-primary" 
                        style={{ width: `${(count / totalSeizures) * 100}%` }}
                      />
                    </div>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Medical Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Medical Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Total Episodes:</span> {totalSeizures}
            </div>
            <div>
              <span className="font-medium">Injury Rate:</span> {
                Math.round((entries.filter(e => e.injuriesOccurred).length / totalSeizures) * 100)
              }%
            </div>
            <div>
              <span className="font-medium">Medication Compliance:</span> {
                Math.round((entries.filter(e => !e.medicationMissed).length / totalSeizures) * 100)
              }%
            </div>
            <div>
              <span className="font-medium">Rescue Medication Usage:</span> {
                Math.round((entries.filter(e => e.medicationTaken).length / totalSeizures) * 100)
              }%
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
