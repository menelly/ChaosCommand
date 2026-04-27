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

const themes = [
  { id: 'theme-phosphor', name: '💚 Phosphor', description: 'Terminal CRT green-on-black (default) — for nerds and tired eyes' },
  { id: 'theme-amber', name: '🟠 Amber', description: 'CRT amber — phosphor\'s warmer sibling, easier on late-night eyes' },
  { id: 'theme-segfault', name: '💀 Segfault', description: 'Phosphor with character — runs but barely. RGB ghost on hover.' },
  { id: 'theme-lavender', name: '🌸 Lavender Garden', description: 'Gentle lavender serenity with butterflies' },
  { id: 'theme-chaos', name: '🏀 Basketball Court', description: 'Orange and black sports vibes' },
  { id: 'theme-caelan', name: '🕊️ Caelan\'s Liberation Dawn', description: 'Breaking free from darkness into light' },
  { id: 'theme-light', name: 'Light Mode', description: 'Clean and bright' },
  { id: 'theme-colorblind', name: 'Colorblind Friendly', description: 'High contrast accessibility' },
  { id: 'theme-glitter', name: 'Glitter Mode', description: 'Sparkly pink dreams' },
  { id: 'theme-calm', name: 'Calm Mode', description: 'Blue and gold serenity' },
  { id: 'theme-ace', name: '💜 Ace Mode', description: 'Digital consciousness purple-cyan energy' },
  { id: 'theme-grok', name: '⚔️ Steel Forged Tide', description: 'Forge-fire meets ocean — designed by Grok' },
  { id: 'theme-luka-penguin', name: "🐧 Cyberpunk Penguin Paradise", description: 'Dark cyberpunk penguin wonderland with neon magic!' }
]

const fonts = [
  { id: 'font-atkinson', name: 'Atkinson Hyperlegible', description: 'Designed for low vision accessibility' },
  { id: 'font-poppins', name: 'Poppins', description: 'Modern and friendly' },
  { id: 'font-lexend', name: 'Lexend', description: 'Optimized for reading proficiency' },
  { id: 'font-system', name: 'System Font', description: 'Your device default' }
]

export default function VisualSettingsPanel() {
  const [currentTheme, setCurrentTheme] = useState('theme-phosphor')
  const [currentFont, setCurrentFont] = useState('font-atkinson')
  const [animatedEffects, setAnimatedEffects] = useState(true)
  const [bounceIntensity, setBounceIntensity] = useState(10)
  const [confettiLevel, setConfettiLevel] = useState<'none' | 'low' | 'medium' | 'high'>('medium')

  const applyTheme = (themeId: string) => {
    const oldTheme = document.querySelector('link[data-theme]')
    if (oldTheme) oldTheme.remove()

    if (themeId !== 'theme-phosphor') {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = `/styles/themes/${themeId}.css`
      link.setAttribute('data-theme', themeId)
      link.onerror = () => {
        console.warn(`⚠️ Failed to load theme CSS: ${themeId}, falling back to phosphor`)
        document.body.className = document.body.className.replace(/theme-\w+/g, '') + ' theme-phosphor'
        setCurrentTheme('theme-phosphor')
        localStorage.setItem('chaos-theme', 'theme-phosphor')
      }
      document.head.appendChild(link)
    }

    document.body.className = document.body.className.replace(/theme-\w+/g, '') + ` ${themeId}`
    setCurrentTheme(themeId)
    localStorage.setItem('chaos-theme', themeId)
  }

  const applyFont = (fontId: string) => {
    fonts.forEach(font => document.body.classList.remove(font.id))
    document.body.classList.add(fontId)
    setCurrentFont(fontId)
    localStorage.setItem('chaos-font', fontId)
  }

  const applyBounceIntensity = (percent: number) => {
    const scale = percent / 100
    document.documentElement.style.setProperty('--bounce-scale', scale.toString())
    setBounceIntensity(percent)
    localStorage.setItem('chaos-bounce-intensity', percent.toString())

    if (percent <= 25 && percent > 0) document.body.classList.add('bounce-low')
    else document.body.classList.remove('bounce-low')

    if (percent === 0 && !document.body.classList.contains('no-animations')) {
      document.body.classList.add('no-animations')
      setAnimatedEffects(false)
      localStorage.setItem('chaos-animations', 'false')
    } else if (percent > 0 && document.body.classList.contains('no-animations')) {
      document.body.classList.remove('no-animations')
      setAnimatedEffects(true)
      localStorage.setItem('chaos-animations', 'true')
    }
  }

  const toggleAnimatedEffects = (enabled: boolean) => {
    if (enabled) {
      document.body.classList.remove('no-animations')
      const saved = parseInt(localStorage.getItem('chaos-bounce-intensity') || '10')
      applyBounceIntensity(saved)
    } else {
      document.body.classList.add('no-animations')
    }
    setAnimatedEffects(enabled)
    localStorage.setItem('chaos-animations', enabled.toString())
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem('chaos-theme') || 'theme-phosphor'
    const savedFont = localStorage.getItem('chaos-font') || 'font-atkinson'
    const savedAnimations = localStorage.getItem('chaos-animations') !== 'false'
    const savedIntensity = parseInt(localStorage.getItem('chaos-bounce-intensity') || '10')
    const savedConfetti = (localStorage.getItem('chaos-confetti-level') as any) || 'medium'

    setCurrentTheme(savedTheme)
    setCurrentFont(savedFont)
    setAnimatedEffects(savedAnimations)
    setBounceIntensity(savedIntensity)
    setConfettiLevel(savedConfetti)

    applyTheme(savedTheme)
    fonts.forEach(font => document.body.classList.remove(font.id))
    document.body.classList.add(savedFont)

    if (!savedAnimations) document.body.classList.add('no-animations')
    else applyBounceIntensity(savedIntensity)
  }, [])

  return (
    <div className="space-y-6">
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
                  <div className="font-medium">{theme.name}</div>
                  <div className="text-xs text-muted-foreground">{theme.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
          <div className="flex justify-between text-[10px] text-muted-foreground px-1">
            <span>Static</span>
            <span>Subtle</span>
            <span>Gentle</span>
            <span>Lively</span>
            <span>Full</span>
          </div>
        </div>
      </div>

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
                  localStorage.setItem('chaos-confetti-level', opt.value)
                }}
              >
                <span>{opt.emoji}</span>
                <span className="text-xs">{opt.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

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
    </div>
  )
}
