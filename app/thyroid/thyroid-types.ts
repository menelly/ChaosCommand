/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Thyroid tracker types. Hypo/hyper symptom tracking, lab values (TSH/T3/T4/
 * antibodies), medication + dose response. Red flags: thyroid storm (hyper
 * emergency) and myxedema (severe hypo) warning clusters.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

export type ThyroidEpisodeType =
  | 'symptoms'   // day-to-day hypo/hyper symptom log
  | 'labs'       // TSH / T3 / T4 / antibody values
  | 'medication' // dose, timing, response
  | 'general'

export type ThyroidDirection = 'hypo' | 'hyper' | 'mixed' | 'unsure'

export type HypoSymptom =
  | 'fatigue'
  | 'cold-intolerance'
  | 'weight-gain'
  | 'constipation'
  | 'dry-skin'
  | 'hair-loss'
  | 'brain-fog'
  | 'depression'
  | 'puffiness'
  | 'slow-heart-rate'
  | 'heavy-periods'
  | 'muscle-aches'

export type HyperSymptom =
  | 'palpitations'
  | 'heat-intolerance'
  | 'weight-loss'
  | 'diarrhea'
  | 'anxiety'
  | 'tremor'
  | 'insomnia'
  | 'sweating'
  | 'rapid-heart-rate'
  | 'eye-changes'      // Graves' ophthalmopathy
  | 'light-periods'
  | 'increased-appetite'

export interface ThyroidEntry {
  id: string
  timestamp: string
  date: string
  episodeType: ThyroidEpisodeType

  direction?: ThyroidDirection
  hypoSymptoms?: HypoSymptom[]
  hyperSymptoms?: HyperSymptom[]

  // LABS (mIU/L for TSH, etc. — units vary, store as numbers + let notes hold ranges)
  tsh?: number
  freeT4?: number
  freeT3?: number
  tpoAntibodies?: number    // Hashimoto's marker
  trab?: number             // TSH-receptor antibody — Graves' marker
  labNotes?: string

  // MEDICATION
  medName?: string          // levothyroxine, liothyronine, methimazole, PTU, etc.
  medDoseMcg?: number
  takenFasting?: boolean    // levo absorption — should be empty stomach
  recentDoseChange?: boolean

  // RED FLAG clusters (user-recorded)
  // thyroid storm: fever + racing heart + agitation/confusion (hyper emergency)
  feverPresent?: boolean
  confusionAgitation?: boolean
  // myxedema: extreme cold + drowsiness/unresponsive (severe hypo emergency)
  extremeColdDrowsy?: boolean

  erVisit?: boolean
  endoNotified?: boolean

  severity: number          // 1-10 overall symptom burden
  notes?: string
  tags?: string[]
}

export interface ThyroidModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: Omit<ThyroidEntry, 'id'>) => void
  editingEntry?: ThyroidEntry | null
}
