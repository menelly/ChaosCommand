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

import React, { createContext, useContext, useState, useEffect } from 'react'
import { closeDB, initializeDatabase } from '@/lib/database/dexie-db'
import { isDemoPin, ensureDemoSeeded } from '@/lib/database/demo-profile'

interface UserContextType {
  userPin: string | null
  isLoggedIn: boolean
  login: (pin: string) => void
  logout: () => void
  switchUser: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userPin, setUserPin] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Check for existing session on mount
  useEffect(() => {
    const savedPin = localStorage.getItem('currentUserPin')
    const savedLoginState = localStorage.getItem('isLoggedIn')

    if (savedPin && savedLoginState === 'true') {
      setUserPin(savedPin)
      setIsLoggedIn(true)
    }
  }, [])

  const login = (pin: string) => {
    // PIN becomes the database isolation key
    // Each PIN gets its own completely separate Dexie database
    setUserPin(pin)
    setIsLoggedIn(true)

    // Persist current user session - use consistent key with database
    localStorage.setItem('currentUserPin', pin)
    localStorage.setItem('chaos-user-pin', pin) // Database key
    localStorage.setItem('isLoggedIn', 'true')

    // Per-PIN UI prefs (theme/font/text-size/etc.) key off chaos-user-pin, so now that
    // it's set, tell ThemeLoader to re-apply THIS profile's appearance. (CHA-226)
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('chaos-pin-changed'))

    // Force initialize the new user's database.
    if (isDemoPin(pin)) {
      // The public demo profile (1111): seed sample data on first view, so logging in with
      // the openly-documented demo PIN always lands on a populated, mild example dataset.
      ensureDemoSeeded().catch(console.error)
    } else {
      initializeDatabase(pin).catch(console.error)
    }

    console.log(`🔐 Database isolated for PIN: ${pin.replace(/./g, '*')}`)
  }

  const logout = () => {
    // Close the current DB connection BEFORE clearing the PIN
    closeDB()

    setUserPin(null)
    setIsLoggedIn(false)

    // Clear current session (but don't delete database data!)
    localStorage.removeItem('currentUserPin')
    localStorage.removeItem('chaos-user-pin') // Database key
    localStorage.removeItem('isLoggedIn')

    // PIN cleared → fall back to the global/default appearance for the login screen.
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('chaos-pin-changed'))

    console.log('🚪 Logged out - database connection closed, data preserved')
  }

  const switchUser = () => {
    // Quick user switching without losing any data
    logout()
  }

  const value: UserContextType = {
    userPin,
    isLoggedIn,
    login,
    logout,
    switchUser
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
