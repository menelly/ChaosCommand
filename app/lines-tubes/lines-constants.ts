/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04  (CHA-252)
 *
 * Lines & Tubes constants — device catalog, problem types, and the
 * safety-critical red-flag engine. Thresholds are clinician-grade (Chris, RN +
 * standard line/tube emergency teaching):
 *   - Central line / PICC / port + fever or chills → possible CLABSI →
 *     bloodstream infection / sepsis. Lines feed central circulation; an
 *     infected one seeds the blood. EMERGENCY.
 *   - Trach problem with breathing difficulty / can't clear secretions →
 *     AIRWAY emergency → 911.
 *   - Central line cracked / open / disconnected → air-embolism risk → clamp,
 *     left side head-down, 911.
 *   - Feeding tube dislodged with an immature tract (recently placed) → do NOT
 *     reinsert at home; stoma can close within hours and blind reinsertion can
 *     make a false tract → urgent eval.
 *   - Ostomy: no output + distension + cramping/vomiting → possible bowel
 *     obstruction → urgent.
 *   - Foley / suprapubic not draining + bladder fullness/pain → obstruction →
 *     urgent flush/change.
 *
 * This is documentation + triage guidance, NEVER diagnosis.
 */

import type { DeviceType, ProblemType, OutputColor, LinesEntry } from "./lines-types"

export const LINES_SUBCATEGORY = "lines-tubes"

// Which device types are "central" for CLABSI / air-embolism logic.
export const CENTRAL_DEVICES: DeviceType[] = ["picc", "central-port", "central-tunneled", "central-temp"]
export const FEEDING_DEVICES: DeviceType[] = ["feeding-ng", "feeding-gtube", "feeding-gj"]
export const OSTOMY_DEVICES: DeviceType[] = ["ostomy-colostomy", "ostomy-ileostomy", "ostomy-urostomy"]
export const URINARY_DEVICES: DeviceType[] = ["foley", "suprapubic"]
export const DRAIN_DEVICES: DeviceType[] = ["drain", "wound-vac"]

export const DEVICE_GROUPS: { label: string; devices: { id: DeviceType; name: string; icon: string }[] }[] = [
  {
    label: "Vascular access",
    devices: [
      { id: "picc", name: "PICC line", icon: "🩸" },
      { id: "central-port", name: "Port (Port-a-Cath)", icon: "🩸" },
      { id: "central-tunneled", name: "Tunneled line (Hickman/Broviac)", icon: "🩸" },
      { id: "central-temp", name: "Temporary central line", icon: "🩸" },
      { id: "midline", name: "Midline", icon: "💉" },
      { id: "peripheral-iv", name: "Peripheral IV", icon: "💉" },
    ],
  },
  {
    label: "Ostomy",
    devices: [
      { id: "ostomy-colostomy", name: "Colostomy", icon: "🟤" },
      { id: "ostomy-ileostomy", name: "Ileostomy", icon: "🟤" },
      { id: "ostomy-urostomy", name: "Urostomy", icon: "💧" },
    ],
  },
  {
    label: "Urinary",
    devices: [
      { id: "foley", name: "Foley catheter", icon: "💧" },
      { id: "suprapubic", name: "Suprapubic catheter", icon: "💧" },
    ],
  },
  {
    label: "Feeding",
    devices: [
      { id: "feeding-ng", name: "NG tube", icon: "🍽️" },
      { id: "feeding-gtube", name: "G-tube / PEG", icon: "🍽️" },
      { id: "feeding-gj", name: "GJ / J-tube", icon: "🍽️" },
    ],
  },
  {
    label: "Airway",
    devices: [
      { id: "trach", name: "Tracheostomy", icon: "🫁" },
    ],
  },
  {
    label: "Drains & wound",
    devices: [
      { id: "drain", name: "Surgical drain (JP/Penrose)", icon: "🩹" },
      { id: "wound-vac", name: "Wound vac (NPWT)", icon: "🩹" },
    ],
  },
  {
    label: "Other",
    devices: [
      { id: "other", name: "Other device", icon: "🔧" },
    ],
  },
]

const DEVICE_NAME_MAP: Record<DeviceType, string> = DEVICE_GROUPS
  .flatMap(g => g.devices)
  .reduce((acc, d) => { acc[d.id] = d.name; return acc }, {} as Record<DeviceType, string>)

const DEVICE_ICON_MAP: Record<DeviceType, string> = DEVICE_GROUPS
  .flatMap(g => g.devices)
  .reduce((acc, d) => { acc[d.id] = d.icon; return acc }, {} as Record<DeviceType, string>)

export function deviceName(type: DeviceType): string { return DEVICE_NAME_MAP[type] ?? "Device" }
export function deviceIcon(type: DeviceType): string { return DEVICE_ICON_MAP[type] ?? "🔧" }

export const PROBLEM_TYPES: { id: ProblemType; name: string; icon: string; description: string; color: string }[] = [
  { id: "routine-check", name: "Routine Check / Care", icon: "✅", description: "Looks good — logging a look or care done", color: "bg-green-100 text-green-800 border-green-200" },
  { id: "site-infection", name: "Site Infection", icon: "🦠", description: "Redness, warmth, pus, ± fever — can be serious on a line", color: "bg-destructive/10 text-destructive border-destructive/20" },
  { id: "occlusion", name: "Occlusion / Blockage", icon: "🚧", description: "Won't flush, draw, or drain — clogged", color: "bg-warning/10 text-warning border-warning/20" },
  { id: "dislodgement", name: "Dislodged / Migrated", icon: "⚠️", description: "Came out, partly out, or moved", color: "bg-destructive/10 text-destructive border-destructive/20" },
  { id: "leakage", name: "Leaking", icon: "💧", description: "Leaking around the site, stoma, or connector", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { id: "mechanical", name: "Mechanical Problem", icon: "🔧", description: "Kinked, cracked, broken clamp, balloon issue", color: "bg-warning/10 text-warning border-warning/20" },
  { id: "skin-breakdown", name: "Skin Breakdown", icon: "🩹", description: "Irritation or breakdown around the site/stoma", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { id: "bleeding", name: "Bleeding", icon: "🩸", description: "Bleeding at the site", color: "bg-destructive/10 text-destructive border-destructive/20" },
  { id: "output-change", name: "Output Change", icon: "📊", description: "Ostomy/drain color, volume, or blood change", color: "bg-teal-100 text-teal-800 border-teal-200" },
  { id: "pain", name: "Pain", icon: "⚡", description: "Pain at or around the device", color: "bg-warning/10 text-warning border-warning/20" },
  { id: "general", name: "General / Other", icon: "📋", description: "Mixed or other note", color: "bg-muted text-muted-foreground border-border" },
]

export const OUTPUT_COLORS: { value: OutputColor; label: string; description: string }[] = [
  { value: "normal", label: "Normal", description: "Usual for this device" },
  { value: "serous-clear", label: "Clear / serous", description: "Thin and clear-yellowish" },
  { value: "serosanguinous", label: "Pink-tinged", description: "Light blood-tinged — common for fresh drains" },
  { value: "bloody", label: "Bloody / red", description: "Frank blood — note and monitor" },
  { value: "cloudy", label: "Cloudy", description: "Possible infection (urine especially)" },
  { value: "dark", label: "Dark / concentrated", description: "Dehydration or old blood" },
  { value: "bilious-green", label: "Green / bile", description: "Bile — expected for some GI tubes" },
  { value: "purulent", label: "Pus / purulent", description: "Thick, cloudy, foul — infection" },
  { value: "other", label: "Other", description: "" },
]

export const SEVERITY_LABELS: { level: number; label: string; color: string }[] = [
  { level: 1, label: "Minimal", color: "text-muted-foreground" },
  { level: 2, label: "Very mild", color: "text-muted-foreground" },
  { level: 3, label: "Mild", color: "text-muted-foreground" },
  { level: 4, label: "Mild-moderate", color: "text-warning" },
  { level: 5, label: "Moderate", color: "text-warning" },
  { level: 6, label: "Moderate", color: "text-warning" },
  { level: 7, label: "Moderate-severe", color: "text-warning" },
  { level: 8, label: "Severe", color: "text-destructive" },
  { level: 9, label: "Very severe", color: "text-destructive" },
  { level: 10, label: "Crisis", color: "text-destructive" },
]

// Immature feeding-tube tract window — within this many days of placement, a
// dislodged G/GJ/J tube is NOT a reinsert-at-home situation.
export const IMMATURE_TRACT_DAYS = 42 // ~6 weeks, conservative

export type RedFlagLevel = "emergency" | "urgent"
export interface RedFlag {
  level: RedFlagLevel
  title: string
  body: string
}

/**
 * Compute applicable red-flag banners from the current entry state. Returns an
 * ordered list (emergencies first). Documentation + triage guidance, NOT a
 * diagnosis.
 */
export function getRedFlags(e: {
  deviceType: DeviceType
  problemType: ProblemType
  feverPresent?: boolean
  fullyDislodged?: boolean
  partiallyDislodged?: boolean
  flushes?: boolean
  draining?: boolean
  breathingDifficulty?: boolean
  cantClearSecretions?: boolean
  noOutput?: boolean
  abdominalDistension?: boolean
  cramping?: boolean
  vomiting?: boolean
  daysSincePlacement?: number
  bleeding?: boolean
  drainagePresent?: boolean
}): RedFlag[] {
  const flags: RedFlag[] = []
  const isCentral = CENTRAL_DEVICES.includes(e.deviceType)
  const isFeeding = FEEDING_DEVICES.includes(e.deviceType)
  const isOstomy = OSTOMY_DEVICES.includes(e.deviceType)
  const isUrinary = URINARY_DEVICES.includes(e.deviceType)

  // 1. Trach airway emergency
  if (e.deviceType === "trach" && (e.breathingDifficulty || e.cantClearSecretions || e.fullyDislodged)) {
    flags.push({
      level: "emergency",
      title: "Airway emergency — call 911",
      body: "Trouble breathing, inability to clear secretions, or a dislodged trach is an airway emergency. Call 911 now. If trained and your trach came out, attempt to replace it per your emergency plan while help is on the way.",
    })
  }

  // 2. Central line infection → CLABSI/sepsis
  if (isCentral && (e.feverPresent || e.problemType === "site-infection") && (e.feverPresent || e.drainagePresent)) {
    flags.push({
      level: "emergency",
      title: "Possible central-line infection (CLABSI)",
      body: "Fever, chills, or pus with a central line / PICC / port can mean the line is infecting your bloodstream — this can progress to sepsis fast. Do not wait. Contact your care team now or go to the ER, and tell them you have a central line.",
    })
  }

  // 3. Central line mechanical breach → air embolism
  if (isCentral && (e.problemType === "mechanical" || e.problemType === "dislodgement") && (e.fullyDislodged || e.partiallyDislodged)) {
    flags.push({
      level: "emergency",
      title: "Central line damaged or dislodged — air-embolism risk",
      body: "A cracked, open, or pulled central line can let air into your bloodstream, which is life-threatening. Clamp the line above the break if you can, lie on your LEFT side with your head down, and call 911.",
    })
  }

  // 4. Feeding tube dislodged with immature tract
  if (isFeeding && (e.fullyDislodged || e.partiallyDislodged)) {
    const immature = e.daysSincePlacement != null && e.daysSincePlacement <= IMMATURE_TRACT_DAYS
    flags.push({
      level: immature ? "emergency" : "urgent",
      title: immature ? "Dislodged feeding tube — recently placed" : "Dislodged feeding tube — replace promptly",
      body: immature
        ? "This tube was placed recently and the tract is not mature. Do NOT try to reinsert it yourself — the path can close within hours and blind reinsertion can create a false tract. Go to the ER / contact your team now."
        : "Even with a mature tract, a feeding-tube stoma can start to close within hours. Cover the site and contact your team today for replacement. If you have a written plan to place a temporary tube to hold the tract open, follow it.",
    })
  }

  // 5. Ostomy obstruction cluster
  if (isOstomy && e.noOutput && (e.abdominalDistension || e.cramping || e.vomiting)) {
    flags.push({
      level: "urgent",
      title: "Possible bowel obstruction",
      body: "No ostomy output along with a distended belly, cramping, or vomiting can signal a blockage. This needs urgent evaluation — contact your team or go to urgent care/ER, especially if vomiting.",
    })
  }

  // 6. Urinary catheter not draining
  if (isUrinary && (e.draining === false || e.noOutput) && e.problemType !== "routine-check") {
    flags.push({
      level: "urgent",
      title: "Catheter not draining",
      body: "A Foley or suprapubic catheter that stops draining while you feel full or have bladder pain can be blocked — urine backing up can damage the kidneys. Check for kinks; if it still won't drain, it needs an urgent flush or change. Contact your team.",
    })
  }

  // 7. Bleeding at a central line site
  if (isCentral && e.problemType === "bleeding") {
    flags.push({
      level: "urgent",
      title: "Bleeding at a central line site",
      body: "Hold firm, steady pressure over the site. If bleeding doesn't stop with sustained pressure, or is heavy, call 911. Otherwise contact your care team promptly.",
    })
  }

  // Emergencies first, then urgent.
  return flags.sort((a, b) => (a.level === "emergency" ? -1 : 1) - (b.level === "emergency" ? -1 : 1))
}
