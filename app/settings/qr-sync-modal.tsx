/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * QR Sync Modal — Device pairing for mobile-desktop data sync.
 * Scan the code, share the data, keep your chaos in sync.
 */
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Smartphone, Wifi, CheckCircle2, AlertCircle, RefreshCw, Upload, Download } from 'lucide-react'
import { useUser } from '@/lib/contexts/user-context'
import { FLASK_URL, backendFetch } from '@/lib/utils/tauri-fetch'
import { exportAllData, importData } from '@/shared/database/migration-helper'

interface QRSyncModalProps {
  isOpen: boolean
  onClose: () => void
}

type SyncState = 'idle' | 'generating' | 'waiting' | 'paired' | 'syncing' | 'done' | 'error'

export function QRSyncModal({ isOpen, onClose }: QRSyncModalProps) {
  const { userPin } = useUser()
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')

  // Clean up QR image URL on unmount
  useEffect(() => {
    return () => {
      if (qrImageUrl) URL.revokeObjectURL(qrImageUrl)
    }
  }, [qrImageUrl])

  const generateQR = async () => {
    if (!userPin) {
      setError('No PIN set. Please log in first.')
      return
    }

    setSyncState('generating')
    setError(null)

    try {
      const response = await backendFetch(`${FLASK_URL}/api/sync/qr-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: userPin })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to generate QR code')
      }

      const contentType = response.headers.get('content-type')
      if (contentType?.includes('image/png')) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        if (qrImageUrl) URL.revokeObjectURL(qrImageUrl)
        setQrImageUrl(url)
        setSyncState('waiting')
        setStatusMessage('Scan this QR code with the Chaos Command phone app')

        // Stage our data for pull while waiting
        stageDataForPull()

        // Start polling for incoming sync
        pollForSync()
      } else {
        // Fallback: server returned JSON (qrcode not installed)
        const data = await response.json()
        setError('QR generation needs the qrcode Python package. Install it: pip install qrcode[pil]')
        setSyncState('error')
      }
    } catch (e: any) {
      setError(e.message || 'Failed to connect to backend')
      setSyncState('error')
    }
  }

  const stageDataForPull = async () => {
    try {
      const exportJson = await exportAllData()
      const exportData = JSON.parse(exportJson)

      await backendFetch(`${FLASK_URL}/api/sync/stage-for-pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: userPin, data: exportData })
      })
    } catch (e) {
      console.error('Failed to stage data for pull:', e)
    }
  }

  const pollForSync = () => {
    const interval = setInterval(async () => {
      try {
        const response = await backendFetch(`${FLASK_URL}/api/sync/pending`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: userPin })
        })

        if (response.ok) {
          const result = await response.json()
          if (result.status === 'pending' && result.data) {
            clearInterval(interval)
            setSyncState('syncing')
            setStatusMessage('Receiving data from phone...')

            // Import the phone's data
            for (const [_token, syncInfo] of Object.entries(result.data as Record<string, any>)) {
              if (syncInfo.data) {
                await importData(JSON.stringify(syncInfo.data))
              }
            }

            setSyncState('done')
            setStatusMessage('Sync complete! Your data is now on both devices.')
          }
        }
      } catch (e) {
        // Polling failure is non-fatal, just retry
      }
    }, 3000) // Check every 3 seconds

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(interval)
      if (syncState === 'waiting') {
        setStatusMessage('QR code expired. Generate a new one to try again.')
      }
    }, 300000)

    // Clean up on unmount
    return () => clearInterval(interval)
  }

  const manualExport = async () => {
    try {
      setSyncState('syncing')
      setStatusMessage('Exporting data...')
      const data = await exportAllData()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chaos-command-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      setSyncState('done')
      setStatusMessage('Backup exported! Transfer the file to your other device and import it there.')
    } catch (e: any) {
      setError(e.message)
      setSyncState('error')
    }
  }

  const manualImport = async () => {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        setSyncState('syncing')
        setStatusMessage('Importing data...')
        const text = await file.text()
        await importData(text)
        setSyncState('done')
        setStatusMessage(`Imported data from ${file.name}!`)
      }
      input.click()
    } catch (e: any) {
      setError(e.message)
      setSyncState('error')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Device Sync
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR Pairing Section */}
          <div className="text-center space-y-3">
            {syncState === 'idle' && (
              <>
                <p className="text-sm text-muted-foreground">
                  Sync your data between desktop and phone over your local network.
                  No cloud. No accounts. Just WiFi.
                </p>
                <Button onClick={generateQR} className="w-full" size="lg">
                  <Wifi className="h-4 w-4 mr-2" />
                  Generate QR Code
                </Button>
              </>
            )}

            {syncState === 'generating' && (
              <div className="py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Generating...</p>
              </div>
            )}

            {syncState === 'waiting' && qrImageUrl && (
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img src={qrImageUrl} alt="Sync QR Code" className="w-48 h-48 mx-auto" />
                </div>
                <p className="text-sm text-muted-foreground">{statusMessage}</p>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Wifi className="h-3 w-3" />
                  Both devices must be on the same WiFi network
                </div>
              </div>
            )}

            {syncState === 'syncing' && (
              <div className="py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground mt-2">{statusMessage}</p>
              </div>
            )}

            {syncState === 'done' && (
              <div className="py-6 space-y-3">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
                <p className="text-sm font-medium">{statusMessage}</p>
                <Button onClick={() => { setSyncState('idle'); setQrImageUrl(null) }} variant="outline">
                  Done
                </Button>
              </div>
            )}

            {syncState === 'error' && (
              <div className="py-6 space-y-3">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <Button onClick={() => { setSyncState('idle'); setError(null) }} variant="outline">
                  Try Again
                </Button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">or sync manually</span>
            </div>
          </div>

          {/* Manual Export/Import */}
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={manualExport} variant="outline" size="sm" disabled={syncState === 'syncing'}>
              <Upload className="h-4 w-4 mr-1" />
              Export Backup
            </Button>
            <Button onClick={manualImport} variant="outline" size="sm" disabled={syncState === 'syncing'}>
              <Download className="h-4 w-4 mr-1" />
              Import Backup
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Export a JSON backup and transfer it manually (USB, email, carrier pigeon)
          </p>
          <p className="text-xs text-destructive/70 text-center">
            Note: Manual backups are NOT encrypted. For encrypted export, use Data Management &rarr; G-Spot Export.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
