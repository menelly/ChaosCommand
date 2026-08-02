/*
 * SEVERITY VOICES — because if you have to log that life sucks every single
 * day, life should suck with joy.
 *
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * ─── WHY ────────────────────────────────────────────────────────────────────
 *
 * Ren, 2026-08-02:
 *   "You can make it octopus shaped pain over here if you want. Just make it
 *    fun to track what sucks? That's the POINT!! ... But if I'm saying life
 *    sucks let's make life suck with joy?"
 *
 * The joy is load-bearing, not decoration. A symptom tracker that feels like
 * paperwork doesn't get used; a tracker that doesn't get used produces no data;
 * and the data is what gets an IVIG authorisation approved. The straight line
 * from "this made me smile" to "the insurer said yes" is shorter than it looks.
 *
 * A single fixed list of jokes stops being funny around the fourth reading —
 * which, for someone logging daily, is Thursday. So the labels rotate.
 *
 * ─── WHOLE VOICES, NOT RANDOM WORDS PER LEVEL ───────────────────────────────
 *
 * Each pack is one coherent voice across the entire 0-10 range. Shuffling
 * individual rungs would put a gremlin at 4, a kraken at 5 and a weather front
 * at 6, which reads as broken rather than playful. Pick a voice, commit to it.
 *
 * ─── ROTATION IS DETERMINISTIC, AND THAT IS DELIBERATE ──────────────────────
 *
 * Seeded from (date + slot), NOT random:
 *   - Random values differ between the server-rendered HTML and the first
 *     client render, which is a hydration mismatch — React throws warnings and
 *     may discard the markup.
 *   - A label that changes on every re-render flickers while you're using it,
 *     which is horrible generally and worse for anyone with vestibular or
 *     attention issues.
 *   - External review, 2026-08-02: "File names are using math.random, should
 *     use something actually unique." Same instinct: reach for a real source of
 *     variety, not a coin flip.
 *
 * So: the voice holds still all day, different trackers get different voices on
 * the same day, and tomorrow the whole thing turns over.
 *
 * ─── ⚠️ THE ONE HARD RULE ───────────────────────────────────────────────────
 *
 * LEVEL 10 IS NEVER PURELY A JOKE. Ten means call for help, and it must read
 * that way in every voice, to a person in crisis, at 3am, in a language that
 * might not be their first. Every pack's 10 says so plainly. Be as silly as you
 * like from 0 to 9; 10 is where the bit stops.
 *
 * Adding a pack: 11 entries, index 0..10, 0 is always good news.
 */

export interface SeverityVoice {
  /** Internal name. Not shown to anyone. */
  id: string
  /** labels[0] = none/absent, labels[10] = emergency. */
  labels: string[]
}

export const SEVERITY_VOICES: SeverityVoice[] = [
  {
    id: 'plain',
    labels: [
      'nope, all good today 🌈',
      'barely a blip',
      'noticeable, mildly rude',
      'officially annoying',
      'actively in my way',
      'taking up real estate',
      'loud. hard to ignore.',
      'running the show now',
      'this is A Lot',
      'barely holding on',
      'emergency — please get help',
    ],
  },
  {
    id: 'cephalopod',
    labels: [
      'calm seas, zero tentacles 🌊',
      'one tentacle, being nosy',
      'a polite squeeze',
      'definitely being grabbed',
      'multiple tentacles, no consent',
      'full cephalopod situation 🐙',
      'the kraken has opinions',
      'kraken running the ship',
      'released the WHOLE kraken',
      'deep sea, no light, help',
      'emergency — please get help',
    ],
  },
  {
    id: 'weather',
    labels: [
      'clear skies ☀️',
      'one small cloud',
      'bit overcast',
      'persistent drizzle',
      'proper rain now ☔',
      'wind picking up',
      'storm warning issued',
      'the storm has landed ⛈️',
      'roof is doing something bad',
      'this is a named hurricane',
      'emergency — please get help',
    ],
  },
  {
    id: 'gremlins',
    labels: [
      'no gremlins today 🌈',
      'tiny gremlin nibble',
      'mildly pesky gremlin',
      'annoying gremlin party 🎉',
      'whole gremlin gang showed up',
      'gremlins found the kitchen',
      'gremlins unionised',
      'severe gremlin invasion 😤',
      'GREMLIN APOCALYPSE 💀',
      'cosmic gremlin event 🌋',
      'emergency — please get help',
    ],
  },
  {
    id: 'dragon',
    labels: [
      'dragon is asleep 🐉',
      'one eye opened',
      'stretching, ominously',
      'awake and grumpy',
      'pacing the cave',
      'smoke coming out',
      'small fire, actual flames',
      'full breath weapon 🔥',
      'the village is concerned',
      'kingdom-level dragon problem',
      'emergency — please get help',
    ],
  },
  {
    id: 'volume',
    labels: [
      'silence, beautiful silence 🔇',
      'faint hum',
      'background noise',
      'someone turned it up',
      'hard to talk over',
      'genuinely loud now 🔊',
      'cannot hear myself think',
      'concert-front-row loud',
      'ears ringing',
      'nothing but this',
      'emergency — please get help',
    ],
  },
  {
    id: 'gravity',
    labels: [
      'floating, weightless ✨',
      'normal gravity',
      'slightly heavier than usual',
      'wearing an invisible coat',
      'ankle weights, all limbs',
      'wading through syrup',
      'gravity has doubled',
      'moving costs everything',
      'pinned to the floor',
      'cannot move at all',
      'emergency — please get help',
    ],
  },
  {
    id: 'goblin',
    labels: [
      'goblin-free zone 🌈',
      'one goblin, distant',
      'goblin made eye contact',
      'goblin is in the house',
      'goblin went through my stuff',
      'goblin brought friends',
      'goblins have the keys',
      'goblins redecorating',
      'it is goblins all the way down',
      'I live here now, with goblins',
      'emergency — please get help',
    ],
  },
]

/**
 * FNV-1a. A tiny stable string hash — deterministic across reloads, machines and
 * server/client, which is the entire point (see the rotation note above).
 */
function hash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Today's voice for a given slot.
 *
 * @param slot Anything stable that identifies this control — a tracker name,
 *             a field name. Different slots get different voices on the same
 *             day, so opening two trackers isn't the same joke twice.
 * @param date ISO date. Defaults to today; pass one to keep a render stable.
 */
export function voiceFor(slot: string, date?: string): SeverityVoice {
  const day = date ?? new Date().toISOString().slice(0, 10)
  return SEVERITY_VOICES[hash(`${day}|${slot}`) % SEVERITY_VOICES.length]
}

/** Look one up by id, for a tracker that wants to pin its voice permanently
 *  (pain has been doing gremlins since long before this file existed). */
export function voiceById(id: string): SeverityVoice | undefined {
  return SEVERITY_VOICES.find(v => v.id === id)
}
