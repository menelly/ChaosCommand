/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-05-10 (CHA-156 v2 refactor)
 *
 * Open source under PolyForm Noncommercial 1.0.0.
 * Co-invented by Ren (vision) and Ace (implementation).
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * FOOD ALLERGENS / REACTIONS TYPES (v2)
 * Multi-modal: covers IgE-mediated allergy (anaphylaxis-capable),
 * celiac/autoimmune (different pattern — GI/joint/cognitive without
 * airway), and other intolerances.
 *
 * Built fresh after Luka's celiac diagnosis 2026-05-10. Celiac
 * reactions don't fit the EpiPen-anaphylaxis frame — they're GI-
 * dominant slow-burn autoimmune flares with joint, fatigue, and
 * neuro symptoms. The tracker distinguishes the two patterns so
 * neither gets shoehorned into the wrong red-flag logic.
 */

export type FoodReactionEpisodeType =
  | 'mild'                    // mild IgE — itching, mild GI, no airway
  | 'moderate'                // moderate IgE — hives, GI, mild swelling
  | 'severe-anaphylaxis'      // 🚨 multisystem — EpiPen + 911 territory
  | 'celiac-autoimmune'       // celiac / NCGS / IBD-like flare
  | 'intolerance'             // FODMAP, lactose, histamine, etc.
  | 'confirmed-exposure'      // known allergen — track ingestion + reaction
  | 'unknown-trigger'         // got sick, don't know why yet
  | 'general'

export type ReactionSeverity = 'Mild' | 'Moderate' | 'Severe' | 'Life-threatening'

export interface FoodAllergenEntry {
  id?: string
  timestamp: string
  date?: string

  // CLASSIFICATION
  episodeType: FoodReactionEpisodeType

  // ALLERGEN / TRIGGER
  allergenName: string
  exposureSource?: string
  exposureRoute?: 'ingested' | 'cross-contamination' | 'airborne' | 'topical' | 'unknown'
  knownAllergen?: boolean  // true if matched against the known-allergens registry

  // SEVERITY
  reactionSeverity: ReactionSeverity
  reactionSeverityScore?: number  // 0-10

  // TIMING
  reactionTime?: string     // time from exposure to first symptoms
  recoveryTime?: string

  // SYMPTOMS — categorized for analytics + red-flag detection
  symptoms: string[]
  // RED-FLAG SYMPTOM CATEGORIES (auto-derived from symptoms list,
  // also explicit fields for clarity in analytics)
  hivesPresent?: boolean
  swellingPresent?: boolean      // face / lips / tongue / throat
  throatTightness?: boolean      // 🚨 airway involvement
  difficultyBreathing?: boolean  // 🚨 airway / lung involvement
  difficultySwallowing?: boolean
  voiceChange?: boolean          // hoarseness — early airway
  giSymptoms?: boolean
  hypotension?: boolean          // 🚨 anaphylactic shock
  rapidHeartbeat?: boolean
  lossOfConsciousness?: boolean  // 🚨

  // CELIAC / AUTOIMMUNE PATTERN (different than IgE)
  brainFogAfter?: boolean
  jointPainAfter?: boolean
  fatigueAfter?: boolean
  moodChangesAfter?: boolean
  delayedReaction?: boolean      // hours-to-days after exposure (celiac/intolerance)
  delayedReactionHours?: number

  // TREATMENT
  epipenUsed?: boolean
  epipenDosesUsed?: number       // 1 or 2 — dosing matters clinically
  otherMedsUsed?: string[]       // benadryl, prednisone, zofran, etc.
  treatmentGiven?: string[]
  emergencyServicesCalled?: boolean
  erVisitRequired?: boolean
  hospitalizedOvernight?: boolean

  // OUTCOME
  fullyRecovered?: boolean

  // ATTACHMENTS
  attachmentImages?: string[]    // photos of hives, food labels, etc.

  // META
  notes?: string
  tags?: string[]

  // === LEGACY FIELDS (preserved for back-compat with v1 entries) ===
  emergencyContacted?: boolean
  emergencyNotes?: string
  otherMedsUsedLegacy?: string  // v1 stored as string instead of array
}

export interface KnownAllergen {
  id?: string
  name: string
  type?: 'IgE-allergy' | 'Celiac' | 'NCGS' | 'Intolerance' | 'Sensitivity' | 'Other'
  severity: ReactionSeverity
  diagnosedBy?: string
  diagnosedDate?: string
  diagnosticTest?: string  // e.g., "tTG-IgA + DGP-IgA + IgG"
  commonSymptoms: string[]
  emergencyPlan: string
  avoidanceNotes: string
  crossReactivity: string[]
  tags: string[]
  isActive: boolean
  created_at: string
  updated_at: string
}

export interface FoodAllergensModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<FoodAllergenEntry, 'id'>) => void
  editingEntry?: FoodAllergenEntry | null
  initialEpisodeType?: FoodReactionEpisodeType
  knownAllergens?: KnownAllergen[]
}
