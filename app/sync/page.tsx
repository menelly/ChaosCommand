/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * Sync page (auto-sync v1) — manages paired devices and adds new ones.
 * The persistent HTTP server runs in Rust whenever the app is open;
 * this page is the management surface, not the transport.
 *
 * Layout:
 *   1. Paired devices list (this PIN's peers — sync now / rename / remove)
 *   2. Add a device (QR show / scan)
 *
 * No cloud. No accounts. Just WiFi-local HTTP between your own devices.
 */
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
  Trash2,
  Pencil,
} from 'lucide-react'
import AppCanvas from '@/components/app-canvas'
import Link from 'next/link'
import { useUser } from '@/lib/contexts/user-context'
import { exportAllData, importData } from '@/lib/database/migration-helper'
import {
  listPeers,
  removePeer,
  renamePeer,
  publishSnapshot,
  type PeerView,
  type ToPeerResult,
} from '@/lib/auto-sync'
import AutoSyncSection from '@/components/settings/auto-sync-section'
import { useToast } from '@/hooks/use-toast'

type PairMode = 'idle' | 'host' | 'scan' | 'pairing' | 'paired'

interface PairQr {
  ip: string
  port: number
  host_peer_id: string
  pairing_token: string
}

interface PairingResult {
  success: boolean
  host_peer_id: string
  host_device_name: string
  message: string | null
}

export default function SyncPage() {
  const { userPin } = useUser()
  const { toast } = useToast()
  const [peers, setPeers] = useState<PeerView[]>([])
  const [pairMode, setPairMode] = useState<PairMode>('idle')
  const [qrData, setQrData] = useState<PairQr | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [syncingPeerId, setSyncingPeerId] = useState<string | null>(null)
  const scannerRef = useRef<any>(null)

  const refreshPeers = useCallback(async () => {
    if (!userPin) return
    try {
      const list = await listPeers(userPin)
      setPeers(list)
    } catch (e) {
      console.error('Failed to list peers:', e)
    }
  }, [userPin])

  useEffect(() => {
    refreshPeers()
  }, [refreshPeers])

  // Make sure the Rust server has a current snapshot for incoming peers.
  useEffect(() => {
    if (!userPin) return
    publishSnapshot(userPin).catch(err =>
      console.warn('Initial publishSnapshot failed:', err)
    )
  }, [userPin])

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
      // Clear any open pairing window on unmount.
      invoke('sync_close_pairing_window').catch(() => {})
    }
  }, [])

  // ---------------------------------------------------------------------------
  // PAIR — host (show QR)
  // ---------------------------------------------------------------------------

  const startHostingPair = async () => {
    if (!userPin) {
      setError('You need to be logged in to pair')
      return
    }
    setPairMode('host')
    setError(null)
    setStatus('Generating pairing QR…')
    try {
      const qr = await invoke<PairQr>('sync_open_pairing_window', { pin: userPin })
      setQrData(qr)
      setStatus('Scan this QR from the other device. Pairing window: 2 minutes.')

      // Poll the peer list — when the new peer shows up, we know the
      // scanner completed pairing on their end.
      const before = peers.length
      const startedAt = Date.now()
      const interval = setInterval(async () => {
        if (Date.now() - startedAt > 130_000) {
          clearInterval(interval)
          if (pairMode === 'host') {
            setStatus('Pairing window expired. Tap "Show QR Code" to try again.')
          }
          return
        }
        try {
          const list = await listPeers(userPin)
          if (list.length > before) {
            clearInterval(interval)
            setPeers(list)
            const newest = list[list.length - 1]
            setStatus(`Paired with ${newest.peer_name}.`)
            setPairMode('paired')
            setQrData(null)
            toast({
              title: `Paired with ${newest.peer_name}`,
              description: 'Future syncs are silent and don\'t need a QR.',
              duration: 6000,
            })
            await invoke('sync_close_pairing_window').catch(() => {})
          }
        } catch {}
      }, 1500)
    } catch (e: any) {
      setError(e?.toString?.() || String(e))
      setPairMode('idle')
    }
  }

  // ---------------------------------------------------------------------------
  // PAIR — scanner (consume QR)
  // ---------------------------------------------------------------------------

  const startScanningPair = async () => {
    if (!userPin) {
      setError('You need to be logged in to pair')
      return
    }
    setPairMode('scan')
    setError(null)
    setStatus('Point camera at the QR code on the other device')

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      await new Promise(resolve => setTimeout(resolve, 100))
      const scanner = new Html5Qrcode('qr-scanner')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async decodedText => {
          await scanner.stop()
          scannerRef.current = null
          setPairMode('pairing')
          setStatus('QR captured. Completing pairing…')
          try {
            const result = await invoke<PairingResult>('sync_complete_pairing', {
              qrJson: decodedText,
              pin: userPin,
            })
            if (result.success) {
              setStatus(`Paired with ${result.host_device_name}.`)
              setPairMode('paired')
              await refreshPeers()
              toast({
                title: `Paired with ${result.host_device_name}`,
                description: 'Future syncs are silent and don\'t need a QR.',
                duration: 6000,
              })
            } else {
              setError(result.message || 'Pairing failed')
              setPairMode('idle')
            }
          } catch (e: any) {
            setError(e?.toString?.() || String(e))
            setPairMode('idle')
          }
        },
        () => {} // ignore scan failures (noisy)
      )
    } catch (e: any) {
      setError(`Camera error: ${e?.toString?.() || e}. Camera permission granted?`)
      setPairMode('idle')
    }
  }

  const cancelPair = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop()
        scannerRef.current = null
      }
      await invoke('sync_close_pairing_window').catch(() => {})
    } catch {}
    setPairMode('idle')
    setQrData(null)
    setError(null)
    setStatus('')
  }

  // ---------------------------------------------------------------------------
  // PER-PEER ACTIONS
  // ---------------------------------------------------------------------------

  const syncWithPeer = async (peer: PeerView) => {
    if (!userPin) return
    setSyncingPeerId(peer.peer_id)
    try {
      // Make sure the server has a current snapshot of OUR data so the
      // peer can pull it back as part of the bidirectional exchange.
      await publishSnapshot(userPin).catch(() => {})

      const data = await exportAllData(userPin)
      const result = await invoke<ToPeerResult>('sync_to_peer', {
        peerId: peer.peer_id,
        pin: userPin,
        data,
      })
      if (result.success && result.data) {
        await importData(result.data)
        toast({
          title: `Synced with ${result.peer_name}`,
          description: `${(result.data.length / 1024).toFixed(1)} KB pulled.`,
          duration: 5000,
        })
      } else if (result.reason === 'pin_mismatch') {
        toast({
          title: `${result.peer_name}: different family member`,
          description: `That device is signed in under a different PIN — sync skipped.`,
          duration: 8000,
          variant: 'destructive',
        })
      } else {
        toast({
          title: `Sync with ${result.peer_name} didn't complete`,
          description: result.reason || 'Unknown reason — check both devices are on the same WiFi.',
          duration: 8000,
          variant: 'destructive',
        })
      }
      await refreshPeers()
    } catch (e: any) {
      toast({
        title: 'Sync failed',
        description: e?.toString?.() || String(e),
        duration: 8000,
        variant: 'destructive',
      })
    } finally {
      setSyncingPeerId(null)
    }
  }

  const handleRemove = async (peer: PeerView) => {
    if (!confirm(`Unpair ${peer.peer_name}? You'll need to scan a fresh QR to re-pair.`)) return
    try {
      await removePeer(peer.peer_id)
      await refreshPeers()
      toast({ title: `Unpaired ${peer.peer_name}`, duration: 4000 })
    } catch (e: any) {
      toast({
        title: 'Could not remove peer',
        description: e?.toString?.() || String(e),
        duration: 6000,
        variant: 'destructive',
      })
    }
  }

  const handleRename = async (peer: PeerView) => {
    const next = prompt(`Rename "${peer.peer_name}" to:`, peer.peer_name)
    if (!next || next.trim() === '' || next === peer.peer_name) return
    try {
      await renamePeer(peer.peer_id, next.trim())
      await refreshPeers()
    } catch (e: any) {
      toast({
        title: 'Rename failed',
        description: e?.toString?.() || String(e),
        duration: 6000,
        variant: 'destructive',
      })
    }
  }

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <AppCanvas currentPage="sync">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="text-6xl">🔄</div>
          <h1 className="text-3xl font-bold">Device Sync</h1>
          <p className="text-muted-foreground">
            Sync your data between devices over local WiFi. No cloud. No accounts.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Alert>
          <Wifi className="h-4 w-4" />
          <AlertDescription>
            Both devices must be on the <strong>same WiFi network</strong> and signed in
            under the <strong>same PIN</strong> to pair or sync.
          </AlertDescription>
        </Alert>

        {/* AUTO-SYNC PREFERENCE */}
        <AutoSyncSection />

        {/* PAIRED DEVICES */}
        <Card>
          <CardHeader>
            <CardTitle>Paired Devices</CardTitle>
            <CardDescription>
              {peers.length === 0
                ? 'No paired devices yet. Pair a device below to enable silent auto-sync.'
                : `${peers.length} ${peers.length === 1 ? 'device' : 'devices'} paired with this PIN. Tap "Sync now" to push and pull immediately.`}
            </CardDescription>
          </CardHeader>
          {peers.length > 0 && (
            <CardContent className="space-y-3">
              {peers.map(peer => (
                <div
                  key={peer.peer_id}
                  className="flex items-center justify-between border rounded-lg p-3 gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{peer.peer_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {peer.last_known_ip || 'IP unknown'}
                      {peer.last_synced_unix > 0 && (
                        <> · last sync {formatRelative(peer.last_synced_unix)}</>
                      )}
                      {peer.consecutive_failures > 0 && (
                        <> · <span className="text-amber-600">{peer.consecutive_failures} failed</span></>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={syncingPeerId === peer.peer_id}
                      onClick={() => syncWithPeer(peer)}
                    >
                      {syncingPeerId === peer.peer_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      <span className="ml-1.5 hidden sm:inline">Sync now</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRename(peer)}
                      title="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(peer)}
                      title="Unpair"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* PAIR A NEW DEVICE */}
        <Card>
          <CardHeader>
            <CardTitle>Pair a New Device</CardTitle>
            <CardDescription>
              One device shows the QR, the other scans it. Both keep a long-lived
              shared key so future syncs don't need a QR.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pairMode === 'idle' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card
                  className="cursor-pointer transition-all hover:shadow-lg hover:border-purple-300"
                  onClick={startHostingPair}
                >
                  <CardHeader className="text-center">
                    <QrCode className="h-10 w-10 mx-auto text-purple-600" />
                    <CardTitle className="text-base">Show QR Code</CardTitle>
                    <CardDescription>
                      This device displays a QR. Scan it from the other.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Monitor className="h-3.5 w-3.5" /> Best for: Desktop
                  </CardContent>
                </Card>
                <Card
                  className="cursor-pointer transition-all hover:shadow-lg hover:border-purple-300"
                  onClick={startScanningPair}
                >
                  <CardHeader className="text-center">
                    <ScanLine className="h-10 w-10 mx-auto text-purple-600" />
                    <CardTitle className="text-base">Scan QR Code</CardTitle>
                    <CardDescription>
                      This device scans a QR from the other.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Smartphone className="h-3.5 w-3.5" /> Best for: Phone
                  </CardContent>
                </Card>
              </div>
            )}

            {pairMode === 'host' && qrData && (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-center text-muted-foreground">{status}</p>
                <div className="p-4 bg-white rounded-xl">
                  <QRCodeSVG value={JSON.stringify(qrData)} size={280} level="M" includeMargin />
                </div>
                <Button variant="outline" onClick={cancelPair}>Cancel</Button>
              </div>
            )}

            {pairMode === 'scan' && (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-center text-muted-foreground">{status}</p>
                <div id="qr-scanner" className="w-full max-w-sm rounded-lg overflow-hidden" />
                <Button variant="outline" onClick={cancelPair}>Cancel</Button>
              </div>
            )}

            {pairMode === 'pairing' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
                <p className="text-sm text-muted-foreground">{status}</p>
              </div>
            )}

            {pairMode === 'paired' && (
              <div className="flex flex-col items-center gap-4 py-6">
                <Check className="h-12 w-12 text-green-600" />
                <p className="text-base font-medium">{status}</p>
                <Button onClick={() => { setPairMode('idle'); setStatus('') }}>
                  Done
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center pt-4">
          <Button variant="outline" asChild>
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Link>
          </Button>
        </div>
      </div>
    </AppCanvas>
  )
}

function formatRelative(unixSecs: number): string {
  if (!unixSecs) return 'never'
  const ageSecs = Math.floor(Date.now() / 1000) - unixSecs
  if (ageSecs < 60) return 'just now'
  if (ageSecs < 3600) return `${Math.floor(ageSecs / 60)}m ago`
  if (ageSecs < 86400) return `${Math.floor(ageSecs / 3600)}h ago`
  return `${Math.floor(ageSecs / 86400)}d ago`
}
