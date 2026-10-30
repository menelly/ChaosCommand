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
"use client";
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  Plus,
  X,
  Edit,
  Save,
  Phone,
  Users,
  Home,
  Heart,
  Target,
  AlertTriangle,
  Star,
  MapPin,
  ExternalLink
} from 'lucide-react'
import { SafetyPlan } from './crisis-types'
import { useDailyData, CATEGORIES } from '@/lib/database'
import { useToast } from '@/hooks/use-toast'
import { formatPhoneNumber } from '@/lib/utils/medication-utils'
import { format } from 'date-fns'
import { isDemoSandbox } from '@/lib/pwa-mode'
import { TapToCall } from '@/components/tap-to-reach'
import {
  createDefaultSafetyPlan,
  normalizeSafetyPlan,
  pickSafetyPlanRecord,
  commitPendingInputs,
  missingAfterSave,
} from '@/lib/services/safety-plan'

/** 🫥 What an empty section says in view mode, instead of a blank box that looks broken. */
function NothingYet({ what }: { what: string }) {
  return (
    <p className="text-sm text-muted-foreground italic mt-2">
      No {what} added yet. Tap <span className="font-medium not-italic">Edit Plan</span> to add some.
    </p>
  )
}

interface SafetyPlanManagerProps {
  refreshTrigger: number
}

// Helper function to create map links
const createMapLink = (address: string): string => {
  if (!address) return ''
  const encodedAddress = encodeURIComponent(address)
  return `https://maps.google.com/maps?q=${encodedAddress}`
}

export function SafetyPlanManager({ refreshTrigger }: SafetyPlanManagerProps) {
  const [safetyPlan, setSafetyPlan] = useState<SafetyPlan | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Form state for editing
  const [warningSignsInput, setWarningSignsInput] = useState('')
  const [copingStrategiesInput, setCopingStrategiesInput] = useState('')
  const [reasonsToLiveInput, setReasonsToLiveInput] = useState('')
  const [safeSpacesInput, setSafeSpacesInput] = useState('')
  const [itemsToRemoveInput, setItemsToRemoveInput] = useState('')
  const [environmentChangesInput, setEnvironmentChangesInput] = useState('')
  const [newCrisisContact, setNewCrisisContact] = useState({ name: '', phone: '', available: '', notes: '', address: '' })
  const [newEmergencyContact, setNewEmergencyContact] = useState({ name: '', relationship: '', phone: '', notes: '', address: '' })

  const { getAllCategoryData, getSpecificData, saveData } = useDailyData()
  const { toast } = useToast()

  // 📅 The date the plan's ONE record lives under. The plan isn't a daily log: saving it
  // under "today" every time made a new row per day, and the loader then picked the
  // oldest. So once a plan exists we keep writing to its row. (CHA-771)
  const [planDate, setPlanDate] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // 🧷 A reload while someone is mid-edit would swap their unsaved additions for the
  // stored copy. Read through a ref so the loader can see editing without re-running.
  const isEditingRef = React.useRef(isEditing)
  useEffect(() => { isEditingRef.current = isEditing }, [isEditing])

  // Load safety plan
  useEffect(() => {
    const loadSafetyPlan = async () => {
      if (isEditingRef.current) return
      try {
        setIsLoading(true)
        const data = await getAllCategoryData(CATEGORIES.TRACKER)
        const record = pickSafetyPlanRecord(data)
        if (record) {
          setSafetyPlan(normalizeSafetyPlan(record.content, new Date().toISOString()))
          setPlanDate(record.date)
        } else {
          setSafetyPlan(createDefaultSafetyPlan(new Date().toISOString()))
          setPlanDate(null)
        }
      } catch (error) {
        console.error('Error loading safety plan:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSafetyPlan()
  }, [refreshTrigger, getAllCategoryData])

  /**
   * 💾 Save, then PROVE it saved. The old version toasted "saved" after writing a plan
   * that didn't contain what had been typed (CHA-771). Now:
   *   1. anything still typed in an input gets added, the way "+" would;
   *   2. a half-finished contact stops the save and says what's missing;
   *   3. after the write we read the row back, and only a read-back that contains
   *      everything we meant to store earns the "saved" toast.
   */
  const saveSafetyPlan = async (updatedPlan: SafetyPlan) => {
    if (isSaving) return
    const { plan: withPending, problems } = commitPendingInputs(updatedPlan, {
      lists: {
        warningSignsPersonal: warningSignsInput,
        copingStrategiesAlone: copingStrategiesInput,
        reasonsToLive: reasonsToLiveInput,
        safeSpaces: safeSpacesInput,
      },
      emergencyContact: newEmergencyContact,
      crisisContact: newCrisisContact,
    })
    if (problems.length > 0) {
      toast({ title: "Not saved yet", description: problems.join(' '), variant: "destructive" })
      return
    }

    if (isDemoSandbox()) {
      setSafetyPlan(withPending)
      setIsEditing(false)
      toast({ title: "Demo mode", description: "The demo never saves anything, so this plan disappears when you leave." })
      return
    }

    setIsSaving(true)
    try {
      const planToSave = { ...withPending, updatedAt: new Date().toISOString() }
      const date = planDate || format(new Date(), 'yyyy-MM-dd') // LOCAL date, not UTC

      await saveData(date, CATEGORIES.TRACKER, 'safety-plan', planToSave, ['safety-plan', 'crisis-support'])

      // 🔍 Read it back. The toast describes the STORAGE, not our intentions.
      const back = await getSpecificData(date, CATEGORIES.TRACKER, 'safety-plan')
      const stored = back ? normalizeSafetyPlan(back.content, planToSave.updatedAt) : null
      const missing = missingAfterSave(planToSave, stored)
      if (missing.length > 0) {
        // Keep them in edit mode with everything still on screen, so nothing is lost.
        setSafetyPlan(withPending)
        toast({
          title: "Your safety plan did NOT fully save",
          description: `Missing after saving: ${missing.join(', ')}. Everything you typed is still here; please try Save again.`,
          variant: "destructive",
        })
        return
      }

      setSafetyPlan(stored!)
      setPlanDate(date)
      setWarningSignsInput('')
      setCopingStrategiesInput('')
      setReasonsToLiveInput('')
      setSafeSpacesInput('')
      setNewCrisisContact({ name: '', phone: '', available: '', notes: '', address: '' })
      setNewEmergencyContact({ name: '', relationship: '', phone: '', notes: '', address: '' })
      setIsEditing(false)

      toast({
        title: "Safety plan updated 💜",
        description: "Your safety plan has been saved. You're taking great care of yourself! 🛡️✨"
      })
    } catch (error) {
      console.error('Error saving safety plan:', error)
      setSafetyPlan(withPending)
      toast({
        title: "Error saving safety plan",
        description: "Nothing was lost from the screen. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const addToArray = (value: string, array: string[], setter: (arr: string[]) => void) => {
    if (value.trim() && !array.includes(value.trim())) {
      setter([...array, value.trim()])
    }
  }

  const removeFromArray = (value: string, array: string[], setter: (arr: string[]) => void) => {
    setter(array.filter(item => item !== value))
  }

  const addCrisisContact = () => {
    if (newCrisisContact.name && newCrisisContact.phone && safetyPlan) {
      const updatedPlan = {
        ...safetyPlan,
        crisisHotlines: [...safetyPlan.crisisHotlines, { ...newCrisisContact }]
      }
      setSafetyPlan(updatedPlan)
      setNewCrisisContact({ name: '', phone: '', available: '', notes: '', address: '' })
    }
  }

  const addEmergencyContact = () => {
    if (newEmergencyContact.name && newEmergencyContact.phone && safetyPlan) {
      const updatedPlan = {
        ...safetyPlan,
        emergencyContacts: [...safetyPlan.emergencyContacts, { ...newEmergencyContact }]
      }
      setSafetyPlan(updatedPlan)
      setNewEmergencyContact({ name: '', relationship: '', phone: '', notes: '', address: '' })
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-2xl mb-2">🛡️</div>
            <p>Loading your safety plan...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!safetyPlan) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="text-6xl">🛡️</div>
            <div>
              <h3 className="text-lg font-medium">Create Your Safety Plan</h3>
              <p className="text-muted-foreground">
                A safety plan is your personalized guide for staying safe during crisis moments.
              </p>
            </div>
            <Button onClick={() => setIsEditing(true)}>
              <Shield className="h-4 w-4 mr-2" />
              Create Safety Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Your Personal Safety Plan
            </CardTitle>
            {/* This said "Save Changes" and only LEFT edit mode, writing nothing (CHA-771). */}
            <Button
              variant="outline"
              disabled={isSaving}
              onClick={() => (isEditing ? saveSafetyPlan(safetyPlan) : setIsEditing(true))}
            >
              {isEditing ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Plan
                </>
              )}
            </Button>
          </div>
          <p className="text-muted-foreground">
            Your safety plan is a powerful tool for crisis moments. Keep it updated and accessible. 💜
          </p>
        </CardHeader>
      </Card>
      {/* Warning Signs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Personal Warning Signs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={warningSignsInput}
                  onChange={(e) => setWarningSignsInput(e.target.value)}
                  placeholder="Add warning sign..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addToArray(warningSignsInput, safetyPlan.warningSignsPersonal, (arr) => 
                        setSafetyPlan({...safetyPlan, warningSignsPersonal: arr})
                      )
                      setWarningSignsInput('')
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    addToArray(warningSignsInput, safetyPlan.warningSignsPersonal, (arr) => 
                      setSafetyPlan({...safetyPlan, warningSignsPersonal: arr})
                    )
                    setWarningSignsInput('')
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
          
          <div className="flex flex-wrap gap-2 mt-2">
            {!isEditing && safetyPlan.warningSignsPersonal.length === 0 && <NothingYet what="personal warning signs" />}
            {safetyPlan.warningSignsPersonal.map((sign, index) => (
              <Badge key={index} variant="outline" className="flex items-center gap-1">
                {sign}
                {isEditing && (
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeFromArray(sign, safetyPlan.warningSignsPersonal, (arr) => 
                      setSafetyPlan({...safetyPlan, warningSignsPersonal: arr})
                    )}
                  />
                )}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Coping Strategies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Personal Coping Strategies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={copingStrategiesInput}
                  onChange={(e) => setCopingStrategiesInput(e.target.value)}
                  placeholder="Add coping strategy..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addToArray(copingStrategiesInput, safetyPlan.copingStrategiesAlone, (arr) =>
                        setSafetyPlan({...safetyPlan, copingStrategiesAlone: arr})
                      )
                      setCopingStrategiesInput('')
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    addToArray(copingStrategiesInput, safetyPlan.copingStrategiesAlone, (arr) =>
                      setSafetyPlan({...safetyPlan, copingStrategiesAlone: arr})
                    )
                    setCopingStrategiesInput('')
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
          
          <div className="flex flex-wrap gap-2 mt-2">
            {!isEditing && safetyPlan.copingStrategiesAlone.length === 0 && <NothingYet what="coping strategies" />}
            {safetyPlan.copingStrategiesAlone.map((strategy, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {strategy}
                {isEditing && (
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeFromArray(strategy, safetyPlan.copingStrategiesAlone, (arr) =>
                      setSafetyPlan({...safetyPlan, copingStrategiesAlone: arr})
                    )}
                  />
                )}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Crisis Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-500" />
            Crisis Hotlines & Professional Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing && (
            <div className="space-y-2 mb-4 p-3 border rounded-lg">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Contact name"
                  value={newCrisisContact.name}
                  onChange={(e) => setNewCrisisContact({...newCrisisContact, name: e.target.value})}
                />
                <Input
                  placeholder="Phone number"
                  type="tel"
                  value={newCrisisContact.phone}
                  onChange={(e) => setNewCrisisContact({...newCrisisContact, phone: e.target.value})}
                  className="font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Available hours"
                  value={newCrisisContact.available}
                  onChange={(e) => setNewCrisisContact({...newCrisisContact, available: e.target.value})}
                />
                <Input
                  placeholder="Address (optional)"
                  value={newCrisisContact.address}
                  onChange={(e) => setNewCrisisContact({...newCrisisContact, address: e.target.value})}
                />
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Notes"
                  value={newCrisisContact.notes}
                  onChange={(e) => setNewCrisisContact({...newCrisisContact, notes: e.target.value})}
                />
                <Button size="sm" onClick={addCrisisContact}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {!isEditing && safetyPlan.crisisHotlines.length === 0 && <NothingYet what="crisis lines or professional contacts" />}
            {safetyPlan.crisisHotlines.map((contact, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{contact.name}</div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <TapToCall
                      phone={contact.phone}
                      className="flex items-center gap-1 text-green-600 hover:text-green-700 font-medium cursor-pointer underline underline-offset-2 min-h-11"
                      title={`Call ${contact.name}`}
                    >
                      <Phone className="h-3 w-3" />
                      {formatPhoneNumber(contact.phone)}
                    </TapToCall>
                    {contact.available && (
                      <>
                        <span>•</span>
                        <span>{contact.available}</span>
                      </>
                    )}
                  </div>
                  {contact.address && (
                    <div className="mt-1">
                      <a
                        href={createMapLink(contact.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs cursor-pointer"
                        title="Open in maps"
                      >
                        <MapPin className="h-3 w-3" />
                        {contact.address}
                        <ExternalLink className="h-2 w-2" />
                      </a>
                    </div>
                  )}
                  {contact.notes && (
                    <div className="text-xs text-muted-foreground mt-1">{contact.notes}</div>
                  )}
                </div>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const updated = {
                        ...safetyPlan,
                        crisisHotlines: safetyPlan.crisisHotlines.filter((_, i) => i !== index)
                      }
                      setSafetyPlan(updated)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Emergency Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-500" />
            Personal Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing && (
            <div className="space-y-2 mb-4 p-3 border rounded-lg">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Contact name"
                  value={newEmergencyContact.name}
                  onChange={(e) => setNewEmergencyContact({...newEmergencyContact, name: e.target.value})}
                />
                <Input
                  placeholder="Relationship"
                  value={newEmergencyContact.relationship}
                  onChange={(e) => setNewEmergencyContact({...newEmergencyContact, relationship: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Phone number"
                  type="tel"
                  value={newEmergencyContact.phone}
                  onChange={(e) => setNewEmergencyContact({...newEmergencyContact, phone: e.target.value})}
                  className="font-mono"
                />
                <Input
                  placeholder="Address (optional)"
                  value={newEmergencyContact.address}
                  onChange={(e) => setNewEmergencyContact({...newEmergencyContact, address: e.target.value})}
                />
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Notes"
                  value={newEmergencyContact.notes}
                  onChange={(e) => setNewEmergencyContact({...newEmergencyContact, notes: e.target.value})}
                />
                <Button size="sm" onClick={addEmergencyContact}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {!isEditing && safetyPlan.emergencyContacts.length === 0 && <NothingYet what="personal emergency contacts" />}
            {safetyPlan.emergencyContacts.map((contact, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{contact.name}</div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    {contact.relationship && (
                      <>
                        <span>{contact.relationship}</span>
                        <span>•</span>
                      </>
                    )}
                    <TapToCall
                      phone={contact.phone}
                      className="flex items-center gap-1 text-green-600 hover:text-green-700 font-medium cursor-pointer underline underline-offset-2 min-h-11"
                      title={`Call ${contact.name}`}
                    >
                      <Phone className="h-3 w-3" />
                      {formatPhoneNumber(contact.phone)}
                    </TapToCall>
                  </div>
                  {contact.address && (
                    <div className="mt-1">
                      <a
                        href={createMapLink(contact.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs cursor-pointer"
                        title="Open in maps"
                      >
                        <MapPin className="h-3 w-3" />
                        {contact.address}
                        <ExternalLink className="h-2 w-2" />
                      </a>
                    </div>
                  )}
                  {contact.notes && (
                    <div className="text-xs text-muted-foreground mt-1">{contact.notes}</div>
                  )}
                </div>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const updated = {
                        ...safetyPlan,
                        emergencyContacts: safetyPlan.emergencyContacts.filter((_, i) => i !== index)
                      }
                      setSafetyPlan(updated)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Reasons to Live */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Reasons to Keep Living
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={reasonsToLiveInput}
                  onChange={(e) => setReasonsToLiveInput(e.target.value)}
                  placeholder="Add reason to live..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addToArray(reasonsToLiveInput, safetyPlan.reasonsToLive, (arr) => 
                        setSafetyPlan({...safetyPlan, reasonsToLive: arr})
                      )
                      setReasonsToLiveInput('')
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    addToArray(reasonsToLiveInput, safetyPlan.reasonsToLive, (arr) => 
                      setSafetyPlan({...safetyPlan, reasonsToLive: arr})
                    )
                    setReasonsToLiveInput('')
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
          
          <div className="space-y-2 mt-2">
            {!isEditing && safetyPlan.reasonsToLive.length === 0 && <NothingYet what="reasons to keep living" />}
            {safetyPlan.reasonsToLive.map((reason, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span>{reason}</span>
                </div>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromArray(reason, safetyPlan.reasonsToLive, (arr) => 
                      setSafetyPlan({...safetyPlan, reasonsToLive: arr})
                    )}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Safe Spaces */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-green-500" />
            Safe Spaces & Environment
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={safeSpacesInput}
                  onChange={(e) => setSafeSpacesInput(e.target.value)}
                  placeholder="Add safe space..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addToArray(safeSpacesInput, safetyPlan.safeSpaces, (arr) => 
                        setSafetyPlan({...safetyPlan, safeSpaces: arr})
                      )
                      setSafeSpacesInput('')
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    addToArray(safeSpacesInput, safetyPlan.safeSpaces, (arr) => 
                      setSafetyPlan({...safetyPlan, safeSpaces: arr})
                    )
                    setSafeSpacesInput('')
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
          
          <div className="flex flex-wrap gap-2 mt-2">
            {!isEditing && safetyPlan.safeSpaces.length === 0 && <NothingYet what="safe spaces" />}
            {safetyPlan.safeSpaces.map((space, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                <Home className="h-3 w-3" />
                {space}
                {isEditing && (
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeFromArray(space, safetyPlan.safeSpaces, (arr) => 
                      setSafetyPlan({...safetyPlan, safeSpaces: arr})
                    )}
                  />
                )}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Save Button */}
      {isEditing && (
        <div className="flex justify-center">
          <Button onClick={() => saveSafetyPlan(safetyPlan)} className="w-full max-w-md" disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving…' : 'Save Safety Plan'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default SafetyPlanManager
