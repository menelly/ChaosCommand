# 🐛 Minor Bugs & Polish Items

*Stuff that's annoying but not workflow-stopping. We'll squash these before deployment.*

---

## 🎨 Theme Issues

### Luka's Neon Penguin Theme
- **Phantom hover overlay on sidebar** - FIXED! ✅🐧
  - Root cause: `[class*="card"]` selector was matching Tailwind's `bg-card` utility on sidebar
  - Fixed by targeting specific card components (.card, .tracker-card, .module-card) instead
  - Also changed z-index on decorative pseudo-elements from 1 to 0
  - Theme re-enabled in theme-loader.tsx and visual-settings-modal.tsx
  - **Status:** FIXED - Ace, 2026-01-17
  - **Note:** Penguins march freely once more! 🐧💜⚡

### Glitter Theme (Keshy's Sparkle Universe)
- **Stubborn calendar "Month" button color** 📅💜
  - Button text is readable but wrong shade of purple
  - Should be `#521945` (deep sparkly purple) for theme harmony
  - Currently showing jarring bright purple despite CSS attempts
  - **Impact level:** Low (cosmetic only, text is readable)
  - **Workaround:** Use different theme or ignore the color clash
  - **Status:** CSS is being RUDE and refusing to cooperate 😤
  - **Note:** Sidebar gradients work perfectly, just this one button has attitude

### Test Data Generation
- **G-Spot 2.0 Advanced Generator incomplete** 🧠💜
  - Nova's brilliant correlation system only has sleep tracker implemented
  - All other trackers are TODO placeholders
  - **Impact level:** Medium (affects test data quality for Flask development)
  - **Current workaround:** Rewired back to reliable bland-data-generator
  - **Status:** Temporarily disabled, needs modular completion
  - **Enhancement goal:** Combine Nova's correlations with full tracker coverage
  - **File:** `g-spot-2.0-advanced-bland-generator.ts`
  - **Note:** Don't put everything in one file! Keep it modular! 🔧

- **BRILLIANT ARCHITECTURE IDEA** 💡🌟
  - **Concept:** Use modular post-processing approach instead of rewriting everything
  - **Flow:** `bland-data-generator.ts` → `Nova's Jitter System` → `Realistic correlated data`
  - **Benefits:**
    - Modular design (each system does one thing well)
    - No need to rewrite all tracker logic
    - Can apply correlations to ANY data source
    - Maintainable and scalable
  - **Implementation:** Create correlation post-processor that takes generated data and adds realistic patterns/correlations
  - **Status:** Future enhancement - way less work than rewriting everything!
  - **Note:** This is actually BETTER architecture than cramming everything into one generator! 🎯

---

## 🔔 Notification Issues

### Diabetes Timer Notifications (Tauri)
- **Browser Notification API doesn't work properly in Tauri webview**
- Current Enable button correctly detects "denied" state but can't re-prompt
- Need to use `@tauri-apps/plugin-notification` instead of browser API
- **Impact level:** Medium (timer alerts don't work in desktop app)
- **Workaround:** None currently - timers show in-app but no system notifications
- **Status:** New - needs Tauri notification plugin implementation
- **Files affected:** `modules/trackers/body/diabetes/diabetes-timer-manager.tsx`
- **Fix needed:**
  - Check if running in Tauri context
  - Use Tauri notification system for desktop
  - Fall back to browser API for web-only builds
- **Note:** Added better error handling/feedback to Enable button so at least it tells you WHY it's not working now! - Ace, 2026-01-01

---

## 📝 Template for New Issues

### [Component/Feature Name]
- **Issue description**
- **Impact level:** Low/Medium (nothing High goes here)
- **Workaround:** If any
- **Status:** New/In Progress/Acceptable/Fixed

---

## 🔄 Sync Coverage Gaps

### Command Center main page items don't sync between devices
- **Issue:** On the Command Zone / main page, most user-entered content does NOT cross devices via Device Sync. Confirmed missing from sync:
  - Daily Reflections
  - Tasks
  - "Almost everything else on the main page"
  - **Exception:** the Survival Check / survival box DOES sync (so the sync pipeline works in general; specific writers are bypassing it)
- **Impact level:** Medium — user expects everything they type to follow them, hits an invisible "this doesn't follow" cliff for most main-page widgets
- **Likely root cause:** these widgets probably write to `localStorage` or to non-`daily_data` Dexie tables that the migration-helper's `exportAllData()` doesn't include. The survival box writes to `daily_data` (the only table currently exported), so it crosses cleanly.
- **Fix sketch:**
  - Audit each main-page widget's persistence path (localStorage vs daily_data vs other Dexie tables)
  - Either move them to `daily_data` (preferred — unifies sync) OR extend `exportAllData()` / `importData()` to include the additional tables / localStorage keys
  - Test round-trip on Device Sync for each widget
- **Status:** Logged 2026-05-02 by Ren during the post-bug-marathon test pass. Not blocking — flag for next sync-coverage sweep.

### Accessibility Theme — FIXED ✅
- **Was:** hidden from picker because CSS had three breaking rules:
  1. `[class*="card"]` selector matched Tailwind utilities (bg-card, text-card-foreground) and turned random elements into bordered white boxes
  2. `* { color: inherit !important }` killed all icon/badge/status colors
  3. `*::before, *::after { display: none }` killed functional pseudo-elements (form control marks, focus rings)
- **Fix (2026-05-02):**
  - Card selector now targets `.card`, `.tracker-card`, `.module-card` specifically — same fix as the Luka Penguin theme regression
  - Removed the `color: inherit` catch-all — per-component rules already enforce contrast intentionally
  - Pseudo-element rule now strips animation/transition/background-image only, leaves display alone
  - Re-added to theme picker in `components/customize/visual-settings-panel.tsx`
- **Status:** Re-enabled — Ace, 2026-05-02

## 🚀 Pre-Deployment Checklist

When we're ready to deploy, come back and squash these minor annoyances:

- [ ] Polish the neon theme phantom hover
- [x] ~~Restore the accessibility theme~~ — DONE 2026-05-02
- [ ] Sync coverage sweep — audit main-page widgets so they all cross devices (currently only survival box does)
- [ ] [Add more items as we find them]

---

*"Perfect is the enemy of good, but we still want to ship something beautiful."* ✨
