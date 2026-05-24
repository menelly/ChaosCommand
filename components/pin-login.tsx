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
import { DEMO_PIN, ensureDemoSeeded, resetDemo, inspectDemoPin, migrateDemoToNewPin } from '@/lib/database/demo-profile'

interface PinLoginProps {
  onPinEntered: (pin: string) => void
}

export default function PinLogin({ onPinEntered }: PinLoginProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // 1111 had pre-existing, unstamped data (possibly a real person's records from when 1111 was a
  // selectable PIN). We never wipe it silently — we ask. This drives the migration dialog.
  const [showMigration, setShowMigration] = useState(false)
  const [migratePin, setMigratePin] = useState('')

  // Entering the public demo PIN seeds its sample data FIRST (awaited), so the demo profile
  // is populated the instant the app loads — no empty-on-first-view race. Works whether the
  // demo is reached via the button or by typing 1111 by hand.
  const enterPin = async (p: string, fresh = false) => {
    if (p === DEMO_PIN) {
      try {
        setBusy(true)
        // SAFETY GATE: if 1111 holds unstamped data we didn't create (a real person may have used
        // 1111 for their actual records pre-0.5.4), do NOT wipe it — stop and ask via the dialog.
        const state = await inspectDemoPin()
        if (state === 'foreign') {
          setShowMigration(true)
          setBusy(false)
          return
        }
        // Safe cases only: "See the demo" button → fresh pristine demo; manual 1111 → seed/self-heal
        await (fresh ? resetDemo() : ensureDemoSeeded())
      } catch (err) {
        console.error('Demo seeding failed:', err)
      } finally {
        setBusy(false)
      }
    }
    onPinEntered(p)
  }

  // "This 1111 data is MINE" → copy it to a new PIN, hand 1111 back to the demo, log into the new PIN.
  const handleMigrate = async () => {
    setError('')
    setBusy(true)
    try {
      const np = migratePin.trim()
      await migrateDemoToNewPin(np)
      setShowMigration(false)
      onPinEntered(np)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed')
    } finally {
      setBusy(false)
    }
  }

  // "It's just the demo" → safe now to reset 1111 to the sample and enter it.
  const handleResetToDemo = async () => {
    setBusy(true)
    try {
      await resetDemo()
      setShowMigration(false)
      onPinEntered(DEMO_PIN)
    } catch (err) {
      console.error('Demo reset failed:', err)
      setError('Could not reset the demo. Try again.')
    } finally {
      setBusy(false)
    }
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
              onClick={() => enterPin(DEMO_PIN, true)}
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

      {/* Migration dialog — 1111 already had data we didn't create. Protect it: ask before wiping. */}
      {showMigration && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-lg">⚠️ There's already data on PIN 1111</CardTitle>
              <CardDescription>
                PIN <strong>1111</strong> is now the public demo profile — but this device already has
                data saved under it. If you used 1111 for your <em>own</em> records, we don't want to
                lose them.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">This is my real data — move it to a new PIN:</p>
                <Input
                  type="password"
                  placeholder="Choose a new PIN (4+ characters)"
                  value={migratePin}
                  onChange={(e) => { setMigratePin(e.target.value); if (error) setError('') }}
                  className="text-center tracking-widest"
                  maxLength={20}
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button onClick={handleMigrate} className="w-full" disabled={busy || migratePin.trim().length < 4}>
                  {busy ? 'Moving your data…' : '📦 Move my data to this new PIN'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Copies everything to the new PIN, then 1111 becomes the demo. Pick a PIN you aren't
                  already using.
                </p>
              </div>

              <div className="border-t pt-3 space-y-2">
                <p className="text-sm font-medium">It was just the demo / I don't need this data:</p>
                <Button onClick={handleResetToDemo} variant="outline" className="w-full" disabled={busy}>
                  🔄 Reset 1111 to the sample demo
                </Button>
                <p className="text-xs text-muted-foreground">
                  This permanently deletes what's currently under 1111 and replaces it with the demo.
                </p>
              </div>

              <Button
                onClick={() => { setShowMigration(false); setMigratePin(''); setError('') }}
                variant="ghost"
                className="w-full"
                disabled={busy}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
