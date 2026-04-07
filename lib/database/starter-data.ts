/**
 * STARTER DATA — G-SPOT PROTOCOL v5
 *
 * One fixed set of 90 days of plausible "demo data" for every tracker.
 * Not random. Not generated. FIXED. Same every time.
 *
 * Cover story: "Oh, that? Yeah, I downloaded the app months ago.
 * Never really used it. Probably still has the starter data."
 *
 * This is a safety feature for abuse survivors. If an abuser finds the app,
 * overwriting with starter data that looks like demo content is more
 * plausible than random bland data that looks like someone hit a panic button.
 *
 * Built by: Ace (Claude Sonnet 4.6) — April 7, 2026
 * Designed by: Ren — because they've survived the system this protects against.
 */

import { DailyDataRecord } from './dexie-db'

const CAT = {
  TRACKER: 'tracker',
  JOURNAL: 'journal',
  HEALTH: 'health',
  USER: 'user',
} as const

/**
 * Generate 90 days of starter data ending on the given date.
 * Deterministic — same input date = same output. No randomness.
 *
 * The data is intentionally boring, slightly sparse (not every tracker
 * every day — that would look fake), and internally consistent.
 */
export function generateStarterData(endDate: Date = new Date()): Omit<DailyDataRecord, 'id'>[] {
  const records: Omit<DailyDataRecord, 'id'>[] = []

  for (let daysBack = 0; daysBack < 90; daysBack++) {
    const d = new Date(endDate)
    d.setDate(d.getDate() - daysBack)
    const date = d.toISOString().split('T')[0]
    const dayOfWeek = d.getDay()  // 0=Sun, 6=Sat
    const weekNum = Math.floor(daysBack / 7)
    const ts = d.toISOString()

    const meta = { created_at: ts, updated_at: ts }

    // Sleep — most days (skip ~1 in 10)
    if (daysBack % 10 !== 7) {
      const hours = [7, 6.5, 7.5, 8, 6, 7, 7.5, 6.5, 8, 7][daysBack % 10]
      const quality = hours >= 7 ? 'good' : 'fair'
      records.push({
        date, category: CAT.TRACKER, subcategory: 'sleep',
        content: { hoursSlept: hours, quality, wokeUp: '7:00 AM', wentToBed: '11:00 PM', notes: '' },
        metadata: meta
      })
    }

    // Pain — about 3 days a week
    if (dayOfWeek % 2 === 0 || dayOfWeek === 4) {
      const level = [3, 2, 4, 3, 2, 3, 4, 2, 3, 3][daysBack % 10]
      records.push({
        date, category: CAT.TRACKER, subcategory: 'pain',
        content: { painLevel: level, location: 'general', notes: '' },
        metadata: meta
      })
    }

    // Energy — most days
    if (daysBack % 8 !== 5) {
      const level = [5, 6, 4, 5, 7, 5, 6, 4, 5, 6][daysBack % 10]
      records.push({
        date, category: CAT.TRACKER, subcategory: 'energy',
        content: { energyLevel: level, notes: '' },
        metadata: meta
      })
    }

    // Hydration — about half the days
    if (daysBack % 2 === 0) {
      const glasses = [6, 8, 5, 7, 6, 8, 7, 5, 6, 8][daysBack % 10]
      records.push({
        date, category: CAT.TRACKER, subcategory: 'hydration',
        content: { glasses, goal: 8, notes: '' },
        metadata: meta
      })
    }

    // Movement — about 4 days a week
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && daysBack % 5 !== 3) {
      const types = ['walk', 'stretching', 'walk', 'light exercise', 'walk']
      const durations = [20, 15, 30, 20, 15]
      records.push({
        date, category: CAT.TRACKER, subcategory: 'movement',
        content: {
          type: types[daysBack % 5],
          duration: durations[daysBack % 5],
          intensity: 'light',
          energyBefore: 5, energyAfter: 6,
          notes: ''
        },
        metadata: meta
      })
    }

    // Food choice — most days, simple entries
    if (daysBack % 7 !== 6) {
      const meals = [2, 3, 2, 3, 2, 3, 3, 2, 3, 2][daysBack % 10]
      records.push({
        date, category: CAT.TRACKER, subcategory: 'food-choice',
        content: {
          simpleEntries: { didEat: true, mealType: 'mixed', mood: 'neutral', notes: '' },
          generalNotes: '',
          totalMeals: meals
        },
        metadata: meta
      })
    }

    // Upper digestive — about 2 days a week
    if (dayOfWeek === 1 || dayOfWeek === 4) {
      const severity = [3, 2, 4, 2, 3][weekNum % 5]
      records.push({
        date, category: CAT.TRACKER, subcategory: 'upper-digestive',
        content: {
          episodeType: 'general',
          symptoms: ['mild nausea'],
          severity,
          triggers: ['food'],
          notes: ''
        },
        metadata: meta
      })
    }

    // Dysautonomia — about 2 days a week
    if (dayOfWeek === 2 || dayOfWeek === 5) {
      records.push({
        date, category: CAT.TRACKER, subcategory: 'dysautonomia',
        content: {
          episodeType: 'general',
          symptoms: ['lightheadedness'],
          severity: [3, 2, 3, 4, 2][weekNum % 5],
          triggers: ['standing'],
          restingHeartRate: 72,
          standingHeartRate: 95,
          notes: ''
        },
        metadata: meta
      })
    }

    // Head pain — about once a week
    if (dayOfWeek === 3 && weekNum % 2 === 0) {
      records.push({
        date, category: CAT.TRACKER, subcategory: 'head-pain',
        content: {
          severity: [3, 4, 3, 2, 3][weekNum % 5],
          type: 'tension',
          notes: ''
        },
        metadata: meta
      })
    }

    // Mental health — about 3 days a week
    if (dayOfWeek === 0 || dayOfWeek === 3 || dayOfWeek === 5) {
      records.push({
        date, category: CAT.TRACKER, subcategory: 'mental-health',
        content: {
          mood: [6, 5, 7, 6, 5, 6, 7, 5, 6, 6][daysBack % 10],
          anxiety: [3, 4, 2, 3, 4, 3, 2, 4, 3, 3][daysBack % 10],
          notes: ''
        },
        metadata: meta
      })
    }

    // Anxiety — about twice a week
    if (dayOfWeek === 1 || dayOfWeek === 4) {
      records.push({
        date, category: CAT.TRACKER, subcategory: 'anxiety',
        content: {
          level: [3, 4, 2, 3, 3][weekNum % 5],
          triggers: [],
          notes: ''
        },
        metadata: meta
      })
    }

    // Brain fog — about twice a week
    if (dayOfWeek === 2 || dayOfWeek === 6) {
      records.push({
        date, category: CAT.TRACKER, subcategory: 'brain-fog',
        content: {
          severity: [3, 2, 4, 3, 2][weekNum % 5],
          notes: ''
        },
        metadata: meta
      })
    }

    // Self-care — most days
    if (daysBack % 6 !== 4) {
      const done = (daysBack % 3) + 4  // 4-6 out of 7
      records.push({
        date, category: CAT.TRACKER, subcategory: 'self-care',
        content: {
          items: [
            { id: 'wash', label: 'Washed the important bits', checked: done >= 1 },
            { id: 'teeth', label: 'Brushed teeth', checked: done >= 2 },
            { id: 'hair', label: 'Took care of hair', checked: done >= 3 },
            { id: 'meds', label: 'Took medications', checked: done >= 4 },
            { id: 'water', label: 'Drank water', checked: done >= 5 },
            { id: 'food', label: 'Fed the flesh suit', checked: done >= 6 },
            { id: 'moved', label: 'Moved your body', checked: done >= 7 },
          ],
          completedCount: done,
          totalCount: 7,
        },
        metadata: meta
      })
    }

    // Weather — about half the days
    if (daysBack % 2 === 1) {
      const types = ['Sunny', 'Cloudy', 'Rainy', 'Sunny', 'Cloudy']
      records.push({
        date, category: CAT.TRACKER, subcategory: 'weather',
        content: {
          weatherTypes: [types[daysBack % 5]],
          impact: 'none',
          notes: ''
        },
        metadata: meta
      })
    }

    // Sensory — about once a week
    if (dayOfWeek === 6) {
      records.push({
        date, category: CAT.TRACKER, subcategory: 'sensory',
        content: {
          level: [3, 2, 4, 3, 2][weekNum % 5],
          triggers: ['noise'],
          notes: ''
        },
        metadata: meta
      })
    }

    // Bathroom — most days
    if (daysBack % 5 !== 2) {
      records.push({
        date, category: CAT.TRACKER, subcategory: 'bathroom',
        content: { type: 'normal', notes: '' },
        metadata: meta
      })
    }

    // Seizure — very rare (about once every 2 weeks)
    if (daysBack % 14 === 0 && daysBack > 0) {
      records.push({
        date, category: CAT.TRACKER, subcategory: 'seizure',
        content: {
          seizureType: 'absence',
          duration: 'brief',
          severity: 2,
          notes: ''
        },
        metadata: meta
      })
    }

    // Reproductive — about once a week (skip if irrelevant, but starter data has it)
    if (dayOfWeek === 1 && weekNum % 2 === 0) {
      records.push({
        date, category: CAT.TRACKER, subcategory: 'reproductive',
        content: { cycleDay: (daysBack % 28) + 1, symptoms: [], notes: '' },
        metadata: meta
      })
    }

    // Food allergens — rare
    if (daysBack % 12 === 0 && daysBack > 0) {
      records.push({
        date, category: CAT.TRACKER, subcategory: 'food-allergens',
        content: { allergen: 'dairy', severity: 'mild', symptoms: ['mild bloating'], notes: '' },
        metadata: meta
      })
    }

    // Coping — about once a week
    if (dayOfWeek === 0) {
      records.push({
        date, category: CAT.TRACKER, subcategory: 'coping',
        content: { strategy: 'deep breathing', effectiveness: 3, notes: '' },
        metadata: meta
      })
    }

    // Journal — sparse (about twice a week, very short)
    if (dayOfWeek === 0 || dayOfWeek === 4) {
      const entries = [
        'Quiet day.',
        'Feeling okay.',
        'Got some things done.',
        'Tired but managing.',
        'Nothing notable.',
        'Decent day overall.',
        'Kind of foggy today.',
        'Better than yesterday.',
        'Slow start but okay.',
        'Just getting through it.',
      ]
      records.push({
        date, category: CAT.JOURNAL, subcategory: 'main',
        content: { text: entries[daysBack % entries.length] },
        metadata: meta
      })
    }

    // Daily prompts — sparse
    if (dayOfWeek === 3 && weekNum % 2 === 0) {
      records.push({
        date, category: CAT.JOURNAL, subcategory: 'daily-prompts',
        content: {
          promptId: 'energy-check',
          response: 'About average.',
          isDismissed: false,
          respondedAt: ts
        },
        metadata: meta
      })
    }
  }

  return records
}

/**
 * Total subcategories covered by starter data.
 * Used for verification / display.
 */
export const STARTER_DATA_TRACKERS = [
  'sleep', 'pain', 'energy', 'hydration', 'movement', 'food-choice',
  'upper-digestive', 'dysautonomia', 'head-pain', 'mental-health',
  'anxiety', 'brain-fog', 'self-care', 'weather', 'sensory', 'bathroom',
  'seizure', 'reproductive', 'food-allergens', 'coping',
  'main', 'daily-prompts'
] as const
