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
 * Patentable technology, but we chose not to patent â€” the Patent Office doesn't
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
import { getPref, setPref } from "@/lib/prefs"
import AppCanvas from "@/components/app-canvas"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Heart,
  Utensils,
  Shield,
  Droplets,
  MapPin,
  Cloud,
  HelpCircle,
  Zap,
  Brain,
  Settings2,
  Wind,
  Sparkles,
  Bone,
  Activity,
  Ear,
  Baby,
  ChevronDown,
  ChevronRight
} from "lucide-react"

interface TrackerButton {
  id: string
  name: string
  shortDescription: string
  helpContent: string
  icon: React.ReactNode
  edition: 'core' | 'cares' | 'companion' | 'command'
}

const HIDDEN_TRACKERS_KEY = 'chaos-body-hidden-trackers'
const HIDE_FERTILITY_KEY = 'chaos-hide-fertility-features'

export default function PhysicalHealthIndex() {
  // TODO: Get this from user profile/settings
  const userEdition: 'cares' | 'companion' | 'command' = 'command'; // For now, show everything
  // Test different editions: 'cares' | 'companion' | 'command'

  // Hidden trackers state - persisted to localStorage
  const [hiddenTrackers, setHiddenTrackers] = useState<string[]>([])
  const [hideFertility, setHideFertility] = useState(false)
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false)

  // Load hidden trackers from localStorage on mount
  useEffect(() => {
    try {
      const saved = getPref(HIDDEN_TRACKERS_KEY)
      if (saved) {
        setHiddenTrackers(JSON.parse(saved))
      }
      const fertilityPref = getPref(HIDE_FERTILITY_KEY)
      if (fertilityPref) {
        setHideFertility(JSON.parse(fertilityPref))
      }
    } catch (e) {
      console.error('Failed to load hidden trackers:', e)
    }
  }, [])

  // Save hidden trackers to localStorage when changed
  const updateHiddenTrackers = (newHidden: string[]) => {
    setHiddenTrackers(newHidden)
    try {
      setPref(HIDDEN_TRACKERS_KEY, JSON.stringify(newHidden))
    } catch (e) {
      console.error('Failed to save hidden trackers:', e)
    }
  }

  const toggleTrackerVisibility = (trackerId: string) => {
    if (hiddenTrackers.includes(trackerId)) {
      updateHiddenTrackers(hiddenTrackers.filter(id => id !== trackerId))
    } else {
      updateHiddenTrackers([...hiddenTrackers, trackerId])
    }
  }

  const toggleFertilityFeatures = (hide: boolean) => {
    setHideFertility(hide)
    try {
      setPref(HIDE_FERTILITY_KEY, JSON.stringify(hide))
    } catch (e) {
      console.error('Failed to save fertility preference:', e)
    }
  }

  const allTrackers: TrackerButton[] = [
    // CORE MEDICAL TRACKING - Moved to Manage section

    // BODY & WELLNESS TRACKING
    {
      id: 'upper-digestive',
      name: 'Upper Digestive',
      shortDescription: 'Nausea, heartburn, reflux, and upper GI symptoms',
      helpContent: 'Track upper digestive symptoms like nausea, vomiting, heartburn, acid reflux, indigestion, and bloating. Identify triggers, log treatments, and monitor severity patterns. Perfect for GERD, gastroparesis, and upper GI issues.',
      icon: <Utensils className="h-5 w-5" />,
      edition: 'cares'
    },
    {
      id: 'digestive-health',
      name: 'Lower Digestive (Bathroom)',
      shortDescription: 'Bristol scale, pain levels, bowel movement patterns',
      helpContent: 'Track digestive health using the Bristol Stool Scale, monitor pain levels, identify food triggers, and track patterns. Includes notes for symptoms and treatments that help.',
      icon: <Utensils className="h-5 w-5" />,
      edition: 'cares'
    },
    {
      id: 'pain-tracking',
      name: 'General Pain & Management',
      shortDescription: 'Pain levels, locations, triggers, treatments, effectiveness',
      helpContent: 'Comprehensive pain tracking with severity scales, location mapping, trigger identification, treatment effectiveness, and context factors like stress and sleep. Perfect for chronic pain management and identifying patterns.',
      icon: <MapPin className="h-5 w-5" />,
      edition: 'cares'
    },
    {
      id: 'head-pain',
      name: 'Head Pain Tracker',
      shortDescription: 'Migraines, headaches, auras, triggers, treatments',
      helpContent: 'Specialized tracking for all types of head pain including migraines, tension headaches, cluster headaches, and sinus pain. Track aura symptoms, pain locations, triggers, treatments, and functional impact. Perfect for identifying patterns and sharing detailed information with healthcare providers.',
      icon: <Brain className="h-5 w-5" />,
      edition: 'cares'
    },
    {
      id: 'dysautonomia',
      name: 'Dysautonomia Tracker',
      shortDescription: 'POTS, orthostatic symptoms, autonomic episodes',
      helpContent: 'Multi-modal dysautonomia tracking with focused episode types: POTS episodes with heart rate monitoring, blood pressure changes, GI symptoms, temperature regulation issues, and general autonomic episodes. Track triggers, interventions, and effectiveness patterns.',
      icon: <Heart className="h-5 w-5" />,
      edition: 'cares'
    },

    {
      id: 'endocrine',
      name: 'Endocrine',
      shortDescription: 'Blood sugar / diabetes, thyroid, adrenal — hormonal & metabolic',
      helpContent: 'Endocrine system tracking. Includes the full diabetes module (blood glucose, insulin, carbs, ketones, analytics) plus thyroid (hypo/hyper symptoms, labs, med response) and adrenal (cortisol patterns, fatigue, crisis warning signs). Device timers (CGM/pump/GLP-1) live in Maintain → Devices & Timers.',
      icon: <Activity className="h-5 w-5" />,
      edition: 'cares'
    },

    // SPECIALIZED TRACKING
    {
      id: 'food-allergens',
      name: 'Food Allergens',
      shortDescription: 'Food reactions, severity, emergency protocols',
      helpContent: 'Track food allergies and reactions, rate severity levels, store emergency protocols and contacts. Separate from environmental allergies for clearer tracking.',
      icon: <Shield className="h-5 w-5" />,
      edition: 'cares'
    },
    {
      id: 'reproductive-health',
      name: 'Reproductive Health & Fertility',
      shortDescription: 'Menstrual cycle, fertility tracking, symptoms, BBT',
      helpContent: 'Comprehensive reproductive health tracking including menstrual cycle, fertility signs, basal body temperature, cervical fluid, ovulation prediction, mood, and symptoms. Gender-neutral language with detailed fertility awareness features.',
      icon: <Heart className="h-5 w-5" />,
      edition: 'cares'
    },
    {
      id: 'weather-environment',
      name: 'Weather & Environment',
      shortDescription: 'Weather impact, environmental allergens',
      helpContent: 'Track how weather and environmental factors affect your symptoms. Monitor barometric pressure, pollen counts, air quality, and seasonal patterns. Includes environmental allergy tracking.',
      icon: <Cloud className="h-5 w-5" />,
      edition: 'cares'
    },
    {
      id: 'seizure-tracking',
      name: 'Seizure Tracker',
      shortDescription: 'Medical-grade seizure episode tracking and analysis',
      helpContent: 'Comprehensive seizure tracking with medical details including seizure types, auras, triggers, recovery time, injuries, and medication. Includes pattern analysis and safety features for epilepsy management.',
      icon: <Zap className="h-5 w-5" />,
      edition: 'cares'
    },
    {
      id: 'cardiac',
      name: 'Cardiac Tracker',
      shortDescription: 'Arrhythmias, chest pain, syncope, palpitations',
      helpContent: 'Track cardiac events including arrhythmias (PAC, PVC, SVT, AFib), chest pain, syncope/presyncope, and palpitations. Captures rhythm classification, ECG strip uploads, vitals, triggers, and resolution methods. Includes 911 red-flag detection and Valsalva-style interim measures.',
      icon: <Activity className="h-5 w-5" />,
      edition: 'cares'
    },
    {
      id: 'respiratory',
      name: 'Respiratory Tracker',
      shortDescription: 'Asthma, SOB, cough, allergic reactions, peak flow',
      helpContent: 'Track asthma attacks, shortness of breath, cough episodes, allergic reactions, and pleuritic pain. Captures peak flow readings, SpO2, inhaler use and response, and breathing patterns. Includes anaphylaxis detection.',
      icon: <Wind className="h-5 w-5" />,
      edition: 'cares'
    },
    {
      id: 'skin',
      name: 'Skin Tracker',
      shortDescription: 'Rashes, hives, eczema, lesions with photo timeline',
      helpContent: 'Track skin events including rashes, hives, eczema flares, mole/lesion monitoring, wounds, sunburns, and contact reactions. Photo upload is primary â€” invaluable for dermatology consults. Includes ABCDE mole screening and SJS/anaphylaxis red flags.',
      icon: <Sparkles className="h-5 w-5" />,
      edition: 'cares'
    },
    {
      id: 'postpartum',
      name: 'Postpartum & Newborn',
      shortDescription: 'Recovery, feeding, and baby — bleeding, mood, diapers, all in one',
      helpContent: 'One place for the postpartum cluster so you are not juggling apps: your recovery (bleeding/lochia with hemorrhage alert, uterus check, healing, mood/PPD screening with crisis support), feeding (which side last, durations, pumping, bottles — gender-neutral terms), and baby (diapers, weight, sleep, jaundice and newborn-fever alerts). Hideable; turn it on when you need it.',
      icon: <Baby className="h-5 w-5" />,
      edition: 'cares'
    },
    {
      id: 'gu',
      name: 'Genitourinary',
      shortDescription: 'Voiding symptoms, retention, incontinence, UTIs, pelvic floor',
      helpContent: 'Track GU symptoms including voiding issues, urinary retention (with safety alert for >300mL), incontinence, infections with triage guidance, sexual health, and pelvic floor symptoms. Gender-neutral language throughout.',
      icon: <Droplets className="h-5 w-5" />,
      edition: 'cares'
    },
    {
      id: 'ent',
      name: 'Ear, Nose & Throat',
      shortDescription: 'Ear, hearing, tinnitus, vertigo, sinus, throat, nosebleeds',
      helpContent: 'Track ENT symptoms including ear pain/infection, hearing changes (with same-day alert for sudden hearing loss), tinnitus, vertigo, sinus issues, throat/voice problems, and nosebleeds. Catches real red flags: sudden sensorineural hearing loss, airway concerns, mastoiditis, chronic hoarseness.',
      icon: <Ear className="h-5 w-5" />,
      edition: 'cares'
    },
    {
      id: 'joint',
      name: 'Joint / MSK Tracker',
      shortDescription: 'Subluxations, dislocations, swelling, ROM',
      helpContent: 'Track joint and musculoskeletal events including subluxations, dislocations, joint pain, swelling, instability, and range-of-motion restrictions. Detailed joint anatomy picker. Especially valuable for EDS / hypermobile-spectrum patients.',
      icon: <Bone className="h-5 w-5" />,
      edition: 'cares'
    },
  ]

  // Filter trackers based on user's edition AND hidden preferences
  const trackers = allTrackers.filter(tracker =>
    (tracker.edition === 'core' || // Always show core features
    tracker.edition === userEdition || // Show user's edition
    userEdition === 'command') && // Command edition sees everything
    !hiddenTrackers.includes(tracker.id) // Respect user's hidden preferences
  );

  // Specialty groups â€” group trackers by body system for the accordion layout
  const SPECIALTY_GROUPS = [
    { id: 'head-neuro', label: '🧠 Head & Nervous System', trackerIds: ['head-pain', 'seizure-tracking', 'dysautonomia'] },
    { id: 'ent', label: '👂 Ear, Nose & Throat', trackerIds: ['ent'] },
    { id: 'heart-lungs', label: '❤️ Heart & Lungs', trackerIds: ['cardiac', 'respiratory'] },
    { id: 'gut', label: '🍽️ Gut & Digestive', trackerIds: ['upper-digestive', 'digestive-health'] },
    { id: 'metabolic', label: '⚡ Metabolic & Immune', trackerIds: ['endocrine', 'food-allergens'] },
    { id: 'skin', label: '🩹 Skin', trackerIds: ['skin'] },
    { id: 'msk', label: '🦴 Bones, Joints & Muscles', trackerIds: ['joint'] },
    { id: 'reproductive', label: '🌸 Reproductive', trackerIds: ['reproductive-health', 'postpartum', 'gu'] },
    { id: 'environment', label: '🌦️ Environment', trackerIds: ['weather-environment'] },
    { id: 'general', label: '📍 General', trackerIds: ['pain-tracking'] },
  ]

  // Collapsed-group state persists to localStorage so it survives navigation.
  // We store the COLLAPSED set (default empty = all open) so new groups added
  // later default to open without needing a migration.
  const COLLAPSED_GROUPS_KEY = 'chaos-body-collapsed-groups'
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const saved = getPref(COLLAPSED_GROUPS_KEY)
      if (saved) setCollapsedGroups(new Set(JSON.parse(saved)))
    } catch (e) {
      console.error('Failed to load collapsed groups:', e)
    }
  }, [])

  const toggleGroup = (id: string) => setCollapsedGroups(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    try { setPref(COLLAPSED_GROUPS_KEY, JSON.stringify([...next])) } catch {}
    return next
  })

  const getTrackerHref = (trackerId: string): string => {
    // Handle specific tracker navigation - PDF-friendly anchor links
    switch (trackerId) {
      case 'upper-digestive': return '/upper-digestive'
      case 'digestive-health': return '/bathroom'
      case 'reproductive-health': return '/reproductive-health'
      case 'pain-tracking': return '/pain'
      case 'head-pain': return '/head-pain'
      case 'dysautonomia': return '/dysautonomia'
      case 'food-allergens': return '/food-allergens'
      case 'weather-environment': return '/weather-environment'
      case 'seizure-tracking': return '/seizure'
      case 'diabetes-tracker': return '/diabetes'
      case 'endocrine': return '/endocrine'
      case 'vitals': return '/vitals'
      case 'cardiac': return '/cardiac'
      case 'respiratory': return '/respiratory'
      case 'skin': return '/skin'
      case 'joint': return '/joint'
      case 'gu': return '/gu'
      case 'postpartum': return '/postpartum'
      case 'ent': return '/ent'
      default: return '#' // TODO: Implement navigation to other trackers
    }
  }

  return (
    <AppCanvas currentPage="physical-health">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            <Heart className="h-8 w-8 text-red-500" />
            Body
          </h1>
          <p className="text-lg text-muted-foreground">
            Medical tracking and physical wellness
          </p>
        </header>

        <div className="space-y-3">
          {SPECIALTY_GROUPS.map(group => {
            const groupTrackers = group.trackerIds
              .map(id => trackers.find(t => t.id === id))
              .filter(Boolean) as typeof trackers
            if (groupTrackers.length === 0) return null
            const isOpen = !collapsedGroups.has(group.id)
            return (
              <Collapsible key={group.id} open={isOpen} onOpenChange={() => toggleGroup(group.id)}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left font-medium text-sm">
                    <span>{group.label}</span>
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 pb-1">
                    {groupTrackers.map((tracker) => (
                      <Card
                        key={tracker.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <CardHeader
                          className="pb-3 cursor-pointer"
                          onClick={() => {
                            const href = getTrackerHref(tracker.id)
                            if (href) window.location.href = href
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-primary">{tracker.icon}</div>
                              <CardTitle className="text-base leading-tight">{tracker.name}</CardTitle>
                            </div>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-muted"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <HelpCircle className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    {tracker.icon}
                                    {tracker.name}
                                  </DialogTitle>
                                  <DialogDescription className="text-left">
                                    {tracker.helpContent}
                                  </DialogDescription>
                                </DialogHeader>
                              </DialogContent>
                            </Dialog>
                          </div>
                          <CardDescription className="text-sm mt-2">
                            {tracker.shortDescription}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>

        {/* CUSTOMIZE TRACKERS */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Customize Your Trackers
            </CardTitle>
            <CardDescription>
              Show only the trackers you actually use. Hidden trackers can always be shown again.
              {hiddenTrackers.length > 0 && (
                <span className="block mt-1 text-primary">
                  {hiddenTrackers.length} tracker{hiddenTrackers.length !== 1 ? 's' : ''} hidden
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={isCustomizeOpen} onOpenChange={setIsCustomizeOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Customize Visible Trackers
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    Customize Body Trackers
                  </DialogTitle>
                  <DialogDescription>
                    Toggle off trackers you don't need. They won't appear on the Body page, but you can always turn them back on.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  {allTrackers.map((tracker) => (
                    <div key={tracker.id}>
                      <div className="flex items-center justify-between gap-4 py-2 border-b border-border/50">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="text-primary shrink-0">
                            {tracker.icon}
                          </div>
                          <div className="min-w-0">
                            <Label htmlFor={`toggle-${tracker.id}`} className="font-medium cursor-pointer">
                              {tracker.name}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {tracker.shortDescription}
                            </p>
                          </div>
                        </div>
                        <Switch
                          id={`toggle-${tracker.id}`}
                          checked={!hiddenTrackers.includes(tracker.id)}
                          onCheckedChange={() => toggleTrackerVisibility(tracker.id)}
                        />
                      </div>
                      {/* Sub-option for Reproductive Health - hide fertility/ovulation features */}
                      {tracker.id === 'reproductive-health' && !hiddenTrackers.includes('reproductive-health') && (
                        <div className="ml-8 mt-2 mb-2 p-3 bg-muted/50 rounded-lg border border-border/50">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <Label htmlFor="toggle-fertility" className="text-sm font-medium cursor-pointer">
                                Hide Fertility & Ovulation
                              </Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                Hides BBT, ovulation tracking, and fertility predictions. For those post-menopause, post-surgery, not trying to conceive, or who just don't need it.
                              </p>
                            </div>
                            <Switch
                              id="toggle-fertility"
                              checked={hideFertility}
                              onCheckedChange={toggleFertilityFeatures}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { updateHiddenTrackers([]); toggleFertilityFeatures(false); }}
                    disabled={hiddenTrackers.length === 0 && !hideFertility}
                  >
                    Show All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCustomizeOpen(false)}
                    className="ml-auto"
                  >
                    Done
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <a href="/">
            <Button variant="outline">
              â† Back to Command Center
            </Button>
          </a>
        </div>
      </div>
    </AppCanvas>
  )
}

