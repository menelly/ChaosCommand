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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Shield, AlertTriangle, Phone, Plus, X } from 'lucide-react'
import { TagInput } from "@/components/tag-input"
import { SEVERITY_LEVELS, COMMON_SYMPTOMS } from './food-allergens-tracker'

interface AllergenFormProps {
  formData: {
    name: string
    severity: 'Mild' | 'Moderate' | 'Severe' | 'Life-threatening'
    diagnosedBy: string
    diagnosedDate: string
    commonSymptoms: string[]
    emergencyPlan: string
    avoidanceNotes: string
    crossReactivity: string[]
    tags: string[]
    isActive: boolean
  }
  updateFormData: (field: string, value: any) => void
  toggleSymptom: (symptom: string) => void
  onSubmit: () => void
  onCancel: () => void
  submitLabel: string
}

export function AllergenForm({ 
  formData, 
  updateFormData, 
  toggleSymptom, 
  onSubmit, 
  onCancel, 
  submitLabel 
}: AllergenFormProps) {
  const [customSymptom, setCustomSymptom] = useState('')
  const [customCrossReactivity, setCustomCrossReactivity] = useState('')

  const addCustomSymptom = () => {
    if (customSymptom.trim() && !formData.commonSymptoms.includes(customSymptom.trim())) {
      updateFormData('commonSymptoms', [...formData.commonSymptoms, customSymptom.trim()])
      setCustomSymptom('')
    }
  }

  const addCrossReactivity = () => {
    if (customCrossReactivity.trim() && !formData.crossReactivity.includes(customCrossReactivity.trim())) {
      updateFormData('crossReactivity', [...formData.crossReactivity, customCrossReactivity.trim()])
      setCustomCrossReactivity('')
    }
  }

  const removeCrossReactivity = (item: string) => {
    updateFormData('crossReactivity', formData.crossReactivity.filter(cr => cr !== item))
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Allergen Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                placeholder="e.g., Cinnamon, Peanuts, Shellfish"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Severity Level *</Label>
              <RadioGroup
                value={formData.severity}
                onValueChange={(value) => updateFormData('severity', value)}
                className="flex flex-wrap gap-4"
              >
                {SEVERITY_LEVELS.map((level) => (
                  <div key={level} className="flex items-center space-x-2">
                    <RadioGroupItem value={level} id={`severity-${level}`} />
                    <Label htmlFor={`severity-${level}`} className="text-sm">{level}</Label>
                  </div>
                ))}
              </RadioGroup>
              <p className="text-sm text-muted-foreground">
                {getSeverityGoblinism(formData.severity)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="diagnosedBy">Diagnosed By</Label>
              <Input
                id="diagnosedBy"
                value={formData.diagnosedBy}
                onChange={(e) => updateFormData('diagnosedBy', e.target.value)}
                placeholder="e.g., Dr. Smith, Allergist"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="diagnosedDate">Diagnosis Date</Label>
              <Input
                id="diagnosedDate"
                type="date"
                value={formData.diagnosedDate}
                onChange={(e) => updateFormData('diagnosedDate', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => updateFormData('isActive', checked)}
            />
            <Label htmlFor="isActive" className="text-sm">
              This allergen is currently active
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Symptoms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Common Symptoms
          </CardTitle>
          <CardDescription>
            Select the symptoms you typically experience with this allergen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {COMMON_SYMPTOMS.map((symptom) => (
              <div key={symptom} className="flex items-center space-x-2">
                <Checkbox
                  id={`symptom-${symptom}`}
                  checked={formData.commonSymptoms.includes(symptom)}
                  onCheckedChange={() => toggleSymptom(symptom)}
                />
                <Label htmlFor={`symptom-${symptom}`} className="text-sm">{symptom}</Label>
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

          {formData.commonSymptoms.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Symptoms:</Label>
              <div className="flex flex-wrap gap-2">
                {formData.commonSymptoms.map((symptom) => (
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

      {/* Emergency & Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Emergency Plan & Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emergencyPlan">Emergency Action Plan</Label>
            <Textarea
              id="emergencyPlan"
              value={formData.emergencyPlan}
              onChange={(e) => updateFormData('emergencyPlan', e.target.value)}
              placeholder="What to do if exposed: medications to take, who to call, when to use EpiPen, etc."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avoidanceNotes">Avoidance Notes</Label>
            <Textarea
              id="avoidanceNotes"
              value={formData.avoidanceNotes}
              onChange={(e) => updateFormData('avoidanceNotes', e.target.value)}
              placeholder="Foods/products to avoid, hidden sources, safe alternatives, etc."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Cross-Reactivity</Label>
            <div className="flex gap-2">
              <Input
                value={customCrossReactivity}
                onChange={(e) => setCustomCrossReactivity(e.target.value)}
                placeholder="Add foods that may cross-react..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCrossReactivity())}
              />
              <Button type="button" onClick={addCrossReactivity} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {formData.crossReactivity.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.crossReactivity.map((item) => (
                  <Badge key={item} variant="outline" className="text-xs">
                    {item}
                    <button
                      type="button"
                      onClick={() => removeCrossReactivity(item)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <TagInput
              value={formData.tags}
              onChange={(tags: string[]) => updateFormData('tags', tags)}
              placeholder="Add tags for organization..."
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
          disabled={!formData.name.trim()}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
