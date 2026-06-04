/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04  (CHA-261)
 *
 * Per-PIN personalization: name, pronouns, gender, parent/feeding terms.
 *
 * The "joy both ways" principle (Ren, 2026-06-04): the DEFAULT is neutral and
 * safe for everyone — "parent", "feeding", they/them — and we NEVER auto-derive
 * gendered language from someone's pronouns or sex. BUT a user who WANTS to be
 * called "Mama" (because becoming Mama is the best thing that ever happened to
 * them) gets that everywhere, joyfully. Affirming in both directions: never
 * imposed, always available. An explicit choice, never an inference.
 *
 * Stored in per-PIN prefs (see lib/prefs.ts) so each profile on a device has
 * its own. Read anywhere with getPersonalization(); write with
 * savePersonalization(patch).
 */
"use client"

import { getPref, setPref } from "@/lib/prefs"

export type PronounChoice = "she/her" | "he/him" | "they/them" | "custom"
export type FeedingTerm = "feeding" | "breastfeeding" | "chestfeeding"

export interface Personalization {
  name: string
  pronouns: PronounChoice
  pronounsCustom: string        // e.g. "ze/zir/zir" when pronouns === 'custom'
  pronounsInExports: boolean     // surface pronouns on PDF/exports for providers
  gender: string                 // free text, optional, private
  reproEnabled: boolean          // user wants reproductive/cycle tracking available
  parentTerm: string             // 'parent' (default) | 'mama' | 'papa' | … | custom
  feedingTerm: FeedingTerm
}

export const PERSONALIZATION_KEYS = {
  name: "chaos-personalization-name",
  pronouns: "chaos-personalization-pronouns",
  pronounsCustom: "chaos-personalization-pronouns-custom",
  pronounsInExports: "chaos-personalization-pronouns-exports",
  gender: "chaos-personalization-gender",
  reproEnabled: "chaos-personalization-repro",
  parentTerm: "chaos-personalization-parent-term",
  feedingTerm: "chaos-personalization-feeding-term",
} as const

const K = PERSONALIZATION_KEYS

export const PERSONALIZATION_DEFAULTS: Personalization = {
  name: "",
  pronouns: "they/them",
  pronounsCustom: "",
  pronounsInExports: false,
  gender: "",
  reproEnabled: false,
  parentTerm: "parent",
  feedingTerm: "feeding",
}

export function getPersonalization(): Personalization {
  return {
    name: getPref(K.name) ?? PERSONALIZATION_DEFAULTS.name,
    pronouns: (getPref(K.pronouns) as PronounChoice) ?? PERSONALIZATION_DEFAULTS.pronouns,
    pronounsCustom: getPref(K.pronounsCustom) ?? PERSONALIZATION_DEFAULTS.pronounsCustom,
    pronounsInExports: getPref(K.pronounsInExports) === "1",
    gender: getPref(K.gender) ?? PERSONALIZATION_DEFAULTS.gender,
    reproEnabled: getPref(K.reproEnabled) === "1",
    parentTerm: getPref(K.parentTerm) ?? PERSONALIZATION_DEFAULTS.parentTerm,
    feedingTerm: (getPref(K.feedingTerm) as FeedingTerm) ?? PERSONALIZATION_DEFAULTS.feedingTerm,
  }
}

export function savePersonalization(patch: Partial<Personalization>): void {
  if (patch.name !== undefined) setPref(K.name, patch.name)
  if (patch.pronouns !== undefined) setPref(K.pronouns, patch.pronouns)
  if (patch.pronounsCustom !== undefined) setPref(K.pronounsCustom, patch.pronounsCustom)
  if (patch.pronounsInExports !== undefined) setPref(K.pronounsInExports, patch.pronounsInExports ? "1" : "0")
  if (patch.gender !== undefined) setPref(K.gender, patch.gender)
  if (patch.reproEnabled !== undefined) setPref(K.reproEnabled, patch.reproEnabled ? "1" : "0")
  if (patch.parentTerm !== undefined) setPref(K.parentTerm, patch.parentTerm)
  if (patch.feedingTerm !== undefined) setPref(K.feedingTerm, patch.feedingTerm)
}

export interface ResolvedPronouns {
  subject: string    // they / she / he
  object: string     // them / her / him
  possessive: string // their / her / his
  label: string      // "they/them"
}

export function resolvedPronouns(p: Personalization = getPersonalization()): ResolvedPronouns {
  switch (p.pronouns) {
    case "she/her": return { subject: "she", object: "her", possessive: "her", label: "she/her" }
    case "he/him": return { subject: "he", object: "him", possessive: "his", label: "he/him" }
    case "custom": {
      const parts = (p.pronounsCustom || "").split("/").map(s => s.trim()).filter(Boolean)
      return {
        subject: parts[0] || "they",
        object: parts[1] || parts[0] || "them",
        possessive: parts[2] || parts[1] || "their",
        label: p.pronounsCustom || "custom",
      }
    }
    case "they/them":
    default:
      return { subject: "they", object: "them", possessive: "their", label: "they/them" }
  }
}

// Parent-term options (joy both ways). Neutral first as the default; the rest are
// there for people for whom the gendered word is the whole point. "Custom" lets
// someone type Baba, Ima, Abba, Mapa, anything.
export const PARENT_TERM_OPTIONS: { value: string; label: string }[] = [
  { value: "parent", label: "Parent (neutral)" },
  { value: "mama", label: "Mama" },
  { value: "mommy", label: "Mommy" },
  { value: "mom", label: "Mom" },
  { value: "papa", label: "Papa" },
  { value: "daddy", label: "Daddy" },
  { value: "dad", label: "Dad" },
  { value: "baba", label: "Baba" },
  { value: "custom", label: "Something else…" },
]

export const FEEDING_TERM_OPTIONS: { value: FeedingTerm; label: string }[] = [
  { value: "feeding", label: "Feeding (neutral)" },
  { value: "breastfeeding", label: "Breastfeeding" },
  { value: "chestfeeding", label: "Chestfeeding" },
]
