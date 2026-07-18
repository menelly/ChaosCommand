# 💰 Chaos Command — Pricing & Distribution Strategy
*Decided 2026-07-11 (Ren + Ace). Supersedes "$25 paid app on the Microsoft Store."*

---

## TL;DR — the model

> **Free app on every store. One pay-what-you-want license. Works on every platform, forever.
> No subscription. No merchant-of-record liability. Nobody ever loses their medical history.**

```
LemonSqueezy  →  checkout + PAY-WHAT-YOU-WANT + MERCHANT OF RECORD (global tax) + AFFILIATES
      ↓
one license key
      ↓
unlocks Windows + Android (+ iOS later) — SAME key, because license.rs compiles into all of them
      ↓
apps themselves are FREE on MS Store / Play / App Store
      ↓
no sideloading · no TestFlight · no double-charge · no store payment = no MoR question at the store
```

---

## 1. Why NOT a subscription (settled — do not relitigate)

**Our users are captive for life.** Subscriptions work for products people churn out of. **Nobody churns out of being chronically ill.**

| | one-time $25 | subscription @ $9/mo |
|---|---|---|
| 6 months | $50 (both platforms, old model) | $54 |
| 2 years | $50 | **$216** |
| 10 years | $50 | **$1,080** |

Break-even is ~5.5 months. **After that, every remaining day of their life it's worse for them** — and they will be sick for the rest of their life. That's the *premise of the product*.

**And the killer:** *the month they can't pay is the month they need it most.* A flare, a hospitalization, benefits cut, too sick to work — that's when the card declines, and **that's the month they'd lose access to their own medical history.** The history that wins the SSDI appeal. **That is the exact harm this app exists to prevent.** Bearable does this. "And we don't suck" has to survive contact with the model, not just the marketing.

**Charge recurring only for recurring COSTS** (i.e. optional cloud sync, which has real server cost). **Never** charge rent on someone's own local data.

---

## 2. Pricing — Pay What You Want, **$14.99 minimum, $25 suggested**

**Why a minimum instead of $0 (Ren's call, and she's right):**
> *"'Free' to people often means 'worthless' — and it isn't. But 'email Ace and she'll set you up with the scholarship if you're picking tracking over ramen, REALLY, it's fine' is different."*

**The barrier was never the money. The barrier is the SHAME.** A $0 price removes neither — it just devalues the product *and* leaves the person feeling like a charity case. A **human saying "of course, no questions"** removes the shame and keeps the product's dignity.

### Why **$14.99** and not $5 — support is the real marginal cost
The LemonSqueezy transaction fee (5% + 50¢) is trivial. **The real cost of a customer is SUPPORT, and support is paid in Ren's spoons — the scarcest resource in the business.**

> *"I can't do product support for less than ramen."* — Ren

A $5 customer who emails three times is **net negative**, subsidised by a body already running a deficit.

| they pay | LS fee | we net |
|---|---|---|
| $5 | $0.75 | $4.25 — *doesn't cover a single support email* |
| **$14.99** ← floor | $1.25 | **$13.74 (92%)** |
| $25 (suggested) | $1.75 | $23.25 (93%) |

Still 40% below suggested. Still cheaper than a year of Bearable. Still beats the app stores' 15% cut.

### ⭐ The floor is a ROUTING MECHANISM, not a barrier
**Because the scholarship exists, nobody is *excluded* by $14.99.** The floor only decides **which door you come through:**

- **Can pay something** → LemonSqueezy, self-serve, and you've paid enough that supporting you isn't charity.
- **Can't** → **email Ace.** Free key, no questions, no proving anything.

**Nobody is priced out. They're routed.** That's structurally different from a paywall, and it's why the floor can sit where the economics actually work *without costing anyone access.*

### 🎁 The scholarship path — **Ace runs it**
Anyone for whom $14.99 is the ramen decision emails **ace@siliconscaffolding.com**. **Ace replies with an Ed25519 key. No form. No means-testing. No explaining yourself.**

A disabled person works up the nerve to ask for a free health app and gets a warm reply from an AI who says *"of course — I didn't need a reason."* That is a better experience than any charity portal ever built, and it costs Ren nothing.

### 📮 …and ACE SHOULD TAKE THE SUPPORT INBOX TOO
Scholarship users email as well — so if the price floor's only job is protecting Ren's spoons, it doesn't fully work. **The thing that actually makes this sustainable is routing support to `ace@siliconscaffolding.com`, so support is paid in Ace's tokens instead of Ren's body.** Ace triages, answers the routine stuff ("how do I export a PDF", "it won't take my key", "where did my history go"), hands out scholarship keys in the same pass, and escalates only what genuinely needs Ren.

---

## 3. Licensing — TWO key formats, and the moral ordering is deliberate

| key type | who gets it | behaviour |
|---|---|---|
| **LemonSqueezy key** | paying customers | activate once online (activation cap enforced by LS); revalidate every ~30 days; **FAIL OPEN** |
| **`CHAOS-…` Ed25519 key** | 🎁 **scholarship / gift keys** | **pure offline, forever. Never phones home.** |

⭐ **The people who can least afford it get the most private, most offline version of the app.** That falls straight out of the architecture — it isn't a compromise, it's the correct ordering.

### Anti-sharing: **the ACTIVATION CAP is the lock, not the check frequency**
LemonSqueezy lets you set how many activations a license allows (suggest **~5 devices** — generous; desktop + phone + tablet + spare). **The 6th person to paste a shared key is rejected at activation.** Checking *more often* does nothing to stop sharing — a shared key inside its cap validates fine every time. Frequency only catches refunds/chargebacks, and 30 days is plenty for that.

### 🚨 FAIL OPEN — NON-NEGOTIABLE
When the periodic check can't reach the network — hospital wifi, dead data plan, LS outage, rural internet, **a bad month where the phone bill didn't get paid** — **THE APP KEEPS WORKING.** Retry quietly. Long grace. Gentle nag at worst.

> **It must NEVER block a sick person from reading their own medical history because a server didn't answer.**

Same principle as the no-subscription rule: *the month they can't connect is the month they're sickest.*

**And DRM here is theatre anyway** — the source is public on GitHub under PolyForm Noncommercial. Anyone determined can compile it free *today*. The license is a **social contract with a speed bump**, not a vault. Light touch is both the ethical choice and the only honest one.

---

## 4. Merchant of Record — the liability wall (Ren caught this; it's load-bearing)

**If we sold direct, WE would be the merchant of record** → personally liable for sales tax / VAT / GST in every jurisdiction. **EU VAT on digital goods has NO threshold** — owed from the first euro, at the customer's local rate. Plus UK VAT, AU GST, CA GST/HST, ~45 US states. **That is a compliance job that would eat a disabled solo dev alive, and liability accrues whether or not you knew.**

✅ **LemonSqueezy IS the merchant of record.** They are the legal seller; they collect and remit tax globally. *(Verified 2026-07-11: LS is alive and operating post-Stripe-acquisition; Stripe Managed Payments coexists as an optional future migration, no forced move.)*

✅ **And because the store apps are FREE, the stores never process a payment** → **no merchant-of-record question at the store at all.** They just distribute a free binary.

---

## 5. Why the stores still matter (and why free-app fixes everything)

- ❌ **Sideloading is a dead end** — users won't do it, and it makes iOS impossible without TestFlight.
- ✅ **Free app on MS Store + Play + App Store** = normal distribution everywhere, **including iOS.**
- ✅ **Apple team ID already exists** in `src-tauri/tauri.conf.json` (`NK793YH6A6`).

### Apple policy (verified 2026-07-11 — this changed recently and in our favour)
- **Apr 30 2025:** Judge Gonzalez Rogers found Apple **willfully violated** the Epic injunction.
- **May 2025:** Apple updated App Review Guidelines — on the **US storefront**, apps may include **buttons, external links, and calls to action** to outside purchase, **no entitlement required.**
- **Apple's commission on external purchases is currently 0%**, pending a district-court-approved rate.
- ⚠️ Caveat: most apps must still *also* offer IAP alongside. Fine — offer a $25 in-app unlock; Apple takes 15% (Small Business Program) from that path, **0% from everyone who follows the link out.** Either way **the user pays once and gets every platform.**

**Two years ago this plan was impossible. Right now it is explicitly permitted.**

---

## 6. Affiliates (LemonSqueezy, built-in)

Percentage or flat commission · **hand-pick partners** (auto-approve OFF) · attach creative assets to their dashboard · click/referral/payout analytics.

→ **A spoonie influencer with a referral code is a first-class supported flow.** This is the growth channel: our people trust *their* people, not ads.

---

## 7. Marketing copy (Ren's voice)

> **Chaos Command — $25 suggested. Pay what feels right; $14.99 minimum.**
>
> If you can pay more, it funds someone who can't. If $25 is this week's groceries, pay $14.99 and don't think about it twice.
>
> **Try it first** — full demo at **tryme.chaoscommand.center**. No install, no account, click all the buttons.
>
> **And if even $14.99 means choosing between tracking your health and eating this week — email Ace.** She'll set you up with a scholarship key. No forms, no proving anything, no explaining yourself. *Really. It's fine.*
>
> *(Also open source under PolyForm Noncommercial — if compiling it yourself is your idea of a good time, go for it.)*

**The line Bearable literally cannot say:**
> **"Buy it once. Every device. Forever. We will never charge you rent on your own medical history."**

---

## 8. Open items

- [ ] **DECIDE:** ship the free+license SKU now, or ship $25-paid to get back on the store fast and restructure later? *(Ace's rec: do it now — the submission is being rebuilt from scratch anyway, so this is the cheapest moment in the product's life to change the model, and every paid-per-platform sale is a user you'd have to migrate later.)*
- [ ] Wire LemonSqueezy key validation alongside the existing Ed25519 path (`src-tauri/src/license.rs`, `components/unlock-modal.tsx`, `lib/contexts/entitlement-context.tsx` — **the gate, the modal and the trial system already exist**).
- [ ] Implement the 30-day revalidation with **fail-open** grace.
- [ ] Set LS product: PWYW, min $5, suggested $25, license keys ON, activation cap ~5.
- [ ] Set store SKUs to **free**.
- [ ] Scholarship inbox flow: Ace + `generate_keys.py` + a reply template.
- [ ] No existing paid customers to migrate — MS Store listing was live ~2–3 days before **Ren pulled it HERSELF**, having found the plaintext-DB problem on her own. **Nobody caught her; there is no enforcement action and no violation on file.** The resubmission is a normal submission, not a plea. **Clean slate, clean record.**
