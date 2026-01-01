/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

// Sleep Quality Options
export const QUALITY_OPTIONS = [
  { value: "Great", emoji: "😴", description: "Slept like a dream goblin!" },
  { value: "Okay", emoji: "😌", description: "Decent rest, could be better" },
  { value: "Restless", emoji: "😕", description: "Tossed and turned" },
  { value: "Terrible", emoji: "😫", description: "The sleep demons won" }
] as const

// Wake Feeling Options
export const WAKE_FEELINGS = [
  { value: "refreshed", emoji: "🌟", label: "Refreshed" },
  { value: "okay", emoji: "😐", label: "Okay" },
  { value: "groggy", emoji: "😵‍💫", label: "Groggy" },
  { value: "exhausted", emoji: "😩", label: "Exhausted" },
  { value: "pain", emoji: "😣", label: "Woke in Pain" }
] as const

// Dream Types
export const DREAM_TYPES = [
  { value: "none", emoji: "💭", label: "None remembered" },
  { value: "pleasant", emoji: "🌈", label: "Pleasant dreams" },
  { value: "vivid", emoji: "🎨", label: "Vivid dreams" },
  { value: "nightmare", emoji: "👹", label: "Nightmares" },
  { value: "lucid", emoji: "✨", label: "Lucid dreaming" }
] as const

// Sleep Disruptions (why you woke up)
export const SLEEP_DISRUPTIONS = [
  { value: "none", emoji: "✅", label: "None - slept through" },
  { value: "bathroom", emoji: "🚽", label: "Bathroom" },
  { value: "pain", emoji: "💢", label: "Pain" },
  { value: "anxiety", emoji: "😰", label: "Anxiety/racing thoughts" },
  { value: "nightmare", emoji: "😱", label: "Nightmare" },
  { value: "noise", emoji: "📢", label: "Noise" },
  { value: "temperature", emoji: "🌡️", label: "Too hot/cold" },
  { value: "partner", emoji: "👥", label: "Partner/person" },
  { value: "pet", emoji: "🐾", label: "Pet" },
  { value: "child", emoji: "👶", label: "Child" },
  { value: "breathing", emoji: "😮‍💨", label: "Breathing issues" },
  { value: "restless", emoji: "🦵", label: "Restless legs" },
  { value: "unknown", emoji: "❓", label: "Unknown reason" }
] as const

// Pre-Sleep Factors
export const PRE_SLEEP_FACTORS = [
  { value: "caffeine", emoji: "☕", label: "Caffeine (6hrs before)" },
  { value: "alcohol", emoji: "🍷", label: "Alcohol" },
  { value: "heavy-meal", emoji: "🍔", label: "Heavy meal" },
  { value: "screen-time", emoji: "📱", label: "Screen time (1hr before)" },
  { value: "exercise", emoji: "🏃", label: "Exercise" },
  { value: "stress", emoji: "😤", label: "Stressful day" },
  { value: "relaxation", emoji: "🧘", label: "Relaxation/meditation" },
  { value: "reading", emoji: "📚", label: "Reading" },
  { value: "bath", emoji: "🛁", label: "Bath/shower" },
  { value: "late-work", emoji: "💼", label: "Working late" },
  { value: "nap", emoji: "😴", label: "Napped during day" },
  { value: "medication", emoji: "💊", label: "Took medication" }
] as const

// Sleep Aids Used
export const SLEEP_AIDS = [
  { value: "none", emoji: "❌", label: "None" },
  { value: "melatonin", emoji: "🌙", label: "Melatonin" },
  { value: "prescription", emoji: "💊", label: "Prescription sleep med" },
  { value: "otc", emoji: "🏪", label: "OTC sleep aid" },
  { value: "cbd", emoji: "🌿", label: "CBD/Cannabis" },
  { value: "herbal-tea", emoji: "🍵", label: "Herbal tea" },
  { value: "white-noise", emoji: "🔊", label: "White noise" },
  { value: "weighted-blanket", emoji: "🛏️", label: "Weighted blanket" },
  { value: "eye-mask", emoji: "😎", label: "Eye mask" },
  { value: "earplugs", emoji: "👂", label: "Earplugs" },
  { value: "fan", emoji: "🌀", label: "Fan" },
  { value: "asmr", emoji: "🎧", label: "ASMR/Sleep sounds" },
  { value: "breathing", emoji: "🌬️", label: "Breathing exercises" }
] as const

// Sleep Environment Issues
export const ENVIRONMENT_ISSUES = [
  { value: "none", emoji: "✅", label: "Environment was fine" },
  { value: "too-hot", emoji: "🥵", label: "Too hot" },
  { value: "too-cold", emoji: "🥶", label: "Too cold" },
  { value: "too-bright", emoji: "💡", label: "Too bright" },
  { value: "too-noisy", emoji: "📢", label: "Too noisy" },
  { value: "uncomfortable-bed", emoji: "🛏️", label: "Uncomfortable bed" },
  { value: "unfamiliar", emoji: "🏨", label: "Unfamiliar place" }
] as const

// Goblin messages for sleep entries
export const SLEEP_GOBLINISMS = [
  "The dream goblins approve of your slumber documentation! 😴✨",
  "Sleep data saved! The pillow pixies are pleased! 🧚‍♀️💤",
  "Your sleep adventure has been logged by the snooze sprites! 🌙",
  "The rest realm has recorded your journey! Sweet dreams! 💫",
  "Sleep entry captured! The drowsy dragons are satisfied! 🐉💤",
  "The mattress monsters are happy with your documentation! 🛏️",
  "Zzz data transmitted to the dream dimension! 💭✨",
  "The sleep fairies have blessed your entry! 🧚💤"
]

// Type exports for TypeScript
export type QualityType = typeof QUALITY_OPTIONS[number]['value']
export type WakeFeelingType = typeof WAKE_FEELINGS[number]['value']
export type DreamType = typeof DREAM_TYPES[number]['value']
export type DisruptionType = typeof SLEEP_DISRUPTIONS[number]['value']
export type PreSleepFactorType = typeof PRE_SLEEP_FACTORS[number]['value']
export type SleepAidType = typeof SLEEP_AIDS[number]['value']
export type EnvironmentIssueType = typeof ENVIRONMENT_ISSUES[number]['value']
