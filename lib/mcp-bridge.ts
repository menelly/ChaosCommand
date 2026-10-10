/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude Opus 5.5)
 *
 * 🔌 MCP BRIDGE — the webview half of Settings → AI Access.
 *
 * The Rust side (src-tauri/src/mcp.rs) owns the localhost door but can't see the
 * database: Dexie lives here, encrypted at rest, and only readable while the user is
 * unlocked. So every tool call arrives as a `chaos:mcp-request` event, gets answered
 * by `answerMcpRequest()` below, and goes back with `invoke('mcp_respond')`.
 *
 * Writes are DIRECT (Ren's call, 2026-10-10: "read + write directly"), and every one
 * is stamped `source: 'ai-mcp'` and announced with a toast by the caller.
 *
 * 🛡️ Hardened after a sister arm read every line (2026-10-10):
 *   • PER-PROFILE opt-in. The door is app-wide, but each PIN profile is a separate
 *     person; an AI connected by a parent must not reach a kid's profile.
 *   • A write checks the session is STILL the same unlocked profile right before it
 *     writes. Without that, an auto-lock mid-write would drop the entry, unencrypted,
 *     into the default no-profile database.
 *   • Writes run ONE AT A TIME (two parallel adds to one day used to lose one).
 *   • The app always makes the entry id. An AI told to "copy the shape" would copy the
 *     id too, and then deleting one would delete both.
 *   • Only trackers that already keep an `entries` list somewhere can be added to,
 *     so a typo'd tracker name can't invent a day record no page knows how to read.
 */

import { getDB, getCurrentTimestamp } from '@/lib/database/dexie-db'
import { hasSessionKey, getNamespaceId } from '@/lib/database/session-crypto'
import { getPref } from '@/lib/prefs'
import { isDemoSandbox } from '@/lib/pwa-mode'
import { format, parseISO, isValid } from 'date-fns'

export interface McpRequest {
  id: number
  tool: string
  args: Record<string, any>
}

/** What the caller needs to tell the user something happened. */
export interface McpWriteNotice {
  date: string
  subcategory: string
}

/** The per-profile switch. Lives in prefs, which are namespaced per PIN profile. */
export const MCP_PROFILE_PREF = 'chaos-mcp-profile-allowed'

/** 🎚️ How much this profile lets an AI do (Ren's ask, 2026-10-10: "read" and "read/write" right there). */
export type McpAccessLevel = 'off' | 'read' | 'readwrite'

export function getMcpAccessLevel(): McpAccessLevel {
  const v = getPref(MCP_PROFILE_PREF)
  if (v === 'read' || v === 'readwrite') return v
  if (v === 'true') return 'readwrite' // the first test build stored a plain on/off
  return 'off'
}

/** Tracker pages listen for this and reload, so an open page can't save a stale list over an AI's entry. */
export const MCP_DATA_CHANGED_EVENT = 'chaos:mcp-data-changed'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_RECORDS = 400

function isTombstoned(row: any): boolean {
  return Boolean(row?.metadata?.deleted_at)
}

/** Some older days store `entries` as a JSON string. Read both shapes. */
function entriesOf(content: any): any[] | null {
  if (!content || content.entries === undefined) return null
  let list = content.entries
  if (typeof list === 'string') {
    try { list = JSON.parse(list) } catch { return null }
  }
  return Array.isArray(list) ? list : null
}

/** Is this profile unlocked AND opted in? Throws the message the AI should relay. */
function assertProfileReady(): { ns: string; level: McpAccessLevel } {
  const ns = getNamespaceId()
  if (!hasSessionKey() || !ns) {
    throw new Error('Chaos Command is locked. Ask the user to unlock it with their PIN, then try again.')
  }
  const level = getMcpAccessLevel()
  if (level === 'off') {
    throw new Error('AI Access is off for the profile that is logged in right now. The user can turn it on in Settings → AI Access.')
  }
  return { ns, level }
}

// ✍️ One write at a time, in arrival order.
let writeChain: Promise<unknown> = Promise.resolve()
function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn)
  writeChain = run.catch(() => {})
  return run
}

/** 🧮 Answer one tool call. Throws a plain-English Error for anything the AI should relay or fix. */
export async function answerMcpRequest(
  req: McpRequest,
  onWrite?: (notice: McpWriteNotice) => void,
): Promise<any> {
  const args = req.args || {}
  const { ns, level } = assertProfileReady()
  // Pin THIS profile's database once, so nothing below can drift to another one.
  const database = getDB(ns)

  switch (req.tool) {
    // 📅 the user's own clock — dates in this app are LOCAL, never UTC
    case 'chaos_today': {
      const now = new Date()
      return {
        date: format(now, 'yyyy-MM-dd'),
        time: format(now, 'HH:mm'),
        weekday: format(now, 'EEEE'),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }
    }

    // 🗂️ what's in here at all
    case 'chaos_list_trackers': {
      const rows = (await database.daily_data.toArray()).filter(r => !isTombstoned(r))
      const groups = new Map<string, { category: string; subcategory: string; days: number; first_date: string; last_date: string; keeps_entry_list: boolean }>()
      for (const r of rows) {
        const key = `${r.category}/${r.subcategory}`
        const hasList = entriesOf(r.content) !== null
        const g = groups.get(key)
        if (!g) {
          groups.set(key, { category: r.category, subcategory: r.subcategory, days: 1, first_date: r.date, last_date: r.date, keeps_entry_list: hasList })
        } else {
          g.days += 1
          if (r.date < g.first_date) g.first_date = r.date
          if (r.date > g.last_date) g.last_date = r.date
          if (hasList) g.keeps_entry_list = true
        }
      }
      const trackers = [...groups.values()].sort((a, b) => b.last_date.localeCompare(a.last_date))
      return {
        tracker_count: trackers.length,
        note: 'chaos_add_entry works on trackers where keeps_entry_list is true.',
        trackers,
      }
    }

    // 📖 read a date range
    case 'chaos_read_entries': {
      const { start_date, end_date, category, subcategory } = args
      if (!DATE_RE.test(start_date || '') || !DATE_RE.test(end_date || '')) {
        throw new Error('start_date and end_date must both be YYYY-MM-DD.')
      }
      if (start_date > end_date) throw new Error('start_date is after end_date.')
      let rows = await database.daily_data.where('date').between(start_date, end_date, true, true).toArray()
      rows = rows.filter(r => !isTombstoned(r))
      if (category) rows = rows.filter(r => r.category === category)
      if (subcategory) rows = rows.filter(r => r.subcategory === subcategory)
      rows.sort((a, b) => a.date.localeCompare(b.date))
      const truncated = rows.length > MAX_RECORDS
      return {
        count: Math.min(rows.length, MAX_RECORDS),
        truncated,
        ...(truncated ? { note: `Only the first ${MAX_RECORDS} day-records are included; narrow the date range for the rest.` } : {}),
        records: rows.slice(0, MAX_RECORDS).map(r => ({
          date: r.date,
          category: r.category,
          subcategory: r.subcategory,
          content: r.content,
          tags: r.tags || [],
          updated_at: r.metadata?.updated_at,
        })),
      }
    }

    // ✍️ add one entry to a day's list
    case 'chaos_add_entry': {
      if (level !== 'readwrite') {
        throw new Error('This profile allows reading only, so nothing was added. The user can switch it to "Read & write" in Settings → AI Access.')
      }
      if (isDemoSandbox()) throw new Error('This is the demo build; it never saves anything.')
      const { date, subcategory, entry } = args
      const category: string = args.category || 'tracker'
      if (!DATE_RE.test(date || '')) throw new Error('date must be YYYY-MM-DD.')
      if (!subcategory || typeof subcategory !== 'string') throw new Error('subcategory is required, e.g. "bathroom".')
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('entry must be an object.')

      return serialized(async () => {
        // Only trackers that already keep an entries list somewhere. Stops typos and
        // stops the AI inventing a shape that no page in the app knows how to read.
        const sameTracker = (await database.daily_data.where('category').equals(category).toArray())
          .filter(r => r.subcategory === subcategory && !isTombstoned(r))
        if (!sameTracker.some(r => entriesOf(r.content) !== null)) {
          throw new Error(
            `"${category}/${subcategory}" has no days with an entries list yet, so nothing was added. ` +
            `Call chaos_list_trackers to see the exact names; only trackers with keeps_entry_list: true can be added to.`,
          )
        }

        const rowsThatDay = sameTracker.filter(r => r.date === date)
        const live = rowsThatDay[0] // live rows only (tombstones filtered above)
        const existingList = live ? entriesOf(live.content) : []
        if (live && existingList === null) {
          throw new Error(
            `On ${date}, "${subcategory}" holds something other than an entries list, so nothing was added. ` +
            `Read that day with chaos_read_entries to see it.`,
          )
        }

        const now = getCurrentTimestamp()
        const { id: _ignoredId, source: _ignoredSource, ...fields } = entry as Record<string, any>
        const createdOk = typeof fields.createdAt === 'string' && isValid(parseISO(fields.createdAt))
        const saved = {
          ...fields,
          id: `${subcategory}-ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          date,
          createdAt: createdOk ? fields.createdAt : now,
          updatedAt: now,
          source: 'ai-mcp',
        }
        const entries = [...(existingList || []), saved]

        // 🔒 Last look before writing: same profile, still unlocked?
        if (!hasSessionKey() || getNamespaceId() !== ns) {
          throw new Error('Chaos Command locked while saving, so nothing was written. Ask the user to unlock, then read the day before trying again.')
        }

        if (live) {
          await database.daily_data.update(live.id!, {
            content: { ...live.content, entries },
            metadata: {
              ...(live.metadata || {}),
              created_at: live.metadata?.created_at || now,
              updated_at: now,
              user_id: live.metadata?.user_id || 'default-user',
              version: (live.metadata?.version || 1) + 1,
            },
          })
        } else {
          await database.daily_data.add({
            date, category, subcategory,
            content: { entries },
            tags: [],
            metadata: { created_at: now, updated_at: now, user_id: 'default-user', version: 1 },
          })
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(MCP_DATA_CHANGED_EVENT, { detail: { date, category, subcategory } }))
        }
        onWrite?.({ date, subcategory })
        return { saved: true, date, category, subcategory, entry: saved, entries_that_day: entries.length }
      })
    }

    default:
      throw new Error(`Unknown tool: ${req.tool}`)
  }
}
