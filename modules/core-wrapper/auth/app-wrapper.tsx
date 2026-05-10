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

import { useDatabase } from '@/lib/database/hooks/use-database'
import { UserProvider, useUser } from '@/lib/contexts/user-context'
import { Toaster } from '@/components/ui/toaster'
import PinLogin from '@/components/pin-login'

interface AppWrapperProps {
  children: React.ReactNode
}

function AppContent({ children }: AppWrapperProps) {
  const { userPin, isLoggedIn, login } = useUser()
  const { isInitialized, isLoading, error } = useDatabase(userPin || undefined)

  // Show PIN login if not logged in
  if (!isLoggedIn) {
    return <PinLogin onPinEntered={login} />
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
        <div className="text-center space-y-4">
          <div className="animate-spin text-4xl">🔄</div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Initializing Command Center</h2>
            <p className="text-muted-foreground">Setting up your secure database for user {userPin}...</p>
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

  return (
    <>
      {children}
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
