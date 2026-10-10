/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude Opus 5.5)
 *
 * 🔌 AI ACCESS (MCP) — the switch for the optional MCP holes. Desktop only.
 *
 * OFF by default. When on, Chaos Command opens a door on 127.0.0.1 (this computer
 * only) that an AI assistant like Claude can use to read the user's logs and add
 * entries, with a secret token, and only while the app is unlocked. The Rust half is
 * src-tauri/src/mcp.rs; the database half is lib/mcp-bridge.ts.
 */
"use client"

import { useEffect, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Bot, Copy, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { confirmAsync } from "@/components/ui/confirm-host"
import { getPref, setPref } from "@/lib/prefs"
import { MCP_PROFILE_PREF, getMcpAccessLevel, type McpAccessLevel } from "@/lib/mcp-bridge"
import { isMobilePlatform } from "@/lib/platform"

interface McpStatus {
  enabled: boolean
  running: boolean
  port: number | null
  token: string
  url: string | null
}

interface AiAccessModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AiAccessModal({ isOpen, onClose }: AiAccessModalProps) {
  const [status, setStatus] = useState<McpStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)
  // The door is app-wide, but each PIN profile has to say yes for ITSELF: a parent's
  // AI must never reach a kid's profile on the same computer.
  const [level, setLevelState] = useState<McpAccessLevel>("off")
  const { toast } = useToast()

  // Ask the Rust side what's true right now every time the modal opens.
  useEffect(() => {
    if (!isOpen) return
    setShowToken(false)
    setLevelState(getMcpAccessLevel())
    if (isMobilePlatform()) { setStatus(null); setError("AI Access is only available in the desktop app."); return }
    invoke<McpStatus>("mcp_get_status")
      .then(s => { setStatus(s); setError(null) })
      .catch(() => setError("AI Access only works in the desktop app."))
  }, [isOpen])

  // 🎚️ Off / Read only / Read & write, for THIS profile.
  const chooseLevel = async (next: McpAccessLevel) => {
    try {
      setPref(MCP_PROFILE_PREF, next === "off" ? "false" : next)
      setLevelState(next)
      setStatus(await invoke<McpStatus>("mcp_set_enabled", { enabled: next !== "off" }))
      setError(null)
    } catch (err) {
      setError(String(err))
    }
  }

  const regenerate = async () => {
    const yes = await confirmAsync({
      title: "Make a new token?",
      description: "Any AI using the old token loses access right away. You'll paste the new one into its settings.",
      confirmText: "New token",
    })
    if (!yes) return
    try {
      setStatus(await invoke<McpStatus>("mcp_regenerate_token"))
      toast({ title: "New token made", description: "The old one stopped working." })
    } catch (err) {
      setError(String(err))
    }
  }

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: `Copied ${what}` })
    } catch {
      toast({ title: "Couldn't copy", description: "Select the text and copy it by hand.", variant: "destructive" })
    }
  }

  const url = status?.url || `http://127.0.0.1:${status?.port ?? 47320}/mcp`
  const token = status?.token || ""
  const masked = token ? `${token.slice(0, 6)}…${token.slice(-4)}` : ""
  // Copy buttons always copy the REAL token; what's on screen stays masked until "Show",
  // so a screenshot of this modal doesn't leak it.
  const cmdFor = (t: string) => `claude mcp add --transport http chaos-command ${url} --header "Authorization: Bearer ${t}"`
  const jsonFor = (t: string) => JSON.stringify(
    { mcpServers: { "chaos-command": { type: "http", url, headers: { Authorization: `Bearer ${t}` } } } },
    null,
    2,
  )
  const shown = showToken ? token : masked
  const on = Boolean(status?.enabled && level !== "off")
  const LEVELS: { value: McpAccessLevel; label: string; hint: string }[] = [
    { value: "off", label: "Off", hint: "Nothing can connect." },
    { value: "read", label: "Read only", hint: "Your AI can look, but can't add anything." },
    { value: "readwrite", label: "Read & write", hint: "Your AI can look and add entries for you." },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Access (MCP)
          </DialogTitle>
          <DialogDescription>
            Let an AI assistant you use (like Claude) read your logs and add entries for you. Completely optional, and off
            until you turn it on.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">{error}</p>
        )}

        {status && (
          <div className="mt-2 space-y-4">
            <div className="space-y-2">
              <div role="radiogroup" aria-label="AI Access for this profile" className="grid grid-cols-3 gap-2">
                {LEVELS.map(l => {
                  const picked = (on ? level : "off") === l.value
                  return (
                    <Button
                      key={l.value}
                      role="radio"
                      aria-checked={picked}
                      variant={picked ? "default" : "outline"}
                      size="sm"
                      onClick={() => chooseLevel(l.value)}
                    >
                      {l.label}
                    </Button>
                  )
                })}
              </div>
              <p className="text-sm text-muted-foreground">
                {LEVELS.find(l => l.value === (on ? level : "off"))?.hint}
                {on && !status.running && " (The door couldn't open: try Off, then on again.)"}
              </p>
            </div>

            <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
              <li>Only programs on <strong>this computer</strong> that have your token can reach it. Anything that can read your files could find the token, so treat it like a password.</li>
              <li>It works while Chaos Command is <strong>running and unlocked</strong>, including minimized or tucked in the tray. Lock or quit the app and the AI is told to ask you.</li>
              <li>Each profile decides for itself. Turning it on here doesn't open anyone else's profile on this computer.</li>
              <li>The AI can <strong>read everything</strong> in this profile (journals and therapy notes included). With <strong>Read &amp; write</strong> it can also <strong>add</strong> entries; anything it adds is marked as AI-added, and you'll see a notice.</li>
              <li>What the AI does with what it reads is up to that AI's service. Only connect ones you trust with medical information, and be careful with an AI that also browses the web: a web page could try to talk it into doing things.</li>
            </ul>

            {on && (
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-medium mb-1">Address</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs break-all rounded bg-muted px-2 py-1">{url}</code>
                    <Button size="sm" variant="outline" onClick={() => copy(url, "address")}><Copy className="h-3 w-3" /></Button>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium mb-1">Token (keep it secret, like a password)</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs break-all rounded bg-muted px-2 py-1">{shown}</code>
                    <Button size="sm" variant="outline" onClick={() => setShowToken(v => !v)}>{showToken ? "Hide" : "Show"}</Button>
                    <Button size="sm" variant="outline" onClick={() => copy(token, "token")}><Copy className="h-3 w-3" /></Button>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium mb-1">Claude Code: paste this in a terminal</div>
                  <div className="flex items-start gap-2">
                    <code className="flex-1 text-xs break-all rounded bg-muted px-2 py-1">{cmdFor(shown)}</code>
                    <Button size="sm" variant="outline" onClick={() => copy(cmdFor(token), "command")}><Copy className="h-3 w-3" /></Button>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium mb-1">Other MCP apps: config JSON</div>
                  <div className="flex items-start gap-2">
                    <pre className="flex-1 text-xs whitespace-pre-wrap break-all rounded bg-muted px-2 py-1">{jsonFor(shown)}</pre>
                    <Button size="sm" variant="outline" onClick={() => copy(jsonFor(token), "config")}><Copy className="h-3 w-3" /></Button>
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={regenerate} className="gap-2">
                  <RefreshCw className="h-3 w-3" /> Make a new token
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
