/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04  (CHA-261)
 *
 * "About You" personalization panel for /customize. Layout from Nova's spec:
 * Name (optional) → Pronouns (+ use in exports) → Gender (optional) →
 * Reproductive tracking → Parent term → Feeding term.
 *
 * Every field writes straight to per-PIN prefs on change (no Save button —
 * matches the other customize panels). Defaults are neutral; gendered language
 * is opt-in and joyful, never inferred. See lib/personalization.ts.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */
"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Heart } from "lucide-react"
import {
  getPersonalization,
  savePersonalization,
  resolvedPronouns,
  PARENT_TERM_OPTIONS,
  FEEDING_TERM_OPTIONS,
  PERSONALIZATION_DEFAULTS,
  type Personalization,
  type PronounChoice,
  type FeedingTerm,
} from "@/lib/personalization"

const PRONOUN_OPTIONS: { value: PronounChoice; label: string }[] = [
  { value: "they/them", label: "they/them" },
  { value: "she/her", label: "she/her" },
  { value: "he/him", label: "he/him" },
  { value: "custom", label: "Custom…" },
]

export default function PersonalizationPanel() {
  const [p, setP] = useState<Personalization>(PERSONALIZATION_DEFAULTS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setP(getPersonalization())
    setReady(true)
  }, [])

  // Update one field locally + persist immediately.
  const update = <K extends keyof Personalization>(field: K, value: Personalization[K]) => {
    setP(prev => {
      const next = { ...prev, [field]: value }
      savePersonalization({ [field]: value } as Partial<Personalization>)
      return next
    })
  }

  // Is a custom parent term in play? (parentTerm not in the preset list)
  const presetValues = PARENT_TERM_OPTIONS.map(o => o.value)
  const parentIsCustom = p.parentTerm !== "" && !presetValues.includes(p.parentTerm) || p.parentTerm === "custom"
  const parentSelectValue = presetValues.includes(p.parentTerm) ? p.parentTerm : "custom"

  if (!ready) return null

  const pron = resolvedPronouns(p)

  return (
    <div className="space-y-6">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="pz-name">Name (optional)</Label>
        <Input
          id="pz-name"
          value={p.name}
          onChange={e => update("name", e.target.value)}
          placeholder="What should we call you?"
        />
        <p className="text-xs text-muted-foreground">Only used in-app and on exports if you choose. Stays on your device.</p>
      </div>

      {/* Pronouns */}
      <div className="space-y-1.5">
        <Label>Pronouns</Label>
        <Select value={p.pronouns} onValueChange={v => update("pronouns", v as PronounChoice)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRONOUN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {p.pronouns === "custom" && (
          <Input
            value={p.pronounsCustom}
            onChange={e => update("pronounsCustom", e.target.value)}
            placeholder="e.g. ze/zir/zir"
            className="mt-2"
          />
        )}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Label htmlFor="pz-pron-exports" className="font-normal text-sm cursor-pointer">
            Use my pronouns in exports
            <span className="block text-xs text-muted-foreground">Adds "{pron.label}" to PDF reports for providers.</span>
          </Label>
          <Switch
            id="pz-pron-exports"
            checked={p.pronounsInExports}
            onCheckedChange={v => update("pronounsInExports", v)}
          />
        </div>
      </div>

      {/* Gender identity */}
      <div className="space-y-1.5">
        <Label htmlFor="pz-gender">Gender identity (optional)</Label>
        <Input
          id="pz-gender"
          value={p.gender}
          onChange={e => update("gender", e.target.value)}
          placeholder="However you describe yourself"
        />
        <p className="text-xs text-muted-foreground">Private. Helps us use language that fits you — never used to assume anything.</p>
      </div>

      {/* Reproductive tracking */}
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="pz-repro" className="font-normal cursor-pointer">
          Reproductive &amp; cycle tracking
          <span className="block text-xs text-muted-foreground">Make period, fertility, and cycle tools available. Change anytime.</span>
        </Label>
        <Switch id="pz-repro" checked={p.reproEnabled} onCheckedChange={v => update("reproEnabled", v)} />
      </div>

      {/* Parent + feeding language only surface in postpartum/feeding views, so
          they're only relevant when reproductive tracking is on. Hide otherwise. */}
      {p.reproEnabled && (
      <>
      {/* Parent term — joy both ways */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><Heart className="h-4 w-4 text-primary" /> What should we call you as a parent?</Label>
        <Select value={parentSelectValue} onValueChange={v => update("parentTerm", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PARENT_TERM_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {parentIsCustom && (
          <Input
            value={p.parentTerm === "custom" ? "" : p.parentTerm}
            onChange={e => update("parentTerm", e.target.value || "custom")}
            placeholder="e.g. Baba, Ima, Abba, Mapa…"
            className="mt-2"
          />
        )}
        <p className="text-xs text-muted-foreground">
          Neutral by default — but if "Mama" (or any word) is the one that makes you light up, it's yours. Used in postpartum &amp; feeding views.
        </p>
      </div>

      {/* Feeding term */}
      <div className="space-y-1.5">
        <Label>Feeding language</Label>
        <Select value={p.feedingTerm} onValueChange={v => update("feedingTerm", v as FeedingTerm)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {FEEDING_TERM_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">How feeding is described in the postpartum tracker.</p>
      </div>
      </>
      )}
    </div>
  )
}
