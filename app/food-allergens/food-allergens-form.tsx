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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Shield, AlertTriangle, Phone, Pill, Clock, Plus, X } from 'lucide-react'
import { TagInput } from "@/components/tag-input"
import { useDailyData, CATEGORIES } from '@/lib/database'
import {
  FoodAllergenEntry,
  KnownAllergen,
  SEVERITY_LEVELS,
  COMMON_SYMPTOMS,
  COMMON_TREATMENTS,
  EXPOSURE_SOURCES
} from './food-allergens-tracker'

interface FoodAllergensFormProps {
  initialData?: FoodAllergenEntry | null
  onSubmit: (data: Omit<FoodAllergenEntry, 'id' | 'timestamp'>) => void
  onCancel: () => void
}

export function FoodAllergensForm({ initialData, onSubmit, onCancel }: FoodAllergensFormProps) {
  const [formData, setFormData] = useState({
    allergenName: '',
    reactionSeverity: 'Mild' as 'Mild' | 'Moderate' | 'Severe' | 'Life-threatening',
    symptoms: [] as string[],
    epipenUsed: false,
    otherMedsUsed: '',
    exposureSource: '',
    reactionTime: '',
    recoveryTime: '',
    emergencyContacted: false,
    emergencyNotes: '',
    treatmentGiven: [] as string[],
    notes: '',
    tags: [] as string[]
  })

  const [customSymptom, setCustomSymptom] = useState('')
  const [customTreatment, setCustomTreatment] = useState('')
  const [customExposureSource, setCustomExposureSource] = useState('')
  const [knownAllergens, setKnownAllergens] = useState<KnownAllergen[]>([])
  const [customAllergenName, setCustomAllergenName] = useState('')

  const { getSpecificData } = useDailyData()

  // Load known allergens
  useEffect(() => {
    loadKnownAllergens()
  }, [])

  // Load initial data if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        allergenName: initialData.allergenName || '',
        reactionSeverity: initialData.reactionSeverity || 'Mild',
        symptoms: initialData.symptoms || [],
        epipenUsed: initialData.epipenUsed || false,
        otherMedsUsed: initialData.otherMedsUsed || '',
        exposureSource: initialData.exposureSource || '',
        reactionTime: initialData.reactionTime || '',
        recoveryTime: initialData.recoveryTime || '',
        emergencyContacted: initialData.emergencyContacted || false,
        emergencyNotes: initialData.emergencyNotes || '',
        treatmentGiven: initialData.treatmentGiven || [],
        notes: initialData.notes || '',
        tags: initialData.tags || []
      })
    }
  }, [initialData])

  const loadKnownAllergens = async () => {
    try {
      const data = await getSpecificData('allergen-registry', CATEGORIES.USER, 'known-allergens')
      if (data?.content?.allergens) {
        setKnownAllergens(data.content.allergens.filter((a: KnownAllergen) => a.isActive))
      }
    } catch (error) {
      console.error('Failed to load known allergens:', error)
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleSymptom = (symptom: string) => {
    const symptoms = formData.symptoms.includes(symptom)
      ? formData.symptoms.filter(s => s !== symptom)
      : [...formData.symptoms, symptom]
    updateFormData('symptoms', symptoms)
  }

  const toggleTreatment = (treatment: string) => {
    const treatments = formData.treatmentGiven.includes(treatment)
      ? formData.treatmentGiven.filter(t => t !== treatment)
      : [...formData.treatmentGiven, treatment]
    updateFormData('treatmentGiven', treatments)
  }

  const addCustomSymptom = () => {
    if (customSymptom.trim() && !formData.symptoms.includes(customSymptom.trim())) {
      updateFormData('symptoms', [...formData.symptoms, customSymptom.trim()])
      setCustomSymptom('')
    }
  }

  const addCustomTreatment = () => {
    if (customTreatment.trim() && !formData.treatmentGiven.includes(customTreatment.trim())) {
      updateFormData('treatmentGiven', [...formData.treatmentGiven, customTreatment.trim()])
      setCustomTreatment('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Use custom exposure source if provided
    const finalExposureSource = customExposureSource.trim() || formData.exposureSource
    
    onSubmit({
      ...formData,
      exposureSource: finalExposureSource
    })
  }

  const getSeverityGoblinism = (severity: string) => {
    const goblinisms: { [key: string]: string } = {
      "Mild": "😌 Mild chaos - your body is being politely dramatic",
      "Moderate": "😬 Moderate mayhem - the immune goblins are having opinions",
      "Severe": "🚨 Severe shenanigans - the goblins are VERY upset about this",
      "Life-threatening": "💀 GOBLIN RED ALERT - this is serious business!"
    }
    return goblinisms[severity] || "🧙‍♂️ Mystery allergen detected"
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Basic Reaction Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="allergenName">Food/Allergen Name *</Label>
              {knownAllergens.length > 0 ? (
                <div className="space-y-2">
                  <Select value={formData.allergenName} onValueChange={(value) => updateFormData('allergenName', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select known allergen or type custom..." />
                    </SelectTrigger>
                    <SelectContent>
                      {knownAllergens.map((allergen) => (
                        <SelectItem key={allergen.id} value={allergen.name}>
                          {allergen.name} ({allergen.severity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input
                      value={customAllergenName}
                      onChange={(e) => setCustomAllergenName(e.target.value)}
                      placeholder="Or type a different allergen..."
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (customAllergenName.trim()) {
                          updateFormData('allergenName', customAllergenName.trim())
                          setCustomAllergenName('')
                        }
                      }}
                      size="sm"
                    >
                      Use
                    </Button>
                  </div>
                </div>
              ) : (
                <Input
                  id="allergenName"
                  value={formData.allergenName}
                  onChange={(e) => updateFormData('allergenName', e.target.value)}
                  placeholder="e.g., Peanuts, Shellfish, Dairy"
                  required
                />
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Reaction Severity *</Label>
              <RadioGroup
                value={formData.reactionSeverity}
                onValueChange={(value) => updateFormData('reactionSeverity', value)}
                className="flex flex-wrap gap-4"
              >
                {SEVERITY_LEVELS.map((level) => (
                  <div key={level} className="flex items-center space-x-2">
                    <RadioGroupItem value={level} id={level} />
                    <Label htmlFor={level} className="text-sm">{level}</Label>
                  </div>
                ))}
              </RadioGroup>
              <p className="text-sm text-muted-foreground">
                {getSeverityGoblinism(formData.reactionSeverity)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Exposure Source</Label>
              <Select value={formData.exposureSource} onValueChange={(value) => updateFormData('exposureSource', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="How were you exposed?" />
                </SelectTrigger>
                <SelectContent>
                  {EXPOSURE_SOURCES.map((source) => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  value={customExposureSource}
                  onChange={(e) => setCustomExposureSource(e.target.value)}
                  placeholder="Or describe custom source..."
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reactionTime">Time to Reaction</Label>
              <Input
                id="reactionTime"
                value={formData.reactionTime}
                onChange={(e) => updateFormData('reactionTime', e.target.value)}
                placeholder="e.g., 5 minutes, 2 hours"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Symptoms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Symptoms Experienced
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {COMMON_SYMPTOMS.map((symptom) => (
              <div key={symptom} className="flex items-center space-x-2">
                <Checkbox
                  id={symptom}
                  checked={formData.symptoms.includes(symptom)}
                  onCheckedChange={() => toggleSymptom(symptom)}
                />
                <Label htmlFor={symptom} className="text-sm">{symptom}</Label>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Input
              value={customSymptom}
              onChange={(e) => setCustomSymptom(e.target.value)}
              placeholder="Add custom symptom..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSymptom())}
            />
            <Button type="button" onClick={addCustomSymptom} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {formData.symptoms.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Symptoms:</Label>
              <div className="flex flex-wrap gap-2">
                {formData.symptoms.map((symptom) => (
                  <Badge key={symptom} variant="secondary" className="text-xs">
                    {symptom}
                    <button
                      type="button"
                      onClick={() => toggleSymptom(symptom)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Treatment & Emergency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Treatment & Emergency Response
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="epipenUsed"
                  checked={formData.epipenUsed}
                  onCheckedChange={(checked) => updateFormData('epipenUsed', checked)}
                />
                <Label htmlFor="epipenUsed" className="text-sm font-medium">
                  EpiPen/Epinephrine Used
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emergencyContacted"
                  checked={formData.emergencyContacted}
                  onCheckedChange={(checked) => updateFormData('emergencyContacted', checked)}
                />
                <Label htmlFor="emergencyContacted" className="text-sm font-medium">
                  Emergency Services Contacted
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="otherMedsUsed">Other Medications Used</Label>
              <Input
                id="otherMedsUsed"
                value={formData.otherMedsUsed}
                onChange={(e) => updateFormData('otherMedsUsed', e.target.value)}
                placeholder="e.g., Benadryl 25mg, Inhaler"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Treatment Given</Label>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {COMMON_TREATMENTS.map((treatment) => (
                <div key={treatment} className="flex items-center space-x-2">
                  <Checkbox
                    id={treatment}
                    checked={formData.treatmentGiven.includes(treatment)}
                    onCheckedChange={() => toggleTreatment(treatment)}
                  />
                  <Label htmlFor={treatment} className="text-sm">{treatment}</Label>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Input
                value={customTreatment}
                onChange={(e) => setCustomTreatment(e.target.value)}
                placeholder="Add custom treatment..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTreatment())}
              />
              <Button type="button" onClick={addCustomTreatment} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {formData.emergencyContacted && (
            <div className="space-y-2">
              <Label htmlFor="emergencyNotes">Emergency Response Notes</Label>
              <Textarea
                id="emergencyNotes"
                value={formData.emergencyNotes}
                onChange={(e) => updateFormData('emergencyNotes', e.target.value)}
                placeholder="Details about emergency response, hospital visit, etc."
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Additional Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recoveryTime">Recovery Time</Label>
              <Input
                id="recoveryTime"
                value={formData.recoveryTime}
                onChange={(e) => updateFormData('recoveryTime', e.target.value)}
                placeholder="e.g., 30 minutes, 2 hours, still recovering"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateFormData('notes', e.target.value)}
              placeholder="Any additional details about the reaction, what helped, what to avoid next time..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <TagInput
              value={formData.tags}
              onChange={(tags: string[]) => updateFormData('tags', tags)}
              placeholder="Add tags for easier searching..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="default"
          disabled={!formData.allergenName.trim()}
        >
          {initialData ? 'Update Reaction' : 'Save Reaction'}
        </Button>
      </div>
    </form>
  )
}
