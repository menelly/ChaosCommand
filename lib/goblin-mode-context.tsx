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

import React, { createContext, useContext, useState, useEffect } from 'react'
import { getPref, setPref } from '@/lib/prefs'

interface GoblinModeContextType {
  goblinMode: boolean
  setGoblinMode: (enabled: boolean) => void
}

const GoblinModeContext = createContext<GoblinModeContextType | undefined>(undefined)

export function GoblinModeProvider({ children }: { children: React.ReactNode }) {
  const [goblinMode, setGoblinModeState] = useState(true)

  const setGoblinMode = (enabled: boolean) => {
    setGoblinModeState(enabled)
    setPref('chaos-goblin-mode', enabled.toString())
  }

  useEffect(() => {
    const savedGoblinMode = getPref('chaos-goblin-mode') !== 'false'
    setGoblinModeState(savedGoblinMode)
  }, [])

  return (
    <GoblinModeContext.Provider value={{ goblinMode, setGoblinMode }}>
      {children}
    </GoblinModeContext.Provider>
  )
}

export function useGoblinMode() {
  const context = useContext(GoblinModeContext)
  if (context === undefined) {
    throw new Error('useGoblinMode must be used within a GoblinModeProvider')
  }
  return context
}
