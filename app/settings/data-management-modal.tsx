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
import { Database, Download, Upload } from "lucide-react"
import { exportAllData, importData } from "@/lib/database/migration-helper"
import { encryptBackup, decryptBackup, downloadBackup } from "@/lib/database/encrypted-export"
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

  // Plain JSON export — unencrypted, human-readable. (Encrypted backup is the option below.)
  const handleExportJson = async () => {
    try {
      const json = await exportAllData()
      const date = new Date().toISOString().slice(0, 10)
      downloadBackup(`chaos-command-data-${date}.json`, json)
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
                <Button onClick={handleExportJson} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export All Data (JSON, unencrypted)
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

                <Button onClick={handleExportBackup} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export Encrypted Backup
                </Button>
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

            <p className="text-xs text-muted-foreground text-center">
              Looking for device-to-device sync? It has its own screen. Logout is at the bottom of the sidebar.
            </p>
          </div>
        </KeyboardAvoidingWrapper>
      </div>
    </div>
  )
}
