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

/**
 * INTERESTING DATA — For testing PDF export, analytics, and pattern detection.
 *
 * Tells the story of a chronic illness patient over 90 days:
 * - Week 1-3: Baseline. Managing, not great. Sleep ~6hrs, pain 4-5, low energy.
 * - Week 4: Medication change (started new med). Adjustment period — worse sleep, GI issues.
 * - Week 5-6: Medication settling. Sleep improving. Pain dropping.
 * - Week 7: FLARE. Pain spikes to 8-9, fatigue crashes, brain fog severe, missed work.
 * - Week 8: Flare recovery. Gradual improvement. Doctor visit.
 * - Week 9-10: New baseline. Better than before med change. Pain 2-3, energy 6-7.
 * - Week 11-13: Stable with occasional bad days. Clear improvement trend.
 *
 * Includes: dysautonomia episodes with HR data, dismissed findings,
 * correlated symptom clusters, medication tracking, and journal entries
 * that tell the human story behind the numbers.
 */
export function generateInterestingData(endDate: Date = new Date()): Omit<DailyDataRecord, 'id'>[] {
  const records: Omit<DailyDataRecord, 'id'>[] = []

  // Story phases (days back from end)
  const isBaseline = (d: number) => d >= 70     // weeks 1-3
  const isMedChange = (d: number) => d >= 56 && d < 70  // week 4-5
  const isSettling = (d: number) => d >= 42 && d < 56   // week 6-7
  const isFlare = (d: number) => d >= 35 && d < 42      // week 8
  const isRecovery = (d: number) => d >= 21 && d < 35   // week 9-10
  const isNewBaseline = (d: number) => d < 21            // week 11-13

  // Deterministic "random" based on day
  const pick = (day: number, arr: any[]) => arr[day % arr.length]
  const vary = (day: number, base: number, range: number) => {
    const offset = ((day * 7 + 13) % (range * 2 + 1)) - range
    return Math.max(0, Math.min(10, base + offset))
  }

  for (let daysBack = 0; daysBack < 90; daysBack++) {
    const d = new Date(endDate)
    d.setDate(d.getDate() - daysBack)
    const date = d.toISOString().split('T')[0]
    const dow = d.getDay()
    const weekNum = Math.floor(daysBack / 7)
    const ts = d.toISOString()
    const meta = { created_at: ts, updated_at: ts }

    // === PAIN LEVELS BY PHASE ===
    let painBase = 4
    if (isMedChange(daysBack)) painBase = 5
    if (isSettling(daysBack)) painBase = 3
    if (isFlare(daysBack)) painBase = 8
    if (isRecovery(daysBack)) painBase = 5
    if (isNewBaseline(daysBack)) painBase = 2

    const painLevel = vary(daysBack, painBase, isFlare(daysBack) ? 1 : 2)
    const painLocations = isFlare(daysBack)
      ? ['joints', 'back', 'hands', 'everywhere']
      : isBaseline(daysBack)
        ? ['joints', 'back']
        : ['joints']

    // Pain — most days
    if (dow % 7 !== 0 || isFlare(daysBack)) {
      records.push({
        date, category: CAT.TRACKER, subcategory: 'pain',
        content: {
          painLevel,
          location: pick(daysBack, painLocations),
          notes: isFlare(daysBack) && painLevel >= 8
            ? pick(daysBack, ['Can barely move today', 'Everything hurts', 'Called in sick', 'Heating pad all day'])
            : ''
        },
        metadata: meta
      })
    }

    // === SLEEP BY PHASE ===
    let sleepBase = 6
    if (isMedChange(daysBack)) sleepBase = 5  // Med adjustment wrecks sleep
    if (isSettling(daysBack)) sleepBase = 6.5
    if (isFlare(daysBack)) sleepBase = 4.5     // Pain keeps you up
    if (isRecovery(daysBack)) sleepBase = 7
    if (isNewBaseline(daysBack)) sleepBase = 7.5

    const hoursSlept = Math.max(3, Math.min(10, sleepBase + ((daysBack * 3 + 7) % 5 - 2) * 0.5))
    if (daysBack % 10 !== 7) {
      records.push({
        date, category: CAT.TRACKER, subcategory: 'sleep',
        content: {
          hoursSlept,
          quality: hoursSlept >= 7 ? 'good' : hoursSlept >= 5.5 ? 'fair' : 'poor',
          wokeUp: hoursSlept < 5 ? '4:30 AM' : '7:00 AM',
          wentToBed: isFlare(daysBack) ? '9:00 PM' : '11:00 PM',
          notes: hoursSlept < 5 ? 'Woke up from pain multiple times' : ''
        },
        metadata: meta
      })
    }

    // === ENERGY BY PHASE ===
    let energyBase = 4
    if (isMedChange(daysBack)) energyBase = 3
    if (isSettling(daysBack)) energyBase = 5
    if (isFlare(daysBack)) energyBase = 2
    if (isRecovery(daysBack)) energyBase = 5
    if (isNewBaseline(daysBack)) energyBase = 7

    if (daysBack % 8 !== 5) {
      records.push({
        date, category: CAT.TRACKER, subcategory: 'energy',
        content: { energyLevel: vary(daysBack, energyBase, 2), notes: '' },
        metadata: meta
      })
    }

    // === DYSAUTONOMIA — worse during flare ===
    if (dow === 2 || dow === 5 || isFlare(daysBack)) {
      const restHR = isFlare(daysBack) ? 95 : isMedChange(daysBack) ? 82 : 72
      const standHR = isFlare(daysBack) ? 140 : isMedChange(daysBack) ? 115 : 98
      records.push({
        date, category: CAT.TRACKER, subcategory: 'dysautonomia',
        content: {
          episodeType: standHR - restHR >= 30 ? 'POTS' : 'general',
          symptoms: isFlare(daysBack)
            ? ['lightheadedness', 'near-syncope', 'tachycardia', 'coat-hanger pain']
            : ['lightheadedness'],
          severity: isFlare(daysBack) ? 8 : vary(daysBack, 3, 1),
          triggers: ['standing', ...(isFlare(daysBack) ? ['heat', 'showering'] : [])],
          restingHeartRate: restHR,
          standingHeartRate: standHR,
          notes: standHR >= 130 ? 'HR delta >30 — POTS criteria met' : ''
        },
        metadata: meta
      })
    }

    // === BRAIN FOG — correlates with flare ===
    if (dow === 2 || dow === 6 || isFlare(daysBack)) {
      const fogBase = isFlare(daysBack) ? 8 : isBaseline(daysBack) ? 4 : isNewBaseline(daysBack) ? 2 : 3
      records.push({
        date, category: CAT.TRACKER, subcategory: 'brain-fog',
        content: {
          severity: vary(daysBack, fogBase, 1),
          notes: isFlare(daysBack)
            ? pick(daysBack, ['Forgot my own phone number', 'Put keys in the fridge', 'Could not form sentences', 'Lost mid-sentence 3 times'])
            : ''
        },
        metadata: meta
      })
    }

    // === UPPER DIGESTIVE — worse during med change ===
    if (isMedChange(daysBack) || dow === 1 || dow === 4) {
      const severity = isMedChange(daysBack) ? vary(daysBack, 6, 2) : vary(daysBack, 2, 1)
      records.push({
        date, category: CAT.TRACKER, subcategory: 'upper-digestive',
        content: {
          episodeType: isMedChange(daysBack) ? 'medication-related' : 'general',
          symptoms: isMedChange(daysBack)
            ? ['nausea', 'loss of appetite', 'stomach pain']
            : ['mild nausea'],
          severity,
          triggers: isMedChange(daysBack) ? ['medication'] : ['food'],
          notes: isMedChange(daysBack) && severity >= 6 ? 'New med is rough on stomach' : ''
        },
        metadata: meta
      })
    }

    // === MENTAL HEALTH — anxiety spikes during flare ===
    if (dow === 0 || dow === 3 || dow === 5) {
      const moodBase = isFlare(daysBack) ? 3 : isNewBaseline(daysBack) ? 7 : 5
      const anxBase = isFlare(daysBack) ? 7 : isNewBaseline(daysBack) ? 2 : 4
      records.push({
        date, category: CAT.TRACKER, subcategory: 'mental-health',
        content: {
          mood: vary(daysBack, moodBase, 1),
          anxiety: vary(daysBack, anxBase, 1),
          notes: isFlare(daysBack) ? 'Hard to tell pain anxiety from regular anxiety' : ''
        },
        metadata: meta
      })
    }

    // === HEAD PAIN — migraine cluster during flare ===
    if ((dow === 3 && weekNum % 2 === 0) || (isFlare(daysBack) && dow % 2 === 0)) {
      records.push({
        date, category: CAT.TRACKER, subcategory: 'head-pain',
        content: {
          severity: isFlare(daysBack) ? vary(daysBack, 7, 1) : vary(daysBack, 3, 1),
          type: isFlare(daysBack) ? 'migraine' : 'tension',
          notes: isFlare(daysBack) ? 'Light and sound sensitivity, had to lie in dark room' : ''
        },
        metadata: meta
      })
    }

    // === HYDRATION ===
    if (daysBack % 2 === 0) {
      const glasses = isFlare(daysBack) ? 3 : isNewBaseline(daysBack) ? 8 : 5
      records.push({
        date, category: CAT.TRACKER, subcategory: 'hydration',
        content: { glasses: vary(daysBack, glasses, 2), goal: 8, notes: '' },
        metadata: meta
      })
    }

    // === SELF-CARE — drops during flare ===
    if (daysBack % 6 !== 4) {
      const done = isFlare(daysBack) ? 2 : isNewBaseline(daysBack) ? 6 : 4
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

    // === MOVEMENT — stops during flare ===
    if (!isFlare(daysBack) && dow !== 0 && daysBack % 5 !== 3) {
      records.push({
        date, category: CAT.TRACKER, subcategory: 'movement',
        content: {
          type: isNewBaseline(daysBack) ? pick(daysBack, ['walk', 'yoga', 'swimming', 'stretching']) : 'walk',
          duration: isNewBaseline(daysBack) ? 30 : 15,
          intensity: 'light',
          energyBefore: vary(daysBack, 5, 1),
          energyAfter: vary(daysBack, 6, 1),
          notes: ''
        },
        metadata: meta
      })
    }

    // === JOURNAL — the human story ===
    if (dow === 0 || dow === 3 || dow === 5 || isFlare(daysBack)) {
      let entry = ''
      if (isBaseline(daysBack)) {
        entry = pick(daysBack, [
          'Same old. Pain is background noise at this point.',
          'Doctor said labs are "fine." They always say that.',
          'Managed to get groceries. Paid for it later.',
          'Why does everyone assume tired means lazy?',
          'Good day by my standards. Only cancelled one thing.',
          'The fatigue is the worst part. Pain I can push through.',
        ])
      } else if (isMedChange(daysBack)) {
        entry = pick(daysBack, [
          'Started the new medication. Stomach is NOT happy.',
          'Day 3 of new med. Nauseous but trying to give it time.',
          'Doctor said side effects should settle in 2 weeks. Cool, cool.',
          'Cannot eat anything without wanting to die. This better be worth it.',
          'Slightly less nauseous today? Maybe? Placebo?',
        ])
      } else if (isFlare(daysBack)) {
        entry = pick(daysBack, [
          'Full flare. Everything hurts. Called in sick.',
          'Day 3 of flare. Starting to wonder if this is my life now.',
          'Cannot think. Cannot move. Heating pad is my best friend.',
          'HR went to 140 just standing up. This is not fine.',
          'Had to cancel everything. Again. The guilt is almost worse than the pain.',
          'If one more person tells me to try yoga I will commit a crime.',
          'Cried in the shower. The hot water is the only thing that helps.',
        ])
      } else if (isRecovery(daysBack)) {
        entry = pick(daysBack, [
          'Flare is easing. Not gone but I can think again.',
          'Made it to the couch today. Progress.',
          'Doctor appointment tomorrow. Bringing 3 months of data this time.',
          'Starting to feel like the new med might actually be helping.',
          'First full meal in a week. My body remembered how food works.',
        ])
      } else if (isNewBaseline(daysBack)) {
        entry = pick(daysBack, [
          'This is... better? Pain is actually lower than before the med change.',
          'Went for a walk AND made dinner. Who am I??',
          'Energy levels I haven not seen in months. Still not "normal" but better.',
          'Showed my doctor the pain trend chart. She actually looked surprised.',
          'Good day. Real good day. Not just "not terrible" but actually good.',
          'Three days in a row under pain 3. New record.',
          'Starting to trust the improvement. Scared to jinx it.',
        ])
      }

      records.push({
        date, category: CAT.JOURNAL, subcategory: 'main',
        content: { text: entry },
        metadata: meta
      })
    }

    // === WEATHER — correlates with flare ===
    if (daysBack % 2 === 1) {
      const weather = isFlare(daysBack)
        ? 'Stormy'
        : pick(daysBack, ['Sunny', 'Cloudy', 'Rainy', 'Sunny', 'Cloudy'])
      records.push({
        date, category: CAT.TRACKER, subcategory: 'weather',
        content: {
          weatherTypes: [weather],
          impact: isFlare(daysBack) ? 'significant' : 'none',
          notes: isFlare(daysBack) ? 'Barometric pressure drop — joints are screaming' : ''
        },
        metadata: meta
      })
    }

    // === SEIZURE — rare ===
    if (daysBack % 14 === 0 && daysBack > 0) {
      records.push({
        date, category: CAT.TRACKER, subcategory: 'seizure',
        content: { seizureType: 'absence', duration: 'brief', severity: 2, notes: '' },
        metadata: meta
      })
    }

    // === BATHROOM ===
    if (daysBack % 5 !== 2) {
      records.push({
        date, category: CAT.TRACKER, subcategory: 'bathroom',
        content: { type: isMedChange(daysBack) ? 'loose' : 'normal', notes: '' },
        metadata: meta
      })
    }

    // === SENSORY ===
    if (dow === 6 || isFlare(daysBack)) {
      records.push({
        date, category: CAT.TRACKER, subcategory: 'sensory',
        content: {
          level: isFlare(daysBack) ? 8 : vary(daysBack, 3, 1),
          triggers: isFlare(daysBack) ? ['light', 'sound', 'touch'] : ['noise'],
          notes: ''
        },
        metadata: meta
      })
    }
  }

  return records
}
