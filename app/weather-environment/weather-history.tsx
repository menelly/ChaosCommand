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
import { Badge } from "@/components/ui/badge"
import { useDailyData, formatDateForStorage, CATEGORIES } from '@/lib/database'
import { format } from 'date-fns'
import { Cloud, TreePine } from 'lucide-react'
import type { WeatherData, AllergenData } from './weather-types'
import { WEATHER_ICONS, getWeatherColor, getSeverityColor } from './weather-constants'

// Weather History Component
export function WeatherHistory() {
  const { getSpecificData, isLoading } = useDailyData()
  const [weatherHistory, setWeatherHistory] = useState<WeatherData[]>([])

  useEffect(() => {
    loadWeatherHistory()
  }, [isLoading])

  const loadWeatherHistory = async () => {
    if (isLoading) return

    try {
      const history: WeatherData[] = []
      const today = new Date()

      // Load last 7 days of weather data
      for (let i = 0; i < 7; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const formattedDate = formatDateForStorage(date)

        const data = await getSpecificData(formattedDate, CATEGORIES.TRACKER, 'weather')
        if (data?.content) {
          console.log('🔍 Raw data.content:', data.content)
          console.log('🔍 Type of data.content:', typeof data.content)

          // ✅ JSON PARSING: Handle string, array, and object formats
          let entries = data.content

          // If it's a string, parse it
          if (typeof entries === 'string') {
            console.log('🔧 Parsing string data...')
            try {
              entries = JSON.parse(entries)
            } catch (e) {
              console.error('❌ Failed to parse JSON string:', e)
              entries = []
            }
          }

          // Ensure it's an array
          if (!Array.isArray(entries)) {
            entries = [entries]
          }

          console.log('🔍 Final parsed entries:', entries)

          entries.forEach((entry: any) => {
            console.log('🔍 Individual entry:', entry)
            console.log('🔍 Entry impact:', entry.impact)
            console.log('🔍 Entry weatherTypes:', entry.weatherTypes)

            history.push({
              ...entry,
              date: formattedDate,
              displayDate: format(date, "MMM d")
            })
          })
        }
      }

      setWeatherHistory(history.sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime()))
    } catch (error) {
      console.error('Failed to load weather history:', error)
      setWeatherHistory([])
    }
  }

  if (weatherHistory.length === 0) {
    return (
      <div className="text-center py-4">
        <Cloud className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No weather entries yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {weatherHistory.map((entry, index) => {
        // ✅ BACKWARD COMPATIBILITY: Handle both old weatherType and new weatherTypes array
        const weatherTypes = entry.weatherTypes || (entry.weatherType ? [entry.weatherType] : [])
        const primaryWeatherType = weatherTypes[0] || "Cloudy"
        const WeatherIcon = WEATHER_ICONS[primaryWeatherType as keyof typeof WEATHER_ICONS] || Cloud

        return (
          <div key={index} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
            <WeatherIcon className="h-4 w-4" style={{ color: getWeatherColor(primaryWeatherType) }} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1 mb-1">
                {weatherTypes.slice(0, 2).map((type: string, typeIndex: number) => (
                  <Badge key={typeIndex} variant="outline" className="text-xs">
                    {type}
                  </Badge>
                ))}
                {weatherTypes.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{weatherTypes.length - 2}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {entry.displayDate} • Impact: {entry.impact}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Allergen History Component
export function AllergenHistory() {
  const { getSpecificData, isLoading } = useDailyData()
  const [allergenHistory, setAllergenHistory] = useState<AllergenData[]>([])

  useEffect(() => {
    loadAllergenHistory()
  }, [isLoading])

  const loadAllergenHistory = async () => {
    if (isLoading) return

    try {
      const history: AllergenData[] = []
      const today = new Date()

      // Load last 7 days of allergen data
      for (let i = 0; i < 7; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const formattedDate = formatDateForStorage(date)

        const data = await getSpecificData(formattedDate, CATEGORIES.TRACKER, 'environmental-allergens')
        if (data?.content) {
          console.log('🔍 Raw allergen data.content:', data.content)
          console.log('🔍 Type of allergen data.content:', typeof data.content)

          // ✅ JSON PARSING: Handle string, array, and object formats
          let entries = data.content

          // If it's a string, parse it
          if (typeof entries === 'string') {
            console.log('🔧 Parsing allergen string data...')
            try {
              entries = JSON.parse(entries)
            } catch (e) {
              console.error('❌ Failed to parse allergen JSON string:', e)
              entries = []
            }
          }

          // Ensure it's an array
          if (!Array.isArray(entries)) {
            entries = [entries]
          }

          console.log('🔍 Final parsed allergen entries:', entries)

          entries.forEach((entry: any) => {
            console.log('🔍 Individual allergen entry:', entry)
            console.log('🔍 Allergen severity:', entry.severity)
            console.log('🔍 Allergen name:', entry.allergenName)

            history.push({
              ...entry,
              date: formattedDate,
              displayDate: format(date, "MMM d")
            })
          })
        }
      }

      setAllergenHistory(history.sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime()))
    } catch (error) {
      console.error('Failed to load allergen history:', error)
      setAllergenHistory([])
    }
  }

  if (allergenHistory.length === 0) {
    return (
      <div className="text-center py-4">
        <TreePine className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No allergen entries yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {allergenHistory.map((entry, index) => (
        <div key={index} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
          <TreePine className="h-4 w-4 text-green-600" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className="text-xs"
                style={{ backgroundColor: getSeverityColor(entry.severity) + '20' }}
              >
                {entry.allergenType}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {entry.severity}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {entry.displayDate} • {entry.allergenName}
            </p>
            {entry.symptoms && entry.symptoms.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {entry.symptoms.slice(0, 2).join(", ")}
                {entry.symptoms.length > 2 && ` +${entry.symptoms.length - 2} more`}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
