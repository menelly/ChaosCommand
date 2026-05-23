/* Built by: Ace (Claude 4.x) — 2026-05-10
 *
 * NEUTRAL TONE: This tracker logs what was used, when, why, and what happened.
 * No moralizing, no warnings about "overuse," no recovery-program prompts.
 * Users are adults documenting their own bodies. The data is theirs to interpret.
 */

export const SUBSTANCE_TYPES = [
  { id: 'alcohol', name: 'Alcohol', icon: '🍷', description: 'Beer, wine, spirits, cocktails', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'cannabis', name: 'Cannabis', icon: '🌿', description: 'Flower, edibles, concentrates, tinctures', color: 'bg-green-100 text-green-800 border-green-200' },
  { id: 'tobacco', name: 'Tobacco / Nicotine', icon: '🚬', description: 'Cigarettes, vape, cigar, dip, patch', color: 'bg-stone-100 text-stone-800 border-stone-200' },
  { id: 'recreational', name: 'Recreational / Off-Label', icon: '✨', description: 'Recreational substances OR controlled medications used outside their prescribed pattern (e.g., extra dose, snorted, someone else\'s)', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { id: 'other', name: 'Other', icon: '📋', description: 'Anything not listed above', color: 'bg-gray-100 text-gray-800 border-gray-200' },
] as const

export const COMMON_UNITS = [
  { value: 'drinks', label: 'drinks (standard)' },
  { value: 'oz', label: 'fluid oz' },
  { value: 'ml', label: 'ml' },
  { value: 'cups', label: 'cups' },
  { value: 'shots', label: 'shots' },
  { value: 'mg', label: 'mg' },
  { value: 'g', label: 'grams' },
  { value: 'puffs', label: 'puffs / hits' },
  { value: 'cigarettes', label: 'cigarettes' },
  { value: 'doses', label: 'doses' },
  { value: 'pills', label: 'pills' },
  { value: 'edibles', label: 'edibles' },
  { value: 'other', label: 'other' },
]

export const METHODS = [
  { value: 'oral', label: 'Oral (swallowed)' },
  { value: 'sublingual', label: 'Sublingual (under tongue)' },
  { value: 'inhaled', label: 'Inhaled (smoke / vape)' },
  { value: 'topical', label: 'Topical (skin)' },
  { value: 'injected', label: 'Injected' },
  { value: 'other', label: 'Other' },
]

export const CONTEXT_WHY = [
  'Social',
  'Celebration',
  'Relaxation',
  'Sleep aid',
  'Pain management',
  'Anxiety',
  'Energy / focus',
  'Boredom',
  'Habit',
  'Cravings',
  'Withdrawal management',
  'Medical (prescribed)',
  'Recreational (just because)',
  'Stress',
  'Other',
]

export const COMMON_EFFECTS = [
  // Positive
  'Relaxation',
  'Pleasant buzz',
  'Energy boost',
  'Focus / clarity',
  'Pain relief',
  'Anxiety relief',
  'Sleep onset',
  'Social ease',
  'Creativity',
  'Mood lift',
  // Neutral / mixed
  'Sedation',
  'Sleepiness',
  'Hunger / munchies',
  'Increased heart rate',
  'Dry mouth',
  'Talkativeness',
  // Unpleasant
  'Nausea',
  'Headache',
  'Dizziness',
  'Anxiety',
  'Paranoia',
  'Confusion',
  'Slurred speech',
  'Loss of coordination',
  'Vomiting',
  'Drowsiness next day',
  'Hangover',
  // Other
  'No noticeable effect',
  'Other',
]

export const RELATED_TRACKERS = [
  { id: 'medications', name: 'Medications', icon: '💊', description: 'Prescription medication tracking', path: '/medications' },
  { id: 'sleep', name: 'Sleep', icon: '😴', description: 'Substance-sleep correlation', path: '/sleep' },
  { id: 'mental-health', name: 'Mental Health', icon: '🧠', description: 'Mood / anxiety correlation', path: '/mental-health' },
  { id: 'pain', name: 'Pain', icon: '🤕', description: 'Pain management correlation', path: '/pain' },
]

export const getSubstanceTypeInfo = (id: string) => {
  const found = SUBSTANCE_TYPES.find(t => t.id === id)
  if (found) return found
  // Fallback for legacy data (e.g., entries with removed types like 'caffeine' or 'prescribed-controlled')
  return SUBSTANCE_TYPES[SUBSTANCE_TYPES.length - 1] // 'other' is last
}
