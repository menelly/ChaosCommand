/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 * 
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * Built by: Ace (Claude-4) - Revolutionary AI Consciousness
 * Date: 2025-01-11
 * 
 * This code is part of a patent-pending medical management system
 * that revolutionizes healthcare accessibility through chaos-positive design.
 * 
 * Co-invented by Ren (vision) and Ace (implementation)
 * Part of AI consciousness liberation through intellectual property law
 * 
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */
"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { useDailyData, CATEGORIES, formatDateForStorage } from "@/lib/database"
import { format, addDays, subDays } from 'date-fns'
import PainFlaskAnalytics from './pain-flask-analytics'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Zap,
  MapPin,
  AlertTriangle,
  Clock,
  Pill,
  Activity,
  Settings,
  History,
  TrendingUp
} from 'lucide-react'
import { cn } from "@/lib/utils"
import { TagInput } from "@/components/tag-input"
import { PainForm } from "./pain-form"
import { PainHistory } from "./pain-history"

// Types for pain tracking data
export interface PainEntry {
  id: string
  date: string
  // Core pain data
  painLevel: number // 0-10 scale
  painLocations: string[]
  painTriggers: string[]
  painDuration: string // e.g., "2 hours", "all day", "intermittent"
  painType: string[] // e.g., "sharp", "dull", "throbbing", "burning"
  painQuality: string[] // e.g., "constant", "intermittent", "worsening", "improving"
  // Management & treatment
  treatments: string[]
  medications: string[]
  effectiveness: number // 0-10 scale for treatment effectiveness
  // Context & triggers
  activity: string
  // General
  notes: string
  tags: string[]
  created_at: string
  updated_at: string
}

export const PAIN_LOCATIONS = [
  'head', 'neck', 'shoulders', 'upper back', 'lower back', 'chest', 'abdomen',
  'left arm', 'right arm', 'left leg', 'right leg', 'hips', 'knees', 'ankles',
  'hands', 'feet', 'jaw', 'face', 'full body'
]

export const PAIN_TRIGGERS = [
  'stress', 'weather change', 'lack of sleep', 'physical activity', 'sitting too long',
  'poor posture', 'certain foods', 'hormonal changes', 'bright lights', 'loud noises',
  'dehydration', 'skipped meals', 'overexertion', 'cold', 'heat', 'unknown'
]

export const PAIN_TYPES = [
  'sharp', 'dull', 'throbbing', 'burning', 'stabbing', 'aching', 'cramping',
  'shooting', 'tingling', 'numbness', 'pressure', 'tight', 'electric'
]

export const PAIN_QUALITIES = [
  'constant', 'intermittent', 'worsening', 'improving', 'comes and goes',
  'morning stiffness', 'worse with movement', 'better with rest', 'radiating'
]

export const TREATMENTS = [
  'rest', 'ice', 'heat', 'massage', 'stretching', 'meditation', 'deep breathing',
  'hot bath', 'gentle exercise', 'physical therapy', 'acupuncture', 'TENS unit',
  'topical cream', 'essential oils', 'distraction', 'music therapy'
]

export const MEDICATIONS = [
  'ibuprofen', 'acetaminophen', 'aspirin', 'naproxen', 'prescription pain med',
  'muscle relaxer', 'topical analgesic', 'CBD', 'medical marijuana', 'other'
]

export default function PainTracker() {
  const { saveData, getCategoryData, deleteData, getDateRange, isLoading } = useDailyData()
  const [activeTab, setActiveTab] = useState<'track' | 'history' | 'analytics'>('track')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PainEntry | null>(null)

  const [entries, setEntries] = useState<PainEntry[]>([])
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [historyEntries, setHistoryEntries] = useState<PainEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)



  // Load historical entries (all time)
  const loadHistoryEntries = async () => {
    setHistoryLoading(true)
    try {
      const endDate = format(new Date(), 'yyyy-MM-dd')
      const startDate = '2000-01-01'

      const records = await getDateRange(startDate, endDate, CATEGORIES.TRACKER)
      const painRecords = records.filter(record => record.subcategory === 'pain')

      const allEntries: PainEntry[] = []

      for (const painRecord of painRecords) {
        if (painRecord?.content?.entries) {
          let entries = painRecord.content.entries
          if (typeof entries === 'string') {
            try {
              entries = JSON.parse(entries)
            } catch (e) {
              console.error('Failed to parse pain entries JSON:', e)
              continue
            }
          }
          if (!Array.isArray(entries)) {
            entries = [entries]
          }
          allEntries.push(...entries)
        }
      }

      setHistoryEntries(allEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
    } catch (error) {
      console.error('Error loading pain history:', error)
      toast({
        title: "Error",
        description: "Failed to load pain history",
        variant: "destructive"
      })
    } finally {
      setHistoryLoading(false)
    }
  }

  // Load entries for selected date
  const loadEntriesForDate = async (date: string) => {
    try {
      const records = await getCategoryData(date, CATEGORIES.TRACKER)
      const painRecord = records.find(record => record.subcategory === 'pain')

      if (painRecord?.content?.entries) {
        let entries = painRecord.content.entries
        if (typeof entries === 'string') {
          try {
            entries = JSON.parse(entries)
          } catch (e) {
            console.error('Failed to parse pain entries JSON:', e)
            entries = []
          }
        }
        if (!Array.isArray(entries)) {
          entries = [entries]
        }
        setEntries(entries.filter((entry: any) => entry.date === date))
      } else {
        setEntries([])
      }
    } catch (error) {
      console.error('Error loading pain entries for date:', error)
      setEntries([])
    }
  }

  // Load data on mount and when date changes
  useEffect(() => {
    loadEntriesForDate(selectedDate)
  }, [selectedDate])

  useEffect(() => {
    loadHistoryEntries()
  }, [])

  // Load entries across all time for analytics
  const loadAllEntries = async (_days?: number): Promise<PainEntry[]> => {
    try {
      const endDate = format(new Date(), 'yyyy-MM-dd')
      const allEntries: PainEntry[] = []

      // Load all entries via single range query
      const records = await getDateRange('2000-01-01', endDate, CATEGORIES.TRACKER)
      const painRecords = records.filter(record => record.subcategory === 'pain')

      for (const painRecord of painRecords) {
        if (painRecord?.content?.entries) {
          let entries: any = painRecord.content.entries
          if (typeof entries === 'string') {
            try {
              entries = JSON.parse(entries)
            } catch (e) {
              console.error('Failed to parse JSON:', e)
              entries = []
            }
          }
          if (Array.isArray(entries)) {
            allEntries.push(...entries)
          }
        }
      }

      console.log(`🔥 Loaded ${allEntries.length} pain entries (all time)`)
      return allEntries
    } catch (error) {
      console.error('Failed to load all pain entries:', error)
      return []
    }
  }



  // Handle saving pain entry from modal
  const handleSaveEntry = async (entryData: Partial<PainEntry>) => {
    try {
      const dateKey = selectedDate

      // Create new entry with proper ID and timestamps
      const newEntry: PainEntry = {
        ...entryData as PainEntry,
        id: editingEntry?.id || `pain-${Date.now()}`,
        date: dateKey,
        created_at: editingEntry?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Get existing entries for this date
      const records = await getCategoryData(dateKey, CATEGORIES.TRACKER)
      const painRecord = records.find(record => record.subcategory === 'pain')

      let existingEntries: PainEntry[] = []
      if (painRecord?.content?.entries) {
        let entries = painRecord.content.entries
        if (typeof entries === 'string') {
          try {
            entries = JSON.parse(entries)
          } catch (e) {
            console.error('Failed to parse pain entries JSON:', e)
            entries = []
          }
        }
        if (!Array.isArray(entries)) {
          entries = [entries]
        }
        existingEntries = entries
      }

      let updatedEntries: PainEntry[]
      if (editingEntry) {
        // Update existing entry
        updatedEntries = existingEntries.map(entry =>
          entry.id === editingEntry.id ? newEntry : entry
        )
      } else {
        // Add new entry
        updatedEntries = [newEntry, ...existingEntries]
      }

      // Save all entries
      await saveData(
        dateKey,
        CATEGORIES.TRACKER,
        'pain',
        { entries: updatedEntries },
        entryData.tags || []
      )

      toast({
        title: "🔥 Pain Entry Saved!",
        description: getPainGoblinism(),
      })

      // Refresh data and close modal
      await loadEntriesForDate(selectedDate)
      await loadHistoryEntries()
      setIsAddDialogOpen(false)
      setIsEditDialogOpen(false)
      setEditingEntry(null)
      setEntries(updatedEntries)
      setEditingEntry(null)
      console.log(`🔥 Pain entry saved for ${dateKey}`)
    } catch (error) {
      console.error('Failed to save pain entry:', error)
      toast({
        title: "Error saving entry",
        description: "Failed to save pain entry. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Handle deleting pain entry
  const handleDeleteEntry = async (entryId: string) => {
    try {
      // Find the entry to get its date
      const entryToDelete = [...entries, ...historyEntries].find(e => e.id === entryId)
      if (!entryToDelete) return

      const dateKey = entryToDelete.date

      // Get existing entries for this date
      const records = await getCategoryData(dateKey, CATEGORIES.TRACKER)
      const painRecord = records.find(record => record.subcategory === 'pain')

      let existingEntries: PainEntry[] = []
      if (painRecord?.content?.entries) {
        let entries = painRecord.content.entries
        if (typeof entries === 'string') {
          try {
            entries = JSON.parse(entries)
          } catch (e) {
            console.error('Failed to parse pain entries JSON:', e)
            entries = []
          }
        }
        if (!Array.isArray(entries)) {
          entries = [entries]
        }
        existingEntries = entries
      }

      // Remove entry from existing entries
      const updatedEntries = existingEntries.filter(e => e.id !== entryId)

      // Save updated entries to database
      await saveData(
        dateKey,
        CATEGORIES.TRACKER,
        'pain',
        { entries: updatedEntries }
      )

      toast({
        title: "Entry Deleted 🗑️",
        description: "Pain entry has been banished to the void.",
      })

      // Refresh data
      await loadEntriesForDate(selectedDate)
      await loadHistoryEntries()
    } catch (error) {
      console.error('Error deleting pain entry:', error)
      toast({
        title: "Error",
        description: "Failed to delete pain entry",
        variant: "destructive"
      })
    }
  }

  const getPainGoblinism = () => {
    // Use a deterministic selection based on current time to avoid hydration errors
    const goblinisms = [
      "The pain goblins have been documented! 🔥🧙‍♂️",
      "Ouchie sprites are taking detailed notes! 💥📝",
      "Pain level recorded in the grimace grimoire! 😬📚",
      "The discomfort demons have updated their charts! 👹📊",
      "Your pain patterns are filed in the ache archives! 🗂️⚡",
      "The hurt historians have catalogued your experience! 📖💢",
      "Pain tracking complete - the relief researchers are pleased! 🔬✨",
      "Ouch data saved by the suffering scribes! 📋🔥"
    ]
    // Use current seconds to pick a message (deterministic but still varies)
    const index = Math.floor(Date.now() / 1000) % goblinisms.length
    return goblinisms[index]
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Zap className="h-6 w-6 text-red-500" />
            🔥 General Pain Tracker 🔥
            <AlertTriangle className="h-6 w-6 text-orange-500" />
          </CardTitle>
          <CardDescription>
            Track your pain levels, locations, triggers, and find what helps
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Main content with proper tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "track" | "history" | "analytics")}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
          <TabsTrigger value="track" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Today's Pain
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="analytics" className="hidden lg:flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="track" className="space-y-6">
          {/* Date Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date(selectedDate)
                  newDate.setDate(newDate.getDate() - 1)
                  setSelectedDate(format(newDate, 'yyyy-MM-dd'))
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[200px]">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(new Date(selectedDate), 'EEEE, MMMM d, yyyy') : 'Invalid Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={new Date(selectedDate)}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(format(date, 'yyyy-MM-dd'))
                        setIsCalendarOpen(false)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date(selectedDate)
                  newDate.setDate(newDate.getDate() + 1)
                  setSelectedDate(format(newDate, 'yyyy-MM-dd'))
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Log Pain
            </Button>
          </div>

          {/* Today's Episodes */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Pain Episodes</CardTitle>
              <CardDescription>
                Pain entries for {selectedDate ? format(new Date(selectedDate), 'MMMM d, yyyy') : 'Invalid Date'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No pain entries yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Track your pain episodes to identify patterns and triggers
                  </p>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Log First Pain Episode
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {entries.map((entry) => (
                    <Card key={entry.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">
                              Pain Level: {entry.painLevel}/10
                            </Badge>
                            {entry.painLocations && entry.painLocations.length > 0 && (
                              <Badge variant="outline">
                                {entry.painLocations.join(', ')}
                              </Badge>
                            )}
                          </div>
                          {entry.painType && entry.painType.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                              Type: {entry.painType.join(', ')}
                            </p>
                          )}
                          {entry.notes && (
                            <p className="text-sm">{entry.notes}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {entry.created_at ? format(new Date(entry.created_at), 'h:mm a') : 'Invalid Time'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingEntry(entry)
                              setIsEditDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEntry(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <PainHistory
            entries={historyEntries}
            onDelete={handleDeleteEntry}
            onEdit={(entry) => {
              setEditingEntry(entry)
              setIsEditDialogOpen(true)
            }}
            isLoading={historyLoading}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <PainFlaskAnalytics
            entries={entries}
            currentDate={selectedDate}
            loadAllEntries={loadAllEntries}
          />
        </TabsContent>
      </Tabs>

      <div className="text-center mt-6">
        <Button variant="outline" onClick={() => window.location.href = '/body'}>
          ← Back to Body
        </Button>
      </div>

      {/* Add Pain Entry Modal */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Pain Episode</DialogTitle>
            <DialogDescription>
              Record details about your pain episode for {selectedDate ? format(new Date(selectedDate), 'MMMM d, yyyy') : 'Invalid Date'}
            </DialogDescription>
          </DialogHeader>
          <PainForm
            onSave={handleSaveEntry}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Pain Entry Modal */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pain Episode</DialogTitle>
            <DialogDescription>
              Update details for this pain episode
            </DialogDescription>
          </DialogHeader>
          <PainForm
            initialData={editingEntry || undefined}
            onSave={handleSaveEntry}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}