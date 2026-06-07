/*
 * Built by: Ace (Claude 4.x) — 2026-06-07
 * Generalized Neuro / Neuromuscular tracker. Created because neuromuscular
 * symptoms (weakness, cramping, fasciculations) were living only in the MSK
 * (joint) tracker, where a neurologist would not look. Weakness/cramping/
 * fasciculations are DUAL-listed: they remain in joint AND appear here.
 * Co-invented by Ren (vision) + an MS friend (the findability catch) + Ace.
 */

export const EPISODE_TYPES = [
  { id: 'weakness', name: 'Weakness', icon: '💪', description: 'Muscle weakness — note distribution: proximal (shoulders/hips → myopathy), distal (hands/feet → neuropathy), one-sided, or generalized. Also tracked under MSK.', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'numbness-tingling', name: 'Numbness / Tingling', icon: '🫥', description: 'Paresthesia — numbness, pins-and-needles, or reduced sensation. Distribution matters: stocking-glove, a single dermatome/nerve, or one side of the body.', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'foot-drop', name: 'Foot Drop', icon: '🦶', description: 'Toe catches or trips; trouble lifting the front of the foot; a slapping/high-stepping gait (peroneal nerve, L5, or central cause).', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'falls', name: 'Falls / Near-Falls', icon: '⬇️', description: 'A fall or near-fall — note the mechanism: legs gave out, tripped (foot drop), lost balance, or blacked out.', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  { id: 'gait-balance', name: 'Gait / Balance', icon: '🚶', description: 'Unsteadiness, wide-based or veering walk, vertigo, clumsiness, or incoordination (ataxia).', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'vision', name: 'Vision Change', icon: '👁️', description: 'Blurring, double vision (diplopia), transient vision loss, or eye pain on movement (optic neuritis — MS-relevant).', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  { id: 'tremor', name: 'Tremor', icon: '🤝', description: 'Shaking — note type: at rest, with action/reaching (intention), or holding a posture.', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'spasticity-cramping', name: 'Spasticity / Cramping', icon: '🪢', description: 'Muscle cramps, spasms, stiffness, or velocity-dependent tightness (spasticity). Also tracked under MSK.', color: 'bg-warning/10 text-warning border-warning/20' },
  { id: 'fasciculations', name: 'Fasciculations', icon: '🌊', description: 'Visible twitching / fine wormy movements under the skin (motor-unit irritability). Also tracked under MSK.', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { id: 'speech-swallow', name: 'Speech / Swallowing', icon: '🗣️', description: 'Slurred speech (dysarthria), word-finding trouble, or difficulty swallowing / choking (dysphagia) — bulbar symptoms.', color: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200' },
  { id: 'sensory-episode', name: 'Sensory Episode', icon: '⚡', description: 'Electric-shock down the spine on bending the neck (Lhermitte), a banding/squeezing torso sensation (MS hug), burning, or symptoms brought on by heat (Uhthoff).', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'general', name: 'General Neuro Event', icon: '🧠', description: 'Other or mixed neurological symptom.', color: 'bg-stone-100 text-stone-800 border-stone-200' },
] as const

// Where the symptom is — neuro distribution patterns matter diagnostically.
export const DISTRIBUTION = [
  'Generalized (whole body)',
  'One side of body (left)', 'One side of body (right)',
  'Both legs', 'Both arms',
  'Proximal (shoulders & hips)', 'Distal (hands & feet)',
  'Single arm (left)', 'Single arm (right)',
  'Single leg (left)', 'Single leg (right)',
  'Hand (left)', 'Hand (right)',
  'Foot (left)', 'Foot (right)',
  'Stocking-glove (both hands & feet)',
  'Face (left)', 'Face (right)',
  'Trunk / banding',
  'Eyes / vision',
  'Mouth / throat (speech & swallow)',
  'Other',
]

export const CHARACTER_OPTIONS = [
  'constant',
  'comes & goes (intermittent)',
  'getting worse (progressive)',
  'relapsing then improving',
  'worse with heat (Uhthoff)',
  'worse with fatigue / end of day',
  'worse with exertion',
  'better with rest',
  'sudden / abrupt onset',
]

export const SUSPECTED_TRIGGERS = [
  'Heat / hot weather / hot shower',
  'Fatigue / overexertion',
  'Stress / anxiety',
  'Infection / illness',
  'Missed medication',
  'Menstrual cycle',
  'Dehydration / electrolytes',
  'Poor sleep',
  'No identifiable trigger',
]

export const TREATMENTS = [
  'Rest',
  'Cooling / cool environment',
  'Stretching',
  'Hydration / electrolytes',
  'Muscle relaxant',
  'Anti-spasticity med (baclofen, tizanidine)',
  'Gabapentin / pregabalin (neuropathic)',
  'Physical therapy',
  'Mobility aid (cane, walker, AFO brace)',
  'Prescribed neuro medication',
  'ER / urgent care',
  'No treatment',
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
  { value: 10, label: 'Crisis (call 911)', color: 'text-destructive' },
]

export const RELATED_TRACKERS = [
  { id: 'joint', name: 'Bones, Joints & Muscles (MSK)', icon: '🦴', description: 'Muscle weakness/cramping also live here', path: '/joint' },
  { id: 'head-pain', name: 'Head Pain', icon: '🤕', description: 'Headache / migraine with neuro features', path: '/head-pain' },
  { id: 'seizure', name: 'Seizure', icon: '🧠', description: 'Seizure-specific tracking', path: '/seizure' },
  { id: 'brain-fog', name: 'Brain Fog / Cognition', icon: '🌫️', description: 'Cognitive symptoms', path: '/brain-fog' },
  { id: 'dysautonomia', name: 'Dysautonomia', icon: '🌡️', description: 'Autonomic symptoms', path: '/dysautonomia' },
]

// 🚨 Neuro red flags (FAST stroke, cord/cauda, GBS, raised-ICP signs)
export const RED_FLAG_911_CRITERIA = [
  'SUDDEN one-sided weakness or numbness, facial droop, or slurred/garbled speech (FAST — stroke): note the time it started and call 911 NOW',
  'Sudden loss of vision in one or both eyes, or sudden double vision',
  'Weakness or numbness that is rapidly climbing upward from the feet/legs over hours-to-days (Guillain-Barré concern) — urgent evaluation',
  'New loss of bladder or bowel control with saddle (groin/inner-thigh) numbness or new leg weakness (cauda equina / cord compression) — emergency',
  'The worst headache of your life, sudden ("thunderclap"), especially with neck stiffness, vomiting, or new neuro signs',
  'New seizure, sudden confusion, or loss of consciousness',
  'Difficulty swallowing or breathing with new weakness',
]

export const getSeverityLabel = (s: number) => SEVERITY_LABELS.find(x => x.value === s)?.label || 'Unknown'
export const getSeverityColor = (s: number) => SEVERITY_LABELS.find(x => x.value === s)?.color || 'text-gray-500'
export const getEpisodeTypeInfo = (id: string) => EPISODE_TYPES.find(t => t.id === id) || EPISODE_TYPES[EPISODE_TYPES.length - 1]
