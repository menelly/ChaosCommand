/*
 * Built by: Ace (Claude 4.x) — 2026-06-07
 * Autoimmune / Connective-Tissue (rheumatology) tracker. Created because
 * systemic CTD symptoms — sicca, constitutional flare, serositis — had NO home
 * (skin held only cutaneous autoimmune signs; nothing tracked glandular/systemic).
 * Built to be rheum-robust, not a sicca stub. Co-invented by Ren (CTD/antisynthetase
 * expertise + the gap-catch) + Ace.
 *
 * Several types are cross-listable to other trackers (the "⇄ also log under …"
 * box): raynauds/mechanic-hands/inflammatory-rash ⇄ skin; arthralgia/
 * morning-stiffness/myalgia ⇄ joint; dysphagia ⇄ neuro. Link targets live in
 * CROSS_LIST_TARGET below.
 */

export const EPISODE_TYPES = [
  { id: 'sicca-eyes', name: 'Dry Eyes (Sicca)', icon: '👁️', description: 'Gritty, burning, dry eyes; needing artificial tears (Sjögren’s / sicca complex)', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  { id: 'sicca-mouth', name: 'Dry Mouth / Hydration Failure', icon: '💧', description: 'Dry mouth, trouble swallowing dry food, can’t stay hydrated, salivary gland swelling (sicca)', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { id: 'raynauds', name: "Raynaud's", icon: '🥶', description: 'Fingers/toes turning white→blue→red with cold or stress; numb/painful (vasospasm). Also tracked under Skin.', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'mechanic-hands', name: "Mechanic's Hands", icon: '🖐️', description: 'Cracked, fissured, scaly skin on the sides of fingers/palms (antisynthetase-specific). Also tracked under Skin.', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'inflammatory-rash', name: 'Inflammatory / Photosensitive Rash', icon: '🦋', description: 'Malar (butterfly), heliotrope, Gottron’s, or sun-triggered rash. Also tracked under Skin.', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { id: 'arthralgia', name: 'Inflammatory Joint Pain', icon: '🔥', description: 'Achy, swollen, warm joints — the inflammatory kind (vs mechanical/EDS). Also tracked under Joints.', color: 'bg-red-100 text-red-800 border-red-200' },
  { id: 'morning-stiffness', name: 'Morning Stiffness', icon: '🌅', description: 'Stiffness on waking; note how long — >30–60 min reads inflammatory. Also tracked under Joints.', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'myalgia', name: 'Muscle Pain / Inflammatory Weakness', icon: '💪', description: 'Aching, tender, or weak muscles (myositis-pattern). Also tracked under Joints.', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'constitutional', name: 'Constitutional Flare', icon: '🤒', description: 'Whole-body flare: profound fatigue, low-grade fever, malaise, brain fog, feeling "fluish" without infection', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'oral-ulcers', name: 'Oral / Nasal Ulcers', icon: '👄', description: 'Painless or painful sores in the mouth or nose (lupus/Behçet-associated)', color: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200' },
  { id: 'serositis', name: 'Serositis (Pleuritic Pain)', icon: '🫁', description: 'Sharp chest pain worse with breathing/lying down (pleuritis/pericarditis) — flag if severe', color: 'bg-warning/10 text-warning border-warning/20' },
  { id: 'lymphadenopathy', name: 'Swollen Glands / Lymph Nodes', icon: '🫧', description: 'Tender or enlarged lymph nodes (neck, armpit, groin) or salivary/parotid swelling', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'dysphagia', name: 'Difficulty Swallowing', icon: '🗣️', description: 'Food sticking, choking, or trouble swallowing (esophageal dysmotility — scleroderma/myositis). Also tracked under Neuro.', color: 'bg-violet-100 text-violet-800 border-violet-200' },
  { id: 'alopecia', name: 'Hair Loss', icon: '💇', description: 'Patchy or diffuse autoimmune hair loss (lupus, alopecia areata)', color: 'bg-stone-100 text-stone-800 border-stone-200' },
  { id: 'general', name: 'General Autoimmune Event', icon: '🧬', description: 'Other or mixed autoimmune/CTD symptom', color: 'bg-gray-100 text-gray-800 border-gray-200' },
] as const

// Which types cross-list, and to which tracker. Used by the modal to show the
// "⇄ also log under X" box and by the tracker to route the cross-list write.
export const CROSS_LIST_TARGET: Record<string, { sub: string; label: string }> = {
  'raynauds': { sub: 'skin', label: 'Skin' },
  'mechanic-hands': { sub: 'skin', label: 'Skin' },
  'inflammatory-rash': { sub: 'skin', label: 'Skin' },
  'arthralgia': { sub: 'joint', label: 'Joints & Muscles' },
  'morning-stiffness': { sub: 'joint', label: 'Joints & Muscles' },
  'myalgia': { sub: 'joint', label: 'Joints & Muscles' },
  'dysphagia': { sub: 'neuro', label: 'Neuro / Neuromuscular' },
}

// Where / what's affected — spans glands, vasculature, skin, joints, systemic.
export const AFFECTED_AREAS = [
  'Eyes', 'Mouth / salivary glands', 'Nose',
  'Fingers', 'Toes', 'Hands', 'Feet',
  'Face / cheeks', 'Scalp', 'Chest',
  'Lymph nodes (neck)', 'Lymph nodes (armpit)', 'Lymph nodes (groin)',
  'Joints (generalized)', 'Muscles (generalized)',
  'Whole body / systemic', 'Other',
]

export const CHARACTER_OPTIONS = [
  'flaring (acute)',
  'constant / chronic',
  'getting worse (progressive)',
  'relapsing then improving',
  'worse with sun / UV',
  'worse with cold',
  'worse with stress / fatigue',
  'better with rest / meds',
]

export const SUSPECTED_TRIGGERS = [
  'Sun / UV exposure',
  'Cold exposure',
  'Stress',
  'Infection / illness',
  'Missed medication',
  'Fatigue / overexertion',
  'Menstrual cycle',
  'Dehydration',
  'No identifiable trigger',
]

export const TREATMENTS = [
  'Immunosuppressant (e.g., mycophenolate/CellCept)',
  'Corticosteroid (oral)',
  'Corticosteroid (topical)',
  'Hydroxychloroquine (Plaquenil)',
  'NSAID',
  'Artificial tears / eye lubricant',
  'Saliva substitute / aggressive hydration',
  'Warming / gloves (Raynaud’s)',
  'Sun protection',
  'IVIG',
  'Rest',
  'Prescribed medication',
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
  { value: 10, label: 'Crisis (seek care)', color: 'text-destructive' },
]

export const RELATED_TRACKERS = [
  { id: 'skin', name: 'Skin', icon: '🩹', description: 'Rashes, Raynaud’s, mechanic’s hands', path: '/skin' },
  { id: 'joint', name: 'Bones, Joints & Muscles (MSK)', icon: '🦴', description: 'Dislocations, subluxations & hypermobility (EDS), inflammatory arthritis, myalgia', path: '/joint' },
  { id: 'neuro', name: 'Neuro / Neuromuscular', icon: '🧠', description: 'Weakness, dysphagia, sensory', path: '/neuro' },
  { id: 'respiratory', name: 'Respiratory', icon: '🫁', description: 'ILD / shortness of breath', path: '/respiratory' },
  { id: 'dysautonomia', name: 'Dysautonomia', icon: '🌡️', description: 'Autonomic / SpO2', path: '/dysautonomia' },
]

// 🚨 Rheumatology / CTD red flags — emergencies that ride with autoimmune disease,
// plus the immunosuppression-specific infection risk.
export const RED_FLAG_911_CRITERIA = [
  'Severe chest pain or shortness of breath, especially sharp/pleuritic or with a fast heart rate (serositis, pericardial effusion, or PE) — seek emergency care',
  'Sudden severe headache with very high blood pressure (scleroderma renal crisis) — emergency',
  'A digital (finger/toe) ulcer that is blackening, spreading, or looks infected — urgent vascular/rheum evaluation',
  'Fever while on immunosuppression (steroids, mycophenolate, etc.) — infection risk is higher and can escalate fast; call your team / urgent care',
  'Rapidly worsening muscle weakness with trouble swallowing or breathing (myositis crisis) — emergency',
  'New confusion, seizure, or stroke-like symptoms (CNS vasculitis / lupus) — call 911',
]

export const getSeverityLabel = (s: number) => SEVERITY_LABELS.find(x => x.value === s)?.label || 'Unknown'
export const getSeverityColor = (s: number) => SEVERITY_LABELS.find(x => x.value === s)?.color || 'text-gray-500'
export const getEpisodeTypeInfo = (id: string) => EPISODE_TYPES.find(t => t.id === id) || EPISODE_TYPES.find(t => t.id === 'general') || EPISODE_TYPES[EPISODE_TYPES.length - 1]
