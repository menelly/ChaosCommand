/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Generic device & timer config. Generalizes the old diabetes-only timer
 * (cgm | pump | glp1) into a preset registry so ANY swap-on-a-schedule device
 * can be tracked: CGM, pump, injectables (Aimovig/Humira/GLP-1 — interval set
 * per drug), line dressings, ostomy, Foley, feeding tube, CPAP filter, + custom.
 *
 * Back-compat: stored timers still live under subcategory 'diabetes_timers'
 * (no migration). Legacy type 'glp1' resolves to the Injectable preset.
 *
 * Colors are intentionally the solid -500 Tailwind hues — the per-dark-theme
 * override layer only retones -50/100/200/300, so -500 icon squares stay
 * readable on every theme (same trick the Maintain/Choice cute-cards use).
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

export interface DeviceTimer {
  id: string
  type: string          // preset key (see DEVICE_PRESETS) or 'custom'
  customName?: string    // label when type === 'custom'
  name: string           // user-facing instance name (e.g. "Left arm Dexcom")
  inserted_at: string    // ISO — when applied/inserted/injected
  expires_at: string     // ISO — when it needs changing/next dose
  user_id: string
}

export interface DevicePreset {
  key: string
  name: string
  defaultDays: number
  icon: string           // emoji for cards/dropdown
  color: string          // hex — used for the in-app calendar dot
  iconBg: string         // Tailwind solid -500 bg for the icon square
  note?: string          // optional helper shown under the type picker
}

// Ordered list shown in the type dropdown.
export const DEVICE_PRESETS: DevicePreset[] = [
  {
    key: 'cgm',
    name: 'CGM Sensor',
    defaultDays: 10,
    icon: '📊',
    color: '#3b82f6',
    iconBg: 'bg-blue-500',
    note: 'Dexcom ~10d, Libre ~14d — set yours below.',
  },
  {
    key: 'pump',
    name: 'Pump Site',
    defaultDays: 3,
    icon: '💉',
    color: '#a855f7',
    iconBg: 'bg-purple-500',
    note: 'Infusion sets are usually changed every 2–3 days.',
  },
  {
    key: 'injectable',
    name: 'Injectable',
    defaultDays: 7,
    icon: '💊',
    color: '#10b981',
    iconBg: 'bg-emerald-500',
    note: 'Set the interval for YOUR drug — e.g. GLP-1 weekly (7d), Humira every 2 weeks (14d), Aimovig monthly (28d).',
  },
  {
    key: 'picc-dressing',
    name: 'PICC Dressing',
    defaultDays: 7,
    icon: '🩹',
    color: '#f43f5e',
    iconBg: 'bg-rose-500',
    note: 'Transparent dressings are typically changed weekly (or if soiled/loose).',
  },
  {
    key: 'central-dressing',
    name: 'Central Line Dressing',
    defaultDays: 7,
    icon: '🩹',
    color: '#ec4899',
    iconBg: 'bg-pink-500',
    note: 'Per your care team — usually weekly, sooner if it lifts or gets wet.',
  },
  {
    key: 'ostomy',
    name: 'Ostomy Pouch / Wafer',
    defaultDays: 4,
    icon: '🧷',
    color: '#f59e0b',
    iconBg: 'bg-amber-500',
    note: 'Wafers commonly last 3–7 days — go by your skin and seal.',
  },
  {
    key: 'foley',
    name: 'Foley / Catheter',
    defaultDays: 14,
    icon: '💧',
    color: '#06b6d4',
    iconBg: 'bg-cyan-500',
    note: 'Often changed every 2–4 weeks, or as your provider directs.',
  },
  {
    key: 'feeding-tube',
    name: 'Feeding Tube / PEG',
    defaultDays: 90,
    icon: '🍽️',
    color: '#f97316',
    iconBg: 'bg-orange-500',
    note: 'Balloon/button changes vary widely — set yours.',
  },
  {
    key: 'cpap-filter',
    name: 'CPAP Filter / Supplies',
    defaultDays: 30,
    icon: '🌬️',
    color: '#6366f1',
    iconBg: 'bg-indigo-500',
    note: 'Filters monthly; tubing/mask cushions on their own schedule.',
  },
  {
    key: 'custom',
    name: 'Custom…',
    defaultDays: 7,
    icon: '🔧',
    color: '#8b5cf6',
    iconBg: 'bg-violet-500',
    note: 'Name it and set how often it needs changing.',
  },
]

// Fast lookup, plus a legacy alias so old 'glp1' data resolves cleanly.
const PRESET_MAP: Record<string, DevicePreset> = DEVICE_PRESETS.reduce(
  (acc, p) => { acc[p.key] = p; return acc },
  {} as Record<string, DevicePreset>
)
PRESET_MAP['glp1'] = { ...PRESET_MAP['injectable'], key: 'glp1' } // legacy back-compat

const CUSTOM_FALLBACK = PRESET_MAP['custom']

/**
 * Resolve a stored timer's type to a display config. Unknown/custom types fall
 * back to the Custom preset, using customName for the label when present.
 */
export function getDeviceConfig(type: string, customName?: string): DevicePreset {
  const preset = PRESET_MAP[type]
  if (preset) return preset
  return { ...CUSTOM_FALLBACK, name: customName || 'Custom Device' }
}

// Display name for a timer (custom uses its customName).
export function deviceDisplayName(timer: Pick<DeviceTimer, 'type' | 'customName'>): string {
  if (timer.type === 'custom') return timer.customName || 'Custom Device'
  return getDeviceConfig(timer.type).name
}

export const getTimeRemaining = (timer: { expires_at: string }) => {
  const expires = new Date(timer.expires_at)
  const now = new Date()
  const remainingMs = expires.getTime() - now.getTime()

  if (remainingMs <= 0) return { expired: true, text: '⚠️ EXPIRED!' }

  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) return { expired: false, text: `${days}d ${hours}h remaining` }
  return { expired: false, text: `${hours}h remaining` }
}

// Storage location — kept as the original key so existing timers carry over
// with zero migration. (Despite the diabetes-era name, it now holds ALL device
// timers.)
export const DEVICE_TIMER_SUBCATEGORY = 'diabetes_timers'
