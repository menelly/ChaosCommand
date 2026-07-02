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
import { deriveSession, clearSessionKey, clearNamespacePointer } from '@/lib/database/session-crypto'
import { migratePlaintextProfileIfNeeded } from '@/lib/database/migrate-to-encrypted'
import { migrateProfileKeys, getPref } from '@/lib/prefs'

interface UserContextType {
  userPin: string | null
  isLoggedIn: boolean
  /**
   * Unlock a profile. ASYNC now: derives the encryption key (PBKDF2) and runs the
   * one-time plaintext→encrypted migration BEFORE resolving, so callers must await
   * before rendering any data screen (the DB has no key until this resolves).
   */
  login: (pin: string) => Promise<void>
  logout: () => void
  switchUser: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userPin, setUserPin] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // NO cross-process auto-resume. The encryption key lives ONLY in memory, so:
  //  • FULL CLOSE (swipe-kill / window X) ends the process → key gone → next launch
  //    shows the lock screen. That's the user's "make it go away" = logout.
  //  • APP SWITCH / minimize keeps the process alive → this component stays mounted,
  //    React state + in-memory key persist → still logged in, no re-entry.
  // Nothing to restore here, and the raw PIN is persisted NOWHERE. (The optional
  // "auto-lock in background" setting, below, tightens the app-switch case too.)

  const login = async (pin: string) => {
    // 1) Derive the crypto session FIRST: sets the hashed namespace pointer (so
    //    getDB() resolves the right DB) and the AES key (so writes encrypt).
    //    Must complete before any profile data is read or written.
    const namespace = await deriveSession(pin)

    // 1b) Rename this profile's UI-pref keys from the old raw-PIN namespace to the
    //     hashed one, so themes/settings survive the switch (and the raw PIN stops
    //     appearing in localStorage key names).
    migrateProfileKeys(pin, namespace)

    // 2) One-time, verified, non-destructive migration of any legacy plaintext
    //    profile (`ChaosCommand_<rawPIN>`) into this encrypted namespace DB.
    try {
      const result = await migratePlaintextProfileIfNeeded(pin)
      if (result.migrated) {
        console.log('🔐 Migrated legacy profile to encrypted store:', result.counts)
      } else {
        // Diagnostic: if your data DOESN'T appear after login, this reason says why.
        // 'no-legacy-db' = nothing at ChaosCommand_<rawPIN> (data may be in the default DB);
        // 'new-db-already-populated' = already migrated (normal on 2nd+ login).
        console.log('🔐 Migration skipped:', result.reason)
      }
    } catch (err) {
      // Migration verification failed → BOTH DBs left intact. Surface, don't crash.
      console.error('⚠️ Profile migration did not complete (data preserved in both stores):', err)
    }

    // Session lives in MEMORY only (React state + the in-memory key). Nothing about
    // the PIN is persisted — the process staying alive IS the "stay logged in", and
    // the process ending IS the logout. So the raw PIN touches localStorage nowhere.
    setUserPin(pin)
    setIsLoggedIn(true)

    // Prefs are namespaced by the hashed profile id now; tell ThemeLoader to re-apply
    // THIS profile's appearance. (CHA-226)
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('chaos-pin-changed'))

    // Force initialize the new user's database (deriveSession already set the
    // namespace, so no-arg resolves to this profile's encrypted DB).
    if (isDemoPin(pin)) {
      // The public demo profile (1111): seed sample data on first view, so logging in with
      // the openly-documented demo PIN always lands on a populated, mild example dataset.
      await ensureDemoSeeded().catch(console.error)
    } else {
      await initializeDatabase().catch(console.error)
    }

    console.log(`🔐 Profile unlocked (encrypted) for PIN: ${pin.replace(/./g, '*')}`)
  }

  const logout = () => {
    // Close the current DB connection BEFORE clearing the session
    closeDB()

    // Wipe the in-memory encryption key + the persisted namespace pointer so a
    // locked profile has NO way to read its own ciphertext until re-unlocked.
    clearSessionKey()
    clearNamespacePointer()

    setUserPin(null)
    setIsLoggedIn(false)

    // Nothing PIN-related is persisted, so there's nothing to strip from storage —
    // clearing the in-memory key + namespace pointer (above) IS the logout.

    // PIN cleared → fall back to the global/default appearance for the login screen.
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('chaos-pin-changed'))

    console.log('🚪 Logged out - key wiped, DB closed, data preserved')
  }

  const switchUser = () => {
    // Quick user switching without losing any data
    logout()
  }

  // OPTIONAL "auto-lock in background" — tightens the app-switch case. When enabled,
  // hiding the app (mobile background / desktop minimize) logs out immediately, so
  // even a quick app-switch requires the PIN to return. Off by default (the process-
  // lifecycle model already logs out on full close). NOTE for the UI: while logged
  // out, background medication/reminder notifications can't fire (no key to read the
  // schedule) — that's the tradeoff this setting makes, and the toggle must say so.
  useEffect(() => {
    if (!isLoggedIn) return
    if (getPref('chaos-auto-lock-background') !== 'true') return
    const onHide = () => { if (document.visibilityState === 'hidden') logout() }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
    // logout is stable within a render; re-subscribe only when login state flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn])

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
