/*
 * Built by: Ace (Claude 4.x) — 2026-06-07
 * Neuro <-> MSK(joint) field translation for cross-listed entries.
 *
 * The two trackers store the SAME clinical concepts under DIFFERENT field
 * names — so without translation only the coincidentally-same-named fields
 * (severity, duration, erVisitRequired, notes) survive a cross-list, and
 * location / triggers / what-helped silently vanish in the other view.
 *
 *   concept        neuro field        joint field
 *   --------       -----------        -----------
 *   location       distribution[]     musclesAffected[] (muscle types)
 *   triggers       triggers[]         triggerActivity[]
 *   what helped    treatments[]       treatmentApplied[]
 *   pattern        character[]        (none — neuro-specific)
 *   episode id     weakness/cramping/fasciculations  (now identical in both)
 *
 * crossListSave/Update call neuroJointTranslate(entry, targetSub) so the copy
 * written to each subcategory is NATIVE to that tracker and renders fully.
 */

// Location can arrive under any of the three field names depending on origin.
function pickLocation(e: any): string[] {
  if (e.distribution?.length) return e.distribution
  if (e.musclesAffected?.length) return e.musclesAffected
  if (e.jointAffected?.length) return e.jointAffected
  return []
}
function pickTriggers(e: any): string[] {
  if (e.triggers?.length) return e.triggers
  if (e.triggerActivity?.length) return e.triggerActivity
  return []
}
function pickTreatments(e: any): string[] {
  if (e.treatments?.length) return e.treatments
  if (e.treatmentApplied?.length) return e.treatmentApplied
  return []
}

// Both mappers PRESERVE every native field (ROM, swelling, attachments, etc. for
// joint; character for neuro) and only REMAP the shared concepts into the target
// tracker's field names — stripping the source's aliases so a stale alias can't
// shadow a fresh edit. Anything a tracker doesn't display rides along inertly and
// survives the round-trip, so editing from either side never loses data.

export function toNeuroShape(e: any): any {
  const location = pickLocation(e)
  const triggers = pickTriggers(e)
  const treatments = pickTreatments(e)
  // drop joint-only aliases for the shared concepts; keep everything else
  const { musclesAffected, jointAffected, triggerActivity, treatmentApplied, ...rest } = e
  return {
    ...rest,
    distribution: location,
    character: e.character || [],
    triggers,
    treatments,
    crossListedIn: e.crossListedIn,
  }
}

export function toJointShape(e: any): any {
  const location = pickLocation(e)
  const triggers = pickTriggers(e)
  const treatments = pickTreatments(e)
  // drop neuro-only aliases for the shared concepts; keep everything else
  const { distribution, character, triggers: _t, treatments: _tr, ...rest } = e
  return {
    ...rest,
    jointAffected: e.jointAffected || [],
    musclesAffected: location,
    triggerActivity: triggers,
    treatmentApplied: treatments,
    crossListedIn: e.crossListedIn,
  }
}

// Translate a cross-listed entry into the shape native to `targetSub`.
// Pass this as the `translate` arg to crossListSave / crossListUpdate.
export function neuroJointTranslate(entry: any, targetSub: string): any {
  if (targetSub === 'joint') return toJointShape(entry)
  if (targetSub === 'neuro') return toNeuroShape(entry)
  return entry
}
