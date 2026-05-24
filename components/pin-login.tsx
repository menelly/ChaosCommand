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
'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DEMO_PIN, ensureDemoSeeded } from '@/lib/database/demo-profile'

interface PinLoginProps {
  onPinEntered: (pin: string) => void
}

export default function PinLogin({ onPinEntered }: PinLoginProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Entering the public demo PIN seeds its sample data FIRST (awaited), so the demo profile
  // is populated the instant the app loads — no empty-on-first-view race. Works whether the
  // demo is reached via the button or by typing 1111 by hand.
  const enterPin = async (p: string) => {
    if (p === DEMO_PIN) {
      try {
        setBusy(true)
        await ensureDemoSeeded()
      } catch (err) {
        console.error('Demo seeding failed:', err)
      } finally {
        setBusy(false)
      }
    }
    onPinEntered(p)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!pin.trim()) {
      setError('Please enter a PIN')
      return
    }

    if (pin.trim().length < 4) {
      setError('PIN must be at least 4 characters')
      return
    }

    setError('')
    await enterPin(pin.trim())
  }

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPin(e.target.value)
    if (error) setError('') // Clear error when user starts typing
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">🔐 Command Center</CardTitle>
          <CardDescription>
            Enter your PIN to access your secure data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter your PIN"
                value={pin}
                onChange={handlePinChange}
                className="text-center text-lg tracking-widest"
                autoFocus
                maxLength={20}
              />
              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}
            </div>
            
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              🚀 Launch Command Center
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="lg"
              disabled={busy}
              onClick={() => enterPin(DEMO_PIN)}
            >
              {busy ? '✨ Loading demo…' : '👀 See the demo (no account needed)'}
            </Button>

            <div className="text-xs text-muted-foreground text-center space-y-1 mt-4">
              <p>💡 Make sure your PIN is unique — family members all need different PINs.</p>
              <p>👀 PIN <strong>1111</strong> is the public demo (sample data). Pick something else for your real data.</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
