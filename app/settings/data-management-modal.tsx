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
import { encryptBackup, decryptBackup, downloadBackup, ENCRYPTED_BACKUP_FORMAT } from "@/lib/database/encrypted-export"
import { openImportFile } from "@/lib/export-file"
import { deleteCurrentProfile } from "@/lib/database/dexie-db"
import { recordBackup } from "@/lib/backup-reminder"
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
  const [deleteConfirmPin, setDeleteConfirmPin] = useState('')  // must re-type the logged-in PIN to delete
  const [deletePinError, setDeletePinError] = useState('')
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
      const { saved, location } = await downloadBackup(filename, json)
      if (!saved) return // user cancelled the save picker — nothing written, don't claim success
      await recordBackup() // any export counts as a backup — reset the reminder clock
      alert(
        `✅ Saved: ${location || filename}\n\n` +
        'It\'s NOT encrypted — anyone with the file can read it. Move it somewhere safe ' +
        'or delete it when you\'re done.'
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
      const { saved, location } = await downloadBackup(filename, content)
      if (!saved) return // user cancelled the save picker — nothing written, don't claim success
      await recordBackup() // any export counts as a backup — reset the reminder clock
      alert(`🔐 Encrypted backup saved: ${location || filename}\n\nKeep the password — it's the only way to open this file. The default (1234) is weak on purpose; set your own for anything you'll store or share.`)
    } catch (error) {
      console.error('Encrypted export failed:', error)
      alert(`❌ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Backup import — native file picker (so .ccbackup is selectable on Android),
  // then SMART-DETECT encrypted vs plain JSON and route accordingly. Both bugs
  // this fixes were real on the S26: the old <input type=file accept=".ccbackup">
  // greyed out the backup file (no MIME), and the handler ALWAYS tried to decrypt
  // so a plain JSON export was rejected as "not a Chaos Command backup".
  // importData merges (non-destructive) so a restore can't clobber a profile.
  const handleImportBackup = async () => {
    try {
      const picked = await openImportFile()
      if (!picked) return // user cancelled the picker
      const text = picked.text

      let parsed: any = null
      try { parsed = JSON.parse(text) } catch { /* handled below */ }

      let restoredJson: string
      if (parsed?.format === ENCRYPTED_BACKUP_FORMAT) {
        // Encrypted backup → needs the password from the field.
        if (!importPassword) {
          alert('That\'s an encrypted backup — enter its password first, then choose the file again.')
          return
        }
        restoredJson = await decryptBackup(text, importPassword) // throws on wrong password
      } else if (parsed && typeof parsed === 'object' && (parsed.daily_data !== undefined || parsed.tags !== undefined)) {
        // Plain (unencrypted) export JSON → import directly; password not needed.
        restoredJson = text
      } else {
        alert('❌ That file isn\'t a Chaos Command backup (couldn\'t recognize it). Pick a .ccbackup or the exported .json.')
        return
      }

      await importData(restoredJson)
      alert(`✅ Backup restored from ${picked.name}.`)
      setImportFile(null)
      setImportPassword('1234')
      setShowImportDialog(false)
      onClose()
    } catch (error) {
      console.error('Import failed:', error)
      const msg = error instanceof Error ? error.message : 'Unknown error'
      alert(`❌ Import failed: ${msg}\n\nIf this is an encrypted backup, double-check the password.`)
    }
  }

  // Permanent wipe — ONLY the currently-logged-in PIN's data. Other profiles on this device
  // (e.g. a kid's PIN) are never touched. Honest, labeled, two-step armed, per-device warned.
  const handleDeleteProfile = async () => {
    // PIN GATE: you must re-type the PIN you're logged in with. This proves you know WHOSE data
    // you're deleting — so you can't nuke a kid's/partner's profile thinking it's yours.
    let currentPin: string | null = null
    try { currentPin = localStorage.getItem('chaos-user-pin') } catch { /* ignore */ }
    if (!currentPin) {
      setDeletePinError('No profile is logged in — nothing to delete.')
      return
    }
    if (deleteConfirmPin.trim() !== currentPin) {
      setDeletePinError("That PIN doesn't match the profile you're logged into. Delete cancelled — check whose profile this is.")
      return
    }
    setDeletePinError('')

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
    if (!ok) { setDeleteArmed(false); setDeleteConfirmPin(''); return }
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
      setDeleteConfirmPin('')
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
                    <Button onClick={handleExportJson} variant="outline" className="w-full border-amber-500/50 text-warning hover:bg-amber-500/10">
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
                    <p className="text-xs text-muted-foreground">
                      Tap below to pick your backup file. Works with both <code>.ccbackup</code>
                      {' '}(encrypted) and <code>.json</code> (unencrypted) exports — we detect which
                      automatically. For an encrypted backup, enter its password first.
                    </p>
                    <div>
                      <Label htmlFor="import-password">Password (encrypted backups only)</Label>
                      <Input
                        id="import-password"
                        type="text"
                        value={importPassword}
                        onChange={(e) => setImportPassword(e.target.value)}
                        placeholder="The password this backup was saved with"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleImportBackup} className="flex-1">
                        <Upload className="h-4 w-4 mr-2" />
                        Choose File &amp; Restore
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
                    This cannot be undone. To confirm <strong>whose</strong> data you&apos;re deleting,
                    re-type the PIN you&apos;re logged in with:
                  </p>
                  <Input
                    type="password"
                    placeholder="Re-enter this profile's PIN"
                    value={deleteConfirmPin}
                    onChange={(e) => { setDeleteConfirmPin(e.target.value); if (deletePinError) setDeletePinError('') }}
                    className="text-center tracking-widest"
                    maxLength={20}
                    autoFocus
                  />
                  {deletePinError && <p className="text-xs text-destructive">{deletePinError}</p>}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleDeleteProfile}
                      variant="destructive"
                      className="flex-1"
                      disabled={deleteConfirmPin.trim().length < 4}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Yes, delete permanently
                    </Button>
                    <Button onClick={() => { setDeleteArmed(false); setDeleteConfirmPin(''); setDeletePinError('') }} variant="outline">
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
