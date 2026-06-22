'use client'

import React, { useState } from 'react'
import { getPref, setPref } from '@/lib/prefs'
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
  Cloud,
  Bell
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getAutoUpdatePref, setAutoUpdatePref } from '@/lib/auto-update-check'
import { getAutoSyncPref, setAutoSyncPref } from '@/lib/auto-sync'
import { ensureNotificationPermission } from '@/lib/services/notification-service'
import { VISIBILITY_SECTIONS } from '@/lib/visibility-sections'
import PersonalizationPanel from '@/components/customize/personalization-panel'
import { UserRound } from 'lucide-react'

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
  { id: 'theme-wicked', name: 'Pink & Green', emoji: '💚', description: 'Glinda-pink meets Elphaba-green' },
  { id: 'theme-light', name: 'Light Mode', emoji: '☀️', description: 'Clean and bright' },
  { id: 'theme-colorblind', name: 'High Contrast', emoji: '👁️', description: 'Accessibility focused' },
  { id: 'theme-taupe', name: 'Tone It Down Taupe', emoji: '🟫', description: 'No motion, no sparkle — a calm beige room' },
]

function applyTheme(themeId: string) {
  const oldTheme = document.querySelector('link[data-theme]')
  if (oldTheme) oldTheme.remove()

  // theme-calm is the ONLY theme bundled statically (layout.tsx) — every other
  // theme, INCLUDING lavender, loads its CSS on demand from /styles/themes/.
  // (This used to skip 'theme-lavender' from when lavender was the bundled
  // default; that was stale, so picking Lavender Garden in onboarding added the
  // body class but never loaded its stylesheet — the one theme that wouldn't apply.)
  if (themeId !== 'theme-calm') {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `/styles/themes/${themeId}.css`
    link.setAttribute('data-theme', themeId)
    document.head.appendChild(link)
  }

  document.body.className = document.body.className.replace(/theme-\w+/g, '') + ` ${themeId}`
  setPref('chaos-theme', themeId)
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
        suggestsTrackers: ['cardiac', 'dysautonomia'],
        suggestsFlag: 'Holter monitor or event monitor if palpitations are frequent'
      },
      {
        id: 'heartbeat-skip',
        label: 'Feeling your heartbeat skip, pause, or do a flip',
        detail: "PVCs/PACs — usually benign but worth documenting frequency and triggers",
        suggestsTrackers: ['cardiac', 'dysautonomia'],
        suggestsFlag: 'ECG and possible Holter monitor'
      },
      {
        id: 'chest-pain',
        label: 'Chest pain or tightness (not during a panic attack)',
        suggestsTrackers: ['cardiac', 'dysautonomia', 'pain'],
        suggestsFlag: 'Cardiac workup — don\'t let anyone dismiss chest pain as anxiety without testing first'
      },
      {
        id: 'sob-minimal',
        label: 'Short of breath with minimal effort',
        detail: "Winded from walking across the room or climbing a few stairs",
        suggestsTrackers: ['respiratory', 'dysautonomia', 'energy'],
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
        suggestsTrackers: ['cardiac', 'dysautonomia', 'vitals'],
      },
      {
        id: 'random-tachycardia',
        label: 'Heart rate spikes randomly — eating, showering, lying down',
        detail: "Inappropriate sinus tachycardia or autonomic dysfunction — not 'just anxiety'",
        suggestsTrackers: ['cardiac', 'dysautonomia'],
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
      {
        id: 'postpartum-recovery',
        label: 'Recently gave birth — tracking recovery (yours or baby\'s)',
        detail: "Postpartum bodies (and newborns) deserve their own log, not a footnote.",
        suggestsTrackers: ['postpartum', 'reproductive'],
      },
    ]
  },
  {
    id: 'msk-neuro',
    title: 'Joints, Muscles & Nerves',
    icon: '🦴',
    description: "Bendy joints, weak muscles, and nerve weirdness",
    symptoms: [
      {
        id: 'joints-hypermobile',
        label: 'Joints that bend too far, dislocate, or "pop out"',
        detail: "Hypermobility isn't just being 'flexible' — subluxations and dislocations are tracked for a reason",
        suggestsTrackers: ['joint', 'autoimmune'],
        suggestsFlag: 'Hypermobility / EDS assessment (Beighton score)'
      },
      {
        id: 'joints-migrating-pain',
        label: 'Joint pain that moves around, or flares unpredictably',
        suggestsTrackers: ['joint', 'autoimmune'],
        suggestsFlag: 'Inflammatory / autoimmune panel (ANA, RF, anti-CCP) if joints swell or flare'
      },
      {
        id: 'muscle-weakness',
        label: 'Muscle weakness, or limbs that "give out"',
        suggestsTrackers: ['neuro'],
        suggestsFlag: 'Neuromuscular workup (EMG / nerve conduction) if weakness is real, not just fatigue'
      },
      {
        id: 'twitching-cramps',
        label: 'Muscle twitching, cramps, or fasciculations',
        suggestsTrackers: ['neuro', 'joint'],
      },
      {
        id: 'numbness-tingling',
        label: 'Numbness, tingling, or "pins and needles" that isn\'t from sitting wrong',
        suggestsTrackers: ['neuro'],
        suggestsFlag: 'Neuropathy workup if persistent or spreading'
      },
    ]
  },
  {
    id: 'skin',
    title: 'Skin & Healing',
    icon: '🩹',
    description: "Skin reactions, slow healing, and connective-tissue clues",
    symptoms: [
      {
        id: 'rashes-recurrent',
        label: 'Rashes, hives, or skin reactions that keep coming back',
        suggestsTrackers: ['skin', 'autoimmune'],
      },
      {
        id: 'slow-healing-bruising',
        label: 'Slow-healing wounds, or bruising more easily than seems normal',
        suggestsTrackers: ['skin'],
        suggestsFlag: 'Clotting / connective-tissue / nutrient workup if frequent'
      },
      {
        id: 'stretchy-skin',
        label: 'Skin that\'s unusually stretchy or soft, or scars that heal strangely',
        detail: "Soft/hyperextensible skin + bendy joints can point to a connective-tissue condition",
        suggestsTrackers: ['skin', 'autoimmune', 'joint'],
        suggestsFlag: 'Connective-tissue (EDS) assessment'
      },
    ]
  },
  {
    id: 'endocrine',
    title: 'Blood Sugar, Thyroid & Hormones',
    icon: '🧪',
    description: "Metabolic and endocrine patterns",
    symptoms: [
      {
        id: 'blood-sugar-swings',
        label: 'Shaky, sweaty, or foggy when you haven\'t eaten — or crash after meals',
        detail: "Blood-sugar swings (including reactive lows after eating) are worth a log + a glucose check",
        suggestsTrackers: ['diabetes', 'energy'],
        suggestsFlag: 'Fasting glucose + HbA1c (and reactive-hypoglycemia eval if it\'s post-meal)'
      },
      {
        id: 'temp-intolerance',
        label: 'Can\'t tolerate heat or cold the way other people seem to',
        suggestsTrackers: ['thyroid', 'dysautonomia'],
        suggestsFlag: 'Thyroid panel (TSH, free T4/T3)'
      },
      {
        id: 'hair-weight-changes',
        label: 'Unexplained hair loss, weight changes, or temperature shifts',
        suggestsTrackers: ['thyroid'],
        suggestsFlag: 'Thyroid + metabolic panel'
      },
      {
        id: 'salt-craving-crashes',
        label: 'Intense salt cravings, or big crashes with stress or standing',
        suggestsTrackers: ['adrenal', 'dysautonomia', 'hydration'],
        suggestsFlag: 'Consider adrenal/cortisol evaluation if persistent (esp. with low BP)'
      },
    ]
  },
  {
    id: 'gu',
    title: 'Bladder & Plumbing',
    icon: '💧',
    description: "Urinary symptoms (bowel stuff lives in Gut Stuff)",
    symptoms: [
      {
        id: 'urinary-urgency',
        label: 'Urinary urgency, frequency, or "gotta go NOW"',
        suggestsTrackers: ['gu'],
      },
      {
        id: 'bladder-pain-retention',
        label: 'Bladder pain, or trouble fully emptying',
        suggestsTrackers: ['gu'],
        suggestsFlag: 'Urology referral (e.g. interstitial cystitis or retention) if persistent'
      },
    ]
  },
  {
    id: 'ent',
    title: 'Ears, Nose & Throat',
    icon: '👂',
    description: "Sinus, hearing, balance, and swallowing",
    symptoms: [
      {
        id: 'tinnitus-vertigo',
        label: 'Ringing ears, vertigo, or room-spinning dizziness',
        suggestsTrackers: ['ent', 'dysautonomia'],
        suggestsFlag: 'ENT / vestibular evaluation'
      },
      {
        id: 'sound-sensitivity',
        label: 'Everything is too loud (or weirdly muffled) — noise overwhelms or you can\'t filter it',
        detail: "Sound sensitivity (hyperacusis) and trouble filtering noise are sensory-processing things, not just hearing — common with autism, migraine, and dysautonomia.",
        suggestsTrackers: ['sensory', 'ent'],
      },
      {
        id: 'chronic-congestion',
        label: 'Chronic sinus congestion, post-nasal drip, or recurrent sore throat',
        suggestsTrackers: ['ent'],
      },
      {
        id: 'swallowing-trouble',
        label: 'Trouble swallowing, or food/pills "getting stuck"',
        suggestsTrackers: ['ent', 'upper-digestive'],
        suggestsFlag: 'Swallow study if persistent'
      },
    ]
  },
  {
    id: 'respiratory-oxygen',
    title: 'Breathing & Oxygen',
    icon: '🫁',
    description: "Breathing patterns and oxygen — beyond just 'winded'",
    symptoms: [
      {
        id: 'breathless-lying',
        label: 'Breathless lying flat, or waking up gasping',
        suggestsTrackers: ['respiratory'],
        suggestsFlag: 'Sleep study + cardiac/pulmonary evaluation'
      },
      {
        id: 'oxygen-drops',
        label: 'Oxygen levels dip (if you\'ve checked with a pulse oximeter)',
        detail: "If your O2 drops with activity or sleep, that's data worth charting",
        suggestsTrackers: ['pulse-oximetry', 'respiratory'],
        suggestsFlag: 'Overnight oximetry / sleep study'
      },
      {
        id: 'chronic-cough-wheeze',
        label: 'Chronic cough or wheeze',
        suggestsTrackers: ['respiratory'],
      },
    ]
  },
  {
    id: 'substances',
    title: 'Substances & Intake',
    icon: '🧪',
    description: "Track how what you take affects how you feel (no judgment)",
    symptoms: [
      {
        id: 'substance-effects',
        label: 'Want to track how alcohol, caffeine, nicotine, or cannabis affect your symptoms',
        detail: "Caffeine and alcohol genuinely move dysautonomia, sleep, and migraine — tracking ≠ judgment",
        suggestsTrackers: ['substance'],
      },
    ]
  },
]

// Map onboarding short-ids to human-readable names (shown on the results screen).
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
  'mental-health': 'Mind & Mood',
  'anxiety': 'Anxiety Tracker',
  'sensory': 'Sensory Tracker',
  'coping': 'Coping & Regulation',
  'crisis': 'Crisis Support',
  'movement': 'Movement Tracker',
  'weather': 'Weather & Environment',
  'reproductive': 'Reproductive Health',
  'self-care': 'Self-Care Tracker',
  // Newer trackers (CHA-314/315 era) — were never reachable from onboarding.
  'cardiac': 'Heart / Cardiac',
  'respiratory': 'Respiratory',
  'joint': 'Joint & MSK',
  'neuro': 'Neuro / Neuromuscular',
  'autoimmune': 'Autoimmune / Connective Tissue',
  'skin': 'Skin',
  'endocrine': 'Endocrine (Diabetes/Thyroid/Adrenal)',
  'diabetes': 'Blood Sugar / Diabetes',
  'thyroid': 'Thyroid',
  'adrenal': 'Adrenal',
  'gu': 'Genitourinary (GU)',
  'ent': 'Ear, Nose & Throat',
  'postpartum': 'Postpartum & Newborn',
  'pulse-oximetry': 'Pulse Oximetry',
  'vitals': 'Vitals',
  'hydration': 'Hydration',
  'substance': 'Substances',
}

// THE RECONCILIATION MAP (load-bearing). Onboarding speaks in short ids; the
// section pages + /customize panel hide trackers by a per-section "visibility
// id" stored in chaos-<section>-hidden-trackers (see lib/visibility-sections.ts
// and the manifest's id-alias rule). These two namespaces DIFFER (pain ↔
// pain-tracking, coping ↔ coping-regulation, bathroom ↔ digestive-health …),
// so onboarding's old hide step — short ids written to the wrong single key —
// silently did nothing. Translate every recommended short id to its real
// visibility id here before writing the hide lists.
// diabetes/thyroid/adrenal collapse to the 'endocrine' hub (how the Body page
// surfaces them).
const VIS_ID: Record<string, string> = {
  // Body
  pain: 'pain-tracking',
  'head-pain': 'head-pain',
  cardiac: 'cardiac',
  dysautonomia: 'dysautonomia',
  respiratory: 'respiratory',
  seizure: 'seizure-tracking',
  joint: 'joint',
  neuro: 'neuro',
  autoimmune: 'autoimmune',
  bathroom: 'digestive-health',
  'upper-digestive': 'upper-digestive',
  skin: 'skin',
  reproductive: 'reproductive-health',
  'food-allergens': 'food-allergens',
  weather: 'weather-environment',
  endocrine: 'endocrine',
  diabetes: 'endocrine',
  thyroid: 'endocrine',
  adrenal: 'endocrine',
  gu: 'gu',
  ent: 'ent',
  postpartum: 'postpartum',
  'pulse-oximetry': 'pulse-oximetry',
  vitals: 'vitals',
  // Mind
  'brain-fog': 'brain-fog',
  'mental-health': 'mental-health-general',
  anxiety: 'anxiety-tracker',
  sensory: 'sensory-tracker',
  'self-care': 'self-care-tracker',
  coping: 'coping-regulation',
  crisis: 'crisis-support',
  // Choice
  sleep: 'sleep',
  hydration: 'hydration',
  'food-choice': 'food-choice',
  movement: 'movement',
  energy: 'energy',
  substance: 'substance',
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0) // 0 = theme, 1 = intro, 2-N+1 = categories, last = results
  const [selectedTheme, setSelectedTheme] = useState(getPref('chaos-theme') || 'theme-calm')
  const [bounceIntensity, setBounceIntensity] = useState(parseInt(getPref('chaos-bounce-intensity') || '10'))
  const [confettiLevel, setConfettiLevel] = useState<'none' | 'low' | 'medium' | 'high'>(
    (getPref('chaos-confetti-level') as any) || 'medium'
  )
  const [autoUpdate, setAutoUpdate] = useState<boolean>(getAutoUpdatePref())
  const [autoSync, setAutoSync] = useState<boolean>(getAutoSyncPref())
  const [enableNotifs, setEnableNotifs] = useState<boolean>(
    typeof window !== 'undefined' && localStorage.getItem('chaos-notifications-enabled') === 'true'
  )

  // Onboarding notification opt-in. Turning it on flips the master switch + the
  // medication-reminder category and asks the OS for permission right here (the
  // natural moment to prompt). Times are still set per-med in Manage; this just
  // makes sure reminders are allowed to fire. Off by default — opt-in.
  const handleEnableNotifs = (v: boolean) => {
    setEnableNotifs(v)
    if (typeof window === 'undefined') return
    localStorage.setItem('chaos-notifications-enabled', v ? 'true' : 'false')
    localStorage.setItem('chaos-medication-reminders', v ? 'true' : 'false')
    if (v) void ensureNotificationPermission()
    // Let any mounted reminder-sync components reconcile to the new setting.
    window.dispatchEvent(new Event('chaos-notif-settings-changed'))
  }
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set())

  const totalSteps = SYMPTOM_CATEGORIES.length + 3 // theme + personalization + intro + categories + results

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
    const recommendedShortIds = trackers.map(t => t.tracker)

    // Translate onboarding short-ids -> the REAL per-section visibility ids that
    // the section pages + /customize actually hide by. (Old code wrote short ids
    // to a single wrong key, so curation silently no-op'd — see VIS_ID above.)
    const recommendedViz = new Set(
      recommendedShortIds.map(id => VIS_ID[id]).filter(Boolean)
    )

    // Write each section's hidden list to ITS OWN key. Curate a section ONLY if
    // the user surfaced at least one symptom relevant to it — otherwise leave it
    // fully visible, so picking (say) heart symptoms doesn't nuke the whole Mind
    // page to empty. Manage (medications/records/admin) is never auto-hidden.
    // Everything stays re-enableable from each section page or /customize.
    for (const section of VISIBILITY_SECTIONS) {
      if (section.id === 'manage') continue
      const sectionHasRecommendation = section.trackers.some(t => recommendedViz.has(t.id))
      const hidden = sectionHasRecommendation
        ? section.trackers.filter(t => !recommendedViz.has(t.id)).map(t => t.id)
        : []
      localStorage.setItem(section.storageKey, JSON.stringify(hidden))
    }

    // Mark complete globally AND per-PIN
    localStorage.setItem('chaos-onboarding-complete', 'true')
    const pin = localStorage.getItem('chaos-user-pin')
    if (pin) {
      localStorage.setItem(`chaos-onboarding-complete-${pin}`, 'true')
      // They set personalization in the "Make It Yours" step — don't re-prompt.
      localStorage.setItem(`chaos-personalization-prompted-${pin}`, 'true')
    }

    // Save symptom selections for potential future reference
    localStorage.setItem('chaos-onboarding-symptoms', JSON.stringify([...selectedSymptoms]))

    router.push('/')
  }

  const skipOnboarding = () => {
    localStorage.setItem('chaos-onboarding-complete', 'true')
    const pin = localStorage.getItem('chaos-user-pin')
    if (pin) {
      localStorage.setItem(`chaos-onboarding-complete-${pin}`, 'true')
      localStorage.setItem(`chaos-personalization-prompted-${pin}`, 'true')
    }
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
                  <span className="text-xs">{theme.description}</span>
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
                    setPref('chaos-bounce-intensity', v.toString())
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
                        setPref('chaos-confetti-level', opt.value)
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
                  checked={enableNotifs}
                  onCheckedChange={(checked) => handleEnableNotifs(checked === true)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-pink-600" />
                    <span className="text-sm font-medium">Remind me to take my meds</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Off by default. Turn this on to let Chaos Command send you medication
                    reminders. For privacy, popups never show the drug name unless you ask them
                    to — by default they just say "time for your medication." You'll set the
                    times per-med later; this just allows reminders. Change anytime in
                    Settings → Notifications.
                  </p>
                </div>
              </label>

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

              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                <Checkbox
                  checked={autoSync}
                  onCheckedChange={(checked) => {
                    const v = checked === true
                    setAutoSync(v)
                    setAutoSyncPref(v)
                  }}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Auto-sync between my devices</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Off by default. When on, your daily survival click silently
                    syncs with every device you've paired (max once per hour).
                    Local-WiFi only — your data never leaves your network.
                    You'll need to pair devices first via the Sync page; turning
                    this on now without paired devices is harmless.
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

  // PERSONALIZATION STEP — "make this yours" before the clinical checklist
  if (currentStep === 1) {
    return (
      // h-screen + overflow-y-auto so the long panel scrolls to Back/Next
      // (app body is overflow-hidden); min-h-full centers when it fits.
      <div className="h-screen overflow-y-auto bg-background">
        <div className="min-h-full flex items-center justify-center p-3 sm:p-6">
          <Card className="max-w-2xl w-full">
            <CardContent className="p-4 sm:p-8 space-y-6">
              <div className="text-center space-y-2">
                <UserRound className="h-10 w-10 text-primary mx-auto" />
                <h1 className="text-2xl font-bold">Make It Yours</h1>
                <p className="text-muted-foreground">
                  Your name and the words that fit you. All optional, all private, all changeable anytime in Customize.
                </p>
              </div>

              <PersonalizationPanel />

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setCurrentStep(0)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={() => setCurrentStep(2)} className="flex items-center gap-2">
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // INTRO STEP
  if (currentStep === 2) {
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
              <Button onClick={() => setCurrentStep(3)} className="flex items-center gap-2">
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
  if (currentStep === SYMPTOM_CATEGORIES.length + 3) {
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
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/40">
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
  const categoryIndex = currentStep - 3
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
