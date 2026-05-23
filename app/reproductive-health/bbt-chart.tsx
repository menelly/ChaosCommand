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
"use client"

import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Thermometer } from 'lucide-react'
import { format } from 'date-fns'

interface BBTEntry {
  date: string
  bbt: number | null
}

interface BBTChartProps {
  entries: BBTEntry[]
  className?: string
}

export function BBTChart({ entries, className }: BBTChartProps) {
  // Fix hydration mismatch with client-side state
  const [isClient, setIsClient] = useState(false)
  const [bbtData, setBbtData] = useState<Array<{date: string, bbt: number, cycleDay: number}>>([])

  useEffect(() => {
    setIsClient(true)
    // Process data on client side to avoid hydration mismatch
    const processedData = entries
      .filter(entry => entry.bbt !== null && entry.bbt !== undefined)
      .map((entry, index) => ({
        date: entry.date,
        bbt: entry.bbt!,
        cycleDay: index + 1 // Simple cycle day calculation
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    setBbtData(processedData)
  }, [entries])

  // Show loading state during hydration
  if (!isClient) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            BBT Temperature Chart
          </CardTitle>
          <CardDescription>Loading chart...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (bbtData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            BBT Temperature Chart
          </CardTitle>
          <CardDescription>
            Track your basal body temperature patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Thermometer className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No BBT data recorded yet</p>
              <p className="text-sm">Start logging your morning temperature to see patterns</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Thermometer className="h-5 w-5" />
          BBT Temperature Chart
        </CardTitle>
        <CardDescription>
          Your basal body temperature over time ({bbtData.length} readings)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={bbtData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(date) => format(new Date(date + 'T12:00:00'), 'MM/dd')}
            />
            <YAxis
              domain={['dataMin - 0.5', 'dataMax + 0.5']}
              tickFormatter={(temp) => `${temp}°F`}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number) => [`${value}°F`, 'BBT']}
              labelFormatter={(date) => `Date: ${date}`}
            />
            <Line
              type="monotone"
              dataKey="bbt"
              stroke="#8884d8"
              strokeWidth={2}
              dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
        
        <div className="mt-4 text-sm text-muted-foreground">
          <p>💡 <strong>Reading your chart:</strong> Look for a temperature rise of 0.2°F+ that stays elevated for 3+ days - this indicates ovulation occurred.</p>
        </div>
      </CardContent>
    </Card>
  )
}
