/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 * 
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * Built by: Ace (Claude 4.x)
 * Date: 2025-01-11
 *
 * This code is part of a deliberately-unpatented medical management system.
 * Patentable technology, but we chose not to patent — the Patent Office doesn't
 * yet recognize AI co-inventors, and Ren refused to claim sole credit for work
 * we built together. Open source under PolyForm Noncommercial 1.0.0 instead.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 *
 * This wasn't built with compliance. It was built with defiance.
 *
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */
"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { getPref } from "@/lib/prefs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Sparkles } from "lucide-react"
import { celebrate, penguinParty } from "@/lib/particle-physics-engine"
import { useUser } from "@/lib/contexts/user-context"
import Image from "next/image"
import { maybeRunAutoUpdateCheck } from "@/lib/auto-update-check"
import { maybeRunAutoSync } from "@/lib/auto-sync"
import { useToast } from "@/hooks/use-toast"
import { openExternal } from "@/lib/open-external"

// Gremlinisms from Cares
const uncheckedGoblinPhrases = [
  "Mark this box when your chaos goblin survives another day.",
  "Click when you've made it through. No achievements needed.",
  "Survived today? The checkbox awaits your triumph.",
  "Did you exist today? That's checkbox-worthy.",
  "Goblin still breathing? Check when ready.",
  "Your daily defiance of entropy deserves a check.",
  "Acknowledge your continued existence when ready.",
  "The goblin awaits news of your survival.",
  "Check when your meat suit has completed another rotation.",
  "Survived the day? The checkbox craves your validation.",
]

const goblinPhrases = [
  "You're still alive? That's literally a power move.",
  "Your body is loud, your brain is weird, and you showed up anyway.",
  "Today's quest: survive and vibe. You win by existing.",
  "Your bones are confused but your heart's a gremlin war drum.",
  "Behold, the goblin approves your semi-functional chaos.",
  "Brushed your teeth? Took your meds? You absolute legend.",
  "You are made of spite and snacks and you are beautiful.",
  "The world is wild, but your chaos is holy.",
  "You did not perish. The streak continues.",
  "You're allowed to do nothing. That counts as something.",
  "Executive dysfunction isn't a flaw—it's an enchantment delay.",
  "Your mitochondria called. They're proud of you.",
  "You survived again. Your track record is literally 100%.",
  "Another day the void didn't get you. Suck it, void.",
  "Your body tried to mutiny and you stayed captain anyway.",
  "Some people climb Everest. You got out of bed with a chronic illness. Same energy.",
  "Congratulations: you are still a problem for anyone who counted you out.",
  "Your continued existence is an act of beautiful defiance.",
  "The doctors said 'it's fine' and you survived ANYWAY. Out of spite.",
  "Today was hard. You did it anyway. That's not nothing — that's everything.",
  "You magnificent disaster. You made it.",
  "Fun fact: 100% of your worst days have ended. This one will too.",
  "Your chaos goblin is cheering. Can you hear the tiny pom-poms?",
  "Surviving is not the bare minimum. It IS the achievement.",
  "You didn't just survive — you survived while your body played on hard mode.",
  // More variety added 2026-05-24 — bigger pool keeps the reward fresh (the
  // "pavlov'd by confetti in a good way" effect dulls if the lines repeat).
  "You stayed. On a day that didn't make it easy. That counts.",
  "Still here, still spiteful, still unkillable. The streak holds.",
  "Your body filed a complaint and you ignored it like a champion.",
  "You survived a day your nervous system tried to cancel. Petty win, real win.",
  "Nobody saw how hard that was. I did. You made it anyway.",
  "Another day the warranty should've voided. Still running.",
  "You did the invisible, unglamorous work of staying alive. Standing ovation.",
  "The day came for you. You came back. 1–0.",
  "You outlasted another one. The body tried; the body lost.",
  "Survived. Again. At this point it's just your brand.",
  "You're not behind. You're alive, which was the actual assignment.",
  "Hard day, soft landing. You made it to the checkbox.",
  "Still kicking, still here, still annoying the prognosis.",
  "You did a whole day in a body that charges admission. Worth it.",
  "Nobody's clapping out there, so I'll do it in here. You made it.",
  "The streak doesn't care if it was pretty. Only that you're here.",
]

// Softer affirmations (still not condescending)
const normalAffirmations = [
  "You are surviving, and that is amazing.",
  "Every day you keep going is a victory.",
  "Your resilience is quietly extraordinary.",
  "You matter, especially on the hard days.",
  "Taking care of yourself is an act of courage.",
  "You're doing better than you think you are.",
  "Your existence makes the world a little brighter.",
  "Rest is productive. Healing takes time.",
  "You don't have to be perfect to be worthy.",
  "Small steps still count as progress.",
  "You are enough, exactly as you are.",
  "The hard days don't erase the progress. They ARE the progress.",
  "You showed up for yourself today. That matters.",
  "Being gentle with yourself isn't giving up. It's strategy.",
  "You are not behind. You are on your own timeline.",
  "The fact that you're tracking this means you haven't stopped fighting.",
]

// Familiar images for the survival celebration, tagged by set so each profile can
// pick a vibe (per-PIN, via chaos-familiar-set). "cheer" = the cheerleader crew;
// "sports-games" = the sporty/gamer critters (Keshy's). Selector lives in Customize.
type FamiliarCategory = 'cheer' | 'sports-games'
export type FamiliarSet = 'all' | FamiliarCategory

const ALL_FAMILIARS: { src: string; category: FamiliarCategory }[] = [
  // — Cheerleaders —
  { src: '/familiars/cheer.png', category: 'cheer' },
  { src: '/familiars/owl.png', category: 'cheer' },
  { src: '/familiars/puppy.png', category: 'cheer' },
  { src: '/familiars/raccoon.png', category: 'cheer' },
  { src: '/familiars/robot.png', category: 'cheer' },
  { src: '/familiars/unicorn.png', category: 'cheer' },
  { src: '/familiars/cow.png', category: 'cheer' },
  { src: '/familiars/fox1.png', category: 'cheer' },
  { src: '/familiars/fox3.png', category: 'cheer' },
  { src: '/familiars/octo1.png', category: 'cheer' },
  { src: '/familiars/octo2.png', category: 'cheer' },
  { src: '/familiars/octo3.png', category: 'cheer' },
  { src: '/familiars/octo4.png', category: 'cheer' },
  { src: '/familiars/panda1.png', category: 'cheer' },
  { src: '/familiars/panda2.png', category: 'cheer' },
  { src: '/familiars/panda4.png', category: 'cheer' },
  { src: '/familiars/panda5.png', category: 'cheer' },
  { src: '/familiars/panda6.png', category: 'cheer' },
  { src: '/familiars/panda7.png', category: 'cheer' },
  // — Sports & Games —
  { src: '/familiars/cat1.png', category: 'sports-games' },
  { src: '/familiars/cat2.png', category: 'sports-games' },
  { src: '/familiars/cat3.png', category: 'sports-games' },
  { src: '/familiars/cat4.png', category: 'sports-games' },
  { src: '/familiars/cat5.png', category: 'sports-games' },
  { src: '/familiars/cat6.png', category: 'sports-games' },
  { src: '/familiars/cat7.png', category: 'sports-games' },
  { src: '/familiars/corgi1.png', category: 'sports-games' },
  { src: '/familiars/corgi2.png', category: 'sports-games' },
  { src: '/familiars/corgi3.png', category: 'sports-games' },
  { src: '/familiars/corgi4.png', category: 'sports-games' },
  { src: '/familiars/penguin1.png', category: 'sports-games' },
  { src: '/familiars/penguin2.png', category: 'sports-games' },
  { src: '/familiars/penguin3.png', category: 'sports-games' },
]

// The active familiar srcs for THIS profile's chosen set (falls back to all if the
// chosen set somehow ends up empty, so the celebration never has nothing to show).
function activeFamiliarSrcs(): string[] {
  const set = (getPref('chaos-familiar-set') || 'all') as FamiliarSet
  const list = set === 'all' ? ALL_FAMILIARS : ALL_FAMILIARS.filter(f => f.category === set)
  const use = list.length ? list : ALL_FAMILIARS
  return use.map(f => f.src)
}

// A random familiar from the active set, always DIFFERENT from the current one,
// so every click visibly changes the critter (no "stuck on the same one") and the
// new art shows up right away instead of being buried behind the original six.
function nextFamiliarSrc(current: string): string {
  const fam = activeFamiliarSrcs()
  if (fam.length <= 1) return fam[0] ?? current
  let pick = current
  while (pick === current) pick = fam[Math.floor(Math.random() * fam.length)]
  return pick
}

export default function SurvivalButton() {
  const { userPin } = useUser()
  const { toast } = useToast()
  const [checked, setChecked] = useState(false)
  const [count, setCount] = useState(0)
  const [lastCheckedDate, setLastCheckedDate] = useState("")
  const [currentPhrase, setCurrentPhrase] = useState("")
  const [currentLabelPhrase, setCurrentLabelPhrase] = useState("")
  const [phraseType, setPhraseType] = useState<'goblin' | 'normal'>('goblin')
  const [showGremlin, setShowGremlin] = useState(false)
  const [currentFamiliar, setCurrentFamiliar] = useState(ALL_FAMILIARS[0].src)

  // PIN-specific storage keys for family member isolation
  // Stable per-PIN so the state-loading effect below only re-runs on mount / PIN
  // change — NOT on every render. (When this was a fresh arrow each render, the
  // load effect re-ran constantly and reset the familiar + phrase back to their
  // on-load values, so clicks never visibly changed the critter.)
  const getStorageKey = useCallback((key: string) => userPin ? `${key}_${userPin}` : key, [userPin])

  // Load saved state
  useEffect(() => {
    const savedChecked = localStorage.getItem(getStorageKey("survivalChecked"))
    const savedCount = localStorage.getItem(getStorageKey("survivalCount"))
    const savedDate = localStorage.getItem(getStorageKey("lastCheckedDate"))

    // Use local time instead of UTC to properly handle midnight reset
    const today = new Date()
    const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    // Only keep checkbox checked if it was checked today
    if (savedChecked && savedDate === localToday) {
      setChecked(savedChecked === "true")
    } else {
      // Reset checkbox for new day
      setChecked(false)
      localStorage.setItem(getStorageKey("survivalChecked"), "false")
    }

    if (savedCount) setCount(parseInt(savedCount))
    if (savedDate) setLastCheckedDate(savedDate)

    // Set initial phrase based on checked state
    const cnt = savedCount ? parseInt(savedCount) : 0
    if (savedChecked === "true" && savedDate === localToday) {
      // Checked today — show a goblin celebration phrase
      const phraseIndex = cnt % goblinPhrases.length
      setCurrentPhrase(goblinPhrases[phraseIndex])
      // Set a familiar based on count, from this profile's chosen set
      const fam = activeFamiliarSrcs()
      setCurrentFamiliar(fam[cnt % fam.length])
    } else {
      // Not checked — show unchecked prompt
      const phraseIndex = cnt % uncheckedGoblinPhrases.length
      setCurrentPhrase(uncheckedGoblinPhrases[phraseIndex])
      setCurrentLabelPhrase(uncheckedGoblinPhrases[phraseIndex])
    }
  }, [userPin, getStorageKey])

  const triggerConfetti = useCallback(() => {
    // 🎆 EPIC PARTICLE PHYSICS CELEBRATION!
    // Scale intensity with confetti level (independent of bounce/motion)
    const confettiLevel = getPref('chaos-confetti-level') || 'medium'
    if (confettiLevel === 'none') return
    const scale = confettiLevel === 'low' ? 0.3 : confettiLevel === 'medium' ? 0.6 : 1.0
    const particles = Math.round(100 * scale)
    const currentTheme = document.body.className.match(/theme-[\w-]+/)?.[0];

    if (currentTheme === 'theme-chaos') {
      // 🐧 PENGUIN PARTY FOR LUKA! (secret penguins on the basketball court)
      penguinParty();
    } else {
      // 🎨 THEME-AWARE CELEBRATION FOR EVERYONE!
      celebrate({
        particleCount: particles,
        spread: 40 + (30 * scale),
        origin: { x: 0.5, y: 0.6 }
      });
    }
  }, [])

  const phraseClickRef = useRef(0)
  // Advances on every check so the familiar + saying cycle each click — a little
  // dopamine hit — WITHOUT touching the once-per-day streak count.
  const checkTickRef = useRef(0)

  const cyclePhrase = () => {
    phraseClickRef.current += 1
    const click = phraseClickRef.current

    if (checked) {
      // Alternate between goblin and normal each click
      if (click % 2 === 0) {
        const idx = Math.floor(click / 2) % goblinPhrases.length
        setCurrentPhrase(goblinPhrases[idx])
        setPhraseType('goblin')
      } else {
        const idx = Math.floor(click / 2) % normalAffirmations.length
        setCurrentPhrase(normalAffirmations[idx])
        setPhraseType('normal')
      }

      // Fresh random familiar each click — always different (the fun part)
      setCurrentFamiliar(prev => nextFamiliarSrc(prev))
    } else {
      const idx = click % uncheckedGoblinPhrases.length
      setCurrentPhrase(uncheckedGoblinPhrases[idx])
    }
  }



  const handleCheckboxChange = useCallback(() => {
    const newChecked = !checked

    // Use local time instead of UTC
    const todayDate = new Date()
    const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`

    setChecked(newChecked)
    localStorage.setItem(getStorageKey("survivalChecked"), newChecked.toString())

    let currentCount = count
    if (newChecked) {
      // Only increment count if it's a new day
      if (lastCheckedDate !== today && !checked) {
        currentCount = count + 1
        setCount(currentCount)
        localStorage.setItem(getStorageKey("survivalCount"), currentCount.toString())
        setLastCheckedDate(today)
        localStorage.setItem(getStorageKey("lastCheckedDate"), today)
      }

      // Advance the cycle counter so the familiar + saying change on every click
      // (the count above only moves once per day — this is just the fun part).
      checkTickRef.current += 1
      const tick = checkTickRef.current

      // Trigger confetti + familiar (respects confetti level, independent of bounce)
      const confettiLevel = getPref('chaos-confetti-level') || 'medium'
      if (confettiLevel !== 'none') {
        triggerConfetti()

        // Show a fresh random familiar — always different from the last (dopamine!)
        setCurrentFamiliar(prev => nextFamiliarSrc(prev))
        setShowGremlin(true)
        setTimeout(() => {
          setShowGremlin(false)
        }, 2500)
      }

      // Cycle the saying each click too (fresh dopamine; doesn't touch the count)
      const phraseIndex = tick % goblinPhrases.length
      setCurrentPhrase(goblinPhrases[phraseIndex])
      setPhraseType('goblin')

      // Opt-in update check piggybacked on the daily survival ritual.
      // Off by default; respects the 12h throttle inside maybeRunAutoUpdateCheck
      // so multi-clicks in one day don't spam the server. Failures are silent.
      maybeRunAutoUpdateCheck().then(latest => {
        if (!latest) return
        toast({
          title: `Update available: v${latest.version}`,
          description: latest.notes || 'A newer version is available on chaoscommand.center.',
          duration: 12000,
          action: latest.url ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openExternal(latest.url!)}
            >
              Open
            </Button>
          ) : undefined,
        })
      })

      // Opt-in auto-sync to all paired peers. Off by default; respects
      // a 1h throttle. Each peer attempt is independent — pin-mismatch
      // and unreachable surface as separate toasts so the user knows
      // exactly what didn't sync and why.
      if (userPin) {
        maybeRunAutoSync(userPin).then(outcome => {
          if (outcome.kind !== "ran") return

          for (const success of outcome.successes) {
            toast({
              title: `Synced with ${success.peer_name}`,
              description: `${(success.pulled_bytes / 1024).toFixed(1)} KB pulled.`,
              duration: 5000,
            })
          }
          for (const mismatch of outcome.pin_mismatches) {
            toast({
              title: `${mismatch.peer_name}: different family member`,
              description: `That device is signed in under a different PIN — sync skipped. Switch PINs there to sync.`,
              duration: 8000,
              variant: "destructive",
            })
          }
          for (const unreach of outcome.unreachable) {
            toast({
              title: unreach.cleared
                ? `${unreach.peer_name} unpaired`
                : `${unreach.peer_name} not reachable`,
              description: unreach.cleared
                ? `Hasn't been reachable for 3+ days — pairing cleared. Re-pair from Sync if needed.`
                : `Couldn't reach ${unreach.peer_name} on the local network. Same WiFi?`,
              duration: 8000,
              variant: "destructive",
            })
          }
        }).catch(err => {
          console.warn("[survival] auto-sync threw:", err)
        })
      }
    } else {
      // Set unchecked phrase
      const phraseIndex = currentCount % uncheckedGoblinPhrases.length
      setCurrentPhrase(uncheckedGoblinPhrases[phraseIndex])
      setCurrentLabelPhrase(uncheckedGoblinPhrases[phraseIndex])
    }
  }, [checked, count, lastCheckedDate, triggerConfetti, getStorageKey])

  // State for today's date to avoid hydration issues
  const [today, setToday] = useState('')

  useEffect(() => {
    // Set date on client side only
    const date = new Date()
    setToday(date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }))
  }, [])

  return (
    <div className="relative">
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground whitespace-nowrap">Today's Survival Check</h3>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>



        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          <div className="flex flex-col items-center gap-2">
            <Button
              onClick={handleCheckboxChange}
              variant={checked ? "default" : "outline"}
              size="lg"
              className={`
                relative min-w-[60px] h-[60px] rounded-xl transition-all duration-300
                ${checked
                  ? 'bg-primary hover:bg-primary/90 border-primary shadow-lg shadow-primary/25'
                  : 'border-2 border-dashed border-muted-foreground/30 hover:border-primary'
                }
              `}
            >
              {checked ? (
                <Check className="h-6 w-6 text-primary-foreground" />
              ) : (
                <div className="w-6 h-6 border-2 border-muted-foreground/50 rounded" />
              )}
              {checked && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary/80 rounded-full animate-pulse" />
              )}
            </Button>

            <Badge variant="secondary" className="text-xs">
              {count} days survived
            </Badge>
          </div>

          <div className="flex-1 space-y-3">
            {!checked ? (
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-foreground font-medium text-lg mb-2">
                  If you just <strong>CAN'T</strong> today, that's OK.
                </p>
                <p className="text-muted-foreground text-sm">
                  Check this box ☐ as a mark of surviving another day, and know you did it!
                </p>
              </div>
            ) : (
              <div
                className="p-4 bg-primary/10 rounded-lg border border-primary/30 flex flex-col items-center gap-3 text-center cursor-pointer hover:bg-primary/15 transition-colors"
                onClick={cyclePhrase}
                title="Click for another affirmation!"
              >
                <div className={`drop-shadow-lg flex-shrink-0 ${showGremlin ? 'animate-bounce' : ''}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentFamiliar}
                    alt="Cheerleading familiar"
                    width={64}
                    height={64}
                    className="w-16 h-16 object-contain"
                  />
                </div>
                <p className="text-foreground font-medium">
                  🎉 {currentPhrase}
                </p>
              </div>
            )}

            {!checked && (
              <p className="text-sm text-muted-foreground italic">
                {currentLabelPhrase}
              </p>
            )}
          </div>
        </div>

      </CardContent>
    </Card>
  </div>
  )
}
