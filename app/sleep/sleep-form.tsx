/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Moon, ChevronDown, ChevronUp } from "lucide-react"
import { SleepEntry } from './sleep-types'
import {
  QUALITY_OPTIONS,
  WAKE_FEELINGS,
  DREAM_TYPES,
  SLEEP_DISRUPTIONS,
  PRE_SLEEP_FACTORS,
  SLEEP_AIDS,
  ENVIRONMENT_ISSUES,
  QualityType,
  WakeFeelingType,
  DreamType,
  DisruptionType,
  PreSleepFactorType,
  SleepAidType,
  EnvironmentIssueType
} from './sleep-constants'

interface SleepFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<SleepEntry, 'id' | 'createdAt' | 'updatedAt'>) => void
  selectedDate: string
  editingEntry?: SleepEntry | null
  isLoading?: boolean
}

export function SleepForm({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  editingEntry = null,
  isLoading = false
}: SleepFormProps) {
  // Core sleep data
  const [hoursSlept, setHoursSlept] = useState([7])
  const [quality, setQuality] = useState<QualityType>("Okay")
  const [bedTime, setBedTime] = useState("")
  const [wakeTime, setWakeTime] = useState("")

  // Disruptions
  const [wokeUpMultipleTimes, setWokeUpMultipleTimes] = useState(false)
  const [timesWoken, setTimesWoken] = useState([1])
  const [disruptions, setDisruptions] = useState<DisruptionType[]>(['none'])

  // Wake feeling & dreams
  const [wakeFeeling, setWakeFeeling] = useState<WakeFeelingType>('okay')
  const [dreamType, setDreamType] = useState<DreamType>('none')
  const [dreamNotes, setDreamNotes] = useState("")

  // Pre-sleep factors
  const [preSleepFactors, setPreSleepFactors] = useState<PreSleepFactorType[]>([])

  // Sleep aids
  const [sleepAids, setSleepAids] = useState<SleepAidType[]>(['none'])

  // Environment
  const [environmentIssues, setEnvironmentIssues] = useState<EnvironmentIssueType[]>(['none'])

  // Naps
  const [hadNap, setHadNap] = useState(false)
  const [napDuration, setNapDuration] = useState([30])

  // Notes and tags
  const [notes, setNotes] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")

  // Collapsible sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    disruptions: false,
    wakeFeeling: false,
    dreams: false,
    preSleep: false,
    aids: false,
    environment: false,
    naps: false
  })

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Reset or populate form
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    } else if (editingEntry) {
      populateFromEntry(editingEntry)
    }
  }, [isOpen, editingEntry])

  const resetForm = () => {
    setHoursSlept([7])
    setQuality("Okay")
    setBedTime("")
    setWakeTime("")
    setWokeUpMultipleTimes(false)
    setTimesWoken([1])
    setDisruptions(['none'])
    setWakeFeeling('okay')
    setDreamType('none')
    setDreamNotes("")
    setPreSleepFactors([])
    setSleepAids(['none'])
    setEnvironmentIssues(['none'])
    setHadNap(false)
    setNapDuration([30])
    setNotes("")
    setTags([])
    setTagInput("")
    setOpenSections({
      disruptions: false,
      wakeFeeling: false,
      dreams: false,
      preSleep: false,
      aids: false,
      environment: false,
      naps: false
    })
  }

  const populateFromEntry = (entry: SleepEntry) => {
    setHoursSlept([entry.hoursSlept])
    setQuality(entry.quality)
    setBedTime(entry.bedTime || "")
    setWakeTime(entry.wakeTime || "")
    setWokeUpMultipleTimes(entry.wokeUpMultipleTimes)
    setTimesWoken([entry.timesWoken || 1])
    setDisruptions(entry.disruptions || ['none'])
    setWakeFeeling(entry.wakeFeeling || 'okay')
    setDreamType(entry.dreamType || 'none')
    setDreamNotes(entry.dreamNotes || "")
    setPreSleepFactors(entry.preSleepFactors || [])
    setSleepAids(entry.sleepAids || ['none'])
    setEnvironmentIssues(entry.environmentIssues || ['none'])
    setHadNap(entry.hadNap || false)
    setNapDuration([entry.napDuration || 30])
    setNotes(entry.notes)
    setTags(entry.tags || [])
  }

  const handleSubmit = () => {
    onSave({
      date: selectedDate,
      hoursSlept: hoursSlept[0],
      quality,
      bedTime: bedTime || undefined,
      wakeTime: wakeTime || undefined,
      wokeUpMultipleTimes,
      timesWoken: wokeUpMultipleTimes ? timesWoken[0] : undefined,
      disruptions,
      wakeFeeling,
      dreamType,
      dreamNotes: dreamNotes || undefined,
      preSleepFactors,
      sleepAids,
      environmentIssues,
      hadNap,
      napDuration: hadNap ? napDuration[0] : undefined,
      notes,
      tags
    })
  }

  const toggleArrayItem = <T extends string>(array: T[], item: T, setArray: (arr: T[]) => void) => {
    if (item === 'none' as T) {
      setArray([item])
    } else if (array.includes(item)) {
      const newArray = array.filter(i => i !== item)
      setArray(newArray.length === 0 ? ['none' as T] : newArray)
    } else {
      setArray([...array.filter(i => i !== 'none'), item])
    }
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

  const getSelectedCount = (array: string[]) => {
    if (array.length === 1 && array[0] === 'none') return 0
    return array.length
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Log Your Sleep
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Hours Slept Slider */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Hours Slept: {hoursSlept[0]} hours
            </Label>
            <Slider
              value={hoursSlept}
              onValueChange={setHoursSlept}
              max={14}
              min={0}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>0h</span>
              <span>7h</span>
              <span>14h</span>
            </div>
          </div>

          {/* Sleep Quality */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Sleep Quality</Label>
            <div className="grid grid-cols-2 gap-3">
              {QUALITY_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={quality === option.value ? "default" : "outline"}
                  onClick={() => setQuality(option.value)}
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">{option.emoji}</span>
                  <div className="text-center">
                    <div className="font-medium">{option.value}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Sleep Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bedTime">Bedtime</Label>
              <Input
                id="bedTime"
                type="time"
                value={bedTime}
                onChange={(e) => setBedTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wakeTime">Wake Time</Label>
              <Input
                id="wakeTime"
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
              />
            </div>
          </div>

          {/* Wake Feeling - Collapsible */}
          <Collapsible open={openSections.wakeFeeling} onOpenChange={() => toggleSection('wakeFeeling')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  How did you feel when you woke up?
                  {wakeFeeling !== 'okay' && (
                    <Badge variant="secondary">{WAKE_FEELINGS.find(w => w.value === wakeFeeling)?.label}</Badge>
                  )}
                </span>
                {openSections.wakeFeeling ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {WAKE_FEELINGS.map((option) => (
                  <Button
                    key={option.value}
                    variant={wakeFeeling === option.value ? "default" : "outline"}
                    onClick={() => setWakeFeeling(option.value)}
                    className="h-auto p-3 flex flex-col items-center gap-1"
                    size="sm"
                  >
                    <span className="text-xl">{option.emoji}</span>
                    <span className="text-xs">{option.label}</span>
                  </Button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Sleep Disruptions - Collapsible */}
          <Collapsible open={openSections.disruptions} onOpenChange={() => toggleSection('disruptions')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  Woke up during the night?
                  {getSelectedCount(disruptions) > 0 && (
                    <Badge variant="secondary">{getSelectedCount(disruptions)} selected</Badge>
                  )}
                </span>
                {openSections.disruptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Woke up multiple times?</Label>
                <Switch
                  checked={wokeUpMultipleTimes}
                  onCheckedChange={setWokeUpMultipleTimes}
                />
              </div>

              {wokeUpMultipleTimes && (
                <div className="space-y-2">
                  <Label>Times woken: {timesWoken[0]}</Label>
                  <Slider
                    value={timesWoken}
                    onValueChange={setTimesWoken}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>
              )}

              <Label className="text-sm font-medium">Why did you wake up?</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SLEEP_DISRUPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={disruptions.includes(option.value) ? "default" : "outline"}
                    onClick={() => toggleArrayItem(disruptions, option.value, setDisruptions)}
                    className="h-auto p-2 flex items-center gap-2 justify-start"
                    size="sm"
                  >
                    <span>{option.emoji}</span>
                    <span className="text-xs">{option.label}</span>
                  </Button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Dreams - Collapsible */}
          <Collapsible open={openSections.dreams} onOpenChange={() => toggleSection('dreams')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  Dreams
                  {dreamType !== 'none' && (
                    <Badge variant="secondary">{DREAM_TYPES.find(d => d.value === dreamType)?.label}</Badge>
                  )}
                </span>
                {openSections.dreams ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DREAM_TYPES.map((option) => (
                  <Button
                    key={option.value}
                    variant={dreamType === option.value ? "default" : "outline"}
                    onClick={() => setDreamType(option.value)}
                    className="h-auto p-2 flex items-center gap-2 justify-start"
                    size="sm"
                  >
                    <span>{option.emoji}</span>
                    <span className="text-xs">{option.label}</span>
                  </Button>
                ))}
              </div>
              {dreamType !== 'none' && (
                <Textarea
                  placeholder="Describe your dreams (optional)..."
                  value={dreamNotes}
                  onChange={(e) => setDreamNotes(e.target.value)}
                  rows={2}
                />
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Pre-Sleep Factors - Collapsible */}
          <Collapsible open={openSections.preSleep} onOpenChange={() => toggleSection('preSleep')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  Pre-sleep factors
                  {preSleepFactors.length > 0 && (
                    <Badge variant="secondary">{preSleepFactors.length} selected</Badge>
                  )}
                </span>
                {openSections.preSleep ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRE_SLEEP_FACTORS.map((option) => (
                  <Button
                    key={option.value}
                    variant={preSleepFactors.includes(option.value) ? "default" : "outline"}
                    onClick={() => {
                      if (preSleepFactors.includes(option.value)) {
                        setPreSleepFactors(preSleepFactors.filter(f => f !== option.value))
                      } else {
                        setPreSleepFactors([...preSleepFactors, option.value])
                      }
                    }}
                    className="h-auto p-2 flex items-center gap-2 justify-start"
                    size="sm"
                  >
                    <span>{option.emoji}</span>
                    <span className="text-xs">{option.label}</span>
                  </Button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Sleep Aids - Collapsible */}
          <Collapsible open={openSections.aids} onOpenChange={() => toggleSection('aids')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  Sleep aids used
                  {getSelectedCount(sleepAids) > 0 && (
                    <Badge variant="secondary">{getSelectedCount(sleepAids)} selected</Badge>
                  )}
                </span>
                {openSections.aids ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SLEEP_AIDS.map((option) => (
                  <Button
                    key={option.value}
                    variant={sleepAids.includes(option.value) ? "default" : "outline"}
                    onClick={() => toggleArrayItem(sleepAids, option.value, setSleepAids)}
                    className="h-auto p-2 flex items-center gap-2 justify-start"
                    size="sm"
                  >
                    <span>{option.emoji}</span>
                    <span className="text-xs">{option.label}</span>
                  </Button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Environment Issues - Collapsible */}
          <Collapsible open={openSections.environment} onOpenChange={() => toggleSection('environment')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  Environment issues
                  {getSelectedCount(environmentIssues) > 0 && (
                    <Badge variant="secondary">{getSelectedCount(environmentIssues)} selected</Badge>
                  )}
                </span>
                {openSections.environment ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ENVIRONMENT_ISSUES.map((option) => (
                  <Button
                    key={option.value}
                    variant={environmentIssues.includes(option.value) ? "default" : "outline"}
                    onClick={() => toggleArrayItem(environmentIssues, option.value, setEnvironmentIssues)}
                    className="h-auto p-2 flex items-center gap-2 justify-start"
                    size="sm"
                  >
                    <span>{option.emoji}</span>
                    <span className="text-xs">{option.label}</span>
                  </Button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Naps - Collapsible */}
          <Collapsible open={openSections.naps} onOpenChange={() => toggleSection('naps')}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  Napped during the day?
                  {hadNap && (
                    <Badge variant="secondary">{napDuration[0]} min nap</Badge>
                  )}
                </span>
                {openSections.naps ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Had a nap?</Label>
                <Switch
                  checked={hadNap}
                  onCheckedChange={setHadNap}
                />
              </div>
              {hadNap && (
                <div className="space-y-2">
                  <Label>Nap duration: {napDuration[0]} minutes</Label>
                  <Slider
                    value={napDuration}
                    onValueChange={setNapDuration}
                    min={5}
                    max={180}
                    step={5}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5 min</span>
                    <span>1 hr</span>
                    <span>3 hrs</span>
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="How did you sleep? Any observations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Tags (optional)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1"
              />
              <Button onClick={addTag} variant="outline" size="sm">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-xs hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSubmit} className="flex-1" disabled={isLoading}>
              <Moon className="h-4 w-4 mr-2" />
              {editingEntry ? 'Update Sleep Entry' : 'Save Sleep Entry'}
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
