/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * Sync page — QR pairing + local network data transfer.
 * No cloud. No accounts. Just two devices on the same WiFi.
 * Because AuDHD humans shouldn't have to export JSON files.
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  QrCode,
  ScanLine,
  Wifi,
  Check,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Smartphone,
  Monitor,
  RefreshCw,
} from 'lucide-react'
import AppCanvas from '@/components/app-canvas'
import Link from 'next/link'
import { useUser } from '@/lib/contexts/user-context'
import { exportAllData, importData } from '@/lib/database/migration-helper'

type SyncMode = 'choose' | 'host' | 'scan' | 'syncing' | 'done' | 'conflict'

interface SyncConflict {
  category: string
  key: string
  local_value: string
  remote_value: string
  local_updated: string
  remote_updated: string
}

export default function SyncPage() {
  const { userPin } = useUser()
  const [mode, setMode] = useState<SyncMode>('choose')
  const [qrData, setQrData] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  const scannerRef = useRef<any>(null)
  const videoRef = useRef<HTMLDivElement>(null)

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const startHosting = async () => {
    if (!userPin) {
      setError('You need to be logged in to sync')
      return
    }

    setMode('host')
    setError(null)
    setStatus('Generating QR code...')

    try {
      // Get QR payload from Rust backend
      const qrJson = await invoke<string>('sync_start_host', { pin: userPin })
      setQrData(qrJson)
      setStatus('Waiting for other device to scan...')

      // Start listening for incoming data
      const envelope = await invoke<any>('sync_receive_data')

      setMode('syncing')
      setStatus('Receiving data...')

      // Import the received data
      await importData(envelope.data)
      setMode('done')
      setStatus(`Synced data from ${envelope.device_name}`)
    } catch (e: any) {
      setError(e.toString())
      setMode('choose')
    }
  }

  const startScanning = async () => {
    if (!userPin) {
      setError('You need to be logged in to sync')
      return
    }

    setMode('scan')
    setError(null)
    setStatus('Point camera at QR code on the other device')

    try {
      // Dynamic import for html5-qrcode (client-side only)
      const { Html5Qrcode } = await import('html5-qrcode')

      // Wait for the video container to be in the DOM
      await new Promise(resolve => setTimeout(resolve, 100))

      const scanner = new Html5Qrcode('qr-scanner')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          // QR scanned! Stop scanner and send data
          await scanner.stop()
          scannerRef.current = null

          setMode('syncing')
          setStatus('Connected! Sending data...')

          try {
            // Export local data as JSON string
            const dataJson = await exportAllData()

            // Send to host
            const result = await invoke<any>('sync_send_data', {
              qrJson: decodedText,
              pin: userPin,
              data: dataJson,
            })

            if (result.success) {
              setMode('done')
              setStatus('Sync complete!')
            } else {
              setError(result.message)
              setMode('choose')
            }
          } catch (e: any) {
            setError(e.toString())
            setMode('choose')
          }
        },
        () => {} // Ignore scan failures (noisy)
      )
    } catch (e: any) {
      setError(`Camera error: ${e.toString()}. Make sure camera permissions are granted.`)
      setMode('choose')
    }
  }

  const cancelSync = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop()
        scannerRef.current = null
      }
      await invoke('sync_stop').catch(() => {})
    } catch {}
    setMode('choose')
    setQrData(null)
    setError(null)
    setStatus('')
  }

  return (
    <AppCanvas currentPage="sync">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-6xl">🔄</div>
          <h1 className="text-3xl font-bold">Device Sync</h1>
          <p className="text-muted-foreground">
            Sync your data between devices over local WiFi. No cloud. No accounts. Just you.
          </p>
        </div>

        {/* Error display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* WiFi reminder */}
        {mode !== 'done' && (
          <Alert>
            <Wifi className="h-4 w-4" />
            <AlertDescription>
              Both devices must be on the <strong>same WiFi network</strong> and logged in with the <strong>same PIN</strong>.
            </AlertDescription>
          </Alert>
        )}

        {/* Choose mode */}
        {mode === 'choose' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              className="cursor-pointer transition-all hover:shadow-lg hover:border-purple-300"
              onClick={startHosting}
            >
              <CardHeader className="text-center">
                <div className="text-4xl mb-2">
                  <QrCode className="h-12 w-12 mx-auto text-purple-600" />
                </div>
                <CardTitle>Show QR Code</CardTitle>
                <CardDescription>
                  This device will display a QR code. Scan it with your other device.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Monitor className="h-4 w-4" />
                  Best for: Desktop
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-all hover:shadow-lg hover:border-purple-300"
              onClick={startScanning}
            >
              <CardHeader className="text-center">
                <div className="text-4xl mb-2">
                  <ScanLine className="h-12 w-12 mx-auto text-purple-600" />
                </div>
                <CardTitle>Scan QR Code</CardTitle>
                <CardDescription>
                  This device will scan a QR code from your other device and send its data.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Smartphone className="h-4 w-4" />
                  Best for: Phone
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Host mode — showing QR */}
        {mode === 'host' && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Scan this QR code from your other device</CardTitle>
              <CardDescription>{status}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {qrData ? (
                <div className="p-4 bg-white rounded-xl">
                  <QRCodeSVG
                    value={qrData}
                    size={280}
                    level="M"
                    includeMargin
                  />
                </div>
              ) : (
                <Loader2 className="h-8 w-8 animate-spin" />
              )}
              <Button variant="outline" onClick={cancelSync}>
                Cancel
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Scan mode — camera */}
        {mode === 'scan' && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Point your camera at the QR code</CardTitle>
              <CardDescription>{status}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div
                id="qr-scanner"
                ref={videoRef}
                className="w-full max-w-sm rounded-lg overflow-hidden"
              />
              <Button variant="outline" onClick={cancelSync}>
                Cancel
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Syncing */}
        {mode === 'syncing' && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
              <h2 className="text-xl font-semibold">{status}</h2>
              <p className="text-muted-foreground">Don't close the app on either device...</p>
            </CardContent>
          </Card>
        )}

        {/* Done */}
        {mode === 'done' && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950">
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <Check className="h-16 w-16 text-green-600" />
              <h2 className="text-2xl font-bold text-green-700 dark:text-green-300">
                Sync Complete!
              </h2>
              <p className="text-green-600 dark:text-green-400">{status}</p>
              <div className="flex gap-3">
                <Button onClick={() => setMode('choose')} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Again
                </Button>
                <Button asChild>
                  <Link href="/settings">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Settings
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conflicts */}
        {mode === 'conflict' && (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-700">
                <AlertTriangle className="h-5 w-5" />
                {conflicts.length} Conflict{conflicts.length !== 1 ? 's' : ''} Found
              </CardTitle>
              <CardDescription>
                These records were edited on both devices. Pick which version to keep.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {conflicts.map((conflict, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <div className="font-medium">{conflict.category} — {conflict.key}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="h-auto p-3 text-left flex flex-col items-start"
                        onClick={() => {
                          // Keep local — remove from conflicts
                          setConflicts(prev => prev.filter((_, idx) => idx !== i))
                          if (conflicts.length <= 1) setMode('done')
                        }}
                      >
                        <span className="font-medium text-sm">Keep Local</span>
                        <span className="text-xs text-muted-foreground">{conflict.local_updated}</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto p-3 text-left flex flex-col items-start"
                        onClick={async () => {
                          // Accept remote — apply it
                          // TODO: smarter per-record import for conflict resolution
                          try {
                            await importData(JSON.stringify({
                              daily_data: [{ category: conflict.category, key: conflict.key, value: conflict.remote_value }]
                            }))
                          } catch {}
                          setConflicts(prev => prev.filter((_, idx) => idx !== i))
                          if (conflicts.length <= 1) setMode('done')
                        }}
                      >
                        <span className="font-medium text-sm">Use Remote</span>
                        <span className="text-xs text-muted-foreground">{conflict.remote_updated}</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Back button */}
        {(mode === 'choose' || mode === 'done') && (
          <div className="flex justify-center pt-4">
            <Button variant="outline" asChild>
              <Link href="/settings">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Settings
              </Link>
            </Button>
          </div>
        )}
      </div>
    </AppCanvas>
  )
}
