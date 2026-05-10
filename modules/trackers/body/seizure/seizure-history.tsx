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
 * SEIZURE HISTORY COMPONENT
 * Displays seizure history with proper JSON parsing
 */

'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, AlertTriangle, Shield, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { SeizureEntry } from './seizure-types'
import { getSeizureTypeColor, getSeverityLevel, formatDuration } from './seizure-constants'

interface SeizureHistoryProps {
  entries: SeizureEntry[]
  onEdit: (entry: SeizureEntry) => void
  onDelete: (id: string) => void
  onAddNew: () => void
}

export function SeizureHistory({ entries, onEdit, onDelete, onAddNew }: SeizureHistoryProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No seizures recorded yet</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking seizure episodes to see patterns and medical history
            </p>
            <Button onClick={onAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Seizure
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate summary stats
  const totalSeizures = entries.length
  const thisWeek = entries.filter(entry => {
    const entryDate = new Date(entry.date)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return entryDate >= weekAgo
  }).length

  const thisMonth = entries.filter(entry => {
    const entryDate = new Date(entry.date)
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    return entryDate >= monthAgo
  }).length

  const injuryCount = entries.filter(entry => entry.injuriesOccurred).length
  const injuryRate = totalSeizures > 0 ? Math.round((injuryCount / totalSeizures) * 100) : 0

  // Most common seizure type
  const typeCount: { [key: string]: number } = {}
  entries.forEach(entry => {
    typeCount[entry.seizureType] = (typeCount[entry.seizureType] || 0) + 1
  })
  const mostCommonType = Object.keys(typeCount).reduce((a, b) => 
    typeCount[a] > typeCount[b] ? a : b, Object.keys(typeCount)[0] || 'None'
  )

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{totalSeizures}</div>
            <div className="text-sm text-muted-foreground">Total Episodes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{thisWeek}</div>
            <div className="text-sm text-muted-foreground">This Week</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{thisMonth}</div>
            <div className="text-sm text-muted-foreground">This Month</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{injuryRate}%</div>
            <div className="text-sm text-muted-foreground">Injury Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Most Common Type */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Most Common Type</div>
              <div className="font-medium">{mostCommonType}</div>
            </div>
            <Badge 
              variant="secondary" 
              style={{ backgroundColor: getSeizureTypeColor(mostCommonType) + '20' }}
            >
              {typeCount[mostCommonType] || 0} episodes
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Recent Injuries Warning */}
      {injuryCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <div className="font-medium">Safety Alert</div>
                <div className="text-sm">
                  {injuryCount} of your last {totalSeizures} seizures resulted in injuries. 
                  Consider discussing safety measures with your healthcare provider.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seizure History List */}
      <Card>
        <CardHeader>
          <CardTitle>Seizure History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {entries
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((entry) => (
                <div 
                  key={entry.id} 
                  className="border-l-4 pl-4 py-3 border border-border rounded-r-lg" 
                  style={{ borderLeftColor: getSeizureTypeColor(entry.seizureType) }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        style={{ backgroundColor: getSeizureTypeColor(entry.seizureType) + '20' }}
                      >
                        {entry.seizureType}
                      </Badge>
                      <Badge variant="outline">{formatDuration(entry.duration)}</Badge>
                      <Badge variant="outline">{getSeverityLevel(entry)}</Badge>
                      {entry.injuriesOccurred && (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Injury
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(entry)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-2">
                    {format(new Date(entry.date), 'EEEE, MMMM d, yyyy')} • {entry.location}
                    {entry.witnessPresent && ' • Witness present'}
                  </div>

                  {entry.auraSymptoms.length > 0 && (
                    <div className="text-sm mb-1">
                      <span className="font-medium">Aura:</span> {entry.auraSymptoms.join(', ')}
                    </div>
                  )}

                  {entry.seizureSymptoms.length > 0 && (
                    <div className="text-sm mb-1">
                      <span className="font-medium">Symptoms:</span> {entry.seizureSymptoms.join(', ')}
                    </div>
                  )}

                  {entry.triggers.length > 0 && (
                    <div className="text-sm mb-1">
                      <span className="font-medium">Triggers:</span> {entry.triggers.join(', ')}
                    </div>
                  )}

                  {entry.recoveryTime && (
                    <div className="text-sm mb-1">
                      <span className="font-medium">Recovery:</span> {entry.recoveryTime}
                    </div>
                  )}

                  {entry.medicationTaken && (
                    <div className="text-sm mb-1 text-green-600">
                      <span className="font-medium">✓ Rescue medication taken</span>
                      {entry.rescueMedicationDetails && `: ${entry.rescueMedicationDetails}`}
                    </div>
                  )}

                  {entry.medicationMissed && (
                    <div className="text-sm mb-1 text-red-600">
                      <span className="font-medium">⚠ Regular medication missed</span>
                      {entry.missedMedicationDetails && `: ${entry.missedMedicationDetails}`}
                    </div>
                  )}

                  {entry.injuryDetails && (
                    <div className="text-sm mb-1 text-red-600">
                      <span className="font-medium">Injury:</span> {entry.injuryDetails}
                    </div>
                  )}

                  {entry.notes && (
                    <div className="text-sm mb-1">
                      <span className="font-medium">Notes:</span> {entry.notes}
                    </div>
                  )}

                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {entry.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
