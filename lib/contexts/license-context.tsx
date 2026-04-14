/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * License state management — talks to Rust backend for Polar validation.
 */
'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface LicenseStatus {
  valid: boolean
  cached: boolean
  message: string
  activation_id: string | null
}

interface LicenseContextType {
  isLicensed: boolean
  isChecking: boolean
  status: LicenseStatus | null
  error: string | null
  activate: (key: string) => Promise<boolean>
  deactivate: () => Promise<void>
  recheck: () => Promise<void>
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined)

export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const [isLicensed, setIsLicensed] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [status, setStatus] = useState<LicenseStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkLicense = useCallback(async () => {
    setIsChecking(true)
    setError(null)
    try {
      const result = await invoke<LicenseStatus>('validate_license')
      setStatus(result)
      setIsLicensed(result.valid)
    } catch (e) {
      // If invoke fails entirely (e.g., not in Tauri), check for dev mode
      if (typeof window !== 'undefined' && !('__TAURI_INTERNALS__' in window)) {
        // Dev mode outside Tauri — skip license check
        setIsLicensed(true)
        setStatus({
          valid: true,
          cached: false,
          message: 'Development mode',
          activation_id: null,
        })
      } else {
        setError(String(e))
        setIsLicensed(false)
      }
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    checkLicense()
  }, [checkLicense])

  const activate = async (key: string): Promise<boolean> => {
    setError(null)
    try {
      const result = await invoke<LicenseStatus>('activate_license', { key })
      setStatus(result)
      setIsLicensed(result.valid)
      return result.valid
    } catch (e) {
      setError(String(e))
      return false
    }
  }

  const deactivate = async () => {
    setError(null)
    try {
      const result = await invoke<LicenseStatus>('deactivate_license')
      setStatus(result)
      setIsLicensed(false)
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <LicenseContext.Provider
      value={{
        isLicensed,
        isChecking,
        status,
        error,
        activate,
        deactivate,
        recheck: checkLicense,
      }}
    >
      {children}
    </LicenseContext.Provider>
  )
}

export function useLicense() {
  const context = useContext(LicenseContext)
  if (context === undefined) {
    throw new Error('useLicense must be used within a LicenseProvider')
  }
  return context
}
