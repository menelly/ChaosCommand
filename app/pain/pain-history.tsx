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

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { format } from 'date-fns'
import {
  Search,
  Edit,
  Trash2,
  Calendar,
  Zap,
  MapPin,
  AlertTriangle,
  Clock,
  Pill,
  Activity,
  Target
} from 'lucide-react'
import { PainEntry } from './pain-tracker'

interface PainHistoryProps {
  entries: PainEntry[]
  onDelete: (entryId: string) => void
  onEdit: (entry: PainEntry) => void
  isLoading?: boolean
}

export function PainHistory({ entries, onDelete, onEdit, isLoading }: PainHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const filteredEntries = entries.filter(entry => {
    const searchLower = searchQuery.toLowerCase()
    return (
      entry.notes?.toLowerCase().includes(searchLower) ||
      entry.painLocations?.some(location => location.toLowerCase().includes(searchLower)) ||
      entry.painTriggers?.some(trigger => trigger.toLowerCase().includes(searchLower)) ||
      entry.painType?.some(type => type.toLowerCase().includes(searchLower)) ||
      entry.painQuality?.some(quality => quality.toLowerCase().includes(searchLower)) ||
      entry.treatments?.some(treatment => treatment.toLowerCase().includes(searchLower)) ||
      entry.medications?.some(med => med.toLowerCase().includes(searchLower)) ||
      entry.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
      entry.activity?.toLowerCase().includes(searchLower) ||
      entry.painDuration?.toLowerCase().includes(searchLower)
    )
  })

  const getPainLevelColor = (level: number) => {
    if (level === 0) return 'text-green-500'
    if (level <= 3) return 'text-yellow-500'
    if (level <= 6) return 'text-orange-500'
    return 'text-red-500'
  }

  const getPainLevelEmoji = (level: number) => {
    if (level === 0) return '😊'
    if (level <= 2) return '😐'
    if (level <= 4) return '😕'
    if (level <= 6) return '😣'
    if (level <= 8) return '😖'
    return '😵'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            📊 Pain History & Patterns
          </CardTitle>
          <CardDescription>
            View and analyze your pain tracking history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search entries by location, triggers, treatments, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Entries List */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <div className="text-muted-foreground">
                {searchQuery ?
                  "No entries match your search criteria." :
                  "No pain entries yet. Start tracking to see your history and identify patterns! 🔥"
                }
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredEntries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {entry.date ? format(new Date(entry.date), 'EEEE, MMMM d, yyyy') : 'Invalid Date'}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 font-bold text-lg ${getPainLevelColor(entry.painLevel)}`}>
                      <Zap className="h-4 w-4" />
                      {getPainLevelEmoji(entry.painLevel)} {entry.painLevel}/10
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(entry)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Dialog open={deleteConfirm === entry.date} onOpenChange={(open) => setDeleteConfirm(open ? entry.date : null)}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Entry</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete this pain entry? This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => {
                              onDelete(entry.id)
                              setDeleteConfirm(null)
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Core Pain Data */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {entry.painDuration && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">Duration:</span>
                      <span className="text-sm">{entry.painDuration}</span>
                    </div>
                  )}

                  {entry.effectiveness > 0 && (
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium">Treatment:</span>
                      <span className="text-sm">{entry.effectiveness}/10</span>
                    </div>
                  )}
                </div>

                {/* Pain Locations */}
                {(entry.painLocations && entry.painLocations.length > 0) && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Pain Locations
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {entry.painLocations.map((location, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {location}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pain Triggers */}
                {(entry.painTriggers && entry.painTriggers.length > 0) && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Triggers
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {entry.painTriggers.map((trigger, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-orange-50">
                          {trigger}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pain Type & Quality */}
                {((entry.painType && entry.painType.length > 0) || (entry.painQuality && entry.painQuality.length > 0)) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(entry.painType && entry.painType.length > 0) && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Pain Type</h4>
                        <div className="flex flex-wrap gap-1">
                          {entry.painType.map((type, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-blue-50">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {(entry.painQuality && entry.painQuality.length > 0) && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Pain Quality</h4>
                        <div className="flex flex-wrap gap-1">
                          {entry.painQuality.map((quality, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-indigo-50">
                              {quality}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Treatments & Medications */}
                {((entry.treatments && entry.treatments.length > 0) || (entry.medications && entry.medications.length > 0)) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(entry.treatments && entry.treatments.length > 0) && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Treatments</h4>
                        <div className="flex flex-wrap gap-1">
                          {entry.treatments.map((treatment, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-teal-50">
                              {treatment}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {(entry.medications && entry.medications.length > 0) && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Pill className="h-4 w-4" />
                          Medications
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {entry.medications.map((medication, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-pink-50">
                              {medication}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Context */}
                {entry.activity && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Activity:</span>
                    <span className="text-sm">{entry.activity}</span>
                  </div>
                )}

                {/* Notes */}
                {entry.notes && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Notes</h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                      {entry.notes}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {(entry.tags && entry.tags.length > 0) && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {entry.tags.map((tag, index) => (
                        <Badge key={index} variant="default" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}