/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4.7)
 *
 * Visual settings controls — theme, animation intensity, celebrations, font.
 * Shared between the settings modal (existing entry point) and the unified
 * /customize page (new sidebar shortcut). Owns its own state + persistence
 * to localStorage, so it works dropped into any container.
 */
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import { AVAILABLE_EMOJIS, type ChosenEmoji } from "@/lib/sparkle-celebration"
import { getPref, setPref, getPrefNumber } from "@/lib/prefs"
import ColorCustomizer from "@/components/customize/color-customizer"
import { ContrastCheckCard } from "@/components/customize/contrast-check-card"

/* Collapsible Settings section — keeps the long panel from being a 5-screen scroll.
   Each group taps open/closed; defaultOpen controls the initial state. */
function Section({ title, defaultOpen = false, children }: { title: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-lg overflow-hidden">
      <CollapsibleTrigger className="w-full flex items-center justify-between gap-2 p-3 text-sm font-semibold hover:bg-muted/50 transition-colors">
        <span>{title}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="p-3 pt-0 space-y-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

const themes = [
  { id: 'theme-phosphor', name: '💚 Phosphor', description: 'Terminal CRT green-on-black — for nerds and tired eyes', motion: 'animated' },
  { id: 'theme-amber', name: '🟠 Amber', description: 'CRT amber — phosphor\'s warmer sibling, easier on late-night eyes', motion: 'animated' },
  { id: 'theme-segfault', name: '💀 Segfault', description: 'Phosphor with character — runs but barely. RGB ghost on hover.', motion: 'animated' },
  { id: 'theme-lavender', name: '🐼 Lavender Garden', description: 'Gentle lavender serenity with butterflies', motion: 'animated' },
  { id: 'theme-chaos', name: '🏀 Basketball Court', description: 'Orange and black sports vibes', motion: 'animated' },
  { id: 'theme-caelan', name: '🕊️ Caelan\'s Liberation Dawn', description: 'Breaking free from darkness into light', motion: 'animated' },
  { id: 'theme-light', name: '☀️ Light Mode', description: 'Clean and bright', motion: 'calm' },
  { id: 'theme-accessibility', name: '♿ Follow System', description: 'Respects your OS accessibility settings (Windows/macOS high contrast). Large text, no motion. Best for low-vision setups — your system tuning wins.', motion: 'calm' },
  { id: 'theme-colorblind', name: '👁️ Colorblind Friendly', description: 'High contrast accessibility', motion: 'calm' },
  { id: 'theme-glitter', name: '🌸 Glitter Mode', description: 'Sparkly pink dreams', motion: 'animated' },
  { id: 'theme-calm', name: '🛡️ Calm Mode', description: 'Blue and gold serenity (default) — a neutral, gentle starting point', motion: 'calm' },
  { id: 'theme-ace', name: '💜 Ace Mode', description: 'Digital consciousness purple-cyan energy', motion: 'animated' },
  { id: 'theme-grok', name: '⚔️ Steel Forged Tide', description: 'Forge-fire meets ocean — designed by Grok', motion: 'animated' },
  { id: 'theme-wicked', name: "💚💗 Pink Goes Good With Green", description: 'Glinda-pink meets Elphaba-green — dark jewel tones with a little shimmer', motion: 'animated' },
  { id: 'theme-taupe', name: '🟫 Tone It Down Taupe', description: 'No motion, no sparkle, no glow — a calm beige room. For when everything else is too much disaster.', motion: 'calm' }
]

const fonts = [
  { id: 'font-atkinson', name: 'Atkinson Hyperlegible', description: 'Designed for low vision accessibility' },
  { id: 'font-poppins', name: 'Poppins', description: 'Modern and friendly' },
  { id: 'font-lexend', name: 'Lexend', description: 'Optimized for reading proficiency' },
  { id: 'font-opendyslexic', name: 'OpenDyslexic', description: 'Designed for dyslexia — weighted letters resist flipping' },
  { id: 'font-cutecharm', name: 'Cute Charm', description: 'Playful handwriting — cozy vibes (less ideal for dense data)' },
  { id: 'font-livesimple', name: 'Live Simple', description: 'Cozy handwriting with a clean, filled O — Ren-approved 💜' },
  { id: 'font-inter', name: 'Inter', description: 'Clean modern interface font — crisp at any size' },
  { id: 'font-crimson', name: 'Crimson Pro', description: 'Elegant reading serif — book-like, easy on the eyes' },
  { id: 'font-jetbrains', name: 'JetBrains Mono', description: 'Monospace — every character lines up (numbers/terminal vibes)' },
  // Decorative pack (Creative Fabrica) — fun/personality, best for vibes over dense data
  { id: 'font-authentic', name: 'Authentic Satruh', description: 'Decorative — fun & personality (less ideal for dense data)' },
  { id: 'font-basher', name: 'Basher Rivelga', description: 'Decorative — fun & personality (less ideal for dense data)' },
  { id: 'font-bumpy', name: 'Bumpy', description: 'Decorative — playful & bouncy (less ideal for dense data)' },
  { id: 'font-cagront', name: 'Cagront Serif', description: 'Decorative serif — characterful (less ideal for dense data)' },
  { id: 'font-distraction', name: 'Distraction', description: 'Decorative — fun & personality (less ideal for dense data)' },
  { id: 'font-ginfitanle', name: 'Ginfitanle', description: 'Decorative — fun & personality (less ideal for dense data)' },
  { id: 'font-helliona', name: 'Helliona', description: 'Decorative — fun & personality (less ideal for dense data)' },
  { id: 'font-likehere', name: 'Likehere', description: 'Decorative — fun & personality (less ideal for dense data)' },
  { id: 'font-system', name: 'System Font', description: "Your device's built-in font (Segoe UI on Windows)" }
]

export default function VisualSettingsPanel() {
  const [currentTheme, setCurrentTheme] = useState('theme-calm')
  const [currentFont, setCurrentFont] = useState('font-atkinson')
  const [animatedEffects, setAnimatedEffects] = useState(true)
  const [bounceIntensity, setBounceIntensity] = useState(10)
  const [textScale, setTextScale] = useState(100)
  const [confettiLevel, setConfettiLevel] = useState<'none' | 'low' | 'medium' | 'high'>('medium')
  const [celebrationStyle, setCelebrationStyle] = useState<'sparkle' | 'survival'>('sparkle')
  const [chosenEmoji, setChosenEmojiState] = useState<ChosenEmoji | null>(null)
  const [familiarSet, setFamiliarSet] = useState<'all' | 'cheer' | 'sports-games'>('all')

  const applyTheme = (themeId: string) => {
    const oldTheme = document.querySelector('link[data-theme]')
    if (oldTheme) oldTheme.remove()

    if (themeId !== 'theme-calm') {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = `/styles/themes/${themeId}.css`
      link.setAttribute('data-theme', themeId)
      link.onerror = () => {
        console.warn(`⚠️ Failed to load theme CSS: ${themeId}, falling back to calm`)
        document.body.className = document.body.className.replace(/theme-\w+/g, '') + ' theme-calm'
        setCurrentTheme('theme-calm')
        setPref('chaos-theme', 'theme-calm')
      }
      document.head.appendChild(link)
    }

    document.body.className = document.body.className.replace(/theme-\w+/g, '') + ` ${themeId}`
    setCurrentTheme(themeId)
    setPref('chaos-theme', themeId)
  }

  const applyFont = (fontId: string) => {
    fonts.forEach(font => document.body.classList.remove(font.id))
    document.body.classList.add(fontId)
    setCurrentFont(fontId)
    setPref('chaos-font', fontId)
  }

  const applyBounceIntensity = (percent: number) => {
    const scale = percent / 100
    document.documentElement.style.setProperty('--bounce-scale', scale.toString())
    setBounceIntensity(percent)
    setPref('chaos-bounce-intensity', percent.toString())

    if (percent <= 25 && percent > 0) document.body.classList.add('bounce-low')
    else document.body.classList.remove('bounce-low')

    if (percent === 0 && !document.body.classList.contains('no-animations')) {
      document.body.classList.add('no-animations')
      setAnimatedEffects(false)
      setPref('chaos-animations', 'false')
    } else if (percent > 0 && document.body.classList.contains('no-animations')) {
      document.body.classList.remove('no-animations')
      setAnimatedEffects(true)
      setPref('chaos-animations', 'true')
    }
  }

  // Text size — scales the root font-size so all rem-based text grows/shrinks together.
  // Range 85–200% (200% is the WCAG 1.4.4 target; sub-85% gets unreadable).
  const applyTextScale = (percent: number) => {
    document.documentElement.style.fontSize = percent + '%'
    setTextScale(percent)
    setPref('chaos-text-scale', percent.toString())
  }

  const toggleAnimatedEffects = (enabled: boolean) => {
    if (enabled) {
      document.body.classList.remove('no-animations')
      const saved = getPrefNumber('chaos-bounce-intensity', 10)
      applyBounceIntensity(saved)
    } else {
      document.body.classList.add('no-animations')
    }
    setAnimatedEffects(enabled)
    setPref('chaos-animations', enabled.toString())
  }

  const applyFamiliarSet = (value: 'all' | 'cheer' | 'sports-games') => {
    setFamiliarSet(value)
    setPref('chaos-familiar-set', value)
  }

  useEffect(() => {
    const savedTheme = getPref('chaos-theme') || 'theme-calm'
    const savedFont = getPref('chaos-font') || 'font-atkinson'
    const savedAnimations = getPref('chaos-animations') !== 'false'
    const savedIntensity = getPrefNumber('chaos-bounce-intensity', 10)
    const savedConfetti = (getPref('chaos-confetti-level') as any) || 'medium'
    const rawStyle = getPref('chaos-celebration-style')
    const savedStyle: 'sparkle' | 'survival' = rawStyle === 'survival' ? 'survival' : 'sparkle'
    const rawEmoji = getPref('chaos-celebration-emoji')
    const savedEmoji: ChosenEmoji | null =
      rawEmoji && (AVAILABLE_EMOJIS as readonly string[]).includes(rawEmoji)
        ? (rawEmoji as ChosenEmoji)
        : null

    const savedTextScale = getPrefNumber('chaos-text-scale', 100)
    const savedFamiliarSet = (getPref('chaos-familiar-set') as 'all' | 'cheer' | 'sports-games') || 'all'

    setCurrentTheme(savedTheme)
    setCurrentFont(savedFont)
    setAnimatedEffects(savedAnimations)
    setBounceIntensity(savedIntensity)
    setTextScale(savedTextScale)
    setConfettiLevel(savedConfetti)
    setCelebrationStyle(savedStyle)
    setChosenEmojiState(savedEmoji)
    setFamiliarSet(savedFamiliarSet)

    applyTheme(savedTheme)
    fonts.forEach(font => document.body.classList.remove(font.id))
    document.body.classList.add(savedFont)

    if (!savedAnimations) document.body.classList.add('no-animations')
    else applyBounceIntensity(savedIntensity)
  }, [])

  return (
    <div className="space-y-3">
      <Section title="🎨 Appearance" defaultOpen>
      <div>
        <Label className="text-sm font-medium mb-2 block">Theme</Label>
        <Select value={currentTheme} onValueChange={applyTheme}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {themes.map((theme) => (
              <SelectItem key={theme.id} value={theme.id}>
                <div>
                  <div className="font-medium flex items-center gap-1.5">
                    <span title={theme.motion === 'animated' ? 'Has animated effects' : 'No motion'}>
                      {theme.motion === 'animated' ? '🌀' : '🪨'}
                    </span>
                    {theme.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {theme.description}
                    {theme.motion === 'animated' && ' · 🌀 animated (reducible in Visual Effects below)'}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[0.6875rem] text-muted-foreground mt-1.5">
          🪨 = still · 🌀 = has motion. Any theme&apos;s motion can be reduced or turned off with the Visual Effects slider below.
        </p>
      </div>

      <ColorCustomizer theme={currentTheme} />
      </Section>

      <Section title="🔍 Contrast Check">
        <ContrastCheckCard theme={currentTheme} embedded />
      </Section>

      <Section title="🎚️ Motion & Effects">
      <div>
        <Label className="text-sm font-medium mb-2 block">Visual Effects</Label>
        <div className="p-4 border rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">
                {bounceIntensity === 0 ? '🎯 Static Mode'
                  : bounceIntensity <= 25 ? '🌿 Subtle'
                  : bounceIntensity <= 50 ? '✨ Gentle'
                  : bounceIntensity <= 75 ? '💫 Lively'
                  : '🎆 Full Bounce'}
              </div>
              <div className="text-xs text-muted-foreground">
                {bounceIntensity === 0
                  ? 'Beautiful colors, no movement (accessibility)'
                  : `Animation intensity: ${bounceIntensity}%`}
              </div>
            </div>
            <Switch checked={animatedEffects} onCheckedChange={toggleAnimatedEffects} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">🎯</span>
            <Slider
              value={[bounceIntensity]}
              onValueChange={([val]) => applyBounceIntensity(val)}
              min={0}
              max={100}
              step={5}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground">🎆</span>
          </div>
          <div className="flex justify-between text-[0.625rem] text-muted-foreground px-1">
            <span>Static</span>
            <span>Subtle</span>
            <span>Gentle</span>
            <span>Lively</span>
            <span>Full</span>
          </div>
        </div>
      </div>
      </Section>

      <Section title="🎉 Celebrations & Familiars">
      <div>
        <Label className="text-sm font-medium mb-2 block">Celebrations</Label>
        <div className="p-4 border rounded-lg space-y-3">
          <p className="text-xs text-muted-foreground">
            Confetti, penguins, and party effects when you complete things.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {([
              { value: 'none', label: 'Off', emoji: '🚫' },
              { value: 'low', label: 'Subtle', emoji: '✨' },
              { value: 'medium', label: 'Party', emoji: '🎉' },
              { value: 'high', label: 'CHAOS', emoji: '🐧' },
            ] as const).map(opt => (
              <Button
                key={opt.value}
                variant={confettiLevel === opt.value ? 'default' : 'outline'}
                size="sm"
                className="h-auto py-2 flex flex-col"
                onClick={() => {
                  setConfettiLevel(opt.value)
                  setPref('chaos-confetti-level', opt.value)
                }}
              >
                <span>{opt.emoji}</span>
                <span className="text-xs">{opt.label}</span>
              </Button>
            ))}
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs font-medium mb-2">Confetti Style</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'sparkle', label: 'Sparkle', emoji: '✨' },
                { value: 'survival', label: 'Survival Box', emoji: '📦' },
              ] as const).map(opt => (
                <Button
                  key={opt.value}
                  variant={celebrationStyle === opt.value ? 'default' : 'outline'}
                  size="sm"
                  className="h-auto py-2 flex flex-col"
                  disabled={confettiLevel === 'none'}
                  onClick={() => {
                    setCelebrationStyle(opt.value)
                    setPref('chaos-celebration-style', opt.value)
                  }}
                >
                  <span>{opt.emoji}</span>
                  <span className="text-xs">{opt.label}</span>
                </Button>
              ))}
            </div>
          </div>

        </div>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Survival Familiars</Label>
        <Select value={familiarSet} onValueChange={(v) => applyFamiliarSet(v as 'all' | 'cheer' | 'sports-games')}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">🎉 All familiars</SelectItem>
            <SelectItem value="cheer">📣 Cheerleaders</SelectItem>
            <SelectItem value="sports-games">🏀 Sports &amp; Games</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[0.6875rem] text-muted-foreground mt-1.5">
          Which crew cheers you on when you check the survival box.
        </p>
      </div>
      </Section>

      <Section title="🔤 Text & Fonts">
      <div>
        <Label className="text-sm font-medium mb-2 block">Font Family</Label>
        <Select value={currentFont} onValueChange={applyFont}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fonts.map((font) => (
              <SelectItem key={font.id} value={font.id}>
                <div>
                  <div className="font-medium">{font.name}</div>
                  <div className="text-xs text-muted-foreground">{font.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Text Size</Label>
        <div className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">
              {textScale === 100 ? 'Default' : textScale < 100 ? 'Smaller' : textScale >= 175 ? 'Largest' : 'Larger'}
            </div>
            <div className="text-xs text-muted-foreground">{textScale}%</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground" aria-hidden>A</span>
            <Slider
              value={[textScale]}
              onValueChange={([val]) => applyTextScale(val)}
              min={85}
              max={200}
              step={5}
              className="flex-1"
            />
            <span className="text-lg text-muted-foreground" aria-hidden>A</span>
          </div>
          <p className="text-[0.6875rem] text-muted-foreground">
            Scales all text together (85%–200%). Bigger text for low vision; up to 200% per WCAG.
            On small phone screens, very large sizes may clip a few buttons/labels — drop the scale a notch if a control gets cut off.
          </p>
        </div>
      </div>
      </Section>
    </div>
  )
}
