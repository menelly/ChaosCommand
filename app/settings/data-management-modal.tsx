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
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Database, Download, Upload, Shield, Zap, Beaker, RefreshCw, QrCode } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { exportAllData, importData } from "@/lib/database/migration-helper"
import { encryptBackup, decryptBackup, downloadBackup } from "@/lib/database/encrypted-export"
import { useUser } from "@/lib/contexts/user-context"
import TestPinManagerComponent from "@/components/test-pin-manager"
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'

interface DataManagementModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DataManagementModal({ isOpen, onClose }: DataManagementModalProps) {
  const [hasPin, setHasPin] = useState(false)
  const [pinInput, setPinInput] = useState("")
  const [confirmPinInput, setConfirmPinInput] = useState("")
  const [showGSpotExplanation, setShowGSpotExplanation] = useState(false)
  const [isExecutingGSpot, setIsExecutingGSpot] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importPin, setImportPin] = useState("1234")            // backup-file password (visible, weak default)
  const [exportPassword, setExportPassword] = useState("1234")  // encrypt-export password (visible, weak default)
  const [importFile, setImportFile] = useState<File | null>(null)

  // The G-Spot is now an emergency logout → the logged-out screen.
  const { logout } = useUser()

  // Check if PIN is set on component mount
  useEffect(() => {
    const savedPin = localStorage.getItem('chaos-data-pin')
    setHasPin(!!savedPin)
  }, [])

  // The G-Spot — emergency logout. One tap, you're at the logged-out screen.
  // No confirm, no PIN gate: friction is the enemy when someone's walking up. Logout is
  // non-destructive (every profile's data stays in its own DB), so there's nothing to
  // confirm and nothing to undo. The app-wrapper redirects to login the instant the
  // session clears. (Replaces the old destructive "overwrite with bland data" protocol —
  // which couldn't reliably cover custom Forge trackers and read as data-hiding to stores.)
  const executeEmergencyLogout = () => {
    logout()
  }

  // Encrypted backup export — boring, honest AES-256-GCM. No disguise, no time-keys.
  const handleGSpotExport = async () => {
    if (!exportPassword) {
      alert('Enter a password to encrypt the backup.')
      return
    }
    try {
      const payloadJson = await exportAllData() // full export: daily_data + tags + image blobs
      const { filename, content } = await encryptBackup(payloadJson, exportPassword)
      downloadBackup(filename, content)
      alert(`🔐 Encrypted backup saved: ${filename}\n\nKeep the password — it's the only way to open this file. The default (1234) is weak on purpose; set your own for anything you'll store or share.`)
    } catch (error) {
      console.error('Encrypted export failed:', error)
      alert(`❌ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Encrypted backup import — decrypt, then merge via importData (non-destructive: it
  // merges into existing data rather than wiping it, so a restore can't clobber a profile).
  const handleGSpotImport = async () => {
    if (!importFile || !importPin) {
      alert('Choose a backup file and enter its password.')
      return
    }
    try {
      const fileContent = await importFile.text()
      const restoredJson = await decryptBackup(fileContent, importPin)
      await importData(restoredJson)
      alert('✅ Backup restored.')
      setImportFile(null)
      setImportPin('1234')
      setShowImportDialog(false)
      onClose()
    } catch (error) {
      console.error('Encrypted import failed:', error)
      alert(`❌ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle PIN setup
  const handlePinSetup = () => {
    if (pinInput !== confirmPinInput) {
      alert('PINs do not match')
      return
    }
    if (pinInput.length < 4) {
      alert('PIN must be at least 4 characters')
      return
    }

    localStorage.setItem('chaos-data-pin', pinInput)
    setHasPin(true)
    setPinInput("")
    setConfirmPinInput("")
    alert('✅ Security PIN has been set!')
  }

  // (Emergency logout needs no PIN gate or confirmation — see executeEmergencyLogout.)

  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg max-w-2xl max-h-[80vh] overflow-y-auto p-6">
        <KeyboardAvoidingWrapper>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl">×</button>
        </div>

        <Tabs defaultValue="data-management" className="py-4">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="data-management" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Management
            </TabsTrigger>
            {/* Test PINs tab hidden for ship — uncomment for dev
            <TabsTrigger value="test-pins" className="flex items-center gap-2">
              <Beaker className="h-4 w-4" />
              Test PINs
            </TabsTrigger>
            */}
          </TabsList>

          <TabsContent value="data-management" className="space-y-6 mt-6">
            {/* PIN Setup Section */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4" />
                <Label className="text-sm font-medium">Security PIN</Label>
                {hasPin && <Badge variant="default">Set</Badge>}
              </div>
              
              {!hasPin ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Set an optional security PIN for sensitive actions.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="pin">PIN</Label>
                      <Input
                        id="pin"
                        type="password"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        placeholder="Enter PIN"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirm-pin">Confirm PIN</Label>
                      <Input
                        id="confirm-pin"
                        type="password"
                        value={confirmPinInput}
                        onChange={(e) => setConfirmPinInput(e.target.value)}
                        placeholder="Confirm PIN"
                      />
                    </div>
                  </div>
                  <Button onClick={handlePinSetup} className="w-full">
                    <Shield className="h-4 w-4 mr-2" />
                    Set Security PIN
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-green-600">✅ Security PIN is configured</p>
              )}
            </div>

            {/* Export Section */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Download className="h-4 w-4" />
                <Label className="text-sm font-medium">Export Data</Label>
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={() => exportAllData()}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export All Data (JSON)
                </Button>

                <div>
                  <Label htmlFor="export-password" className="text-xs">Backup password</Label>
                  <Input
                    id="export-password"
                    type="text"
                    value={exportPassword}
                    onChange={(e) => setExportPassword(e.target.value)}
                    placeholder="Password to encrypt the file"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Encrypts your backup (AES-256). <code>1234</code> is a convenience default —
                    set your own before you store or share this anywhere that matters.
                  </p>
                </div>

                <Button
                  onClick={handleGSpotExport}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  G-Spot Export (Encrypted) 😏
                </Button>
              </div>
            </div>

            {/* Device Sync Section */}
            <div className="p-4 border rounded-lg border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw className="h-4 w-4 text-purple-600" />
                <Label className="text-sm font-medium">Device Sync</Label>
                <Badge variant="outline" className="text-xs">New</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Sync data between your phone and desktop over local WiFi. No cloud, no files to manage.
              </p>
              <Button
                asChild
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <a href="/sync">
                  <QrCode className="h-4 w-4 mr-2" />
                  Open Device Sync
                </a>
              </Button>
            </div>

            {/* Import Section */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Upload className="h-4 w-4" />
                <Label className="text-sm font-medium">Import Data</Label>
              </div>

              <div className="space-y-3">
                {!showImportDialog ? (
                  <Button
                    onClick={() => setShowImportDialog(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import G-Spot Data
                  </Button>
                ) : (
                  <div className="space-y-3 p-3 border rounded bg-muted/50">
                    <div>
                      <Label htmlFor="import-file">Backup file</Label>
                      <Input
                        id="import-file"
                        type="file"
                        accept=".ccbackup,.json"
                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="import-pin">Backup password</Label>
                      <Input
                        id="import-pin"
                        type="text"
                        value={importPin}
                        onChange={(e) => setImportPin(e.target.value)}
                        placeholder="The password this backup was saved with"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleGSpotImport}
                        className="flex-1"
                        disabled={!importFile || !importPin}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Restore Backup
                      </Button>
                      <Button
                        onClick={() => {
                          setShowImportDialog(false)
                          setImportFile(null)
                          setImportPin("1234")
                        }}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* The G-Spot — emergency logout (undramatic by design; boring is camouflage) */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4" />
                <Label className="text-sm font-medium">The G-Spot</Label>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  One tap, you're logged out. It's the G-Spot. It does the thing. 🤷
                  <button
                    onClick={() => setShowGSpotExplanation(!showGSpotExplanation)}
                    className="underline ml-1"
                  >
                    what&apos;s this?
                  </button>
                </p>

                {showGSpotExplanation && (
                  <div className="text-xs text-muted-foreground bg-muted/60 p-3 rounded">
                    <p>
                      Instantly drops you to the logged-out screen — same as logging out and back
                      into a different profile, just faster. Your data stays exactly where it is,
                      untouched, in its own profile. Why&apos;s it called the G-Spot? Don&apos;t worry about it. 😏
                    </p>
                  </div>
                )}

                <Button
                  onClick={executeEmergencyLogout}
                  variant="outline"
                  className="w-full"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Go to the G-Spot
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Test PINs tab hidden for ship — uncomment for dev
          <TabsContent value="test-pins" className="mt-6">
            <TestPinManagerComponent onClose={onClose} />
          </TabsContent>
          */}
        </Tabs>
        </KeyboardAvoidingWrapper>
      </div>
    </div>
  )
}
