/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Single source of truth for the sidebar's content nav buttons. Both the
 * sidebar itself and the Customize → Sidebar Declutter panel import this, so the
 * declutter toggles can never drift out of sync with what the sidebar actually
 * renders (the exact failure mode we just hit with the tracker lists).
 *
 * Core nav (Home, Customize, Settings, Disclaimer, Logout) is intentionally NOT
 * here — those are always visible. Only these content sections are declutterable.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */

export const SIDEBAR_HIDDEN_KEY = "chaos-sidebar-hidden"
export const SIDEBAR_NAV_CHANGED_EVENT = "chaos-sidebar-nav-changed"

export interface SidebarNavItem {
  id: string
  text: string
  emoji: string
  targetPageId: string
  buttonClass: string
}

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  { id: "body", text: "Body", emoji: "🫀", targetPageId: "body", buttonClass: "sidebar-btn-1" },
  { id: "mind", text: "Mind", emoji: "🧠", targetPageId: "mind", buttonClass: "sidebar-btn-2" },
  { id: "maintain", text: "Maintain", emoji: "🔩", targetPageId: "maintain", buttonClass: "sidebar-btn-3" },
  { id: "choice", text: "Choice", emoji: "💪", targetPageId: "choice", buttonClass: "sidebar-btn-4" },
  { id: "built", text: "Built", emoji: "🔧", targetPageId: "custom", buttonClass: "sidebar-btn-5" },
  { id: "forge", text: "Forge", emoji: "🔨", targetPageId: "forge", buttonClass: "sidebar-btn-6" },
  { id: "manage", text: "Manage", emoji: "🗂️", targetPageId: "manage", buttonClass: "sidebar-btn-guide" },
  { id: "patterns", text: "Patterns", emoji: "📊", targetPageId: "patterns", buttonClass: "sidebar-btn-1" },
  { id: "routines", text: "Routines", emoji: "📋", targetPageId: "routines", buttonClass: "sidebar-btn-2" },
]
