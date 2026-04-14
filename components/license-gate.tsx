/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * License activation screen — shown when no valid license is found.
 */
'use client'

import { useState } from 'react'
import { useLicense } from '@/lib/contexts/license-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { KeyRound, Loader2, AlertCircle } from 'lucide-react'

export default function LicenseGate({ children }: { children: React.ReactNode }) {
  const { isLicensed, isChecking, error, activate } = useLicense()
  const [key, setKey] = useState('')
  const [activating, setActivating] = useState(false)
  const [activateError, setActivateError] = useState<string | null>(null)

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
          <h2 className="text-xl font-semibold">Checking license...</h2>
        </div>
      </div>
    )
  }

  if (isLicensed) {
    return <>{children}</>
  }

  const handleActivate = async () => {
    const trimmed = key.trim()
    if (!trimmed) return

    setActivating(true)
    setActivateError(null)
    const success = await activate(trimmed)
    setActivating(false)

    if (!success) {
      setActivateError('Invalid license key, or all device slots are in use.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
            <KeyRound className="h-6 w-6 text-purple-600 dark:text-purple-300" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Activate Chaos Command
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Enter your license key to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="CHAOS_XXXXXXXX-XXXX-XXXX-XXXX"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
              disabled={activating}
              className="font-mono text-sm"
            />
          </div>

          {(activateError || error) && (
            <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{activateError || error}</span>
            </div>
          )}

          <Button
            onClick={handleActivate}
            disabled={activating || !key.trim()}
            className="w-full"
            size="lg"
          >
            {activating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Activating...
              </>
            ) : (
              'Activate'
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Get your license key at{' '}
            <span className="font-medium">chaoscommand.center</span>
          </p>

          <p className="text-xs text-muted-foreground text-center">
            Need to free up a device?{' '}
            <span className="font-medium">Manage devices in your customer portal.</span>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
