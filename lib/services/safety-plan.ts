/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude Opus 5.5)
 *
 * 🛡️ safety-plan.ts — the logic under the Safety Plan, pulled out where it can be TESTED.
 *
 * 🚨 THE BUG (CHA-771, found in the live app 2026-10-29): add a personal emergency contact
 * and a reason to keep living, press save, get "Your safety plan has been saved 💜", and
 * view mode is EMPTY. Reading the stored row back showed every list empty. So it was
 * NOT SAVED, not "saved but not rendered".
 * The toast lied: it fired after a write of an object that didn't hold the entries.
 *
 * The ways the old screen could do that, all fixed here or in safety-plan-manager.tsx:
 *   1. Typed-but-not-added text was thrown away. A contact only joined the plan when
 *      you pressed the small "+" at the end of the Notes row; "Save Safety Plan" just
 *      saved the lists as they were. Anything still sitting in an input vanished.
 *      → commitPendingInputs() adds it on save, and an unfinishable draft (a contact
 *        with a name and no phone) BLOCKS the save with a sentence instead of vanishing.
 *   2. The header button said "Save Changes" but only left edit mode. Nothing written.
 *   3. The toast fired whether or not what we meant to store was stored.
 *      → missingAfterSave() compares what we meant to write with what reads back.
 *   4. Latent: the plan is saved under the day's date, and loading took the FIRST
 *      safety-plan row it found. Edit it on a second day and the reload would show the
 *      older copy. → pickSafetyPlanRecord() takes the newest live row.
 *
 * Pure: no React, no Dexie, no "@/" imports (the golden suite runs this with node).
 */

import type { SafetyPlan } from '../../app/crisis-support/crisis-types'

export type { SafetyPlan }

/** The string lists the editor can add to, with the words we use for them out loud. */
export const LIST_SECTIONS = {
  warningSignsPersonal: 'warning signs',
  copingStrategiesAlone: 'coping strategies',
  reasonsToLive: 'reasons to keep living',
  safeSpaces: 'safe spaces',
} as const
export type ListSection = keyof typeof LIST_SECTIONS

export interface ContactDraft { name: string; phone: string; notes?: string; address?: string }
export interface EmergencyContactDraft extends ContactDraft { relationship: string }
export interface CrisisContactDraft extends ContactDraft { available: string }

/** Whatever is still sitting in the edit inputs when someone presses save. */
export interface PendingInputs {
  lists?: Partial<Record<ListSection, string>>
  emergencyContact?: EmergencyContactDraft
  crisisContact?: CrisisContactDraft
}

export function createDefaultSafetyPlan(nowIso: string): SafetyPlan {
  return {
    id: 'safety-plan-default',
    name: 'My Safety Plan',
    isActive: true,
    warningSignsPersonal: [],
    warningSignsExternal: [],
    copingStrategiesAlone: [],
    copingStrategiesSocial: [],
    copingStrategiesDistraction: [],
    supportPeopleInformal: [],
    supportPeopleProfessional: [],
    crisisHotlines: [
      { name: '988 Suicide & Crisis Lifeline', phone: '988', available: '24/7', notes: 'Free, confidential support' },
    ],
    emergencyContacts: [],
    environmentChanges: [],
    itemsToRemove: [],
    safeSpaces: [],
    reasonsToLive: [],
    hopefulMemories: [],
    futureGoals: [],
    peopleWhoCare: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  }
}

const ARRAY_KEYS = [
  'warningSignsPersonal', 'warningSignsExternal', 'copingStrategiesAlone', 'copingStrategiesSocial',
  'copingStrategiesDistraction', 'supportPeopleInformal', 'supportPeopleProfessional', 'crisisHotlines',
  'emergencyContacts', 'environmentChanges', 'itemsToRemove', 'safeSpaces', 'reasonsToLive',
  'hopefulMemories', 'futureGoals', 'peopleWhoCare',
] as const

/** Stored content may be a JSON string, or an older plan missing a list. Never crash on .map(). */
export function normalizeSafetyPlan(content: unknown, nowIso: string): SafetyPlan {
  let raw: any = content
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw) } catch { raw = null }
  }
  const base = createDefaultSafetyPlan(nowIso)
  if (!raw || typeof raw !== 'object') return base
  const plan: any = { ...base, ...raw }
  for (const k of ARRAY_KEYS) {
    if (!Array.isArray(plan[k])) plan[k] = (base as any)[k]
  }
  return plan as SafetyPlan
}

interface RowLike {
  subcategory?: string
  date?: string
  content?: unknown
  metadata?: { updated_at?: string; deleted_at?: string } | null
}

/** The newest LIVE safety-plan row. Tombstoned rows are deleted rows, not plans. */
export function pickSafetyPlanRecord<T extends RowLike>(rows: T[]): T | undefined {
  const live = rows.filter(r => r.subcategory === 'safety-plan' && !r.metadata?.deleted_at)
  const stamp = (r: T) => {
    let c: any = r.content
    if (typeof c === 'string') { try { c = JSON.parse(c) } catch { c = null } }
    return String(r.metadata?.updated_at || c?.updatedAt || r.date || '')
  }
  return live.sort((a, b) => stamp(b).localeCompare(stamp(a)))[0]
}

const clean = (s: string | undefined) => (s || '').trim()
const draftTouched = (d?: ContactDraft & Record<string, any>) =>
  !!d && Object.values(d).some(v => typeof v === 'string' && v.trim() !== '')

/**
 * Fold whatever is still typed into the inputs into the plan, the same way pressing
 * "+" would. Returns `problems` (plain sentences) for drafts we can't finish on the
 * person's behalf; the caller must NOT save while there are any.
 */
export function commitPendingInputs(plan: SafetyPlan, pending: PendingInputs): { plan: SafetyPlan; added: string[]; problems: string[] } {
  const next: SafetyPlan = { ...plan }
  const added: string[] = []
  const problems: string[] = []

  for (const key of Object.keys(LIST_SECTIONS) as ListSection[]) {
    const value = clean(pending.lists?.[key])
    if (!value) continue
    const list = next[key] as string[]
    if (!list.includes(value)) {
      ;(next as any)[key] = [...list, value]
      added.push(LIST_SECTIONS[key])
    }
  }

  const ec = pending.emergencyContact
  if (draftTouched(ec)) {
    if (clean(ec!.name) && clean(ec!.phone)) {
      next.emergencyContacts = [...next.emergencyContacts, {
        name: clean(ec!.name), relationship: clean(ec!.relationship), phone: clean(ec!.phone),
        notes: clean(ec!.notes), address: clean(ec!.address),
      }]
      added.push('emergency contact')
    } else {
      problems.push('The personal emergency contact you started needs both a name and a phone number. Finish it, or clear it, then save.')
    }
  }

  const cc = pending.crisisContact
  if (draftTouched(cc)) {
    if (clean(cc!.name) && clean(cc!.phone)) {
      next.crisisHotlines = [...next.crisisHotlines, {
        name: clean(cc!.name), phone: clean(cc!.phone), available: clean(cc!.available),
        notes: clean(cc!.notes), address: clean(cc!.address),
      }]
      added.push('crisis contact')
    } else {
      problems.push('The crisis line / professional contact you started needs both a name and a phone number. Finish it, or clear it, then save.')
    }
  }

  return { plan: next, added, problems }
}

/** Sections (in words) where something we meant to save is NOT in what read back. Empty = verified. */
export function missingAfterSave(intended: SafetyPlan, stored: SafetyPlan | null | undefined): string[] {
  if (!stored) return ['the whole plan']
  const missing: string[] = []
  for (const key of Object.keys(LIST_SECTIONS) as ListSection[]) {
    const have = new Set(stored[key] as string[])
    if ((intended[key] as string[]).some(v => !have.has(v))) missing.push(LIST_SECTIONS[key])
  }
  const contactKey = (c: { name: string; phone: string }) => `${c.name}\u0000${c.phone}`
  const storedEc = new Set(stored.emergencyContacts.map(contactKey))
  if (intended.emergencyContacts.some(c => !storedEc.has(contactKey(c)))) missing.push('emergency contacts')
  const storedCc = new Set(stored.crisisHotlines.map(contactKey))
  if (intended.crisisHotlines.some(c => !storedCc.has(contactKey(c)))) missing.push('crisis contacts')
  return missing
}
