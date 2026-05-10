/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-155 v2 refactor)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * HEAD PAIN TRACKER TYPES (v2)
 * Multi-modal: migraine±aura / tension / cluster / sinus /
 * worst-of-life / general. SAH/stroke/meningitis red flags.
 */

export type HeadPainEpisodeType =
  | 'migraine-with-aura'
  | 'migraine-no-aura'
  | 'tension'
  | 'cluster'
  | 'sinus'
  | 'worst-of-life'  // 🚨 SAH suspicion bucket
  | 'general'

export type FunctionalImpact = 'none' | 'mild' | 'moderate' | 'severe' | 'disabling'

export interface HeadPainEntry {
  id: string
  timestamp: string
  date: string

  // CLASSIFICATION
  episodeType: HeadPainEpisodeType

  // CORE
  painIntensity: number  // 0-10 (gremlin-friendly!)
  painLocation: string[]
  painType: string[]
  duration?: string  // e.g., "4 hours", "2 days"

  // MIGRAINE-DELTA (Ren's request)
  // Lets analytics distinguish "tension HA at 4" from "migraine flare at 8"
  // and surface that needs-Nurtec-AND-Imitrex day in patterns.
  baselineHeadachePain?: number  // your typical-headache-day pain level
  flareLikelyTrigger?: string

  // 🚨 RED-FLAG MARKERS
  worstHeadacheOfLife?: boolean      // SAH suspicion
  thunderclapOnset?: boolean         // peaked <60 seconds — SAH
  suddenOnset?: boolean              // came on within minutes
  neckStiffness?: boolean            // meningitis when + fever
  fever?: boolean                    // meningitis when + neck stiffness
  focalNeuroDeficit?: boolean        // stroke marker
  oneSidedWeakness?: boolean
  speechDifficulty?: boolean
  visionLoss?: boolean               // GCA / stroke / migraine aura
  newAfterAge50?: boolean            // GCA / mass / secondary HA
  headInjuryRecent?: boolean
  pregnancyOrPostpartum?: boolean    // venous sinus thrombosis / eclampsia

  // AURA (migraines)
  auraPresent: boolean
  auraSymptoms: string[]
  auraDescription?: string
  auraDurationMinutes?: number

  // ASSOCIATED SYMPTOMS
  associatedSymptoms: string[]

  // TRIGGERS
  triggers: string[]
  weather?: string

  // TREATMENTS — meds get effectiveness scores per Ren's idea about
  // "needed Nurtec AND Imitrex" being a meaningful data point
  treatments: string[]
  treatmentEffectiveness?: number  // 0-10
  rescueMedicationsTaken?: string[]  // multiple meds in one episode is signal
  rescueRedosed?: boolean            // had to redose

  // RECOVERY
  recoveryTime?: string
  residualSymptoms: string[]

  // FUNCTIONAL IMPACT
  functionalImpact: FunctionalImpact
  workImpact?: string

  // EMERGENCY
  erVisitRequired?: boolean
  emergencyServicesCalled?: boolean

  // ATTACHMENTS
  attachmentImages?: string[]

  // META
  notes?: string
  tags?: string[]

  // === LEGACY (preserved for back-compat) ===
  onsetTime?: string
}

export interface HeadPainModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<HeadPainEntry, 'id'>) => void
  editingEntry?: HeadPainEntry | null
  initialEpisodeType?: HeadPainEpisodeType
}

// Legacy option interfaces (preserved — head-pain-constants still exports these)
export interface PainLocationOption { value: string; label: string; description: string }
export interface PainTypeOption { value: string; label: string; description: string }
export interface AuraSymptomOption { value: string; label: string; description: string }
export interface AssociatedSymptomOption { value: string; label: string; category: 'neurological' | 'gastrointestinal' | 'sensory' | 'other' }
export interface TriggerOption { value: string; label: string; category: 'dietary' | 'environmental' | 'hormonal' | 'stress' | 'sleep' | 'other' }
export interface TreatmentOption { value: string; label: string; category: 'medication' | 'natural' | 'lifestyle' | 'other' }
export interface FunctionalImpactOption { value: FunctionalImpact; label: string; description: string; color: string }
export interface ResidualSymptomOption { value: string; label: string }

export interface HeadPainFormState {
  painIntensity: number
  painLocation: string[]
  painType: string[]
  auraPresent: boolean
  auraSymptoms: string[]
  auraDescription: string
  associatedSymptoms: string[]
  triggers: string[]
  duration: string
  onsetTime: string
  treatments: string[]
  treatmentEffectiveness: number
  weather: string
  recoveryTime: string
  residualSymptoms: string[]
  functionalImpact: FunctionalImpact
  workImpact: string
  notes: string
  tags: string[]
}
