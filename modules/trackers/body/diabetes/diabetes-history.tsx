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
 * DIABETES HISTORY COMPONENT
 * Historical view of diabetes tracking data and timers
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, Activity, Droplets, Zap, Apple } from 'lucide-react'
import { db, CATEGORIES, formatDateForStorage } from '@/lib/database'
import { DiabetesEntry, Timer, DiabetesHistoryProps } from './diabetes-types'
import { getTimeRemaining, getBGRangeInfo } from './diabetes-constants'

export function DiabetesHistory({}: DiabetesHistoryProps) {
  const [historyEntries, setHistoryEntries] = useState<DiabetesEntry[]>([])
  const [historyTimers, setHistoryTimers] = useState<Timer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState(7) // Days to look back

  useEffect(() => {
    loadHistoryData()
  }, [dateRange])

  const loadHistoryData = async () => {
    setIsLoading(true)
    try {
      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - dateRange)

      const allEntries: DiabetesEntry[] = []
      const allTimers: Timer[] = []

      // Generate array of dates to check
      const dates = []
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(formatDateForStorage(new Date(d)))
      }

      // Load entries for each date
      for (const dateKey of dates) {
        // Load diabetes entries
        const entriesRecord = await db.daily_data
          .where('[date+category+subcategory]')
          .equals([dateKey, CATEGORIES.HEALTH, 'diabetes'])
          .first()

        if (entriesRecord?.content) {
          const dateEntries = Array.isArray(entriesRecord.content) ? entriesRecord.content : [entriesRecord.content]
          allEntries.push(...dateEntries)
        }
      }

      // Load all timers (they persist across dates)
      const timerRecords = await db.daily_data
        .where('category')
        .equals(CATEGORIES.HEALTH)
        .and(record => record.subcategory === 'diabetes_timers')
        .toArray()

      timerRecords.forEach(record => {
        if (record.content) {
          const recordTimers = Array.isArray(record.content) ? record.content : [record.content]
          allTimers.push(...recordTimers)
        }
      })

      // Remove timer duplicates
      const uniqueTimers = allTimers.filter((timer, index, self) =>
        index === self.findIndex(t => t.id === timer.id)
      )

      // Sort entries by created_at (newest first)
      allEntries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setHistoryEntries(allEntries)
      setHistoryTimers(uniqueTimers)

    } catch (error) {
      console.error('Error loading history data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    
    if (isNaN(date.getTime())) {
      console.error('❌ Invalid timestamp:', timestamp)
      return 'Invalid Date'
    }

    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">History</h2>
        <Select value={dateRange.toString()} onValueChange={(value) => setDateRange(parseInt(value))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 2 weeks</SelectItem>
            <SelectItem value="30">Last month</SelectItem>
            <SelectItem value="90">Last 3 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading history...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Timer History */}
          {historyTimers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timer History ({historyTimers.length} timers)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {historyTimers.map(timer => {
                    const remaining = getTimeRemaining(timer)
                    return (
                      <div key={timer.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{timer.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Started: {formatTimestamp(timer.inserted_at)}
                          </div>
                        </div>
                        <Badge variant={remaining.expired ? "destructive" : "secondary"}>
                          {remaining.text}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Entry History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Tracking History ({historyEntries.length} entries)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyEntries.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No entries found for the selected time period</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyEntries.map(entry => (
                    <div key={entry.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm text-muted-foreground">
                          {entry.entry_date} at {entry.entry_time}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimestamp(entry.created_at)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        {entry.blood_glucose && (
                          <div className="flex items-center gap-2">
                            <Droplets className="h-4 w-4 text-red-500" />
                            <span className="text-sm">
                              {entry.blood_glucose} mg/dL
                            </span>
                          </div>
                        )}
                        {entry.insulin_amount && (
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-blue-500" />
                            <span className="text-sm">
                              {entry.insulin_amount}u {entry.insulin_type}
                            </span>
                          </div>
                        )}
                        {entry.carbs && (
                          <div className="flex items-center gap-2">
                            <Apple className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{entry.carbs}g carbs</span>
                          </div>
                        )}
                        {entry.ketones && (
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-purple-500" />
                            <span className="text-sm">{entry.ketones} mmol/L</span>
                          </div>
                        )}
                      </div>

                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {entry.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag === 'nope' ? '🍰 NOPE' : tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {entry.notes && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium">Notes:</span> {entry.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
