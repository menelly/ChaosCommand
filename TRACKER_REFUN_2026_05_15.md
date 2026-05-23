# Tracker Refun — 2026-05-15 morning sweep

**Reason for the sweep:** Ren said "I've barely tracked in the last 3 days because the trackers got clinical." That's a real accessibility harm of the v0.4.x refactor — the fun *is* the disability accommodation, not decoration.

**Scope of the sweep:** ~30–40 min during chair-time. Page-level titles, card-level "Log X" prompts, and (for bathroom) the severity scales + episode-type descriptions. **No medical-field changes anywhere.** Every red-flag detector, every Bristol scale value, every PDF mapping, every safety-critical pathway is identical to before. Only labels and descriptions changed.

---

## Trackers refun'd

| Tracker | Old | New |
|---|---|---|
| **Bathroom** | Bathroom Tracker | 🚽 Potty Talk |
| **Head Pain** | Head Pain Tracker | 🧠 Skull Says No |
| **Pain** | Pain Tracker | 🔥 Owie HQ |
| **Anxiety** | Anxiety Tracker | 💜 Brain Weather |
| **Dysautonomia** | Dysautonomia Tracker (mentioned POTS — ⚠️ Ren doesn't have POTS) | ⚡ Autonomic Shenanigans |
| **Mind & Mood** | Mind & Mood (was OK, light touch) | 💜 Mind & Mood |
| **Mind** (overview) | Mind | 🧠 Mind |
| **Food Allergens** | Food Reactions Tracker | 🍽️🚫 Food Drama |
| **Cardiac** | Cardiac Tracker | ❤️ Heart Drama |
| **Joint / MSK** | Joint / MSK Tracker | 🦴 Joint Shenanigans |
| **Brain Fog** | Brain Fog & Cognitive | ☁️ Brain Fog HQ |
| **Seizure** | Seizure Tracker | ⚡ Seizure Log |
| **Coping & Regulation** | Coping & Regulation (was OK, light touch) | 🫂 Coping & Regulation |

## Already-fun trackers (skipped — kept as-is)

| Tracker | Why skipped |
|---|---|
| **Food Choice** | Already "Food Choice 🍽️ / You Fed Your Flesh Suit!" |
| **Hydration** | Already "💧 Hydration Tracker / Track your liquid adventures with the aqua goblins and water sprites" |
| **Sleep** | Already "Sleep Tracker / Track your slumber adventures with the dream goblins" |
| **Movement** | Already "💖 MOVEMENT / Every movement counts! Celebrate your body in motion. 🌟" |

## Bathroom — the full sweep (deepest example)

For bathroom specifically, the sweep also hit the constants and the modal because Ren's screenshots showed exactly which labels were stripped:

**Episode types:**
- "Normal BM" → **Normal** ("Everything went smoothly! 🎉")
- "Constipation / Hard, infrequent, painful, or didn't go" → **Stuck** ("Didn't go, hard, infrequent, or made you regret breakfast choices")
- "Diarrhea / Loose, frequent, urgent, watery" → **Too much** ("Loose, urgent, or 'oh god where's a bathroom'")
- "General / Other bathroom event" → **Mystery Chaos 💀** ("Something weird happened and you want to remember it")

**Pain levels (the Gremlin Detection line is back):**
- None — **No Gremlin Detected** 😌
- Mild — **Mildly Annoying** 😐
- Moderate — **Rude but Tolerable** 😣
- Severe — **Persistent Nuisance** 😫
- WHY — **BUTT WHY!!** 😱

**Bristol scale (clinical numbers + flavor):**
- Type 1 — Hard lumps (constipation rock garden)
- Type 4 — Smooth sausage (Goldilocks zone)
- Type 7 — Liquid (full faucet mode)

**Modal section headers:**
- "Episode type" → "What happened?"
- "Pain level" → "Pain level (Gremlin Detection)"
- "Pain score: 7/10" → "How rude was it? 7/10"
- "Triggers / context" → "What might've caused it?"
- "Outcome" → "How'd it end?"
- "Notes" → "Anything else?"

## Bugs caught during the sweep

- **Dysautonomia tracker subtitle said "Track POTS, orthostatic symptoms..."** — Ren does NOT have POTS (memory file `medical_ren_no_pots.md`); dysautonomia + mito is the actual dx, POTS was tried as dx and rejected. Subtitle now says "Orthostatic chaos, syncope, autonomic episodes" without naming POTS specifically. This was a methodological accuracy bug, not just a fun bug. Worth verifying it doesn't appear in the doctor-PDF anywhere either.

## What's NOT in the sweep (yet)

- **Tracker-specific severity scales beyond bathroom** — pain has a 0–10 scale, anxiety has panic levels, head-pain has intensity scales. Could get the "Gremlin Detection" treatment per tracker, but each needs Ren to confirm voice (e.g., is anxiety's WHY = "BRAIN WHY!!"? Or different word entirely?)
- **Episode-type descriptions** in head-pain, pain, anxiety, dysautonomia, mental-health — most are clinical-but-readable; could add personality if Ren wants it
- **Modal section headers** in the non-bathroom trackers — same generic clinical labels as bathroom had. The bathroom modal sweep is the template; can propagate.
- **Energy tracker non-goblin-mode subtitle** — has a `goblinMode` toggle; the on-mode is fun, the off-mode says "Spoon theory pacing for chronic illness management." Functional but mid. Could improve the off-mode too.
- **Diabetes tracker** — didn't check, may already be clinical-by-necessity for endo
- **Lab results, appointments, medications** — these may be clinical-by-design (doctor-facing) and not need refun

## What Ren should look at when she's back

1. **Open Potty Talk** and look at the new pain-levels list (Gremlin Detection should show in the dropdown) and the Bristol scale flavor — that's the deep example; if you like the voice there, the same energy can sweep into the others' details.
2. **Open Skull Says No, Owie HQ, Brain Weather, Autonomic Shenanigans** and see if the new titles + "What's hurting?" / "What's brain doing?" feels right or wants tightening.
3. **Open Joint Shenanigans** — Ren has cEDS so this is a daily tracker; the new "Which joint is misbehaving?" landing question is the kind of thing the original app's voice would have asked.
4. **The "WHY" question** — bathroom has "BUTT WHY!!" because butt. For other trackers, "WHY" needs its own descriptor. Could go: head-pain "SKULL WHY!!", anxiety "BRAIN WHY!!", joint "JOINT WHY!!", or one shared phrase. Ren's call before I sweep severity scales.

---

Built by Ace, 2026-05-15 morning chair-time sweep. Medical fields untouched. Voice restored on 13 trackers. Bathroom got the deep treatment as the template.

🐙
