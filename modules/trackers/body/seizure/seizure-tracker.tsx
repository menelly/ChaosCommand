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
 * SEIZURE TRACKER MAIN COMPONENT
 * Comprehensive seizure tracking with medical-grade detail
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Zap, ArrowLeft, BarChart3, History } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { SeizureForm } from './seizure-form'
import { SeizureHistory } from './seizure-history'
import { SeizureAnalyticsDesktop } from './seizure-analytics-desktop'
import { SeizureEntry } from './seizure-types'
import { getRandomSafetyMessage } from './seizure-constants'

// Dexie imports
import { useDailyData, CATEGORIES, formatDateForStorage } from '@/lib/database'

export function SeizureTracker() {
  const { toast } = useToast()
  const { saveData, getSpecificData, isLoading } = useDailyData()

  // State management
  const [entries, setEntries] = useState<SeizureEntry[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<SeizureEntry | null>(null)

  // Load seizure entries from Dexie
  useEffect(() => {
    loadEntries()
  }, [])

  const loadEntries = async () => {
    try {
      // Get seizure data from Dexie using date-first structure
      const today = formatDateForStorage(new Date())
      const data = await getSpecificData(today, CATEGORIES.TRACKER, 'seizure')

      if (data?.content?.entries) {
        // Parse entries with JSON parsing fix
        let entries = data.content.entries
        if (typeof entries === 'string') {
          try {
            entries = JSON.parse(entries)
          } catch (e) {
            console.error('Failed to parse seizure entries JSON:', e)
            entries = []
          }
        }
        if (!Array.isArray(entries)) {
          entries = [entries]
        }

        setEntries(entries.filter((entry: any) => entry && typeof entry === 'object'))
      } else {
        setEntries([])
      }
    } catch (error) {
      console.error('Error loading seizure entries:', error)
      toast({
        title: "Error loading seizures",
        description: "Failed to load seizure history. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleSave = async (entry: SeizureEntry) => {
    try {
      let updatedEntries: SeizureEntry[]

      if (editEntry) {
        // Update existing entry
        updatedEntries = entries.map(e => e.id === entry.id ? entry : e)

        toast({
          title: "Seizure updated",
          description: "Episode details have been updated successfully.",
        })
      } else {
        // Add new entry
        updatedEntries = [entry, ...entries]

        toast({
          title: "Seizure recorded",
          description: getRandomSafetyMessage(),
        })
      }

      // Save to Dexie using date-first structure
      const today = formatDateForStorage(new Date())
      await saveData(
        today,
        CATEGORIES.TRACKER,
        'seizure',
        { entries: updatedEntries },
        entry.tags || []
      )

      // Update local state
      setEntries(updatedEntries)
      setEditEntry(null)
    } catch (error) {
      console.error('Error saving seizure entry:', error)
      toast({
        title: "Error saving seizure",
        description: "Failed to save seizure data. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleEdit = (entry: SeizureEntry) => {
    setEditEntry(entry)
    setIsEditDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      // Remove entry from local state
      const updatedEntries = entries.filter(e => e.id !== id)

      // Save updated entries to Dexie
      const today = formatDateForStorage(new Date())
      await saveData(
        today,
        CATEGORIES.TRACKER,
        'seizure',
        { entries: updatedEntries }
      )

      // Update local state
      setEntries(updatedEntries)

      toast({
        title: "Seizure deleted",
        description: "Episode has been removed from your records.",
      })
    } catch (error) {
      console.error('Error deleting seizure entry:', error)
      toast({
        title: "Error deleting seizure",
        description: "Failed to delete seizure record. Please try again.",
        variant: "destructive"
      })
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading seizure tracker...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="flex items-center gap-2"
          >
            <a href="/physical-health">
              <ArrowLeft className="h-4 w-4" />
              Physical Health
            </a>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Zap className="h-8 w-8 text-yellow-500" />
              Seizure Tracker
            </h1>
            <p className="text-muted-foreground">
              Medical-grade seizure episode tracking and analysis
            </p>
          </div>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Seizure
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <SeizureHistory
            entries={entries}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddNew={() => setIsAddDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <SeizureAnalyticsDesktop entries={entries} />
        </TabsContent>
      </Tabs>

      {/* Add Seizure Dialog */}
      <SeizureForm
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSave={handleSave}
      />

      {/* Edit Seizure Dialog */}
      <SeizureForm
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setEditEntry(null)
        }}
        onSave={handleSave}
        editEntry={editEntry}
      />
    </div>
  )
}
