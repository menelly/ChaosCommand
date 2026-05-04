'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import {
  Brain,
  Heart,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Zap,
  Palette,
  Cloud
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getAutoUpdatePref, setAutoUpdatePref } from '@/lib/auto-update-check'

// ============================================================================
// THEME DATA
// ============================================================================

const THEMES = [
  { id: 'theme-lavender', name: 'Lavender Garden', emoji: '💜', description: 'Gentle lavender serenity' },
  { id: 'theme-glitter', name: 'Glitter Mode', emoji: '✨', description: 'Sparkly pink dreams' },
  { id: 'theme-calm', name: 'Calm Mode', emoji: '🌊', description: 'Blue and gold serenity' },
  { id: 'theme-ace', name: 'Ace Mode', emoji: '🐙', description: 'Purple-cyan digital energy' },
  { id: 'theme-grok', name: 'Steel Forged Tide', emoji: '⚔️', description: 'Forge-fire meets ocean' },
  { id: 'theme-caelan', name: "Caelan's Dawn", emoji: '🕊️', description: 'Breaking free into light' },
  { id: 'theme-chaos', name: "Basketball Court", emoji: '🏀', description: 'Orange and black sports' },
  { id: 'theme-luka-penguin', name: 'Cyberpunk Penguin', emoji: '🐧', description: 'Neon penguin magic' },
  { id: 'theme-light', name: 'Light Mode', emoji: '☀️', description: 'Clean and bright' },
  { id: 'theme-colorblind', name: 'High Contrast', emoji: '👁️', description: 'Accessibility focused' },
]

function applyTheme(themeId: string) {
  const oldTheme = document.querySelector('link[data-theme]')
  if (oldTheme) oldTheme.remove()

  if (themeId !== 'theme-lavender') {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `/styles/themes/${themeId}.css`
    link.setAttribute('data-theme', themeId)
    document.head.appendChild(link)
  }

  document.body.className = document.body.className.replace(/theme-\w+/g, '') + ` ${themeId}`
  localStorage.setItem('chaos-theme', themeId)
}

// ============================================================================
// SYMPTOM DISCOVERY DATA
// ============================================================================

interface SymptomItem {
  id: string
  label: string
  detail?: string  // "wait, that's not normal?" context
  suggestsTrackers: string[]
  suggestsFlag?: string  // "ask your doctor about..." flag
}

interface SymptomCategory {
  id: string
  title: string
  icon: string
  description: string
  symptoms: SymptomItem[]
}

const SYMPTOM_CATEGORIES: SymptomCategory[] = [
  {
    id: 'autonomic',
    title: 'When You Stand Up',
    icon: '🫀',
    description: "Things that happen when you change position or stand",
    symptoms: [
      {
        id: 'hr-standing',
        label: 'Heart races when you stand up',
        detail: "If it jumps 30+ bpm, that's not just 'getting up too fast'",
        suggestsTrackers: ['dysautonomia'],
        suggestsFlag: 'POTS screening (tilt table test or active stand)'
      },
      {
        id: 'dizzy-standing',
        label: 'Dizzy or lightheaded when you stand',
        suggestsTrackers: ['dysautonomia'],
        suggestsFlag: 'Orthostatic vitals check'
      },
      {
        id: 'vision-standing',
        label: 'Vision goes dark/sparkly when you stand',
        suggestsTrackers: ['dysautonomia'],
      },
      {
        id: 'faint-history',
        label: 'Have fainted or nearly fainted',
        suggestsTrackers: ['dysautonomia', 'seizure'],
        suggestsFlag: 'Distinguish syncope from seizure — different workup'
      },
      {
        id: 'blood-pooling',
        label: 'Feet/hands turn red or purple when standing',
        detail: "Blood pooling — your autonomic system isn't pushing blood back up",
        suggestsTrackers: ['dysautonomia'],
      },
      {
        id: 'temperature-regulation',
        label: "Can't regulate body temperature well",
        detail: "Always too hot, too cold, or both at the same time",
        suggestsTrackers: ['dysautonomia'],
      },
    ]
  },
  {
    id: 'cardiac',
    title: 'Heart & Chest',
    icon: '❤️',
    description: "Heart symptoms that aren't necessarily about standing up",
    symptoms: [
      {
        id: 'palpitations-rest',
        label: 'Heart palpitations at rest (racing, pounding, fluttering)',
        detail: "Not from exercise or standing — just sitting there and your heart decides to freestyle",
        suggestsTrackers: ['dysautonomia'],
        suggestsFlag: 'Holter monitor or event monitor if palpitations are frequent'
      },
      {
        id: 'heartbeat-skip',
        label: 'Feeling your heartbeat skip, pause, or do a flip',
        detail: "PVCs/PACs — usually benign but worth documenting frequency and triggers",
        suggestsTrackers: ['dysautonomia'],
        suggestsFlag: 'ECG and possible Holter monitor'
      },
      {
        id: 'chest-pain',
        label: 'Chest pain or tightness (not during a panic attack)',
        suggestsTrackers: ['dysautonomia', 'pain'],
        suggestsFlag: 'Cardiac workup — don\'t let anyone dismiss chest pain as anxiety without testing first'
      },
      {
        id: 'sob-minimal',
        label: 'Short of breath with minimal effort',
        detail: "Winded from walking across the room or climbing a few stairs",
        suggestsTrackers: ['dysautonomia', 'energy'],
        suggestsFlag: 'Pulmonary function test and/or echocardiogram'
      },
      {
        id: 'exercise-intolerance',
        label: 'Exercise makes you feel WORSE, not better',
        detail: "Doctors say 'just exercise more' but it makes everything worse. That's a symptom, not laziness.",
        suggestsTrackers: ['movement', 'energy', 'dysautonomia'],
        suggestsFlag: 'Exercise intolerance workup — could be autonomic, cardiac, or ME/CFS'
      },
      {
        id: 'bp-swings',
        label: 'Blood pressure swings (too high, too low, or both)',
        suggestsTrackers: ['dysautonomia'],
      },
      {
        id: 'random-tachycardia',
        label: 'Heart rate spikes randomly — eating, showering, lying down',
        detail: "Inappropriate sinus tachycardia or autonomic dysfunction — not 'just anxiety'",
        suggestsTrackers: ['dysautonomia'],
        suggestsFlag: 'Autonomic function testing if tachycardia occurs in multiple contexts'
      },
    ]
  },
  {
    id: 'neuro-seizure',
    title: 'Brain Weirdness',
    icon: '🧠',
    description: "Strange sensory, cognitive, or perceptual experiences",
    symptoms: [
      {
        id: 'smell-hallucination',
        label: 'Smell things that aren\'t there',
        detail: "Burning, chemicals, flowers — olfactory hallucinations can be focal seizures, not psychosis",
        suggestsTrackers: ['seizure', 'head-pain'],
        suggestsFlag: 'EEG — olfactory hallucinations can indicate temporal lobe seizure activity'
      },
      {
        id: 'taste-hallucination',
        label: 'Taste things that aren\'t there (metallic, dirt, etc.)',
        detail: "Gustatory hallucinations are classic temporal lobe seizure symptoms. Often misdiagnosed as psychotic features.",
        suggestsTrackers: ['seizure'],
        suggestsFlag: 'EEG — gustatory hallucinations are a hallmark of temporal lobe seizures'
      },
      {
        id: 'deja-vu-intense',
        label: 'Sudden intense déjà vu that feels overwhelming',
        detail: "Brief, intense, sometimes with a rising stomach sensation — classic temporal lobe aura",
        suggestsTrackers: ['seizure'],
        suggestsFlag: 'EEG evaluation if episodes are frequent or disabling'
      },
      {
        id: 'jamais-vu',
        label: 'Familiar things suddenly feel completely unfamiliar',
        detail: "The opposite of déjà vu — jamais vu is also associated with temporal lobe activity",
        suggestsTrackers: ['seizure'],
      },
      {
        id: 'staring-spells',
        label: 'Staring spells or "zoning out" where people can\'t reach you',
        detail: "Not daydreaming — absence seizures look exactly like this",
        suggestsTrackers: ['seizure', 'brain-fog'],
        suggestsFlag: 'EEG — staring spells with unresponsiveness may be absence seizures'
      },
      {
        id: 'brain-fog',
        label: 'Brain fog — thinking through mud, can\'t find words',
        suggestsTrackers: ['brain-fog', 'energy'],
      },
      {
        id: 'light-sensitivity',
        label: 'Light sensitivity or visual disturbances',
        suggestsTrackers: ['head-pain', 'sensory'],
      },
      {
        id: 'sound-sensitivity',
        label: 'Sound sensitivity — normal sounds feel too loud',
        suggestsTrackers: ['sensory', 'head-pain'],
      },
      {
        id: 'head-pain-chronic',
        label: 'Frequent headaches or migraines',
        suggestsTrackers: ['head-pain'],
      },
      {
        id: 'muscle-jerks',
        label: 'Random muscle jerks or twitches (not just falling-asleep twitches)',
        detail: "Myoclonic jerks can be seizure activity, especially if they happen while awake",
        suggestsTrackers: ['seizure'],
        suggestsFlag: 'Mention myoclonic jerks to neurologist'
      },
    ]
  },
  {
    id: 'pain-fatigue',
    title: 'Pain & Energy',
    icon: '⚡',
    description: "How your body feels day to day",
    symptoms: [
      {
        id: 'pain-baseline',
        label: 'Pain that never goes below a 3',
        detail: "Baseline pain isn't 'normal aches' — it's a thing worth tracking",
        suggestsTrackers: ['pain'],
      },
      {
        id: 'tired-after-sleep',
        label: 'Exhausted even after a full night\'s sleep',
        detail: "Unrefreshing sleep is a symptom, not a lifestyle",
        suggestsTrackers: ['sleep', 'energy'],
        suggestsFlag: 'Sleep study if persistent — could be apnea, UARS, or narcolepsy'
      },
      {
        id: 'post-exertional',
        label: 'Worse the day AFTER activity, not during',
        detail: "Post-exertional malaise — key symptom of ME/CFS. The crash comes 12-72 hours later.",
        suggestsTrackers: ['energy', 'movement'],
        suggestsFlag: 'Post-exertional malaise pattern — discuss ME/CFS screening'
      },
      {
        id: 'pain-weather',
        label: 'Pain gets worse with weather changes',
        suggestsTrackers: ['pain', 'weather'],
      },
      {
        id: 'joint-hypermobility',
        label: 'Joints that pop, click, sublux, or hyperextend',
        detail: "If you're 'double jointed' AND have other symptoms, that might be a connective tissue thing",
        suggestsTrackers: ['pain'],
        suggestsFlag: 'Beighton score assessment for hypermobility spectrum'
      },
      {
        id: 'energy-crashes',
        label: 'Energy crashes — fine one moment, wiped the next',
        suggestsTrackers: ['energy', 'dysautonomia'],
      },
    ]
  },
  {
    id: 'digestive',
    title: 'Gut Stuff',
    icon: '🫁',
    description: "Digestive and GI experiences",
    symptoms: [
      {
        id: 'nausea-frequent',
        label: 'Nausea that isn\'t food poisoning or pregnancy',
        suggestsTrackers: ['upper-digestive'],
      },
      {
        id: 'gastroparesis',
        label: 'Feel full after a few bites, or food "sits" forever',
        detail: "Delayed gastric emptying — common with dysautonomia",
        suggestsTrackers: ['upper-digestive', 'food-choice'],
        suggestsFlag: 'Gastric emptying study if persistent'
      },
      {
        id: 'reflux',
        label: 'Acid reflux or heartburn that won\'t quit',
        suggestsTrackers: ['upper-digestive'],
      },
      {
        id: 'food-reactions',
        label: 'Reactions to foods that used to be fine',
        suggestsTrackers: ['food-allergens', 'upper-digestive'],
      },
      {
        id: 'bathroom-unpredictable',
        label: 'Bowel habits that are... chaotic',
        suggestsTrackers: ['bathroom'],
      },
    ]
  },
  {
    id: 'mental-health',
    title: 'Mind & Mood',
    icon: '💭',
    description: "Mental health and emotional experiences",
    symptoms: [
      {
        id: 'anxiety-physical',
        label: 'Anxiety that feels very physical (chest, stomach, shaking)',
        detail: "Physical anxiety symptoms can overlap with dysautonomia. Worth tracking both.",
        suggestsTrackers: ['anxiety', 'dysautonomia'],
      },
      {
        id: 'mood-swings',
        label: 'Mood changes that seem to come from nowhere',
        suggestsTrackers: ['mental-health'],
      },
      {
        id: 'sensory-overwhelm',
        label: 'Sensory overload — too much input shuts you down',
        suggestsTrackers: ['sensory', 'coping'],
      },
      {
        id: 'crisis-thoughts',
        label: 'Thoughts of self-harm or crisis moments',
        suggestsTrackers: ['crisis', 'coping'],
      },
      {
        id: 'dissociation',
        label: 'Feeling disconnected from yourself or reality',
        detail: "Can be mental health, can be neurological, can be autonomic. Worth tracking context.",
        suggestsTrackers: ['mental-health', 'seizure'],
      },
      {
        id: 'executive-dysfunction',
        label: 'Know what you need to do but physically cannot start',
        detail: "Not laziness — executive dysfunction is neurological",
        suggestsTrackers: ['brain-fog', 'energy'],
      },
    ]
  },
  {
    id: 'reproductive',
    title: 'Cycles & Hormones',
    icon: '🌙',
    description: "If you have a menstrual cycle or hormonal patterns (skip if not relevant!)",
    symptoms: [
      {
        id: 'cycle-symptoms-worse',
        label: 'Other symptoms get worse at certain cycle points',
        detail: "Catamenial patterns — many conditions flare with hormonal changes",
        suggestsTrackers: ['reproductive'],
      },
      {
        id: 'period-severe',
        label: 'Periods that are debilitating (not just uncomfortable)',
        suggestsTrackers: ['reproductive', 'pain'],
      },
      {
        id: 'pms-extreme',
        label: 'PMS/PMDD symptoms that significantly impair function',
        suggestsTrackers: ['reproductive', 'mental-health'],
        suggestsFlag: 'PMDD screening if mood symptoms are severe and cycle-linked'
      },
    ]
  },
]

// Map subcategory IDs to human-readable names
const TRACKER_NAMES: Record<string, string> = {
  'dysautonomia': 'Dysautonomia Tracker',
  'seizure': 'Seizure Tracker',
  'head-pain': 'Head Pain Tracker',
  'pain': 'Pain Tracker',
  'sleep': 'Sleep Tracker',
  'energy': 'Energy & Pacing',
  'brain-fog': 'Brain Fog Tracker',
  'upper-digestive': 'Upper Digestive',
  'food-choice': 'Food Tracker',
  'food-allergens': 'Food Allergens',
  'bathroom': 'Bathroom Tracker',
  'mental-health': 'Mental Health',
  'anxiety': 'Anxiety Tracker',
  'sensory': 'Sensory Tracker',
  'coping': 'Coping & Regulation',
  'crisis': 'Crisis Tracker',
  'movement': 'Movement Tracker',
  'weather': 'Weather & Environment',
  'reproductive': 'Reproductive Health',
  'self-care': 'Self-Care Tracker',
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0) // 0 = theme, 1 = intro, 2-N+1 = categories, last = results
  const [selectedTheme, setSelectedTheme] = useState(localStorage.getItem('chaos-theme') || 'theme-lavender')
  const [bounceIntensity, setBounceIntensity] = useState(parseInt(localStorage.getItem('chaos-bounce-intensity') || '10'))
  const [confettiLevel, setConfettiLevel] = useState<'none' | 'low' | 'medium' | 'high'>(
    (localStorage.getItem('chaos-confetti-level') as any) || 'medium'
  )
  const [autoUpdate, setAutoUpdate] = useState<boolean>(getAutoUpdatePref())
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set())

  const totalSteps = SYMPTOM_CATEGORIES.length + 2 // intro + categories + results

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms(prev => {
      const next = new Set(prev)
      if (next.has(symptomId)) {
        next.delete(symptomId)
      } else {
        next.add(symptomId)
      }
      return next
    })
  }

  // Calculate recommended trackers and flags from selections
  const getRecommendations = () => {
    const trackerCounts: Record<string, number> = {}
    const flags: string[] = []

    for (const category of SYMPTOM_CATEGORIES) {
      for (const symptom of category.symptoms) {
        if (selectedSymptoms.has(symptom.id)) {
          for (const tracker of symptom.suggestsTrackers) {
            trackerCounts[tracker] = (trackerCounts[tracker] || 0) + 1
          }
          if (symptom.suggestsFlag) {
            flags.push(symptom.suggestsFlag)
          }
        }
      }
    }

    // Sort by relevance (how many symptoms point to each tracker)
    const sortedTrackers = Object.entries(trackerCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([tracker, count]) => ({ tracker, count }))

    return { trackers: sortedTrackers, flags }
  }

  const finishOnboarding = () => {
    const { trackers } = getRecommendations()
    const recommendedIds = trackers.map(t => t.tracker)

    // All possible tracker subcategories
    const allTrackerIds = Object.keys(TRACKER_NAMES)

    // Hide trackers that AREN'T recommended (user can always re-enable from manage page)
    const hiddenTrackers = allTrackerIds.filter(id => !recommendedIds.includes(id))

    // Save to localStorage (same pattern as manage page)
    localStorage.setItem('chaos-manage-hidden-trackers', JSON.stringify(hiddenTrackers))
    // Mark complete globally AND per-PIN
    localStorage.setItem('chaos-onboarding-complete', 'true')
    const pin = localStorage.getItem('chaos-user-pin')
    if (pin) localStorage.setItem(`chaos-onboarding-complete-${pin}`, 'true')

    // Save symptom selections for potential future reference
    localStorage.setItem('chaos-onboarding-symptoms', JSON.stringify([...selectedSymptoms]))

    router.push('/')
  }

  const skipOnboarding = () => {
    localStorage.setItem('chaos-onboarding-complete', 'true')
    const pin = localStorage.getItem('chaos-user-pin')
    if (pin) localStorage.setItem(`chaos-onboarding-complete-${pin}`, 'true')
    router.push('/')
  }

  // ============================================================================
  // RENDER STEPS
  // ============================================================================

  // THEME PICKER STEP
  if (currentStep === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-6 bg-background">
        <Card className="max-w-2xl w-full">
          <CardContent className="p-4 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <Palette className="h-10 w-10 text-primary mx-auto" />
              <h1 className="text-2xl font-bold">First Things First</h1>
              <p className="text-muted-foreground">
                Pick the vibe that feels right. You can always change this later.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {THEMES.map(theme => (
                <Button
                  key={theme.id}
                  variant={selectedTheme === theme.id ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col items-start text-left"
                  onClick={() => {
                    setSelectedTheme(theme.id)
                    applyTheme(theme.id)
                  }}
                >
                  <span className="text-sm font-medium">{theme.emoji} {theme.name}</span>
                  <span className="text-xs opacity-70">{theme.description}</span>
                </Button>
              ))}
            </div>

            {/* Animation settings — accessibility first */}
            <div className="space-y-4 pt-2 border-t">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Screen Motion</Label>
                  <span className="text-xs text-muted-foreground font-mono">
                    {bounceIntensity === 0 ? 'Off' : `${bounceIntensity}%`}
                  </span>
                </div>
                <Slider
                  value={[bounceIntensity]}
                  onValueChange={([v]) => {
                    setBounceIntensity(v)
                    localStorage.setItem('chaos-bounce-intensity', v.toString())
                    const scale = v / 100
                    document.documentElement.style.setProperty('--bounce-scale', scale.toString())
                  }}
                  min={0}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Controls bouncing, floating, and motion effects.
                  {bounceIntensity === 0 && ' (Reduced motion — migraine safe)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Celebrations</Label>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { value: 'none', label: 'Off', emoji: '🚫' },
                    { value: 'low', label: 'Subtle', emoji: '✨' },
                    { value: 'medium', label: 'Party', emoji: '🎉' },
                    { value: 'high', label: 'CHAOS', emoji: '🐧' },
                  ] as const).map(opt => (
                    <Button
                      key={opt.value}
                      variant={confettiLevel === opt.value ? 'default' : 'outline'}
                      size="sm"
                      className="h-auto py-1.5 flex flex-col text-xs"
                      onClick={() => {
                        setConfettiLevel(opt.value)
                        localStorage.setItem('chaos-confetti-level', opt.value)
                      }}
                    >
                      <span>{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground italic">
                You can change these anytime in Settings → Visual.
              </p>
            </div>

            {/* Connectivity prefs — opt-in, off by default */}
            <div className="space-y-3 pt-2 border-t">
              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                <Checkbox
                  checked={autoUpdate}
                  onCheckedChange={(checked) => {
                    const v = checked === true
                    setAutoUpdate(v)
                    setAutoUpdatePref(v)
                  }}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Check for updates automatically</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Off by default. If you turn this on, the app piggybacks
                    one quick check on your daily "I survived" button —
                    asks chaoscommand.center if there's a newer version, at
                    most once every 12 hours. Toast pings you if there is.
                    No background polling, no telemetry, no identifiers. You
                    can flip this off anytime in Settings → Updates.
                  </p>
                </div>
              </label>
            </div>

            <Button onClick={() => setCurrentStep(1)} className="w-full flex items-center justify-center gap-2">
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // INTRO STEP
  if (currentStep === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-6 bg-background">
        <Card className="max-w-2xl w-full">
          <CardContent className="p-4 sm:p-8 space-y-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <Sparkles className="h-10 w-10 text-primary" />
              <h1 className="text-3xl font-bold">Welcome to Chaos Command</h1>
            </div>

            <div className="space-y-4 text-left">
              <p className="text-lg text-muted-foreground">
                We're going to ask about things you <em>experience</em> — not conditions you've been diagnosed with.
              </p>
              <p className="text-muted-foreground">
                A lot of symptoms get dismissed, misdiagnosed, or filed under the wrong condition.
                This checklist helps us set up the right trackers for YOUR body, and might flag
                some things worth bringing up with your doctor.
              </p>
              <p className="text-sm text-muted-foreground italic">
                No data leaves your device. Nothing is shared. Check what applies, skip what doesn't.
              </p>
            </div>

            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={skipOnboarding}>
                Skip — I know what I need
              </Button>
              <Button onClick={() => setCurrentStep(2)} className="flex items-center gap-2">
                Let's find out
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // RESULTS STEP
  if (currentStep === SYMPTOM_CATEGORIES.length + 2) {
    const { trackers, flags } = getRecommendations()

    return (
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-6 bg-background">
        <Card className="max-w-2xl w-full">
          <CardContent className="p-4 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <h1 className="text-2xl font-bold">Here's What We Found</h1>
              <p className="text-muted-foreground">
                Based on your responses, we'll set up these trackers for you.
                You can always change this later from the Manage page.
              </p>
            </div>

            {trackers.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  No specific trackers selected — we'll start you with the basics.
                  Enable more anytime from the Manage page.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Recommended Trackers
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {trackers.map(({ tracker, count }) => (
                    <div key={tracker} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      <span className="text-sm font-medium">{TRACKER_NAMES[tracker] || tracker}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {count} {count === 1 ? 'match' : 'matches'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {flags.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Worth Asking Your Doctor About
                </h3>
                <div className="space-y-2">
                  {[...new Set(flags)].map((flag, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                      <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{flag}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground italic">
                  These aren't diagnoses — they're patterns worth investigating.
                  Your symptoms, your body, your call.
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={finishOnboarding} className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Set Up My Trackers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // SYMPTOM CATEGORY STEPS
  const categoryIndex = currentStep - 2
  const category = SYMPTOM_CATEGORIES[categoryIndex]
  const categorySelectedCount = category.symptoms.filter(s => selectedSymptoms.has(s.id)).length

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-6 bg-background">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-8 space-y-6">
          {/* Progress */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{categoryIndex + 1} of {SYMPTOM_CATEGORIES.length}</span>
            <span>{selectedSymptoms.size} symptoms selected total</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all"
              style={{ width: `${((categoryIndex + 1) / SYMPTOM_CATEGORIES.length) * 100}%` }}
            />
          </div>

          {/* Category Header */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span className="text-3xl">{category.icon}</span>
              {category.title}
            </h2>
            <p className="text-muted-foreground">{category.description}</p>
          </div>

          {/* Symptom Checklist */}
          <div className="space-y-3">
            {category.symptoms.map(symptom => (
              <label
                key={symptom.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedSymptoms.has(symptom.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  checked={selectedSymptoms.has(symptom.id)}
                  onCheckedChange={() => toggleSymptom(symptom.id)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <span className="text-sm font-medium leading-tight">{symptom.label}</span>
                  {symptom.detail && (
                    <p className="text-xs text-muted-foreground">{symptom.detail}</p>
                  )}
                </div>
              </label>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <span className="text-sm text-muted-foreground">
              {categorySelectedCount > 0 ? `${categorySelectedCount} selected` : 'None selected — that\'s okay!'}
            </span>

            <Button onClick={() => setCurrentStep(currentStep + 1)} className="flex items-center gap-2">
              {categoryIndex < SYMPTOM_CATEGORIES.length - 1 ? 'Next' : 'See Results'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
