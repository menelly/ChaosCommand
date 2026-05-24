/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude 4.x)
 *
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 * Open source under PolyForm Noncommercial 1.0.0.
 *
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Database, Download, Upload, Trash2 } from "lucide-react"
import { exportAllData, importData } from "@/lib/database/migration-helper"
import { encryptBackup, decryptBackup, downloadBackup } from "@/lib/database/encrypted-export"
import { deleteCurrentProfile } from "@/lib/database/dexie-db"
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'

interface DataManagementModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DataManagementModal({ isOpen, onClose }: DataManagementModalProps) {
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importPassword, setImportPassword] = useState("1234")  // backup-file password (visible, weak default)
  const [exportPassword, setExportPassword] = useState("1234")  // encrypt-export password (visible, weak default)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [deleteArmed, setDeleteArmed] = useState(false)   // two-step arming for the permanent wipe
  const [showAdvancedExport, setShowAdvancedExport] = useState(false)  // hide unencrypted JSON behind intent

  // Plain JSON export — unencrypted, human-readable. Warn first (it's medical data in the
  // clear) and confirm where it saved (otherwise it lands silently in Downloads).
  const handleExportJson = async () => {
    const ok = confirm(
      '⚠️ This export is NOT encrypted.\n\n' +
      'Anyone who opens the file can read all your medical data, and it saves to your ' +
      'Downloads folder in plain text.\n\n' +
      'For a protected copy, use "Export Encrypted Backup" instead.\n\n' +
      'Export unencrypted anyway?'
    )
    if (!ok) return
    try {
      const json = await exportAllData()
      const date = new Date().toISOString().slice(0, 10)
      const filename = `chaos-command-data-${date}.json`
      downloadBackup(filename, json)
      alert(
        `✅ Saved: ${filename}\n\n` +
        'It\'s in your Downloads folder and is NOT encrypted — anyone with the file can read ' +
        'it. Move it somewhere safe or delete it when you\'re done.'
      )
    } catch (error) {
      console.error('JSON export failed:', error)
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Encrypted backup export — honest AES-256-GCM, password-protected. No disguise, no time-keys.
  const handleExportBackup = async () => {
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

  // Encrypted backup import — decrypt, then merge via importData (non-destructive: it merges
  // into existing data rather than wiping it, so a restore can't clobber a profile).
  const handleImportBackup = async () => {
    if (!importFile || !importPassword) {
      alert('Choose a backup file and enter its password.')
      return
    }
    try {
      const fileContent = await importFile.text()
      const restoredJson = await decryptBackup(fileContent, importPassword)
      await importData(restoredJson)
      alert('✅ Backup restored.')
      setImportFile(null)
      setImportPassword('1234')
      setShowImportDialog(false)
      onClose()
    } catch (error) {
      console.error('Encrypted import failed:', error)
      alert(`❌ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Permanent wipe — ONLY the currently-logged-in PIN's data. Other profiles on this device
  // (e.g. a kid's PIN) are never touched. Honest, labeled, two-step armed, per-device warned.
  const handleDeleteProfile = async () => {
    const ok = confirm(
      '⚠️ DELETE THIS PROFILE\'S DATA — PERMANENT\n\n' +
      'This erases everything saved under the PIN you\'re logged in with right now — every ' +
      'tracker, every entry, gone. It cannot be undone and there is no backup.\n\n' +
      '👨‍👩‍👧 Other PINs on this device are NOT affected. If someone else (a kid, a partner) has ' +
      'their own PIN here, their data stays exactly as it is. This only deletes YOURS.\n\n' +
      '📱💻 IF YOU SYNC THIS PROFILE TO ANOTHER DEVICE: this only wipes the device you\'re on ' +
      'right now. Run "Delete This Profile\'s Data" on each device separately — they share data ' +
      'with each other, not through us, so we can\'t reach the other one for you.\n\n' +
      'Are you absolutely sure you want to permanently delete this profile\'s data?'
    )
    if (!ok) { setDeleteArmed(false); return }
    try {
      const dbName = await deleteCurrentProfile()
      // Drop the session hint so the app reopens at the locked screen, not this profile.
      try {
        localStorage.removeItem('chaos-user-pin')
        localStorage.removeItem('chaos-demo-fixture-version')
      } catch { /* ignore */ }
      alert(
        '🗑️ Done. This profile\'s data has been permanently deleted from this device.\n\n' +
        'The app will now return to the locked screen. Other PINs on this device are untouched.\n\n' +
        'Remember: if you synced this profile to another device, its copy is still there until you delete it there too.'
      )
      // Hard reload → guaranteed clean state, back at the locked/PIN screen.
      window.location.href = '/'
      window.location.reload()
    } catch (error) {
      console.error('Delete-profile failed:', error)
      alert(`❌ Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setDeleteArmed(false)
    }
  }

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

          <div className="space-y-6 py-2">
            {/* Export */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Download className="h-4 w-4" />
                <Label className="text-sm font-medium">Export Data</Label>
              </div>

              <div className="space-y-3">
                {/* Encrypted is THE default path — prominent, password right above it. */}
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

                <Button onClick={handleExportBackup} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export Encrypted Backup
                </Button>

                {/* Unencrypted JSON lives under Advanced — you have to go looking for the risky one. */}
                {!showAdvancedExport ? (
                  <button
                    onClick={() => setShowAdvancedExport(true)}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 w-full text-center pt-1"
                  >
                    Advanced ▾
                  </button>
                ) : (
                  <div className="space-y-2 p-3 border border-dashed rounded bg-muted/30">
                    <p className="text-xs text-muted-foreground">
                      <strong>Advanced — unencrypted export.</strong> Plain-text JSON anyone can read.
                      Only use this if you specifically need a readable copy (e.g. importing elsewhere).
                      For storing or sharing, use the encrypted backup above.
                    </p>
                    <Button onClick={handleExportJson} variant="outline" className="w-full border-amber-500/50 text-amber-700 dark:text-amber-500 hover:bg-amber-500/10">
                      <Download className="h-4 w-4 mr-2" />
                      Export All Data (JSON, unencrypted)
                    </Button>
                    <button
                      onClick={() => setShowAdvancedExport(false)}
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 w-full text-center"
                    >
                      Hide ▴
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Import / Restore */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Upload className="h-4 w-4" />
                <Label className="text-sm font-medium">Import / Restore</Label>
              </div>

              <div className="space-y-3">
                {!showImportDialog ? (
                  <Button onClick={() => setShowImportDialog(true)} variant="outline" className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    Restore from Backup
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
                      <Label htmlFor="import-password">Backup password</Label>
                      <Input
                        id="import-password"
                        type="text"
                        value={importPassword}
                        onChange={(e) => setImportPassword(e.target.value)}
                        placeholder="The password this backup was saved with"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleImportBackup} className="flex-1" disabled={!importFile || !importPassword}>
                        <Upload className="h-4 w-4 mr-2" />
                        Restore Backup
                      </Button>
                      <Button
                        onClick={() => {
                          setShowImportDialog(false)
                          setImportFile(null)
                          setImportPassword("1234")
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

            {/* Danger zone — permanent, this-PIN-only delete */}
            <div className="p-4 border border-destructive/40 rounded-lg bg-destructive/5">
              <div className="flex items-center gap-2 mb-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                <Label className="text-sm font-medium text-destructive">Delete This Profile&apos;s Data</Label>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Permanently erases everything saved under the PIN you&apos;re logged in with — no undo, no
                backup. <strong>Other PINs on this device are not touched.</strong> If you sync to another
                device, you&apos;ll need to do this there too.
              </p>

              {!deleteArmed ? (
                <Button onClick={() => setDeleteArmed(true)} variant="outline" className="w-full border-destructive/50 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete This Profile&apos;s Data…
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-destructive">
                    This cannot be undone. Permanently delete this profile&apos;s data?
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handleDeleteProfile} variant="destructive" className="flex-1">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Yes, delete permanently
                    </Button>
                    <Button onClick={() => setDeleteArmed(false)} variant="outline">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Looking for device-to-device sync? It has its own screen. Logout is at the bottom of the sidebar.
            </p>
          </div>
        </KeyboardAvoidingWrapper>
      </div>
    </div>
  )
}
