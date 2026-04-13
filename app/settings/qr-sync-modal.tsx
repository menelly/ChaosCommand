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
    // QR sync is being rebuilt without Flask — coming soon!
    setError('QR sync is being upgraded. For now, use Export/Import in Settings to move data between devices.')
    setSyncState('error')
  }

  const stageDataForPull = async () => {
    // Placeholder — will be rebuilt with Tauri HTTP server
  }

  const pollForSync = () => {
    const interval = setInterval(async () => {
      try {
        // Placeholder — will be rebuilt with Tauri HTTP server
        const response: any = null

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
      const filename = `chaos-command-backup-${new Date().toISOString().split('T')[0]}.json`
      const blob = new Blob([data], { type: 'application/json' })
      const file = new File([blob], filename, { type: 'application/json' })

      // Use native share sheet on mobile (Android/iOS)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Chaos Command Backup',
          text: 'Medical data backup',
          files: [file]
        })
        setSyncState('done')
        setStatusMessage('Backup shared! Import it on your other device.')
      } else {
        // Fallback: download file (desktop)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
        setSyncState('done')
        setStatusMessage('Backup exported! Transfer the file to your other device and import it there.')
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        // User cancelled share sheet
        setSyncState('idle')
        return
      }
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
          {/* Sync Section */}
          <div className="text-center space-y-3">
            {syncState === 'idle' && (
              <>
                <p className="text-sm text-muted-foreground">
                  Move your data between devices. Export on one, import on the other.
                  No cloud. No accounts. Your data stays yours.
                </p>
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

          {/* Export/Import — the actual sync */}
          {syncState === 'idle' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={manualExport} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
                <Button onClick={manualImport} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Import Data
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                On mobile, Export opens your share sheet (email, drive, bluetooth).
                On desktop, it downloads a JSON file.
              </p>
              <p className="text-xs text-destructive/70 text-center">
                Note: Backups are NOT encrypted. For encrypted export, use Data Management &rarr; G-Spot Export.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
