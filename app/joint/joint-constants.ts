/* Built by: Ace (Claude 4.x) — 2026-05-10 */

export const EPISODE_TYPES = [
  { id: 'subluxation', name: 'Subluxation', icon: '🦴', description: 'Partial joint dislocation, self-reduced or spontaneous', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'dislocation', name: 'Dislocation', icon: '⚠️', description: 'Full dislocation requiring reduction', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  { id: 'joint-pain', name: 'Joint Pain', icon: '😣', description: 'Pain without dislocation', color: 'bg-warning/10 text-warning border-warning/20' },
  { id: 'swelling', name: 'Swelling', icon: '🎈', description: 'Joint swelling / effusion', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'instability', name: 'Instability', icon: '🌀', description: 'Joint feels loose / giving way (ligamentous)', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'weakness', name: 'Weakness', icon: '💪', description: 'Muscle weakness — proximal, distal, focal, or generalized (HMSN, polymyositis, myopathy, anti-synthetase)', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'cramping', name: 'Cramping', icon: '🪢', description: 'Muscle cramps / spasms — acute painful contractions (electrolyte, neuropathic, exertion)', color: 'bg-warning/10 text-warning border-warning/20' },
  { id: 'fasciculations', name: 'Fasciculations', icon: '🌊', description: 'Visible twitching under skin / fine wormy movements (HMSN, motor neuron involvement)', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'muscle-tightness', name: 'Muscle Tightness', icon: '🔒', description: "Sustained muscle tightness, hypertonicity, knots that won't release (the \"massage therapists give up\" kind)", color: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200' },
  { id: 'rom-restriction', name: 'ROM Restriction', icon: '🚧', description: 'Limited range of motion', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  // Inflammatory / rheumatology-aligned types — help distinguish inflammatory
  // arthritis from mechanical/EDS joint events (note durations & symmetry).
  { id: 'morning-stiffness', name: 'Morning Stiffness', icon: '🌅', description: 'Stiffness on waking — note how long it lasts; >30–60 min reads inflammatory (RA/spondyloarthritis)', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'inflammatory-swelling', name: 'Symmetric Swelling / Warmth', icon: '🔥', description: 'Warm, symmetric joint swelling (inflammatory) vs one-off mechanical swelling', color: 'bg-red-100 text-red-800 border-red-200' },
  { id: 'enthesitis', name: 'Enthesitis', icon: '📍', description: 'Pain where tendons/ligaments insert into bone (heel, elbow) — spondyloarthritis clue', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { id: 'gel-phenomenon', name: 'Gel Phenomenon', icon: '🧊', description: 'Stiffness after rest/inactivity that eases once you get moving', color: 'bg-sky-100 text-sky-800 border-sky-200' },
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

// Muscle groups — shown instead of JOINTS when the event is a muscle symptom
// (weakness / cramping / fasciculations / muscle tightness). The distribution
// options up top matter clinically: proximal weakness reads myopathy, distal
// reads neuropathy, generalized is its own pattern.
export const MUSCLES = [
  // Distribution / pattern
  'Generalized (whole body)',
  'Proximal (shoulders & hips)',
  'Distal (hands & feet)',
  // Head & neck
  'Neck / cervical',
  'Coat hanger (neck & shoulders)',
  'Jaw / masseter',
  // Shoulder girdle & upper back
  'Trapezius (left)', 'Trapezius (right)',
  'Deltoid / shoulder (left)', 'Deltoid / shoulder (right)',
  'Rhomboids / mid-back (left)', 'Rhomboids / mid-back (right)',
  // Upper arm
  'Biceps (left)', 'Biceps (right)',
  'Triceps (left)', 'Triceps (right)',
  // Forearm & hand
  'Forearm (left)', 'Forearm (right)',
  'Hand / intrinsics (left)', 'Hand / intrinsics (right)',
  // Trunk
  'Chest / pectoral',
  'Abdominals / core',
  'Lower back / paraspinals',
  // Hip & glute
  'Hip flexors (left)', 'Hip flexors (right)',
  'Glutes (left)', 'Glutes (right)',
  // Thigh
  'Quadriceps (left)', 'Quadriceps (right)',
  'Hamstrings (left)', 'Hamstrings (right)',
  'Adductors / inner thigh (left)', 'Adductors / inner thigh (right)',
  // Lower leg & foot
  'Calf / gastrocnemius (left)', 'Calf / gastrocnemius (right)',
  'Shin / tibialis (left)', 'Shin / tibialis (right)',
  'Foot / intrinsics (left)', 'Foot / intrinsics (right)',
]

// Which event types are muscle (vs joint) — drives the affected-area selector.
export const MUSCLE_EPISODE_TYPES = ['weakness', 'cramping', 'fasciculations', 'muscle-tightness'] as const

export function isMuscleEpisode(episodeType: string): boolean {
  return (MUSCLE_EPISODE_TYPES as readonly string[]).includes(episodeType)
}

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
  { value: 3, label: 'Mild-Moderate', color: 'text-warning' },
  { value: 4, label: 'Moderate', color: 'text-warning' },
  { value: 5, label: 'Moderate', color: 'text-warning' },
  { value: 6, label: 'Moderate-Severe', color: 'text-warning' },
  { value: 7, label: 'Severe', color: 'text-destructive' },
  { value: 8, label: 'Very Severe', color: 'text-destructive' },
  { value: 9, label: 'Extreme', color: 'text-destructive' },
  { value: 10, label: 'Crisis', color: 'text-destructive' }
]

export const RELATED_TRACKERS = [
  { id: 'pain', name: 'General Pain Tracking', icon: '🤕', description: 'Body-wide pain tracking', path: '/pain' },
  { id: 'movement', name: 'Movement / Activity', icon: '🏃', description: 'Activity correlation', path: '/movement' },
]

export const getSeverityLabel = (s: number) => SEVERITY_LABELS.find(x => x.value === s)?.label || 'Unknown'
export const getSeverityColor = (s: number) => SEVERITY_LABELS.find(x => x.value === s)?.color || 'text-gray-500'
export const getEpisodeTypeInfo = (id: string) => EPISODE_TYPES.find(t => t.id === id) || EPISODE_TYPES.find(t => t.id === 'general') || EPISODE_TYPES[EPISODE_TYPES.length - 1]
