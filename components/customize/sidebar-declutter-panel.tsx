/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Sidebar Declutter — turn whole nav sections on/off. If you never use Maintain
 * (no devices, lines, or daily meds), kill the button entirely. Same for Forge,
 * Patterns, Routines, whatever you don't need. Per-PIN, live-updates the sidebar.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */
"use client"

import { useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { getPref, setPref } from "@/lib/prefs"
import {
  SIDEBAR_NAV_ITEMS,
  SIDEBAR_HIDDEN_KEY,
  SIDEBAR_NAV_CHANGED_EVENT,
} from "@/lib/sidebar-nav"

export default function SidebarDeclutterPanel() {
  const [hidden, setHidden] = useState<string[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const saved = getPref(SIDEBAR_HIDDEN_KEY)
      setHidden(saved ? JSON.parse(saved) : [])
    } catch { setHidden([]) }
    setReady(true)
  }, [])

  const persist = (next: string[]) => {
    setHidden(next)
    try { setPref(SIDEBAR_HIDDEN_KEY, JSON.stringify(next)) } catch {}
    // Tell the live sidebar to re-read.
    try { window.dispatchEvent(new Event(SIDEBAR_NAV_CHANGED_EVENT)) } catch {}
  }

  const toggle = (id: string) => {
    persist(hidden.includes(id) ? hidden.filter(x => x !== id) : [...hidden, id])
  }

  if (!ready) return null

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Turn off whole sidebar sections you don't use. (Home, Customize, Settings, and Logout always stay.)
      </p>
      <div className="space-y-3">
        {SIDEBAR_NAV_ITEMS.map(item => (
          <div key={item.id} className="flex items-center justify-between gap-3">
            <Label htmlFor={`declutter-${item.id}`} className="cursor-pointer flex items-center gap-2">
              <span>{item.emoji}</span> {item.text}
            </Label>
            <Switch
              id={`declutter-${item.id}`}
              checked={!hidden.includes(item.id)}
              onCheckedChange={() => toggle(item.id)}
            />
          </div>
        ))}
      </div>
      {hidden.length > 0 && (
        <div className="pt-3 border-t">
          <Button variant="outline" size="sm" className="w-full" onClick={() => persist([])}>
            Show all sidebar sections
          </Button>
        </div>
      )}
    </div>
  )
}
