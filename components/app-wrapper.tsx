/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * App Wrapper — PIN login gate + new user detection + onboarding trigger.
 * "This is NOT NORMAL" — the app that tells you what your doctor should have.
 */
'use client'

import { useState, useEffect } from 'react'
import { useDatabase } from '@/lib/database/hooks/use-database'
import { UserProvider, useUser } from '@/lib/contexts/user-context'
import { Toaster } from '@/components/ui/toaster'
import PinLogin from '@/components/pin-login'
import KonamiEasterEgg from '@/components/konami-easter-egg'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Sparkles, Rocket } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'

interface AppWrapperProps {
  children: React.ReactNode
}

/**
 * New User Welcome — shown when a PIN has no data in its database.
 * Offers onboarding or skip.
 */
function NewUserWelcome({ pin, onDismiss }: { pin: string; onDismiss: () => void }) {
  const router = useRouter()

  const startOnboarding = () => {
    localStorage.setItem(`chaos-onboarding-complete-${pin}`, 'true')
    onDismiss()
    router.push('/onboarding')
  }

  const skipOnboarding = () => {
    localStorage.setItem(`chaos-onboarding-complete-${pin}`, 'true')
    onDismiss()
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Welcome to Chaos Command
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Looks like this is your first time here with this PIN.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            We can walk you through setting up your trackers — it takes about 5 minutes
            and helps us show you things your doctor probably should have asked about.
          </p>

          <Button
            onClick={startOnboarding}
            className="w-full"
            size="lg"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Show Me What&apos;s Not Normal
          </Button>

          <Button
            onClick={skipOnboarding}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Rocket className="h-4 w-4 mr-2" />
            Skip — Just Open the App
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            You can always run onboarding later from Settings.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function AppContent({ children }: AppWrapperProps) {
  const { userPin, isLoggedIn, login } = useUser()
  const { isInitialized, isLoading, error } = useDatabase(userPin || undefined)
  const pathname = usePathname()
  const [isNewUser, setIsNewUser] = useState<boolean | null>(null)
  const [checkingNewUser, setCheckingNewUser] = useState(false)

  // Restore bounce intensity from localStorage on mount — CSS default is 1 (full bounce)
  // so without this, navigating between pages resets to SUPER BOUNCY
  useEffect(() => {
    const savedIntensity = parseInt(localStorage.getItem('chaos-bounce-intensity') || '10')
    const scale = savedIntensity / 100
    document.documentElement.style.setProperty('--bounce-scale', scale.toString())
    if (savedIntensity <= 25 && savedIntensity > 0) {
      document.body.classList.add('bounce-low')
    }
    if (savedIntensity === 0 || localStorage.getItem('chaos-animations') === 'false') {
      document.body.classList.add('no-animations')
    }
  }, [])

  // Check if this PIN is new (no data in their database)
  useEffect(() => {
    if (!isLoggedIn || !userPin || !isInitialized) {
      setIsNewUser(null)
      return
    }

    // Check per-PIN onboarding flag
    const onboardingDone = localStorage.getItem(`chaos-onboarding-complete-${userPin}`)
    // Also check the old global flag (for existing users who already onboarded)
    const globalOnboardingDone = localStorage.getItem('chaos-onboarding-complete')

    if (onboardingDone === 'true' || globalOnboardingDone === 'true') {
      setIsNewUser(false)
      return
    }

    // Check if the database has any data for this PIN
    setCheckingNewUser(true)
    const checkDb = async () => {
      try {
        // Try to count records in the database
        const { db } = await import('@/lib/database/dexie-db')
        const count = await db.daily_data.count()
        setIsNewUser(count === 0)
      } catch {
        // If we can't check, assume not new (don't block existing users)
        setIsNewUser(false)
      } finally {
        setCheckingNewUser(false)
      }
    }
    checkDb()
  }, [isLoggedIn, userPin, isInitialized])

  // Show PIN login if not logged in
  if (!isLoggedIn) {
    return <PinLogin onPinEntered={login} />
  }

  if (isLoading || checkingNewUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
        <div className="text-center space-y-4">
          <div className="animate-spin text-4xl">🔄</div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Initializing Command Center</h2>
            <p className="text-muted-foreground">Setting up your secure database...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-500 text-6xl">⚠️</div>
          <h2 className="text-xl font-semibold">Database Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">
            The app will continue to load, but some features may not work properly.
          </p>
        </div>
      </div>
    )
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl">🔄</div>
          <h2 className="text-xl font-semibold">Starting Command Center</h2>
        </div>
      </div>
    )
  }

  // New user — show welcome choice (but not if already on onboarding/logout)
  if (isNewUser && !pathname?.startsWith('/onboarding') && !pathname?.startsWith('/logout')) {
    return <NewUserWelcome pin={userPin!} onDismiss={() => setIsNewUser(false)} />
  }

  return (
    <>
      {children}
      <KonamiEasterEgg />
      <Toaster />
    </>
  )
}

export function AppWrapper({ children }: AppWrapperProps) {
  return (
    <UserProvider>
      <AppContent>{children}</AppContent>
    </UserProvider>
  )
}
