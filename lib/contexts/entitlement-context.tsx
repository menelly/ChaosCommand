/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * entitlement-context.tsx — the single source of truth for "can this user use
 * the app right now?". Combines the three sources via resolveEntitlement:
 *   • offline license key   (Rust: validate_license)
 *   • store IAP purchase     (Rust: check_store_entitlement — STUB until MSIX)
 *   • 14-day trial clock     (Rust: get_trial_status)
 *
 * Web / dev (not running inside Tauri): there is no store build and nothing to
 * gate, so the app is always usable — same bypass the license context uses.
 */
'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { resolveEntitlement, type Entitlement } from '@/lib/services/entitlement'

interface RustLicenseStatus { valid: boolean }
interface RustTrialStatus {
  started_at: number
  days_total: number
  days_remaining: number
  seconds_remaining: number
  expired: boolean
}

interface EntitlementContextType {
  entitlement: Entitlement | null
  isChecking: boolean
  /** Re-resolve from the backend (after a key is activated or a purchase). */
  refresh: () => Promise<void>
}

const EntitlementContext = createContext<EntitlementContextType | undefined>(undefined)

const inTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** Store-purchase check. Real implementation (Windows StoreContext / Apple
 *  StoreKit) lands with the MSIX/App Store packaging; until then there is no
 *  store build, so "not purchased" is the correct, safe answer (the trial + key
 *  paths fully gate dev/sideload builds). */
async function checkStoreIAP(): Promise<boolean> {
  try {
    return await invoke<boolean>('check_store_entitlement')
  } catch {
    return false // command not registered yet (pre-MSIX) → no store purchase
  }
}

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  const resolve = useCallback(async () => {
    setIsChecking(true)
    try {
      // DEV/QA override — force a state via ?entitlement=trial|expired|licensed
      // so the lock UI can be eyeballed in the browser without a Tauri build or
      // waiting 14 days. Only fires when the param is explicitly present.
      const override = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('entitlement')
        : null
      if (override === 'expired') {
        setEntitlement(resolveEntitlement({ hasKey: false, hasStoreIAP: false, trialExpired: true, trialDaysRemaining: 0 }))
        return
      }
      if (override === 'trial') {
        // ?entitlement=trial&trialdays=2 lets the 3-/1-day reminder be tested.
        const dParam = typeof window !== 'undefined'
          ? Number(new URLSearchParams(window.location.search).get('trialdays'))
          : NaN
        const trialDaysRemaining = Number.isFinite(dParam) && dParam > 0 ? dParam : 7
        setEntitlement(resolveEntitlement({ hasKey: false, hasStoreIAP: false, trialExpired: false, trialDaysRemaining }))
        return
      }
      if (override === 'licensed') {
        setEntitlement(resolveEntitlement({ hasKey: true, hasStoreIAP: false, trialExpired: true, trialDaysRemaining: 0 }))
        return
      }

      // Web / dev outside Tauri: nothing to gate — fully usable.
      if (!inTauri()) {
        setEntitlement(resolveEntitlement({
          hasKey: true, hasStoreIAP: false, trialExpired: false, trialDaysRemaining: 0,
        }))
        return
      }

      const [license, trial, hasStoreIAP] = await Promise.all([
        invoke<RustLicenseStatus>('validate_license').catch(() => ({ valid: false })),
        invoke<RustTrialStatus>('get_trial_status').catch(() => null),
        checkStoreIAP(),
      ])

      setEntitlement(resolveEntitlement({
        hasKey: !!license?.valid,
        hasStoreIAP,
        // If the trial clock can't be read, fail OPEN (treat as in-trial) rather
        // than locking a legitimate user out over a transient backend error.
        trialExpired: trial ? trial.expired : false,
        trialDaysRemaining: trial ? trial.days_remaining : 0,
      }))
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => { resolve() }, [resolve])

  return (
    <EntitlementContext.Provider value={{ entitlement, isChecking, refresh: resolve }}>
      {children}
    </EntitlementContext.Provider>
  )
}

export function useEntitlement() {
  const ctx = useContext(EntitlementContext)
  if (ctx === undefined) throw new Error('useEntitlement must be used within an EntitlementProvider')
  return ctx
}
