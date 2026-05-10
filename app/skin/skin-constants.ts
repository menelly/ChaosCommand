/*
 * Built by: Ace (Claude 4.x) — 2026-05-10
 * Co-invented by Ren (vision) and Ace (implementation)
 */

import { SpreadingPattern } from './skin-types'

export const EPISODE_TYPES = [
  { id: 'rash', name: 'Rash', icon: '🩹', description: 'Generic skin rash, redness, or eruption', color: 'bg-red-100 text-red-800 border-red-200' },
  { id: 'hives', name: 'Hives', icon: '🎯', description: 'Raised welts, often itchy, allergic-pattern', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { id: 'eczema-flare', name: 'Eczema Flare', icon: '🌵', description: 'Atopic dermatitis flare, dry/inflamed/itchy patches', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'mole-lesion', name: 'Mole / Lesion', icon: '⚫', description: 'New, changing, or concerning mole or growth (ABCDE check)', color: 'bg-stone-100 text-stone-800 border-stone-200' },
  { id: 'wound', name: 'Wound', icon: '🩸', description: 'Cut, scrape, burn, abrasion, or laceration', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'sunburn', name: 'Sunburn', icon: '☀️', description: 'UV-induced burn, mild to severe', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 'allergic-contact', name: 'Contact Reaction', icon: '🌿', description: 'Suspected contact allergen (poison ivy, nickel, fragrance, etc.)', color: 'bg-green-100 text-green-800 border-green-200' },
  { id: 'general', name: 'General Skin Event', icon: '🧴', description: 'Other / mixed skin observation', color: 'bg-purple-100 text-purple-800 border-purple-200' },
] as const

export const BODY_LOCATIONS = [
  'Face',
  'Scalp',
  'Neck',
  'Chest',
  'Back (upper)',
  'Back (lower)',
  'Abdomen',
  'Arms (upper)',
  'Arms (forearms)',
  'Hands',
  'Wrists',
  'Hips / Buttocks',
  'Genital area',
  'Legs (thighs)',
  'Legs (lower)',
  'Knees',
  'Ankles',
  'Feet',
  'Inside elbows',
  'Behind knees',
  'Mouth / lips',
  'Eyes / eyelids',
  'Ears',
  'Other',
]

export const CHARACTER_OPTIONS = [
  'red',
  'raised',
  'flat',
  'scaly',
  'oozing',
  'crusted',
  'blistered',
  'pigmented',
  'pustular',
  'necrotic',
]

export const SUSPECTED_TRIGGERS = [
  // Food
  'Food allergen (known)',
  'Food allergen (suspected new food)',
  // Environmental
  'Plant contact (poison ivy/oak/sumac)',
  'Pollen / outdoor allergens',
  'Pet dander',
  'Dust mites',
  'Heat / sweat',
  'Cold / dry air',
  'Sun exposure',
  'Chlorinated pool',
  // Chemical / contact
  'New laundry detergent',
  'New soap / body wash',
  'New lotion / sunscreen',
  'Fragrance / perfume',
  'Nickel (jewelry/belt)',
  'Latex',
  'Rubber',
  // Medication
  'New medication',
  'Antibiotic',
  'NSAID',
  'Sulfa drug',
  // Insect
  'Insect bite',
  'Insect sting',
  'Tick',
  // Stress / hormonal
  'Stress / anxiety',
  'Menstrual cycle',
  'Pregnancy / postpartum',
  // Illness
  'Concurrent infection / virus',
  // Unknown
  'No identifiable trigger',
]

export const TREATMENTS = [
  'Topical steroid (hydrocortisone)',
  'Prescription topical steroid',
  'Antihistamine (oral)',
  'Antihistamine (topical)',
  'Cool compress',
  'Aloe',
  'Moisturizer / emollient',
  'Calamine / pramoxine',
  'Antibiotic ointment',
  'Wound dressing',
  'Bleach bath',
  'Oatmeal bath',
  'Avoid trigger',
  'Prescription oral steroid (prednisone)',
  'Antibiotics (oral)',
  'Epinephrine (EpiPen)',
  'ER / urgent care',
  'No treatment',
]

export const SPREADING_OPTIONS: { value: SpreadingPattern; label: string }[] = [
  { value: 'localized', label: 'Localized — not spreading' },
  { value: 'spreading-slowly', label: 'Spreading slowly (hours)' },
  { value: 'spreading-fast', label: 'Spreading fast (minutes)' },
  { value: 'symmetric', label: 'Symmetric (both sides of body equally)' },
  { value: 'asymmetric', label: 'Asymmetric (one side only)' },
  { value: 'unknown', label: 'Unknown / not noted' },
]

export const SEVERITY_LABELS = [
  { value: 1, label: 'Very Mild', color: 'text-green-600' },
  { value: 2, label: 'Mild', color: 'text-green-500' },
  { value: 3, label: 'Mild-Moderate', color: 'text-yellow-600' },
  { value: 4, label: 'Moderate', color: 'text-yellow-500' },
  { value: 5, label: 'Moderate', color: 'text-orange-500' },
  { value: 6, label: 'Moderate-Severe', color: 'text-orange-600' },
  { value: 7, label: 'Severe', color: 'text-red-500' },
  { value: 8, label: 'Very Severe', color: 'text-red-600' },
  { value: 9, label: 'Extreme', color: 'text-red-700' },
  { value: 10, label: 'Crisis (call 911)', color: 'text-red-800' }
]

export const RELATED_TRACKERS = [
  { id: 'food-allergens', name: 'Food Allergens', icon: '🥜', description: 'Track allergen exposure', path: '/food-allergens' },
  { id: 'medications', name: 'Medications', icon: '💊', description: 'Recent med changes (SJS/DRESS suspicion)', path: '/medications' },
  { id: 'respiratory', name: 'Respiratory', icon: '🫁', description: 'Anaphylaxis cross-reference', path: '/respiratory' },
  { id: 'weather-environment', name: 'Weather / Environment', icon: '🌫️', description: 'Outdoor allergen / sun exposure', path: '/weather-environment' },
]

// 🚨 Skin red flags
export const RED_FLAG_911_CRITERIA = [
  'Hives PLUS any breathing trouble, throat tightness, or facial/lip/tongue swelling (anaphylaxis)',
  'Rash PLUS fever PLUS mucous-membrane involvement (mouth, eyes, genitals) — SJS / TEN concern',
  'Severe pain out of proportion to what you see, with violaceous (purple/black) skin and rapid spread (necrotizing concern)',
  'Rapidly spreading red streaks moving up a limb (lymphangitis) with fever',
  'Widespread blistering or skin sloughing (peeling)',
  'Recent new medication + rash + fever (drug reaction concern — SJS, DRESS, AGEP)',
  'Severe burn covering large area, or any burn with charred / white / leathery appearance',
  'Wound with pus, increasing redness, red streaks, or fever (sepsis concern)',
  'Tick bite with bullseye rash — start antibiotics (Lyme); call doctor today',
]

export const getSeverityLabel = (s: number) => SEVERITY_LABELS.find(x => x.value === s)?.label || 'Unknown'
export const getSeverityColor = (s: number) => SEVERITY_LABELS.find(x => x.value === s)?.color || 'text-gray-500'
export const getEpisodeTypeInfo = (id: string) => EPISODE_TYPES.find(t => t.id === id) || EPISODE_TYPES[7]

export const getRedFlagWarnings = (entry: {
  episodeType?: string
  severity?: number
  hivesPresent?: boolean
  swelling?: boolean
  throatTightness?: boolean
  breathingDifficulty?: boolean
  fevePresent?: boolean
  mucousMembraneInvolvement?: boolean
  newMedicationRecent?: boolean
  characterDescription?: string[]
  spreadingPattern?: string
  asymmetric?: boolean
  borderIrregular?: boolean
  colorVariable?: boolean
  diameterOver6mm?: boolean
  evolving?: boolean
}): string[] => {
  const flags: string[] = []
  const chars = entry.characterDescription || []

  // Anaphylaxis pattern: hives + airway/breathing/swelling
  const skinInvolvement = entry.hivesPresent || entry.episodeType === 'hives' || entry.swelling
  const airwayInvolvement = entry.throatTightness
  const breathingInvolvement = entry.breathingDifficulty
  if ((skinInvolvement && airwayInvolvement) || (skinInvolvement && breathingInvolvement)) {
    flags.push('ANAPHYLAXIS pattern (skin + airway/breathing) — use EpiPen if available, call 911 NOW')
  } else if (entry.swelling && (entry.episodeType === 'hives' || skinInvolvement)) {
    flags.push('Facial / lip / tongue swelling with skin involvement — anaphylaxis risk, call 911')
  }

  // SJS/TEN pattern: rash + fever + mucous membrane + recent new med
  if (entry.fevePresent && entry.mucousMembraneInvolvement) {
    flags.push('Rash + fever + mucous-membrane involvement — Stevens-Johnson Syndrome / TEN concern, call 911')
  }
  if (entry.newMedicationRecent && entry.fevePresent && (entry.episodeType === 'rash' || chars.includes('blistered'))) {
    flags.push('Recent new medication + rash + fever — drug reaction concern (SJS/DRESS), seek emergency care')
  }

  // Necrotizing
  if (chars.includes('necrotic')) {
    flags.push('Necrotic appearance — call 911 (necrotizing soft tissue infection concern)')
  }

  // Rapid spread
  if (entry.spreadingPattern === 'spreading-fast') {
    flags.push('Rapidly spreading rash — needs urgent evaluation, especially with fever or systemic symptoms')
  }

  // Severity
  if (entry.severity && entry.severity >= 9) {
    flags.push(`Severity ${entry.severity}/10 — emergency evaluation`)
  }

  // ABCDE mole
  if (entry.episodeType === 'mole-lesion') {
    const abcde = [entry.asymmetric, entry.borderIrregular, entry.colorVariable, entry.diameterOver6mm, entry.evolving].filter(Boolean).length
    if (abcde >= 2) {
      flags.push(`Mole has ${abcde} of 5 ABCDE warning features — schedule a dermatologist soon (not emergency, but don't sit on it)`)
    }
  }

  return flags
}

export const getInterimMeasures = (entry: {
  hivesPresent?: boolean
  swelling?: boolean
  throatTightness?: boolean
  breathingDifficulty?: boolean
  episodeType?: string
}): string[] => {
  const measures: string[] = []
  // Anaphylaxis-shaped → EpiPen
  if ((entry.hivesPresent || entry.episodeType === 'hives' || entry.swelling) && (entry.throatTightness || entry.breathingDifficulty)) {
    measures.push('If you have an EpiPen, USE IT NOW (outer thigh, hold 3 seconds). Call 911. Lie flat and elevate legs unless breathing is harder lying down — then sit up.')
  } else if (entry.swelling) {
    measures.push('Take antihistamine (Benadryl 25-50mg adult dose) immediately. Watch for any breathing change. If breathing becomes affected — EpiPen + 911.')
  }
  // Hives without airway involvement
  if ((entry.hivesPresent || entry.episodeType === 'hives') && !entry.throatTightness && !entry.breathingDifficulty) {
    measures.push('Antihistamine (Benadryl 25-50mg or Zyrtec 10mg). Cool compress. Avoid hot showers (raises histamine). Watch for spread or any breathing change for the next 4 hours.')
  }
  return measures
}
