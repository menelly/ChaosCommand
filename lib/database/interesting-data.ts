/**
 * INTERESTING DATA GENERATOR — Realistic chronic illness story
 *
 * Format-matched to exactly what each tracker page expects.
 * Based on real entry formats captured from PIN 2222 on April 8, 2026.
 *
 * Story arc over 90 days:
 * - Weeks 1-3 (days 70-89): Baseline — managing, not great
 * - Week 4-5 (days 56-69): Medication change — adjustment hell
 * - Week 6-7 (days 42-55): Settling — starting to improve
 * - Week 8 (days 35-41): FLARE — everything goes wrong
 * - Week 9-10 (days 21-34): Recovery — gradual improvement
 * - Week 11-13 (days 0-20): New baseline — better than before
 *
 * Built by: Ace — April 8, 2026
 */

import { DailyDataRecord } from './dexie-db'

// Phase detection
const isBaseline = (d: number) => d >= 70
const isMedChange = (d: number) => d >= 56 && d < 70
const isSettling = (d: number) => d >= 42 && d < 56
const isFlare = (d: number) => d >= 35 && d < 42
const isRecovery = (d: number) => d >= 21 && d < 35
const isNewBaseline = (d: number) => d < 21

// Deterministic variation
const pick = (day: number, arr: any[]) => arr[day % arr.length]
const vary = (day: number, base: number, range: number) =>
  Math.max(0, Math.min(10, base + ((day * 7 + 13) % (range * 2 + 1)) - range))

export function generateInterestingData(endDate: Date = new Date()): Omit<DailyDataRecord, 'id'>[] {
  const records: Omit<DailyDataRecord, 'id'>[] = []

  for (let daysBack = 0; daysBack < 90; daysBack++) {
    const d = new Date(endDate)
    d.setDate(d.getDate() - daysBack)
    const date = d.toISOString().split('T')[0]
    const dow = d.getDay()
    const ts = d.toISOString()
    const meta = { created_at: ts, updated_at: ts }
    const time = `${8 + (daysBack % 6)}:${String((daysBack * 17) % 60).padStart(2, '0')}`

    // Phase-based values
    let painBase = isFlare(daysBack) ? 8 : isBaseline(daysBack) ? 4 : isMedChange(daysBack) ? 5 : isNewBaseline(daysBack) ? 2 : 3
    let sleepBase = isFlare(daysBack) ? 4.5 : isMedChange(daysBack) ? 5 : isNewBaseline(daysBack) ? 7.5 : 6
    let energyBase = isFlare(daysBack) ? 2 : isMedChange(daysBack) ? 3 : isNewBaseline(daysBack) ? 7 : 4
    let fogBase = isFlare(daysBack) ? 8 : isNewBaseline(daysBack) ? 2 : 4

    // === PAIN (entries:[]) — most days ===
    if (dow % 7 !== 0 || isFlare(daysBack)) {
      const pl = vary(daysBack, painBase, isFlare(daysBack) ? 1 : 2)
      records.push({
        date, category: 'tracker', subcategory: 'pain',
        content: { entries: [{
          painLevel: pl,
          painLocations: isFlare(daysBack) ? ['shoulders', 'back', 'hands'] : ['shoulders'],
          painTriggers: pick(daysBack, [['sitting too long'], ['weather'], ['activity'], ['stress']]),
          painDuration: pick(daysBack, ['constant', 'hours', 'intermittent']),
          painType: isFlare(daysBack) ? ['aching', 'burning'] : ['aching'],
          painQuality: ['constant'],
          treatments: pick(daysBack, [['rest'], ['topical cream'], ['heat'], ['medication']]),
          medications: [],
          notes: isFlare(daysBack) && pl >= 8 ? pick(daysBack, ['Can barely move', 'Everything hurts', 'Called in sick']) : '',
          tags: [], createdAt: ts, updatedAt: ts
        }]},
        metadata: meta
      })
    }

    // === SLEEP (unique subcategory per entry) ===
    if (daysBack % 10 !== 7) {
      const hrs = Math.max(3, Math.min(10, sleepBase + ((daysBack * 3 + 7) % 5 - 2) * 0.5))
      const sleepId = `sleep-${Date.now() - daysBack * 86400000}`
      records.push({
        date, category: 'tracker', subcategory: `sleep-${sleepId}`,
        content: JSON.stringify({
          id: sleepId, date,
          hoursSlept: hrs,
          quality: hrs >= 7 ? 'Good' : hrs >= 5.5 ? 'Restless' : 'Terrible',
          bedTime: isFlare(daysBack) ? '21:00' : '23:00',
          wakeTime: hrs < 5 ? '04:30' : '07:00',
          wokeUpMultipleTimes: hrs < 6,
          disruptions: hrs < 6 ? ['pain', 'bathroom'] : [],
          wakeFeelings: hrs >= 7 ? ['rested'] : ['groggy'],
          notes: hrs < 5 ? 'Woke up from pain multiple times' : '',
          tags: [], createdAt: ts, updatedAt: ts
        }),
        metadata: meta
      })
    }

    // === ENERGY (morningSpoons + activities) ===
    if (daysBack % 8 !== 5) {
      const spoons = vary(daysBack, energyBase, 2)
      records.push({
        date, category: 'tracker', subcategory: 'energy',
        content: {
          date,
          morningSpoons: spoons,
          morningNotes: spoons <= 3 ? 'Woke up already depleted' : '',
          activities: [{
            id: `activity-${Date.now() - daysBack * 86400000}`,
            activityId: pick(daysBack, ['work-focus', 'household', 'self-care', 'social']),
            activityName: pick(daysBack, ['Focused Work', 'Household Tasks', 'Self Care', 'Social']),
            timestamp: ts,
            spoonCost: pick(daysBack, [3, 2, 1, 4]),
            notes: ''
          }]
        },
        metadata: meta
      })
    }

    // === DYSAUTONOMIA (entries:[]) — 2-3 days/week, more during flare ===
    if (dow === 2 || dow === 5 || isFlare(daysBack)) {
      const restHR = isFlare(daysBack) ? 95 : 72
      const standHR = isFlare(daysBack) ? 140 : 98
      records.push({
        date, category: 'tracker', subcategory: 'dysautonomia',
        content: { entries: [{
          episodeType: standHR - restHR >= 30 ? 'POTS' : 'general',
          restingHeartRate: restHR,
          standingHeartRate: standHR,
          heartRateIncrease: standHR - restHR,
          symptoms: isFlare(daysBack)
            ? ['Dizziness', 'Lightheadedness', 'Heart Palpitations', 'Chest Pain']
            : ['Dizziness', 'Lightheadedness'],
          triggers: ['Standing', ...(isFlare(daysBack) ? ['Heat', 'Showering'] : [])],
          severity: isFlare(daysBack) ? 8 : vary(daysBack, 3, 1),
          treatments: ['Lying down', 'Fluids'],
          notes: standHR >= 130 ? 'HR delta >30 — POTS criteria met' : '',
          tags: [], date, time, createdAt: ts, updatedAt: ts
        }]},
        metadata: meta
      })
    }

    // === BRAIN FOG (entries:[]) ===
    if (dow === 2 || dow === 6 || isFlare(daysBack)) {
      const sev = vary(daysBack, fogBase, 1)
      records.push({
        date, category: 'tracker', subcategory: 'brain-fog',
        content: { entries: [{
          id: `${Date.now() - daysBack * 86400000}`, date, time,
          symptoms: isFlare(daysBack)
            ? ['word_finding', 'confusion', 'mental_cloudiness', 'memory_issues']
            : ['mental_cloudiness'],
          severity: String(sev),
          triggers: isFlare(daysBack) ? ['Stress', 'Poor sleep', 'Pain'] : ['Poor sleep'],
          treatments: ['Rest', 'Coffee'],
          notes: isFlare(daysBack) ? pick(daysBack, ['Forgot my phone number', 'Put keys in fridge', 'Lost mid-sentence']) : '',
          tags: [], createdAt: ts, updatedAt: ts
        }]},
        metadata: meta
      })
    }

    // === UPPER DIGESTIVE (entries:[]) — worse during med change ===
    if (isMedChange(daysBack) || dow === 1 || dow === 4) {
      const sev = isMedChange(daysBack) ? 'severe' : 'mild'
      records.push({
        date, category: 'tracker', subcategory: 'upper-digestive',
        content: { entries: [{
          id: `upper-digestive-${Date.now() - daysBack * 86400000}`, date, time,
          symptoms: isMedChange(daysBack) ? ['nausea', 'loss of appetite', 'stomach pain'] : ['bloating'],
          severity: sev,
          triggers: isMedChange(daysBack) ? ['Medication'] : ['Food'],
          treatments: isMedChange(daysBack) ? ['Ginger', 'Small meals'] : ['Water'],
          notes: isMedChange(daysBack) ? 'New med is rough on stomach' : '',
          tags: [], createdAt: ts, updatedAt: ts
        }]},
        metadata: meta
      })
    }

    // === MENTAL HEALTH (entries:[]) ===
    if (dow === 0 || dow === 3 || dow === 5) {
      const moodVal = isFlare(daysBack) ? 3 : isNewBaseline(daysBack) ? 7 : 5
      const anxVal = isFlare(daysBack) ? 7 : isNewBaseline(daysBack) ? 2 : 4
      records.push({
        date, category: 'tracker', subcategory: 'mental-health',
        content: { entries: [{
          id: `mental-health-${Date.now() - daysBack * 86400000}`, date, time,
          mood: pick(daysBack, ['good', 'okay', 'low', 'good', 'okay']),
          moodIntensity: vary(daysBack, moodVal, 1),
          emotionalState: isFlare(daysBack) ? ['frustrated', 'hopeless'] : ['stable'],
          anxietyLevel: vary(daysBack, anxVal, 1),
          depressionLevel: isFlare(daysBack) ? 5 : 1,
          managementStrategies: pick(daysBack, [['breathing'], ['distraction'], ['social support']]),
          notes: isFlare(daysBack) ? 'Hard to separate pain anxiety from baseline anxiety' : '',
          tags: [], createdAt: ts, updatedAt: ts
        }]},
        metadata: meta
      })
    }

    // === HEAD PAIN (entries:[]) — migraine cluster during flare ===
    if ((dow === 3 && daysBack % 14 < 7) || (isFlare(daysBack) && dow % 2 === 0)) {
      records.push({
        date, category: 'tracker', subcategory: 'head-pain',
        content: { entries: [{
          id: `${Date.now() - daysBack * 86400000}`,
          timestamp: ts, date,
          painIntensity: isFlare(daysBack) ? vary(daysBack, 7, 1) : vary(daysBack, 3, 1),
          painLocation: isFlare(daysBack) ? ['temples', 'behind-eyes'] : ['temples'],
          painType: isFlare(daysBack) ? ['throbbing', 'pressure'] : ['dull-ache'],
          auraPresent: isFlare(daysBack) && daysBack % 3 === 0,
          auraSymptoms: [],
          triggers: isFlare(daysBack) ? ['light', 'noise'] : ['stress'],
          treatments: ['dark room', 'medication'],
          notes: isFlare(daysBack) ? 'Light and sound sensitivity' : '',
          tags: [], createdAt: ts, updatedAt: ts
        }]},
        metadata: meta
      })
    }

    // === BATHROOM (entries:[]) ===
    if (daysBack % 5 !== 2) {
      records.push({
        date, category: 'tracker', subcategory: 'bathroom',
        content: { entries: [{
          id: `bathroom-${Date.now() - daysBack * 86400000}`, date, time,
          status: isMedChange(daysBack) ? '💥 Too much' : '✅ Normal-ish',
          bristolScale: isMedChange(daysBack) ? '6' : '4',
          painLevel: 'None',
          notes: isMedChange(daysBack) ? 'New med side effects' : '',
          count: 1, tags: [], createdAt: ts, updatedAt: ts
        }]},
        metadata: meta
      })
    }

    // === SEIZURE (entries:[]) — rare ===
    if (daysBack % 14 === 0 && daysBack > 0) {
      records.push({
        date, category: 'tracker', subcategory: 'seizure',
        content: { entries: [{
          id: `${Date.now() - daysBack * 86400000}`,
          timestamp: ts, date,
          seizureType: 'Focal Aware (Simple Partial)',
          duration: '< 30 seconds',
          consciousness: 'Fully Aware',
          triggers: ['Stress', 'Fatigue'],
          treatments: ['Rest'],
          notes: '', tags: [], createdAt: ts, updatedAt: ts
        }]},
        metadata: meta
      })
    }

    // === FOOD CHOICE ({simpleEntries:[], detailedEntries:[]}) ===
    if (daysBack % 7 !== 6) {
      records.push({
        date, category: 'tracker', subcategory: 'food-choice',
        content: {
          simpleEntries: [{
            id: `simple-${Date.now() - daysBack * 86400000}`,
            timestamp: ts, didEat: true,
            mealType: pick(daysBack, ['breakfast', 'lunch', 'dinner']),
            mood: isFlare(daysBack) ? 'struggling' : 'good',
            notes: isFlare(daysBack) ? 'Barely managed crackers' : '',
            tags: []
          }],
          detailedEntries: [],
          generalNotes: ''
        },
        metadata: meta
      })
    }

    // === WEATHER (array []) ===
    if (daysBack % 2 === 1) {
      records.push({
        date, category: 'tracker', subcategory: 'weather',
        content: [{
          weatherTypes: isFlare(daysBack)
            ? ['Pressure Hell', 'Stormy']
            : pick(daysBack, [['Sunny'], ['Cloudy'], ['Rainy'], ['Sunny', 'Warm']]),
          impact: isFlare(daysBack) ? 'A LOT' : 'A little',
          description: isFlare(daysBack) ? 'Barometric pressure drop' : '',
          tags: [], timestamp: ts
        }],
        metadata: meta
      })
    }

    // === REPRODUCTIVE HEALTH (flat object) ===
    if (dow === 1 && daysBack % 14 < 7) {
      records.push({
        date, category: 'tracker', subcategory: 'reproductive-health',
        content: {
          flow: (daysBack % 28) < 5 ? pick(daysBack, ['light', 'medium', 'heavy', 'light', 'spotting']) : 'none',
          pain: (daysBack % 28) < 5 ? 4 : 0,
          mood: pick(daysBack, [['stable'], ['irritable'], ['tired'], ['calm']]),
          symptoms: (daysBack % 28) < 5 ? ['cramps', 'fatigue'] : [],
          libido: 0, cervicalFluid: '', bbt: null, energyLevel: '',
          fertilitySymptoms: [], opk: null, ferning: null,
          spermEggExposure: false, notes: '', tags: []
        },
        metadata: meta
      })
    }

    // === SELF-CARE (unique subcategory) ===
    if (daysBack % 6 !== 4) {
      const done = isFlare(daysBack) ? 2 : isNewBaseline(daysBack) ? 5 : 4
      const scId = `selfcare-${Date.now() - daysBack * 86400000}`
      records.push({
        date, category: 'tracker', subcategory: `selfcare-${scId}`,
        content: {
          id: scId, date, time,
          category: 'daily',
          activity: 'daily-routine',
          customActivity: '',
          duration: pick(daysBack, ['Quick', 'Half day', 'Full day']),
          motivation: [],
          energyBefore: vary(daysBack, energyBase, 1),
          energyAfter: vary(daysBack, energyBase + 1, 1),
          moodBefore: 'okay', moodAfter: done >= 4 ? 'good' : 'okay',
          completedItems: done, totalItems: 7,
          notes: isFlare(daysBack) ? 'Only managed meds and water' : '',
          tags: [], createdAt: ts, updatedAt: ts
        },
        metadata: meta
      })
    }

    // === JOURNAL ===
    if (dow === 0 || dow === 3 || dow === 5 || isFlare(daysBack)) {
      let entry = ''
      if (isBaseline(daysBack)) {
        entry = pick(daysBack, [
          'Same old. Pain is background noise at this point.',
          'Doctor said labs are "fine." They always say that.',
          'Managed to get groceries. Paid for it later.',
          'The fatigue is the worst part. Pain I can push through.',
          'Good day by my standards. Only cancelled one thing.',
        ])
      } else if (isMedChange(daysBack)) {
        entry = pick(daysBack, [
          'Started the new medication. Stomach is NOT happy.',
          'Day 3 of new med. Nauseous but trying to give it time.',
          'Cannot eat anything without wanting to die. This better be worth it.',
        ])
      } else if (isFlare(daysBack)) {
        entry = pick(daysBack, [
          'Full flare. Everything hurts. Called in sick.',
          'Cannot think. Cannot move. Heating pad is my best friend.',
          'HR went to 140 just standing up. This is not fine.',
          'Had to cancel everything. Again.',
          'If one more person tells me to try yoga I will commit a crime.',
        ])
      } else if (isRecovery(daysBack)) {
        entry = pick(daysBack, [
          'Flare is easing. Not gone but I can think again.',
          'Doctor appointment tomorrow. Bringing 3 months of data this time.',
          'Starting to feel like the new med might actually be helping.',
        ])
      } else {
        entry = pick(daysBack, [
          'This is... better? Pain is actually lower than before the med change.',
          'Went for a walk AND made dinner. Who am I??',
          'Showed my doctor the pain trend chart. She actually looked surprised.',
          'Three days in a row under pain 3. New record.',
          'Starting to trust the improvement. Scared to jinx it.',
        ])
      }
      records.push({
        date, category: 'journal', subcategory: 'main',
        content: { text: entry },
        metadata: meta
      })
    }
  }

  return records
}
