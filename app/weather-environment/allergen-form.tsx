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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { TreePine } from 'lucide-react'
import { TagInput } from "@/components/tag-input"
import type { AllergenType, AllergenSeverity } from './weather-types'
import { ALLERGEN_TYPES, ALLERGEN_SEVERITIES, COMMON_SYMPTOMS, getSeverityColor } from './weather-constants'

interface AllergenFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    allergenType: AllergenType
    allergenName: string
    severity: AllergenSeverity
    symptoms: string[]
    location: string
    duration: string
    treatment: string
    notes: string
    tags: string[]
  }) => void
  initialData?: {
    allergenType: AllergenType
    allergenName: string
    severity: AllergenSeverity
    symptoms: string[]
    location: string
    duration: string
    treatment: string
    notes: string
    tags: string[]
  } | null
  isEditing?: boolean
}

export function AllergenForm({ isOpen, onClose, onSave, initialData, isEditing = false }: AllergenFormProps) {
  const [allergenType, setAllergenType] = useState<AllergenType>(initialData?.allergenType || "Pollen")
  const [allergenName, setAllergenName] = useState(initialData?.allergenName || "")
  const [allergenSeverity, setAllergenSeverity] = useState<AllergenSeverity>(initialData?.severity || "Mild")
  const [allergenSymptoms, setAllergenSymptoms] = useState<string[]>(initialData?.symptoms || [])
  const [allergenLocation, setAllergenLocation] = useState(initialData?.location || "")
  const [allergenDuration, setAllergenDuration] = useState(initialData?.duration || "")
  const [allergenTreatment, setAllergenTreatment] = useState(initialData?.treatment || "")
  const [allergenNotes, setAllergenNotes] = useState(initialData?.notes || "")
  const [allergenTags, setAllergenTags] = useState<string[]>(initialData?.tags || [])

  // Update form when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      setAllergenType(initialData.allergenType || "Pollen")
      setAllergenName(initialData.allergenName || "")
      setAllergenSeverity(initialData.severity || "Mild")
      setAllergenSymptoms(initialData.symptoms || [])
      setAllergenLocation(initialData.location || "")
      setAllergenDuration(initialData.duration || "")
      setAllergenTreatment(initialData.treatment || "")
      setAllergenNotes(initialData.notes || "")
      setAllergenTags(initialData.tags || [])
    }
  }, [initialData])

  const resetForm = () => {
    setAllergenType("Pollen")
    setAllergenName("")
    setAllergenSeverity("Mild")
    setAllergenSymptoms([])
    setAllergenLocation("")
    setAllergenDuration("")
    setAllergenTreatment("")
    setAllergenNotes("")
    setAllergenTags([])
  }

  const handleSave = () => {
    if (!allergenName.trim()) {
      alert("Please enter an allergen name")
      return
    }

    onSave({
      allergenType,
      allergenName: allergenName.trim(),
      severity: allergenSeverity,
      symptoms: allergenSymptoms,
      location: allergenLocation.trim(),
      duration: allergenDuration.trim(),
      treatment: allergenTreatment.trim(),
      notes: allergenNotes.trim(),
      tags: allergenTags
    })

    resetForm()
    onClose()
  }

  const handleCancel = () => {
    resetForm()
    onClose()
  }

  const toggleSymptom = (symptom: string) => {
    if (allergenSymptoms.includes(symptom)) {
      setAllergenSymptoms(allergenSymptoms.filter(s => s !== symptom))
    } else {
      setAllergenSymptoms([...allergenSymptoms, symptom])
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TreePine className="h-5 w-5 text-green-500" />
            {isEditing ? 'Edit Environmental Allergen Entry' : 'Add Environmental Allergen Entry'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update your environmental allergen reaction' : 'Track environmental allergen reactions and symptoms'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Allergen Type */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Allergen Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALLERGEN_TYPES.map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={allergenType === type ? "default" : "outline"}
                  onClick={() => setAllergenType(type)}
                  className="justify-start text-sm"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* Allergen Name */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Specific Allergen</Label>
            <Input
              value={allergenName}
              onChange={(e) => setAllergenName(e.target.value)}
              placeholder="e.g., Oak pollen, Cat dander, Cigarette smoke..."
            />
          </div>

          {/* Severity */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Severity</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALLERGEN_SEVERITIES.map((severity) => (
                <Button
                  key={severity}
                  type="button"
                  variant={allergenSeverity === severity ? "default" : "outline"}
                  onClick={() => setAllergenSeverity(severity)}
                  className="justify-start text-sm"
                  style={{
                    backgroundColor: allergenSeverity === severity ? getSeverityColor(severity) : undefined,
                    borderColor: getSeverityColor(severity)
                  }}
                >
                  {severity}
                </Button>
              ))}
            </div>
          </div>

          {/* Symptoms */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Symptoms</Label>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_SYMPTOMS.map((symptom) => (
                <Badge
                  key={symptom}
                  variant={allergenSymptoms.includes(symptom) ? "default" : "outline"}
                  className="cursor-pointer justify-center py-2"
                  onClick={() => toggleSymptom(symptom)}
                >
                  {symptom}
                </Badge>
              ))}
            </div>
            {allergenSymptoms.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Selected: {allergenSymptoms.join(", ")}
              </div>
            )}
          </div>

          {/* Location & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label className="text-base font-medium">Location</Label>
              <Input
                value={allergenLocation}
                onChange={(e) => setAllergenLocation(e.target.value)}
                placeholder="Where did exposure occur?"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-base font-medium">Duration</Label>
              <Input
                value={allergenDuration}
                onChange={(e) => setAllergenDuration(e.target.value)}
                placeholder="How long did symptoms last?"
              />
            </div>
          </div>

          {/* Treatment */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Treatment</Label>
            <Input
              value={allergenTreatment}
              onChange={(e) => setAllergenTreatment(e.target.value)}
              placeholder="What helped? (medications, removal from area, etc.)"
            />
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Notes</Label>
            <Textarea
              value={allergenNotes}
              onChange={(e) => setAllergenNotes(e.target.value)}
              placeholder="Additional details about the reaction..."
              className="min-h-[80px]"
            />
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Tags</Label>
            <TagInput
              value={allergenTags}
              onChange={setAllergenTags}
              placeholder="Add tags like 'seasonal', 'indoor', 'outdoor'..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              {isEditing ? 'Update Allergen Entry' : 'Save Allergen Entry'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
