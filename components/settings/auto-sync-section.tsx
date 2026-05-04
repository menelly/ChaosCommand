/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * Settings tile for the opt-in auto-sync feature. Mirrors the shape of
 * UpdateCheckSection — pref toggle + paired-devices count + a link to
 * the full /sync management page.
 */
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { RefreshCw, ArrowRight } from "lucide-react"
import { useUser } from "@/lib/contexts/user-context"
import {
  getAutoSyncPref,
  setAutoSyncPref,
  listPeers,
  type PeerView,
} from "@/lib/auto-sync"

export default function AutoSyncSection() {
  const { userPin } = useUser()
  const [pref, setPref] = useState(false)
  const [peers, setPeers] = useState<PeerView[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setPref(getAutoSyncPref())
  }, [])

  useEffect(() => {
    if (!userPin) {
      setLoaded(true)
      return
    }
    listPeers(userPin)
      .then(list => setPeers(list))
      .catch(() => setPeers([]))
      .finally(() => setLoaded(true))
  }, [userPin])

  return (
    <div className="p-4 border rounded-lg border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
      <div className="flex items-center gap-2 mb-3">
        <RefreshCw className="h-4 w-4 text-purple-600" />
        <Label className="text-sm font-medium">Auto-Sync to Paired Devices</Label>
        <Badge variant="outline" className="text-xs">Opt-in</Badge>
      </div>

      <p className="text-sm text-muted-foreground mb-3">
        Off by default. When on, your daily "I survived" click silently
        syncs with every device you've paired under this PIN — at most
        once per hour. Local-WiFi only, no cloud, authenticated with a
        long-lived shared key per pairing.
      </p>

      {loaded && (
        <div className="text-xs text-muted-foreground mb-3">
          {peers.length === 0 ? (
            <>
              <span className="font-medium">No paired devices yet.</span>{" "}
              Pair a device on the Sync page to start syncing.
            </>
          ) : (
            <>
              {peers.length} device{peers.length === 1 ? "" : "s"} paired:{" "}
              {peers.map(p => p.peer_name).join(", ")}
            </>
          )}
        </div>
      )}

      <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 mb-3">
        <Checkbox
          checked={pref}
          onCheckedChange={(checked) => {
            const v = checked === true
            setPref(v)
            setAutoSyncPref(v)
          }}
          className="mt-0.5"
        />
        <div className="space-y-0.5">
          <span className="text-sm font-medium">
            Sync silently on the daily survival button
          </span>
          <p className="text-xs text-muted-foreground">
            One auto-sync per hour, fires alongside the survival check-in.
            Turning this on without paired devices is harmless — nothing
            happens until you pair.
          </p>
        </div>
      </label>

      <Button asChild variant="outline" size="sm" className="w-full">
        <Link href="/sync">
          Manage Pairings
          <ArrowRight className="h-3.5 w-3.5 ml-2" />
        </Link>
      </Button>
    </div>
  )
}
