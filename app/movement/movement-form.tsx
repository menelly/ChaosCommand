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

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Heart } from "lucide-react"
import { KeyboardAvoidingWrapper } from "@/components/ui/keyboard-avoiding-wrapper"
import { MovementEntry } from './movement-types'
import { MOVEMENT_TYPES, INTENSITY_LEVELS, BODY_FEELINGS, MOVEMENT_GOBLINISMS } from './movement-constants'
import { format } from "date-fns"

// Helper functions for duration slider
const getDurationMinutes = (durationStr: string): number => {
  if (!durationStr) return 0  // Start at 0 (null state)

  // Parse common formats: "5 min", "30 minutes", "1 hour", "1.5 hours"
  const str = durationStr.toLowerCase()

  if (str.includes('hour')) {
    const hours = parseFloat(str.match(/[\d.]+/)?.[0] || '1')
    return Math.round(hours * 60)
  }

  if (str.includes('min')) {
    const minutes = parseFloat(str.match(/[\d.]+/)?.[0] || '5')
    return Math.round(minutes)
  }

  // Default fallback
  return 5
}

const formatDuration = (minutes: number): string => {
  if (minutes === 0) return ""  // Return empty string for null state
  if (minutes < 60) {
    return `${minutes} min`
  } else {
    const hours = minutes / 60
    if (hours === 1) return '1 hour'
    if (hours === Math.floor(hours)) return `${Math.floor(hours)} hours`
    return `${hours.toFixed(1)} hours`
  }
}

interface MovementFormProps {
  selectedDate: string
  editingEntry: MovementEntry | null
  onSave: (entry: Omit<MovementEntry, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel?: () => void
  isLoading?: boolean
  isOpen: boolean
  onClose: () => void
}

export function MovementForm({
  selectedDate,
  editingEntry,
  onSave,
  onCancel,
  isLoading = false,
  isOpen,
  onClose
}: MovementFormProps) {
  // Form state
  const [time, setTime] = useState(editingEntry?.time || format(new Date(), 'HH:mm'))
  const [type, setType] = useState(editingEntry?.type || "")
  const [duration, setDuration] = useState(editingEntry?.duration || "")
  const [intensity, setIntensity] = useState(editingEntry?.intensity || "")
  const [energyBefore, setEnergyBefore] = useState(editingEntry?.energyBefore || 5)
  const [energyAfter, setEnergyAfter] = useState(editingEntry?.energyAfter || 5)
  const [bodyFeel, setBodyFeel] = useState<string[]>(editingEntry?.bodyFeel || [])
  const [location, setLocation] = useState(editingEntry?.location || "")
  const [notes, setNotes] = useState(editingEntry?.notes || "")
  const [tags, setTags] = useState<string[]>(editingEntry?.tags || [])
  const [tagInput, setTagInput] = useState("")

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

  const handleSubmit = () => {
    if (!type) {
      return // Validation handled by parent
    }

    onSave({
      date: selectedDate,
      time,
      type,
      duration,
      intensity,
      energyBefore,
      energyAfter,
      bodyFeel,
      location,
      notes,
      tags
    })
  }

  const resetForm = () => {
    setTime(format(new Date(), 'HH:mm'))
    setType("")
    setDuration("")
    setIntensity("")
    setEnergyBefore(5)
    setEnergyAfter(5)
    setBodyFeel([])
    setLocation("")
    setNotes("")
    setTags([])
    setTagInput("")
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const toggleBodyFeel = (feeling: string) => {
    if (bodyFeel.includes(feeling)) {
      setBodyFeel(bodyFeel.filter(f => f !== feeling))
    } else {
      setBodyFeel([...bodyFeel, feeling])
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Log Movement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <KeyboardAvoidingWrapper>
        {/* Time */}
        <div className="space-y-2">
          <Label htmlFor="time">Time</Label>
          <Input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        {/* Movement Type */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">💖 What kind of movement?</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {MOVEMENT_TYPES.map((movementType) => (
              <Button
                key={movementType.value}
                variant={type === movementType.value ? "default" : "outline"}
                onClick={() => setType(movementType.value)}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <span className="text-2xl">{movementType.emoji}</span>
                <span className="font-medium text-xs text-center">{movementType.description}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-4">
          <div className="text-center">
            <Label htmlFor="duration" className="text-base font-medium">Duration</Label>
            <div className="text-lg font-semibold text-foreground mt-1">
              {duration || <span className="text-muted-foreground">Not specified</span>}
            </div>
          </div>
          <Slider
            value={[getDurationMinutes(duration)]}
            onValueChange={(value) => {
              const minutes = value[0]
              if (minutes === 0) {
                setDuration("")  // Reset to blank if slider goes back to 0
              } else {
                const formatted = formatDuration(minutes)
                setDuration(formatted)
              }
            }}
            max={120}
            min={0}
            step={5}
            className="w-full"
          />
          <div className="text-xs text-muted-foreground text-center">
            Leave at far left for no duration, or drag to set (5 min → 2 hours) 🎯
          </div>
        </div>

        {/* Intensity */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">How did it feel?</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {INTENSITY_LEVELS.map((level) => (
              <Button
                key={level.value}
                variant={intensity === level.value ? "default" : "outline"}
                onClick={() => setIntensity(level.value)}
                className="h-auto p-3 flex flex-col items-center gap-2 text-center"
              >
                <span className="text-2xl">{level.emoji}</span>
                <span className="font-medium text-xs">{level.value.replace('_', ' ')}</span>
                <span className="text-xs leading-tight whitespace-normal break-words">{level.description}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Energy Before/After */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="energy-before">Energy Before (1-10)</Label>
            <Input
              id="energy-before"
              type="number"
              min="1"
              max="10"
              value={energyBefore}
              onChange={(e) => setEnergyBefore(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="energy-after">Energy After (1-10)</Label>
            <Input
              id="energy-after"
              type="number"
              min="1"
              max="10"
              value={energyAfter}
              onChange={(e) => setEnergyAfter(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Body Feelings */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">How does your body feel? (Select all that apply)</Label>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {BODY_FEELINGS.map((feeling) => (
              <Button
                key={feeling}
                variant={bodyFeel.includes(feeling) ? "default" : "outline"}
                onClick={() => toggleBodyFeel(feeling)}
                className="h-auto p-2 text-xs"
              >
                {feeling}
              </Button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location">Where? (optional)</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., bedroom, living room, outside, gym..."
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How are you feeling? Any wins to celebrate? Challenges to note?"
            rows={3}
          />
        </div>

        {/* Tags */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Tags</Label>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add a tag..."
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
            />
            <Button onClick={addTag} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

          </KeyboardAvoidingWrapper>

          {/* Save Button */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSubmit} className="flex-1" disabled={isLoading || !type}>
              <Heart className="h-4 w-4 mr-2" />
              {editingEntry ? 'Update Movement Entry' : 'Save Movement Entry'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
