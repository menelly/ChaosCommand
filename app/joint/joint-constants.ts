/* Built by: Ace (Claude 4.x) — 2026-05-10 */

export const EPISODE_TYPES = [
  { id: 'subluxation', name: 'Subluxation', icon: '🦴', description: 'Partial joint dislocation, self-reduced or spontaneous', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'dislocation', name: 'Dislocation', icon: '⚠️', description: 'Full dislocation requiring reduction', color: 'bg-red-100 text-red-800 border-red-200' },
  { id: 'joint-pain', name: 'Joint Pain', icon: '😣', description: 'Pain without dislocation', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'swelling', name: 'Swelling', icon: '🎈', description: 'Joint swelling / effusion', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'instability', name: 'Instability', icon: '🌀', description: 'Joint feels loose / giving way', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'rom-restriction', name: 'ROM Restriction', icon: '🚧', description: 'Limited range of motion', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { id: 'general', name: 'General Joint Event', icon: '🦴', description: 'Mixed or other joint event', color: 'bg-stone-100 text-stone-800 border-stone-200' },
] as const

export const JOINTS = [
  // Upper extremity
  'Jaw / TMJ (left)', 'Jaw / TMJ (right)',
  'Shoulder (left)', 'Shoulder (right)',
  'Elbow (left)', 'Elbow (right)',
  'Wrist (left)', 'Wrist (right)',
  'Fingers MCP (left)', 'Fingers MCP (right)',
  'Fingers PIP (left)', 'Fingers PIP (right)',
  'Fingers DIP (left)', 'Fingers DIP (right)',
  'Thumb (left)', 'Thumb (right)',
  // Spine
  'Cervical spine (neck)',
  'Thoracic spine (upper back)',
  'Lumbar spine (lower back)',
  'Sacroiliac (left)', 'Sacroiliac (right)',
  'Ribs',
  // Lower extremity
  'Hip (left)', 'Hip (right)',
  'Knee (left)', 'Knee (right)',
  'Patella (left)', 'Patella (right)',
  'Ankle (left)', 'Ankle (right)',
  'Foot (left)', 'Foot (right)',
  'Toes (left)', 'Toes (right)',
]

export const TRIGGER_ACTIVITIES = [
  'Reaching overhead',
  'Lifting',
  'Twisting',
  'Pushing / pulling',
  'Turning over in sleep',
  'Sleeping in unusual position',
  'Sitting too long',
  'Standing too long',
  'Walking',
  'Stairs',
  'Sneezing / coughing',
  'Stretching',
  'Yoga / exercise',
  'Carrying child / pet',
  'Spontaneous (no clear cause)',
  'Other',
]

export const TREATMENTS = [
  'Ice',
  'Heat',
  'Compression / brace',
  'Splint',
  'Sling',
  'Self-reduction',
  'Manual reduction (someone helped)',
  'ER reduction',
  'NSAID (ibuprofen, naproxen)',
  'Acetaminophen (Tylenol)',
  'Topical analgesic',
  'Muscle relaxant',
  'Rest / immobilization',
  'Taping (KT, athletic)',
  'Physical therapy',
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
  { value: 10, label: 'Crisis', color: 'text-red-800' }
]

export const RELATED_TRACKERS = [
  { id: 'pain', name: 'General Pain Tracking', icon: '🤕', description: 'Body-wide pain tracking', path: '/pain' },
  { id: 'movement', name: 'Movement / Activity', icon: '🏃', description: 'Activity correlation', path: '/movement' },
]

export const getSeverityLabel = (s: number) => SEVERITY_LABELS.find(x => x.value === s)?.label || 'Unknown'
export const getSeverityColor = (s: number) => SEVERITY_LABELS.find(x => x.value === s)?.color || 'text-gray-500'
export const getEpisodeTypeInfo = (id: string) => EPISODE_TYPES.find(t => t.id === id) || EPISODE_TYPES[6]
