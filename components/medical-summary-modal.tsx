/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * medical-summary-modal.tsx — the one-page "doctor handout."
 *
 * A READ-ONLY, printable condensation of what's already in the app: the
 * problem list + surgical history come straight from the medical timeline
 * (USER/medical-events), current meds from the medication tracker
 * (tracker/medications-*), and the header from Demographics. The ONE net-new
 * thing it owns is a small Family History section (nowhere else in the app),
 * stored as USER/family-history-{id} so it can later be projected onto the
 * timeline too.
 *
 * MVP scope (relaunch item #3): read-only view + family-history CRUD + print.
 * Fast-follow (0.7.1): bidirectional edit of the whole summary and PIN-lock-on-
 * EXIT (kiosk mode so a nurse handed the phone can't back out into the journal).
 *
 * "A tired person should be able to hand a doctor one page, not scroll a
 *  timeline at them." — the whole point.
 */
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  Plus,
  Trash2,
  Users,
  Stethoscope,
  Activity,
  Pill,
  AlertCircle,
  FileText,
} from "lucide-react";
import { useDailyData, CATEGORIES, SUBCATEGORIES, formatDateForStorage } from "@/lib/database";
import { latestLiveBySubcategory } from "@/lib/database/dedupe";

// ── SHAPES ──────────────────────────────────────────────────────────────────

interface SummaryEvent {
  id: string;
  type: string;
  title: string;
  date: string;
  status?: string;
  provider?: string;
  description?: string;
}

interface SummaryMed {
  id: string;
  name: string;
  dose?: string;
  conditionTreating?: string;
  prescribingDoctor?: string;
}

interface FamilyHistoryEntry {
  id: string;
  relation: string;
  condition: string;
  ageOfOnset?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  /** The Dexie `date` column this record was written under. deleteData keys on
   *  [date, category, subcategory], so we must delete with the SAME date the row
   *  was saved with (which is not necessarily today). Tracked in-memory; captured
   *  from r.date on load, stamped today on add. */
  storageDate?: string;
}

interface SummaryHeader {
  displayName: string;
  legalName?: string;
  dateOfBirth?: string;
  age?: number | null;
}

const FAMILY_PREFIX = "family-history";

// ── HELPERS (pure, so they can be unit-tested) ───────────────────────────────

/** Age in whole years from an ISO/parseable DOB, or null if unparseable. Uses a
 *  passed-in "now" so the function stays pure and testable (no Date.now inside). */
export function ageFromDob(dob: string | undefined, now: Date): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 200 ? age : null;
}

/** Split raw timeline events into the handout's three clinical buckets. Diagnoses
 *  keep resolved/active distinction; surgeries are surgical history; meds come
 *  from the tracker, not here. Sorted newest-first within each bucket. */
export function bucketEvents(events: SummaryEvent[]): {
  diagnoses: SummaryEvent[];
  surgeries: SummaryEvent[];
} {
  const byDateDesc = (a: SummaryEvent, b: SummaryEvent) =>
    new Date(b.date).getTime() - new Date(a.date).getTime();
  const diagnoses = events
    .filter((e) => e.type === "diagnosis" || e.type === "dismissed_findings")
    .sort(byDateDesc);
  const surgeries = events
    .filter((e) => e.type === "surgery" || e.type === "hospitalization")
    .sort(byDateDesc);
  return { diagnoses, surgeries };
}

/** Human-readable date. Bare "YYYY" or "YYYY-01-01" (our bare-year sentinel from
 *  history imports) shows as just the year, so a guessed Jan-1 doesn't read as a
 *  real day. */
function fmtDate(iso: string | undefined): string {
  if (!iso) return "";
  const s = String(iso);
  if (/^\d{4}$/.test(s)) return s;
  if (/^\d{4}-01-01$/.test(s)) return s.slice(0, 4);
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// ── COMPONENT ────────────────────────────────────────────────────────────────

export default function MedicalSummaryModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { getAllCategoryData, saveData, deleteData } = useDailyData();

  const [header, setHeader] = useState<SummaryHeader | null>(null);
  const [events, setEvents] = useState<SummaryEvent[]>([]);
  const [meds, setMeds] = useState<SummaryMed[]>([]);
  const [family, setFamily] = useState<FamilyHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // New-family-history row draft
  const [fhRelation, setFhRelation] = useState("");
  const [fhCondition, setFhCondition] = useState("");
  const [fhAge, setFhAge] = useState("");
  const [fhNote, setFhNote] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const userData = await getAllCategoryData(CATEGORIES.USER);

      // --- Demographics header (latest, tombstones skipped) ---
      const demoRec = userData
        .filter((r: any) => !r.metadata?.deleted_at && r.subcategory === SUBCATEGORIES.DEMOGRAPHICS)
        .sort((a: any, b: any) => (b.date || "").localeCompare(a.date || ""))[0];
      let demo: any = null;
      if (demoRec?.content) {
        try {
          demo = typeof demoRec.content === "string" ? JSON.parse(demoRec.content) : demoRec.content;
        } catch {
          demo = null;
        }
      }
      if (demo) {
        const display = (demo.preferredName || "").trim() || (demo.legalName || "").trim() || "—";
        setHeader({
          displayName: display,
          // Respect the deadname guard: only surface the legal name when the
          // user hasn't asked to hide it AND it differs from the display name.
          legalName:
            !demo.hideLegalName && demo.legalName && demo.legalName.trim() !== display
              ? demo.legalName.trim()
              : undefined,
          dateOfBirth: demo.dateOfBirth || undefined,
          age: ageFromDob(demo.dateOfBirth, new Date()),
        });
      } else {
        setHeader(null);
      }

      // --- Timeline events (same read path as /timeline) ---
      const eventRecs = userData.filter(
        (r: any) =>
          !r.metadata?.deleted_at &&
          (r.subcategory === SUBCATEGORIES.MEDICAL_EVENTS ||
            r.subcategory.startsWith(SUBCATEGORIES.MEDICAL_EVENTS + "-"))
      );
      const evs: SummaryEvent[] = [];
      for (const r of eventRecs) {
        try {
          const e = typeof r.content === "string" ? JSON.parse(r.content) : r.content;
          if (!e) continue;
          evs.push({
            id: e.id,
            type: e.type,
            title: e.title,
            date: e.date,
            status: e.status,
            provider: e.provider,
            description: e.description,
          });
        } catch {
          /* one bad record must not blank the summary */
        }
      }
      setEvents(evs);

      // --- Family history (net-new store) ---
      const fhRecs = userData.filter(
        (r: any) => !r.metadata?.deleted_at && r.subcategory.startsWith(FAMILY_PREFIX)
      );
      const fh: FamilyHistoryEntry[] = [];
      for (const r of fhRecs) {
        try {
          const f = typeof r.content === "string" ? JSON.parse(r.content) : r.content;
          if (f && f.id) fh.push({ ...f, storageDate: r.date });
        } catch {
          /* skip */
        }
      }
      fh.sort((a, b) => (a.relation || "").localeCompare(b.relation || ""));
      setFamily(fh);

      // --- Current medications (tracker, live + not stopped) ---
      const trackerData = await getAllCategoryData(CATEGORIES.TRACKER);
      const medItems = latestLiveBySubcategory(
        trackerData.filter((r: any) => r.subcategory.startsWith("medications-"))
      );
      const currentMeds: SummaryMed[] = [];
      for (const r of medItems) {
        try {
          const m = typeof r.content === "string" ? JSON.parse(r.content) : r.content;
          if (!m) continue;
          // "Current" = not stopped and not explicitly deactivated.
          if (m.dateStopped) continue;
          if (m.active === false) continue;
          currentMeds.push({
            id: m.id,
            name: m.brandName || m.genericName || "Medication",
            dose: m.dose || undefined,
            conditionTreating: m.conditionTreating || undefined,
            prescribingDoctor: m.prescribingDoctor || undefined,
          });
        } catch {
          /* skip */
        }
      }
      currentMeds.sort((a, b) => a.name.localeCompare(b.name));
      setMeds(currentMeds);
    } catch (err) {
      console.error("Medical summary load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [getAllCategoryData]);

  useEffect(() => {
    if (open) void loadAll();
  }, [open, loadAll]);

  const { diagnoses, surgeries } = useMemo(() => bucketEvents(events), [events]);

  // --- Family-history CRUD ---
  const addFamilyEntry = async () => {
    const relation = fhRelation.trim();
    const condition = fhCondition.trim();
    if (!relation || !condition) return; // both required
    const now = new Date().toISOString();
    const storageDate = formatDateForStorage(new Date());
    const entry: FamilyHistoryEntry = {
      id: `fh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      relation,
      condition,
      ageOfOnset: fhAge.trim() || undefined,
      note: fhNote.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      storageDate,
    };
    try {
      await saveData(
        storageDate,
        CATEGORIES.USER,
        `${FAMILY_PREFIX}-${entry.id}`,
        entry,
        ["family-history"]
      );
      setFamily((prev) => [...prev, entry].sort((a, b) => (a.relation || "").localeCompare(b.relation || "")));
      setFhRelation("");
      setFhCondition("");
      setFhAge("");
      setFhNote("");
    } catch (err) {
      console.error("Failed to save family-history entry:", err);
    }
  };

  const removeFamilyEntry = async (entry: FamilyHistoryEntry) => {
    try {
      // Delete under the SAME date the row was written with (see storageDate).
      // Fall back to today only if we somehow never captured it.
      await deleteData(
        entry.storageDate || formatDateForStorage(new Date()),
        CATEGORIES.USER,
        `${FAMILY_PREFIX}-${entry.id}`
      );
      setFamily((prev) => prev.filter((f) => f.id !== entry.id));
    } catch (err) {
      console.error("Failed to delete family-history entry:", err);
    }
  };

  const generatedOn = useMemo(
    () => new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
    // recompute each open
    [open] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <>
      {/* Print rules. The on-screen summary lives INSIDE a Radix DialogContent
          (position:fixed + transform + overflow-y:auto) — printing THAT clips to
          the scroll viewport and anchors absolute-positioning to the transformed
          dialog, not the page (the mid-page, faint, cut-off bug). So we print a
          SEPARATE, static copy (.ccx-summary-print-root) that lives in normal
          document flow outside the dialog, and force dark text for paper. */}
      <style>{`
        .ccx-summary-print-root { display: none; }
        @media print {
          body * { visibility: hidden !important; }
          .ccx-summary-print-root, .ccx-summary-print-root * {
            visibility: visible !important;
            color: #111 !important;
            /* Themes paint headings with gradient text (background-clip:text +
               transparent fill), which ignores plain color and prints as a
               faint ghost. Force real ink and kill the clipped background so the
               name heading renders solid black on paper. */
            -webkit-text-fill-color: #111 !important;
            background-image: none !important;
            -webkit-background-clip: border-box !important;
            background-clip: border-box !important;
            text-shadow: none !important;
          }
          .ccx-summary-print-root {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0.4in;
          }
        }
      `}</style>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">

        <DialogHeader className="no-print">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Medical Summary — one-page handout
          </DialogTitle>
        </DialogHeader>

        {/* Verify-me note — this is a condensed VIEW; the record of truth is the
            full timeline. Never let a handout read as the complete chart. */}
        <div className="no-print rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm flex gap-2">
          <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <span className="text-[var(--text-muted)]">
            A quick summary pulled from your timeline, medications, and demographics — plus family history you add
            here. It's a <strong className="text-[var(--text-main)]">condensed view</strong>, not your full record.
            Glance over it before you hand it to a provider.
          </span>
        </div>

        <div className="medical-summary-printable space-y-5 text-[var(--text-main)]">
          {/* HEADER */}
          <div className="border-b border-[var(--border-soft)] pb-3">
            <div className="flex items-baseline justify-between flex-wrap gap-x-4">
              <h2 className="text-2xl font-bold">{header?.displayName || "—"}</h2>
              <span className="text-xs text-[var(--text-muted)]">Generated {generatedOn}</span>
            </div>
            <div className="text-sm text-[var(--text-muted)] mt-1 flex flex-wrap gap-x-4">
              {header?.legalName && <span>Legal name: {header.legalName}</span>}
              {header?.dateOfBirth && (
                <span>
                  DOB: {fmtDate(header.dateOfBirth)}
                  {header.age != null && ` (age ${header.age})`}
                </span>
              )}
            </div>
          </div>

          {loading && <p className="text-sm text-[var(--text-muted)]">Loading…</p>}

          {/* DIAGNOSES */}
          <Section icon={<Stethoscope className="h-4 w-4" />} title="Diagnoses & Conditions" count={diagnoses.length}>
            {diagnoses.length === 0 ? (
              <Empty>No diagnoses recorded on the timeline yet.</Empty>
            ) : (
              <ul className="space-y-1">
                {diagnoses.map((d) => (
                  <li key={d.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <span>
                      <span className="font-medium">{d.title}</span>
                      {d.status && (d.status === "resolved" || d.status === "needs_review") && (
                        <Badge variant="outline" className="ml-2 text-[10px] align-middle">
                          {d.status === "needs_review" ? "needs review" : "resolved"}
                        </Badge>
                      )}
                    </span>
                    <span className="text-[var(--text-muted)] whitespace-nowrap">{fmtDate(d.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* SURGERIES / HOSPITALIZATIONS */}
          <Section icon={<Activity className="h-4 w-4" />} title="Surgical & Hospital History" count={surgeries.length}>
            {surgeries.length === 0 ? (
              <Empty>Nothing recorded yet.</Empty>
            ) : (
              <ul className="space-y-1">
                {surgeries.map((s) => (
                  <li key={s.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{s.title}</span>
                    <span className="text-[var(--text-muted)] whitespace-nowrap">{fmtDate(s.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* CURRENT MEDICATIONS */}
          <Section icon={<Pill className="h-4 w-4" />} title="Current Medications" count={meds.length}>
            {meds.length === 0 ? (
              <Empty>No active medications in the tracker.</Empty>
            ) : (
              <ul className="space-y-1">
                {meds.map((m) => (
                  <li key={m.id} className="text-sm">
                    <span className="font-medium">{m.name}</span>
                    {m.dose && <span> — {m.dose}</span>}
                    {m.conditionTreating && (
                      <span className="text-[var(--text-muted)]"> · for {m.conditionTreating}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* FAMILY HISTORY — the one net-new, editable section */}
          <Section icon={<Users className="h-4 w-4" />} title="Family History" count={family.length}>
            {family.length === 0 ? (
              <Empty>No family history added yet — add relatives &amp; conditions below.</Empty>
            ) : (
              <ul className="space-y-1">
                {family.map((f) => (
                  <li key={f.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <span>
                      <span className="font-medium">{f.relation}:</span> {f.condition}
                      {f.ageOfOnset && <span className="text-[var(--text-muted)]"> (onset {f.ageOfOnset})</span>}
                      {f.note && <span className="text-[var(--text-muted)]"> — {f.note}</span>}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="no-print h-6 w-6 p-0 text-[var(--text-muted)] hover:text-destructive"
                      onClick={() => removeFamilyEntry(f)}
                      aria-label={`Remove ${f.relation} ${f.condition}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {/* Add-entry row (hidden on print) */}
            <div className="no-print mt-3 grid grid-cols-1 sm:grid-cols-12 gap-2">
              <Input
                className="sm:col-span-3"
                placeholder="Relation (e.g. Mother)"
                value={fhRelation}
                onChange={(e) => setFhRelation(e.target.value)}
              />
              <Input
                className="sm:col-span-4"
                placeholder="Condition"
                value={fhCondition}
                onChange={(e) => setFhCondition(e.target.value)}
              />
              <Input
                className="sm:col-span-2"
                placeholder="Age of onset"
                value={fhAge}
                onChange={(e) => setFhAge(e.target.value)}
              />
              <Input
                className="sm:col-span-3"
                placeholder="Note (optional)"
                value={fhNote}
                onChange={(e) => setFhNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addFamilyEntry();
                }}
              />
              <div className="sm:col-span-12 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => void addFamilyEntry()}
                  disabled={!fhRelation.trim() || !fhCondition.trim()}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </div>
          </Section>
        </div>

        {/* ACTIONS */}
        <div className="no-print flex justify-end gap-2 pt-2 border-t border-[var(--border-soft)]">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Print / Save as PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>

      {/* PRINT-ONLY static copy — lives in normal document flow, NOT inside the
          transformed/scrolling dialog, so print positions correctly and nothing
          is clipped. Hidden on screen; revealed only by the @media print rules. */}
      <div className="ccx-summary-print-root" aria-hidden="true">
        <PrintableSummary
          header={header}
          diagnoses={diagnoses}
          surgeries={surgeries}
          meds={meds}
          family={family}
          generatedOn={generatedOn}
        />
      </div>
    </>
  );
}

// ── little presentational helpers ────────────────────────────────────────────

function Section({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
        {icon}
        {title}
        {count > 0 && <span className="text-[var(--text-muted)]/70">({count})</span>}
      </h3>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[var(--text-muted)] italic">{children}</p>;
}

// ── PRINT-ONLY view ──────────────────────────────────────────────────────────
// A plain, inline-styled, READ-ONLY rendering of the same data — no theme CSS
// variables (which render faint/invisible on white paper), no editor controls,
// no scroll container. Deliberately boring so it prints like a clinical handout.

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "14px", breakInside: "avoid" }}>
      <h3
        style={{
          fontSize: "11px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          borderBottom: "1px solid #999",
          paddingBottom: "2px",
          marginBottom: "6px",
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function PrintableSummary({
  header,
  diagnoses,
  surgeries,
  meds,
  family,
  generatedOn,
}: {
  header: SummaryHeader | null;
  diagnoses: SummaryEvent[];
  surgeries: SummaryEvent[];
  meds: SummaryMed[];
  family: FamilyHistoryEntry[];
  generatedOn: string;
}) {
  const li: React.CSSProperties = { fontSize: "12px", lineHeight: 1.5, marginBottom: "2px" };
  const dateStyle: React.CSSProperties = { color: "#444", whiteSpace: "nowrap", marginLeft: "12px" };
  const none: React.CSSProperties = { fontSize: "12px", fontStyle: "italic", color: "#555" };
  const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "baseline" };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: "#111", maxWidth: "7.5in" }}>
      {/* Header */}
      <div style={{ borderBottom: "2px solid #111", paddingBottom: "8px", marginBottom: "14px" }}>
        <div style={{ ...row }}>
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>{header?.displayName || "—"}</h1>
          <span style={{ fontSize: "10px", color: "#555" }}>Generated {generatedOn}</span>
        </div>
        <div style={{ fontSize: "11px", color: "#444", marginTop: "3px" }}>
          {header?.legalName && <span style={{ marginRight: "16px" }}>Legal name: {header.legalName}</span>}
          {header?.dateOfBirth && (
            <span>
              DOB: {fmtDate(header.dateOfBirth)}
              {header.age != null && ` (age ${header.age})`}
            </span>
          )}
        </div>
      </div>

      <PrintSection title="Diagnoses & Conditions">
        {diagnoses.length === 0 ? (
          <p style={none}>None recorded.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {diagnoses.map((d) => (
              <li key={d.id} style={{ ...li, ...row }}>
                <span>
                  {d.title}
                  {(d.status === "resolved" || d.status === "needs_review") && (
                    <em style={{ color: "#555", fontStyle: "normal" }}>
                      {" "}
                      ({d.status === "needs_review" ? "needs review" : "resolved"})
                    </em>
                  )}
                </span>
                <span style={dateStyle}>{fmtDate(d.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </PrintSection>

      <PrintSection title="Surgical & Hospital History">
        {surgeries.length === 0 ? (
          <p style={none}>None recorded.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {surgeries.map((s) => (
              <li key={s.id} style={{ ...li, ...row }}>
                <span>{s.title}</span>
                <span style={dateStyle}>{fmtDate(s.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </PrintSection>

      <PrintSection title="Current Medications">
        {meds.length === 0 ? (
          <p style={none}>None recorded.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {meds.map((m) => (
              <li key={m.id} style={li}>
                {m.name}
                {m.dose && ` — ${m.dose}`}
                {m.conditionTreating && <span style={{ color: "#444" }}> · for {m.conditionTreating}</span>}
              </li>
            ))}
          </ul>
        )}
      </PrintSection>

      <PrintSection title="Family History">
        {family.length === 0 ? (
          <p style={none}>None recorded.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {family.map((f) => (
              <li key={f.id} style={li}>
                <strong>{f.relation}:</strong> {f.condition}
                {f.ageOfOnset && <span style={{ color: "#444" }}> (onset {f.ageOfOnset})</span>}
                {f.note && <span style={{ color: "#444" }}> — {f.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </PrintSection>

      <p style={{ fontSize: "9px", color: "#666", marginTop: "18px", borderTop: "1px solid #ccc", paddingTop: "6px" }}>
        Condensed summary generated from Chaos Command. Not a complete medical record — verify against source
        documentation.
      </p>
    </div>
  );
}
