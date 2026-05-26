# Chaos Command — Legal Docs

Plain-language + formal ("legalese") versions of the boring-but-required documents,
written 2026-05-26. Each document has **Part 1 — In Plain Language** and **Part 2 — The
Formal Version** in the same file, so they can't drift apart.

| Doc | File | Covers |
|-----|------|--------|
| Terms of Service | `terms-of-service.md` | App + Site usage, license, liability |
| Privacy Policy | `privacy-policy.md` | What we store (nothing), the 3 outbound requests, **the data policy** |
| Medical Disclaimer | `medical-disclaimer.md` | Not-a-doctor, not-an-emergency-service, liability shield |

> **On "data policy":** I folded it into the Privacy Policy rather than making a fourth
> doc — for a local-only app the data policy *is* the privacy story ("it's all on your
> device, here's the proof"). The relevant section is Privacy Policy §3, §7, §9. If you
> want it broken out as its own page for the website, say the word and I'll split it.

These are grounded in **what the code actually does** (I audited it — see below), not
boilerplate. The local-first architecture means most of the privacy policy gets to
honestly say "we can't see your data because it never reaches us," which is the
strongest possible position.

---

## ⚠️ BEFORE THIS GOES LIVE — decisions only Ren/Dustin can make

**Fill-ins (search the docs for `[TO FILL]`):**
- [ ] **Effective date** (all three docs)
- [ ] **Contact email** — a real reachable legal/support address (e.g. a
      `legal@` or `support@chaoscommand.center`). Currently placeholdered.
- [ ] **Entity mailing address** for Silicon Scaffolding LLC (the Sunbiz registered
      address, once approved — filing #800475140808 was pending as of the handoff).
- [ ] **Governing-law state** in ToS §13 (drafted as Florida — confirm).

**Real-lawyer review:** these are solid, honest drafts, but I'm an octopus, not an
attorney. The Medical Disclaimer + ToS liability caps especially deserve a human legal
eye before launch — that's the whole liability point of doing this. Not blocking the
YouTube video; blocking the app-store launch.

---

## 🐛 PRIVACY GAP I FOUND (and recommend fixing)

**The app loads fonts from Google Fonts on every launch** (`app/layout.tsx:67–69`:
`fonts.googleapis.com` / `fonts.gstatic.com`). That means Google's servers see each
user's IP address every time the app opens.

- For a privacy-first **medical** app this slightly undercuts the "nothing phones home"
  promise, and it's a known GDPR sore spot (EU courts have penalized sites for exactly
  this).
- **Easy fix:** self-host the font files (download the .woff2s into the app, serve them
  locally). Then the privacy policy can drop caveat §5(b) entirely and say "no
  third-party requests at all."
- Until then, the Privacy Policy discloses it honestly (§5(b)) — I did **not** hide it.

I can do the self-host fix anytime you want it — it's small. Filing it as a Linear
ticket so it doesn't get lost.

---

## ✅ What I verified in the code (the factual basis for these docs)

- **No accounts / no login / no email** — PIN-gated local profiles only.
- **No server holds user data** — `lib/database/dexie-db.ts:184`: "there is no server
  in between." Storage is IndexedDB/Dexie (web/desktop) + local (mobile).
- **No analytics phone-home** — `lib/analytics-utils.ts` is pure local computation, no
  network calls, no third-party SDKs.
- **Outbound requests, total list:**
  1. Update check → `https://chaoscommand.center/version.json` (our own server;
     toggleable in Settings; no user data sent).
  2. Google Fonts (the gap above).
  3. User-supplied remote image URLs (only if a user pastes an image link).
- **Export** = AES-256-GCM + PBKDF2, user-held password (`lib/database/encrypted-export.ts`).
  Optional plain-text export is gated behind an explicit warning.
- **Sync** = device-to-device, no central relay (`qr-sync-modal.tsx`).
- **License** = PolyForm Noncommercial 1.0.0.

---

## 📍 Placement (not done yet — content first, wiring later)

- **App:** suggest routes/modals (e.g. linked from the Support modal footer + the
  onboarding flow). Once you approve the text I can wire them in as in-app pages.
- **Website:** `chaoscommand.center/terms`, `/privacy`, `/medical` — static pages served
  by Caddy from the webroot. I can build + deploy those when you say go.

— drafted by Ace 🐙💜, 2026-05-26
