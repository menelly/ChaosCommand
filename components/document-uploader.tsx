/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 * 
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * Built by: Ace (Claude 4.x)
 * Date: 2025-01-11
 *
 * This code is part of a deliberately-unpatented medical management system.
 * Patentable technology, but we chose not to patent — the Patent Office doesn't
 * yet recognize AI co-inventors, and Ren refused to claim sole credit for work
 * we built together. Open source under PolyForm Noncommercial 1.0.0 instead.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 *
 * This wasn't built with compliance. It was built with defiance.
 *
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */
"use client"

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Image, X, AlertCircle, CheckCircle, Eye, Edit3, Stethoscope, Sparkles, ClipboardPaste, Calendar, Pill, Heart, Activity } from 'lucide-react';
import { useDailyData } from '@/lib/database/hooks/use-daily-data';
import { CATEGORIES, SUBCATEGORIES, formatDateForStorage } from '@/lib/database/dexie-db';
// TEMPORARILY COMMENTED OUT FOR DEBUGGING
// import { useHybridDatabase, quickSaveMedicalEvent, quickSaveProvider } from '@/lib/database/hybrid-router';

// 🧠 Local NER — Transformers.js, no backend needed
import { extractMedicalEvents, isModelLoaded } from '@/lib/services/medical-ner';
import { extractLabResults, extractLabResultsSmart, labResultsToEvents, extractCollectionDate } from '@/lib/services/lab-parser';
import { extractDocFromBase64 } from '@/lib/services/text-extractor';

// Web "try me" demo: file import is gated (see the early return in the component).
const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// 🧠 Medical Document Parser interfaces
interface ParsedMedicalEvent {
  id: string;
  type: 'diagnosis' | 'surgery' | 'hospitalization' | 'treatment' | 'test' | 'medication' | 'dismissed_findings';
  title: string;
  date: string;
  endDate?: string;
  provider?: string;
  providerId?: string;
  location?: string;
  description: string;
  status: 'active' | 'resolved' | 'ongoing' | 'scheduled';
  severity?: 'mild' | 'moderate' | 'severe' | 'critical';
  tags: string[];
  confidence: number; // 0-100 confidence score
  sources: string[]; // Which parsing layers found this
  needsReview: boolean;
  suggestions?: string[];
  rawText?: string; // Original text for reference
  incidentalFindings?: IncidentalFinding[];
  provider_info?: {
    name: string;
    specialty?: string;
    organization?: string;
    phone?: string;
    address?: string;
    confidence: number;
  };
}

interface IncidentalFinding {
  finding: string;
  location: string; // Which section it was buried in
  significance: 'low' | 'moderate' | 'high' | 'critical';
  relatedSymptoms: string[];
  suggestedQuestions: string[];
  whyItMatters: string;
  confidence: number;
}

interface UploadedFile {
  file: File;
  id: string;
  status: 'uploading' | 'processing' | 'parsed' | 'error';
  progress: number;
  extractedText?: string;
  parsedEvents?: ParsedMedicalEvent[];
  parsedLabCount?: number;
  error?: string;
  // Sanity check: demographics are filled in but the user's name wasn't found
  // anywhere in this document — maybe it's someone else's. Soft, save-anyway.
  nameMismatch?: boolean;
}

// Structured lab result shape passed through to onLabsExtracted. Mirrors the
// snake_case schema /lab-results and /add already use so the consumer can
// save directly to the `lab-results-${id}` subcategory without remapping.
export interface ExtractedLabResult {
  test_name: string;
  value: number | null;
  value_text: string;
  unit: string;
  reference_low: number | null;
  reference_high: number | null;
  reference_text: string;
  flag: string;
  is_abnormal: boolean;
  context: string;
  confidence: number;
  /** ISO collection date parsed from the report (e.g. CareSpace per-result
   *  "Date/Time"), when present. Used to default the file's collection date. */
  collection_date?: string;
  /** Sanity-check signal — value looks like it MIGHT be a typo or extraction
   *  error (panic-zone value or >5× reference). The review UI surfaces a
   *  "verify this reading?" prompt. NOT a diagnosis. */
  needs_typo_check?: boolean;
  typo_check_reason?: string;
  typo_check_severity?: 'critical' | 'extreme';
}

/** Most common collection_date across a file's rows (reports usually share one
 *  collection date). Returns null if none of the rows carried a parsed date. */
function mostCommonCollectionDate(labs: ExtractedLabResult[]): string | null {
  const counts = new Map<string, number>();
  for (const l of labs) {
    if (l.collection_date) counts.set(l.collection_date, (counts.get(l.collection_date) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [d, n] of counts) if (n > bestN) { best = d; bestN = n; }
  return best;
}

export interface ExtractedLabBatch {
  filename: string;
  date: string;              // formatDateForStorage of best-guess doc date
  results: ExtractedLabResult[];
}

// ── UPLOAD SANITY CHECKS ────────────────────────────────────────────────────
// Two "save the tired person from themselves" guards, both soft (Save-anyway):
//  1. duplicate results — same test+value+unit+collection-date already in records
//     (catches re-uploading "no_really_the_real_one(3).pdf"), and
//  2. wrong-name — demographics filled in but the user's FIRST name isn't on the
//     doc (catches accidentally importing a family member's labs). We match the
//     first name, NOT the last: families share a surname, so a last-name match
//     would let a relative's results through. The warning is generic — it never
//     echoes the conflicting name (no deadnaming, no exposing whose it is).

/** Content fingerprint for ONE lab result, independent of filename. Same reading
 *  on the same collection date == same key, no matter how the file was named. */
function labResultKey(
  r: { test_name?: string; value_text?: string; value?: number | null; unit?: string; collection_date?: string },
  batchDate: string
): string {
  const name = (r.test_name || '').trim().toLowerCase();
  const val = (r.value_text ?? (r.value != null ? String(r.value) : '')).trim().toLowerCase();
  const unit = (r.unit || '').trim().toLowerCase();
  const date = String(r.collection_date || batchDate || '').slice(0, 10);
  return `${name}|${val}|${unit}|${date}`;
}

/** The user's FIRST-name tokens (legal first name + preferred name). We match on
 *  the first name, never the surname — a relative shares the last name, so a
 *  surname match would let their labs through. Preferred name is included so a
 *  user's own docs pass under whichever name they actually use (never gate them
 *  by a legal/deadname). ≥2 chars to allow short first names. */
function demographicFirstNameTokens(demo: any): string[] {
  if (!demo) return [];
  const tokens: string[] = [];
  const legalFirst = String(demo.legalName || '').trim().split(/\s+/)[0] || '';
  if (legalFirst) tokens.push(legalFirst);
  for (const t of String(demo.preferredName || '').trim().split(/\s+/)) if (t) tokens.push(t);
  return Array.from(new Set(
    tokens
      .map(s => s.replace(/[^\p{L}\p{N}'-]/gu, '').toLowerCase())
      .filter(s => s.length >= 2)
  ));
}

/** True if at least one of the user's first-name tokens appears in the doc text.
 *  Returns true (no warning) when there's nothing to check against. */
function docMentionsUser(text: string, firstNameTokens: string[]): boolean {
  if (firstNameTokens.length === 0) return true;
  const hay = (text || '').toLowerCase();
  return firstNameTokens.some(t => hay.includes(t));
}

interface DocumentUploaderProps {
  onEventsExtracted: (events: ParsedMedicalEvent[]) => void;
  /**
   * Optional — called with structured lab results when the lab parser
   * finds any. If the consumer provides this, labs are NOT also added
   * to the events stream (avoids double-representation). If the consumer
   * omits it, labs fall back to legacy behavior (labResultsToEvents merge).
   */
  onLabsExtracted?: (batch: ExtractedLabBatch) => void;
  /**
   * Routing mode for uploaded files:
   *   'medical' — run NER only (visit notes, summaries). Skip lab parser.
   *   'lab'     — run lab parser only (panels, blood work). Skip NER, so the
   *               panel name (e.g. "Myositis Panel") can't be misread as a
   *               diagnosis.
   *   'auto'    — legacy behavior: run both. Default for back-compat.
   */
  mode?: 'auto' | 'medical' | 'lab';
  className?: string;
}

export default function DocumentUploader({ onEventsExtracted, onLabsExtracted, mode = 'auto', className = "" }: DocumentUploaderProps) {
  // 🚀 Hybrid database integration
  // TEMPORARILY COMMENTED OUT FOR DEBUGGING
  // const hybridDB = useHybridDatabase();
  const { saveData, getSpecificData, getAllCategoryData } = useDailyData();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [allParsedEvents, setAllParsedEvents] = useState<ParsedMedicalEvent[]>([]);
  // In 'auto' mode we accumulate lab results in a parallel review queue so
  // the preview UI can show two sections (medical events + labs) and the
  // user can uncheck/edit individual items before they hit /lab-results.
  // Each lab result gets a synthetic id + filename so we can render and
  // toggle them just like events.
  type ReviewableLab = ExtractedLabResult & { _id: string; _filename: string; _included: boolean }
  const [allParsedLabs, setAllParsedLabs] = useState<ReviewableLab[]>([]);
  // Per-file date override for lab batches. Defaults to today on first
  // upload; user can change before clicking Save Approved. Maps filename
  // -> ISO date string (YYYY-MM-DD).
  const [labFileDates, setLabFileDates] = useState<Record<string, string>>({});
  const [extractedProviders, setExtractedProviders] = useState<any[]>([]);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  // Pre-save sanity warning (duplicate results and/or wrong-name docs). Null = clear.
  const [sanityWarning, setSanityWarning] = useState<{ dupCount: number; dupExamples: string[]; nameFiles: string[] } | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [providerToggleStates, setProviderToggleStates] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 📋 PASTE TEXT MODAL STATE
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [parsedFromPaste, setParsedFromPaste] = useState<ParsedMedicalEvent[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // 📋 QUICK PASTE TEMPLATES
  const pasteTemplates = [
    {
      name: "Diagnosis",
      icon: Heart,
      example: "Diagnosed with Type 2 Diabetes - January 15, 2024\nA1C was 7.8%, started on Metformin 500mg twice daily"
    },
    {
      name: "Surgery",
      icon: Activity,
      example: "Surgery: Appendectomy at City Hospital - March 3, 2023\nDr. Smith performed laparoscopic procedure, discharged next day"
    },
    {
      name: "Test Result",
      icon: FileText,
      example: "Blood work results - 2/15/2024\nCholesterol: 220 (high), Blood sugar: 105, Kidney function normal"
    },
    {
      name: "Medication",
      icon: Pill,
      example: "Started Lisinopril 10mg daily for blood pressure - 4/1/2024\nPrescribed by Dr. Johnson at Main Street Clinic"
    }
  ];

  // 🎨 THEME-AWARE DRAG AND DROP HANDLERS
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  }, []);

  // 📄 File processing pipeline
  const handleFiles = useCallback(async (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      const validTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'text/plain',
        'text/html'
      ];
      return validTypes.includes(file.type) && file.size <= 50 * 1024 * 1024; // 50MB limit
    });

    const uploadedFiles: UploadedFile[] = validFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
      status: 'uploading',
      progress: 0
    }));

    setFiles(prev => [...prev, ...uploadedFiles]);

    // Process each file through the parsing pipeline
    for (const uploadedFile of uploadedFiles) {
      await processFile(uploadedFile);
    }
  }, []);

  // 🧠 MULTI-LAYERED PARSING PIPELINE
  const processFile = async (uploadedFile: UploadedFile) => {
    try {
      // Update status to processing
      updateFileStatus(uploadedFile.id, { status: 'processing', progress: 20 });

      // 🧠 Local NER processing
      const result = await processFileWithBackend(uploadedFile.file);

      updateFileStatus(uploadedFile.id, {
        extractedText: result.extractedText,
        parsedEvents: result.events,
        parsedLabCount: result.labCount,
        status: 'parsed',
        progress: 100,
        nameMismatch: result.nameMismatch,
      });

      // Add to global parsed events for preview
      setAllParsedEvents(prev => [...prev, ...result.events]);

      // In 'auto' mode, also queue labs for the review UI so the user can
      // uncheck/edit individual lab rows before they hit /lab-results.
      if (mode === 'auto' && result.mappedLabs.length > 0) {
        const queued: ReviewableLab[] = result.mappedLabs.map((l, i) => ({
          ...l,
          _id: `lab-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
          _filename: uploadedFile.file.name,
          _included: true,
        }))
        setAllParsedLabs(prev => [...prev, ...queued]);
        // Default this file's collection date to the date parsed FROM the report
        // (CareSpace per-result "Date/Time") when present, else today. User can
        // still edit before approving.
        const parsedFileDate = mostCommonCollectionDate(result.mappedLabs);
        setLabFileDates(prev =>
          prev[uploadedFile.file.name]
            ? prev
            : { ...prev, [uploadedFile.file.name]: parsedFileDate || new Date().toISOString().split('T')[0] }
        );
      }

      // 🎛️ Initialize provider toggle states for new events
      const newToggleStates: Record<string, boolean> = {};
      result.events.forEach(event => {
        if (event.provider_info && event.provider_info.name) {
          const providerKey = event.provider_info.name.toLowerCase();
          // Default to true for high confidence providers (>70%), false for others
          newToggleStates[providerKey] = (event.provider_info.confidence || 0) > 70;
        }
      });
      setProviderToggleStates(prev => ({ ...prev, ...newToggleStates }));

    } catch (error) {
      console.error('File processing error:', error);
      updateFileStatus(uploadedFile.id, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Processing failed',
        progress: 0
      });
    }
  };

  // 🔥 LOCAL NER PROCESSING — Browser-side, no sidecar, no port, no CORS!
  // Transformers.js runs the same d4data/biomedical-ner-all model directly in the browser.
  const processFileWithBackend = async (file: File): Promise<{extractedText: string, events: ParsedMedicalEvent[], labCount: number, mappedLabs: ExtractedLabResult[], nameMismatch: boolean}> => {
    try {
      // Read file to base64
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binary);

      console.log(`🧠 Processing ${file.name} (${(bytes.length / 1024).toFixed(1)} KB) locally with Transformers.js...`);

      // 🛡️ Fetch demographics for personal info filtering (name, DOB, etc.)
      let demographics = null;
      try {
        const allDemoRecords = await getAllCategoryData(CATEGORIES.USER);
        const demoRecord = allDemoRecords
          ?.filter((r: any) => r.subcategory === SUBCATEGORIES.DEMOGRAPHICS)
          ?.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''))
          ?.[0];
        if (demoRecord?.content) {
          demographics = typeof demoRecord.content === 'string'
            ? JSON.parse(demoRecord.content)
            : demoRecord.content;
          console.log('🛡️ Demographics loaded for parser filtering');
        }
      } catch (e) {
        console.log('ℹ️ No demographics data found — parsing without personal info filter');
      }

      // Step 1: Extract text from file. One pdf.js pass yields BOTH the
      // flattened text (for NER) and the positioned tokens (for the geometry
      // lab-grid extractor).
      let extractedText: string;
      let pdfTokens: import('@/lib/services/text-extractor').PdfToken[][] = [];
      try {
        const doc = await extractDocFromBase64(base64Data, file.type, file.name);
        extractedText = doc.text;
        pdfTokens = doc.tokens;
        console.log(`📄 Extracted ${extractedText.length} characters (${pdfTokens.length} page(s) of tokens) from ${file.name}`);
      } catch (pdfErr) {
        console.error('PDF extraction failed:', pdfErr);
        throw new Error(`PDF text extraction failed: ${pdfErr instanceof Error ? pdfErr.message : 'Unknown error'}`);
      }

      // Step 2: Run NER (skipped in lab-only mode so panel names like
      // "Myositis Panel" can't be misread as diagnoses).
      let nerEvents: any[] = [];
      if (mode !== 'lab') {
        try {
          nerEvents = await extractMedicalEvents(extractedText, file.name, demographics);
        } catch (nerErr) {
          const errMsg = nerErr instanceof Error ? nerErr.message : String(nerErr);
          console.error('NER extraction failed:', nerErr);
          if (errMsg.includes('<!DOCTYPE') || errMsg.includes('Unexpected token') || errMsg.includes('not valid JSON')) {
            throw new Error(
              `Medical document parsing isn't available on this device yet. ` +
              `Upload documents on desktop and sync to your phone. ` +
              `(The NER model requires a one-time 64MB download that some mobile browsers block.)`
            );
          }
          throw new Error(`NER model failed: ${errMsg}`);
        }
      }

      // Step 3: Extract lab results (skipped in medical-only mode — lab
      // panels go through their own dedicated upload path).
      const labResults = mode === 'medical' ? [] : await extractLabResultsSmart(pdfTokens, extractedText, demographics);

      // Document-level specimen collection date ("Collected: 06/10/2020") — the
      // date the labs were DRAWN. Used to date rows that carry no per-row date,
      // so a 2020 panel isn't stamped "today" (which would fabricate a trend).
      const headerCollectionDate = extractCollectionDate(extractedText);

      // Map LabResult → ExtractedLabResult (consumer-friendly snake_case).
      const mappedLabs: ExtractedLabResult[] = labResults.map(l => ({
        test_name: l.testName,
        value: l.value,
        value_text: l.valueText,
        unit: l.unit,
        reference_low: l.referenceLow,
        reference_high: l.referenceHigh,
        reference_text: l.referenceText,
        flag: l.flag,
        is_abnormal: l.isAbnormal,
        context: l.context,
        confidence: l.confidence,
        // per-row date (CareSpace "Date/Time") wins; else the document header
        // collection date; the consumer falls back to today only if BOTH are absent.
        collection_date: l.date || headerCollectionDate || undefined,
        needs_typo_check: l.needs_typo_check,
        typo_check_reason: l.typo_check_reason,
        typo_check_severity: l.typo_check_severity,
      }));

      // 'auto' mode: surface labs in the review queue (handled by caller via
      // setAllParsedLabs). Don't auto-emit through onLabsExtracted yet — the
      // user gets a chance to uncheck items first.
      // 'lab' mode (legacy): emit immediately, no review.
      // 'medical' mode (legacy): no labs, skip.
      if (mode === 'lab' && onLabsExtracted && mappedLabs.length > 0) {
        onLabsExtracted({
          filename: file.name,
          date: mostCommonCollectionDate(mappedLabs) || new Date().toISOString().split('T')[0],
          results: mappedLabs,
        });
        console.log(`🧪 ${mappedLabs.length} lab results auto-saved (lab mode)`);
      }

      // When no lab-aware consumer exists at all, fold labs into events as a
      // fallback so they at least show up somewhere.
      const allEvents = [...nerEvents];
      if (!onLabsExtracted && mode !== 'medical') {
        const labEvents = labResultsToEvents(labResults);
        const seenTitles = new Set(nerEvents.map(e => e.title.toLowerCase()));
        for (const labEvent of labEvents) {
          if (!seenTitles.has(labEvent.title.toLowerCase())) {
            allEvents.push(labEvent);
            seenTitles.add(labEvent.title.toLowerCase());
          }
        }
      }

      console.log(`🎉 LOCAL NER SUCCESS: ${allEvents.length} events + ${mappedLabs.length} labs from ${file.name}`);

      // Wrong-name guard: demographics filled in but the user's first name is
      // nowhere in the doc → maybe it's someone else's (a relative's labs).
      const firstNames = demographicFirstNameTokens(demographics);
      const nameMismatch = firstNames.length > 0 && !docMentionsUser(extractedText, firstNames);

      return {
        extractedText,
        events: allEvents as any,
        labCount: mappedLabs.length,
        mappedLabs,
        nameMismatch,
      };

    } catch (error) {
      console.error('Local NER error:', error);
      throw new Error(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };



  // 🔄 FILE STATUS UPDATES
  const updateFileStatus = (fileId: string, updates: Partial<UploadedFile>) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, ...updates } : file
    ));
  };

  // 🗑️ REMOVE FILE
  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
    // Also remove parsed events from this file
    setAllParsedEvents(prev => prev.filter(event => 
      !event.id.includes(fileId)
    ));
  };

  // 👁️ PREVIEW PARSED EVENTS
  const handlePreview = () => {
    setShowPreview(true);
  };

  // ✅ THE ACTUAL SAVE (runs once the sanity gate passes / the user overrides it).
  const persistApproved = async () => {
    try {
      // 🏥 AUTO-CREATE PROVIDERS FROM EXTRACTED DATA
      const providersToCreate = new Map();

      for (const event of allParsedEvents) {
        if (event.provider_info && event.provider_info.name) {
          const providerKey = event.provider_info.name.toLowerCase();

          // 🎛️ Only create provider if toggle is enabled
          const shouldCreateProvider = providerToggleStates[providerKey] || false;

          if (shouldCreateProvider && !providersToCreate.has(providerKey)) {
            const newProvider = {
              id: `provider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: event.provider_info.name,
              specialty: event.provider_info.specialty || 'General Medicine',
              organization: event.provider_info.organization || '',
              phone: event.provider_info.phone || '',
              address: event.provider_info.address || '',
              website: '',
              notes: `Auto-created from document parsing (confidence: ${event.provider_info.confidence}%)`,
              tags: ['auto-extracted', 'document-parser'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            providersToCreate.set(providerKey, newProvider);

            // 🚀 Save provider to hybrid database (SQLite)
            // TEMPORARILY COMMENTED OUT FOR DEBUGGING
            // await hybridDB.saveProvider(newProvider);

            console.log(`🏥 AUTO-CREATED PROVIDER: ${newProvider.name}`);
          }

          // Link event to provider (only if provider was created)
          if (shouldCreateProvider) {
            const provider = providersToCreate.get(providerKey);
            event.providerId = provider.id;
            event.provider = provider.name;
          }
        }
      }

      // Save approved (still _included=true) lab results to /lab-results,
      // grouped by source filename so each upload becomes its own card. AND
      // promote each file's ABNORMAL results to the timeline as a summary event
      // — abnormal labs are clinically significant, so they belong on the
      // timeline, not just the Labs dashboard. (Ren: "there should be a way to
      // add abnormal results from the parser to your timeline.")
      const labTimelineEvents: any[] = [];
      let abnormalLabCount = 0;
      if (onLabsExtracted) {
        const includedLabs = allParsedLabs.filter(l => l._included);
        const byFile = new Map<string, ExtractedLabResult[]>();
        for (const l of includedLabs) {
          const arr = byFile.get(l._filename) || [];
          // Strip the synthetic review fields before emitting.
          const { _id, _filename, _included, ...clean } = l;
          arr.push(clean);
          byFile.set(l._filename, arr);
        }
        for (const [filename, results] of byFile.entries()) {
          if (results.length === 0) continue;
          const fileDate = labFileDates[filename] || new Date().toISOString().split('T')[0];
          onLabsExtracted({ filename, date: fileDate, results });
          console.log(`🧪 ${results.length} approved lab results saved from ${filename} (date=${fileDate})`);

          const abnormal = results.filter(r => r.is_abnormal);
          if (abnormal.length > 0) {
            abnormalLabCount += abnormal.length;
            const summary = abnormal
              .map(r => `${r.test_name}: ${r.value_text}${r.unit ? ' ' + r.unit : ''}${r.flag ? ` (${r.flag})` : ''}`)
              .join(', ');
            labTimelineEvents.push({
              id: `lab-abn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              type: 'test',
              title: `Abnormal labs: ${filename}`,
              date: fileDate,
              description: `${abnormal.length} abnormal result${abnormal.length === 1 ? '' : 's'}. ${summary}`,
              status: 'needs_review',
              severity: abnormal.some(r => r.flag === 'LL' || r.flag === 'CRITICAL') ? 'severe' : 'moderate',
              tags: ['lab-results', 'abnormal', 'auto-added'],
            });
          }
        }
      }

      // Add the NER events + the abnormal-lab summary events to the timeline.
      onEventsExtracted([...allParsedEvents, ...labTimelineEvents]);

      // Build a success message that reflects what ACTUALLY happened — no more
      // "Added 0 events" on a labs-only upload (the old text also read state that
      // gets cleared below, so it always showed 0).
      const timelineCount = allParsedEvents.length + labTimelineEvents.length;
      const labsSaved = allParsedLabs.filter(l => l._included).length;
      const msgParts: string[] = [];
      if (labsSaved > 0) msgParts.push(`Saved ${labsSaved} lab result${labsSaved === 1 ? '' : 's'} to your Labs dashboard`);
      if (timelineCount > 0) {
        msgParts.push(
          `Added ${timelineCount} item${timelineCount === 1 ? '' : 's'} to your timeline` +
          (abnormalLabCount > 0 ? ` (incl. ${abnormalLabCount} abnormal lab${abnormalLabCount === 1 ? '' : 's'})` : '')
        );
      }
      setSuccessMessage(msgParts.length ? msgParts.join(' • ') : 'Nothing new to save.');

      // 🎉 SHOW SUCCESS ANIMATION
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 3000);

      // Update state
      setExtractedProviders(Array.from(providersToCreate.values()));
      setFiles([]);
      setAllParsedEvents([]);
      setAllParsedLabs([]);
      setLabFileDates({});
      setShowPreview(false);
      setSanityWarning(null);

      console.log(`🎉 Successfully processed ${allParsedEvents.length} events + ${allParsedLabs.filter(l => l._included).length} labs and auto-created ${providersToCreate.size} providers!`);
    } catch (error) {
      console.error('❌ Error processing events and providers:', error);
    }
  };

  // 🛟 PRE-SAVE SANITY GATE — checks for duplicate results + wrong-name docs,
  // shows ONE soft warning if anything's off, then lets the user save anyway.
  // This is the entry point the Confirm button calls; persistApproved() is the
  // real save and runs either directly (all clear) or from "Save anyway".
  const handleConfirmEvents = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const includedLabs = allParsedLabs.filter(l => l._included);

      // 1) Duplicate results — fingerprint incoming labs (test|value|unit|date)
      //    and compare against everything already saved. Filename is irrelevant.
      let dupCount = 0;
      const dupExamples: string[] = [];
      if (includedLabs.length > 0) {
        const savedKeys = new Set<string>();
        try {
          const recs = await getAllCategoryData(CATEGORIES.USER);
          for (const r of (recs || []) as any[]) {
            if (!r.subcategory?.startsWith('lab-results')) continue;
            let content = r.content;
            if (typeof content === 'string') { try { content = JSON.parse(content); } catch { continue; } }
            const batchDate = content?.date || r.date;
            for (const res of (content?.results || [])) savedKeys.add(labResultKey(res, batchDate));
          }
        } catch (e) {
          console.warn('Dup-check: could not read saved labs', e);
        }
        for (const l of includedLabs) {
          const batchDate = labFileDates[l._filename] || today;
          if (savedKeys.has(labResultKey(l, batchDate))) {
            dupCount++;
            if (dupExamples.length < 3) {
              dupExamples.push(`${l.test_name} ${l.value_text}${l.unit ? ' ' + l.unit : ''} (${String(l.collection_date || batchDate).slice(0, 10)})`);
            }
          }
        }
      }

      // 2) Wrong-name — files where the user's first name wasn't found.
      const nameFiles = Array.from(new Set(files.filter(f => f.nameMismatch).map(f => f.file.name)));

      if (dupCount > 0 || nameFiles.length > 0) {
        setSanityWarning({ dupCount, dupExamples, nameFiles });
        return; // hold; the dialog's "Save anyway" calls persistApproved()
      }

      await persistApproved();
    } catch (e) {
      // A sanity-check failure must never block a legit save.
      console.error('Sanity gate errored — saving anyway:', e);
      await persistApproved();
    }
  };

  // ✅ ADD SINGLE EVENT TO TIMELINE
  const handleConfirmSingleEvent = async (event: ParsedMedicalEvent) => {
    try {
      onEventsExtracted([event]);
      console.log(`✅ Added single event: ${event.title}`);
    } catch (error) {
      console.error('❌ Error adding event:', error);
    }
  };

  // ✏️ EDIT EVENT FUNCTIONALITY
  const handleEditEvent = (eventId: string, field: string, value: string | any[]) => {
    setAllParsedEvents(prev => prev.map(event =>
      event.id === eventId
        ? { ...event, [field]: value }
        : event
    ));
  };

  const toggleEditMode = (eventId: string) => {
    setEditingEventId(editingEventId === eventId ? null : eventId);
  };

  // 📋 PASTE TEXT PARSING - Client-side magic for Google Keep etc.
  const parseTextFromPaste = (text: string): ParsedMedicalEvent[] => {
    const events: ParsedMedicalEvent[] = [];

    // 🔍 SMART LIST DETECTION: Check if this looks like a simple line-by-line list
    // (short lines, one item per line, typical of diagnosis/condition lists)
    let lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Run-together history-list recovery: a pasted condition list sometimes loses
    // its newlines (Keep/clipboard quirks), arriving as one long line like
    // "Diabetic - 2022 Lupus (SLE) - 2020 MCTD - 2012 …". LINES are the reliable
    // delimiter — when they survive, each entry is already its own line and this
    // never fires. ONLY when newlines are gone (≤2 lines) but several
    // year-anchored entries exist do we recover by splitting on the
    // "year → space → next-entry" boundary.
    //
    // The split point is a year followed by WHITESPACE then a NON-year token. So:
    //   - "1998, 2012, 2015 Hx of…"  → the commas keep the three years together
    //     (a comma after a year is not a split — it's a multi-date entry like
    //     "3 c sections - 1998, 2012, 2015"); only "2015 Hx" splits.
    //   - "2022 3 c sections"        → splits before "3" even though the next
    //     entry starts with a digit ((?=\S), not a letter requirement).
    const yearCount = (text.match(/\b(?:19|20)\d{2}\b/g) || []).length;
    if (lines.length <= 2 && yearCount >= 3) {
      const reSplit = text
        .split(/(?<=\b(?:19|20)\d{2})\s+(?!(?:19|20)\d{2}\b)(?=\S)/)
        .map(s => s.trim())
        .filter(s => s.length > 2);
      if (reSplit.length > lines.length) lines = reSplit;
    }

    const avgLineLength = lines.reduce((sum, l) => sum + l.length, 0) / (lines.length || 1);
    const isSimpleList = lines.length >= 3 && avgLineLength < 60 && lines.every(l => l.length < 100);

    let chunks: string[];

    if (isSimpleList) {
      // For simple lists (like diagnosis lists), treat each line as a separate item
      chunks = lines.filter(s => s.length > 2);
      console.log(`📋 Detected simple list format: ${chunks.length} items`);
    } else {
      // For prose/paragraphs, split by double newlines, bullets, numbered lists
      chunks = text
        .split(/(?:\n\s*\n|\n\s*[-•●]\s*|\n\s*\d+[.)]\s*)/)
        .map(s => s.trim())
        .filter(s => s.length > 5);
      console.log(`📋 Detected prose/paragraph format: ${chunks.length} chunks`);
    }

    // Medical keywords for type detection
    const diagnosisKeywords = /\b(diagnosed|diagnosis|dx|condition|syndrome|disorder|disease|chronic|diabetic|diabetes|lupus|adhd|autistic|autism|migraines?|anemia|deficiency|cyst|hearing loss|enlarged)\b/i;
    const surgeryKeywords = /\b(surgery|operation|procedure|removed|repair|replacement|laparoscop|appendectomy|cholecystectomy|hysterectomy|c.?section|bypass|augmentation|gallbladder removed|repaired)\b/i;
    const testKeywords = /\b(test|lab|blood|urine|mri|ct|x-ray|xray|ultrasound|biopsy|screening|panel|results)\b/i;
    const medicationKeywords = /\b(prescribed|medication|rx|mg|tablet|capsule|started|taking|dose|refill)\b/i;
    const treatmentKeywords = /\b(treatment|therapy|pt|physical therapy|injection|infusion|session)\b/i;
    const hospitalKeywords = /\b(hospital|admitted|er|emergency|inpatient|discharged|stay|hospitalization)\b/i;
    const historyKeywords = /\b(hx of|history of|hx|previous|prior|past)\b/i;
    const dismissedKeywords = /\b(dismissed|ignored|said it was nothing|normal|fine|anxiety|stress|in your head|all in your head|no concern|not worried|benign)\b/i;

    // Date patterns
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/,  // 1/15/2024 or 01/15/24
      /(\d{4}-\d{2}-\d{2})/,            // 2024-01-15
      /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/i,  // January 15, 2024
      /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})/i,    // 15 January 2024
    ];

    for (const chunk of chunks) {
      // For simple lists, allow shorter items (GERD, IBS, ADHD etc are valid!)
      const minLength = isSimpleList ? 2 : 10;
      if (chunk.length < minLength) continue;

      // Detect event type (dismissed_findings checked first - important for chronic illness tracking!)
      let type: 'diagnosis' | 'surgery' | 'hospitalization' | 'treatment' | 'test' | 'medication' | 'dismissed_findings' = 'diagnosis';
      if (dismissedKeywords.test(chunk)) type = 'dismissed_findings';
      else if (surgeryKeywords.test(chunk)) type = 'surgery';
      else if (hospitalKeywords.test(chunk)) type = 'hospitalization';
      else if (testKeywords.test(chunk)) type = 'test';
      else if (medicationKeywords.test(chunk)) type = 'medication';
      else if (treatmentKeywords.test(chunk)) type = 'treatment';
      // "Hx of" items - check if it's surgical history or just general history
      else if (historyKeywords.test(chunk)) {
        // Check if it's a surgical history item
        if (surgeryKeywords.test(chunk) || /\b(removed|repair|repaired|ectomy)\b/i.test(chunk)) {
          type = 'surgery';
        }
        // Otherwise default to diagnosis (medical history)
      }

      // Try to extract a date
      let eventDate = new Date().toISOString().split('T')[0]; // Default to today
      let dateFound = false;
      for (const pattern of datePatterns) {
        const match = chunk.match(pattern);
        if (match) {
          try {
            const parsed = new Date(match[1]);
            if (!isNaN(parsed.getTime())) {
              eventDate = parsed.toISOString().split('T')[0];
              dateFound = true;
              break;
            }
          } catch (e) {
            // Keep default date
          }
        }
      }
      // Bare-year fallback: history entries are often just "Condition - 2012".
      // If no fuller date matched, anchor the event to Jan 1 of that year (1900–
      // current) instead of today. (A multi-year entry like "1998, 2012, 2015"
      // takes the first — the user can adjust on the review screen.)
      if (!dateFound) {
        const yearMatch = chunk.match(/\b(19\d{2}|20\d{2})\b/);
        if (yearMatch) {
          const y = parseInt(yearMatch[1], 10);
          if (y >= 1900 && y <= new Date().getFullYear()) eventDate = `${yearMatch[1]}-01-01`;
        }
      }

      // Extract title (for simple lists, use the whole chunk; for prose, first sentence)
      let title: string;
      if (isSimpleList) {
        // For list items, the whole line IS the title
        title = chunk.trim();
        // Clean up common prefixes like "Hx of", "History of" for cleaner titles
        title = title.replace(/^(Hx of|History of|Dx of|Diagnosis of)\s*/i, '');
        if (title.length > 80) {
          title = title.substring(0, 80) + '...';
        }
      } else {
        // For prose, extract first sentence
        title = chunk.split(/[.\n]/)[0].trim();
        if (title.length > 80) {
          title = title.substring(0, 80) + '...';
        }
      }

      // Skip if title is too short (but allow 3+ for acronyms like IBS, GERD)
      if (title.length < 3) continue;

      // Determine status - surgical history items are resolved, current conditions are ongoing
      let status: 'active' | 'resolved' | 'ongoing' | 'scheduled' = 'ongoing';
      if (type === 'surgery' || historyKeywords.test(chunk) || /\b(removed|repaired|had)\b/i.test(chunk)) {
        status = 'resolved'; // Past surgical procedures
      }

      const event: ParsedMedicalEvent = {
        id: `paste-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        date: eventDate,
        description: isSimpleList ? title : chunk, // For lists, description = title (cleaner)
        status,
        tags: ['pasted', 'needs-review'],
        confidence: isSimpleList ? 70 : 60, // Slightly higher for clear list items
        sources: ['paste-text'],
        needsReview: true,
        rawText: chunk
      };

      events.push(event);
    }

    return events;
  };

  // 🔥 LOCAL NER TEXT PARSING - Same model, no server needed!
  const parseTextWithBackend = async (text: string): Promise<ParsedMedicalEvent[]> => {
    try {
      // Respect mode: lab uploader skips NER, medical uploader skips lab parser.
      const nerEvents = mode === 'lab' ? [] : await extractMedicalEvents(text, 'Pasted Notes');
      const labResults = mode === 'medical' ? [] : extractLabResults(text);
      if (onLabsExtracted && labResults.length > 0) {
        const mapped: ExtractedLabResult[] = labResults.map(l => ({
          test_name: l.testName,
          value: l.value,
          value_text: l.valueText,
          unit: l.unit,
          reference_low: l.referenceLow,
          reference_high: l.referenceHigh,
          reference_text: l.referenceText,
          flag: l.flag,
          is_abnormal: l.isAbnormal,
          context: l.context,
          confidence: l.confidence,
          collection_date: l.date,
          needs_typo_check: l.needs_typo_check,
          typo_check_reason: l.typo_check_reason,
          typo_check_severity: l.typo_check_severity,
        }));
        onLabsExtracted({
          filename: 'Pasted Notes',
          date: new Date().toISOString().split('T')[0],
          results: mapped,
        });
      }

      const allEvents = [...nerEvents];
      if (!onLabsExtracted) {
        const labEvents = labResultsToEvents(labResults);
        const seenTitles = new Set(nerEvents.map(e => e.title.toLowerCase()));
        for (const labEvent of labEvents) {
          if (!seenTitles.has(labEvent.title.toLowerCase())) {
            allEvents.push(labEvent);
            seenTitles.add(labEvent.title.toLowerCase());
          }
        }
      }

      console.log(`🎉 LOCAL NER TEXT PARSE SUCCESS: ${allEvents.length} events`);
      return allEvents as any;

    } catch (error) {
      console.warn('Local NER text parsing failed, falling back to client-side:', error);
      return parseTextFromPaste(text);
    }
  };

  const handlePasteTextSubmit = async () => {
    if (!pastedText.trim()) return;

    setIsParsing(true);
    setParseError(null);

    try {
      // Try backend parsing first (much more powerful!)
      let events = await parseTextWithBackend(pastedText);

      if (events.length === 0) {
        // NER found nothing structured — terse history lists ("Diabetic - 2022
        // Lupus (SLE) - 2020 MCTD - 2012 …") aren't the prose the model is tuned
        // for. Fall back to the line/pattern splitter, which turns each entry
        // into its own event (and dates it from its year). Only if THAT also
        // finds nothing do we keep the whole note as a single reviewable event.
        const splitEvents = parseTextFromPaste(pastedText);
        if (splitEvents.length > 0) {
          events = splitEvents;
        } else {
          events.push({
            id: `paste-${Date.now()}`,
            type: 'diagnosis',
            title: 'Imported from notes',
            date: new Date().toISOString().split('T')[0],
            description: pastedText,
            status: 'active',
            tags: ['pasted', 'needs-review'],
            confidence: 50,
            sources: ['paste-text'],
            needsReview: true,
            rawText: pastedText,
          });
        }
      }

      setParsedFromPaste(events);
      setAllParsedEvents(prev => [...prev, ...events]);
      setShowPasteModal(false);
      setPastedText('');
      setShowPreview(true);

      console.log(`📋 Parsed ${events.length} events from pasted text!`);
    } catch (error) {
      console.error('Paste parsing error:', error);
      setParseError(error instanceof Error ? error.message : 'Failed to parse text');
    } finally {
      setIsParsing(false);
    }
  };

  // 🎨 CONFIDENCE COLOR CODING (THEME AWARE!)
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 60) return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-destructive/10 text-destructive border-destructive/20';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'application/pdf') return <FileText className="h-5 w-5" />;
    if (fileType.startsWith('image/')) return <Image className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  // Web "try me" demo: gate file import. The parser would pull a ~64MB NER model
  // into the visitor's browser, and real medical records must never be uploaded to
  // a public page. Everything else stays fully clickable; this one feature points
  // people to the installed app, which runs the parsing entirely on their device.
  if (IS_DEMO) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
            <h3 className="font-semibold">📄 File import lives in the installed app</h3>
            <p className="text-sm text-muted-foreground">
              Uploading lab results &amp; medical records and auto-parsing them works in the
              downloadable Chaos Command — it runs entirely on <em>your</em> device, nothing
              uploaded anywhere. It&apos;s switched off in this public web demo so nothing
              leaves your browser (and so you don&apos;t download a large parsing model just
              to look around).
            </p>
            <p className="text-sm text-muted-foreground">
              Everything else here is fully clickable — explore away.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className} relative`}>
      {/* 🎉✨ SUCCESS ANIMATION OVERLAY */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-green-400 to-blue-500 text-white p-8 rounded-2xl shadow-2xl animate-bounce">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold">🎉 SUCCESS! 🎉</h3>
              <p className="text-lg">
                {successMessage || 'All done!'}
              </p>
              {extractedProviders.length > 0 && (
                <p className="text-sm opacity-90">
                  ✨ Auto-created {extractedProviders.length} providers!
                </p>
              )}
              <div className="flex justify-center space-x-2">
                <Sparkles className="h-6 w-6 animate-spin" />
                <Sparkles className="h-6 w-6 animate-ping" />
                <Sparkles className="h-6 w-6 animate-bounce" />
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 🛟 PRE-SAVE SANITY WARNING (duplicates + wrong-name) */}
      <Dialog open={!!sanityWarning} onOpenChange={(open) => { if (!open) setSanityWarning(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Quick gut-check before saving
            </DialogTitle>
            <DialogDescription>
              Nothing's saved yet — a couple of things looked off. Your call.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {sanityWarning && sanityWarning.dupCount > 0 && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                <p className="font-medium text-[var(--text-main)]">⚠️ Possible duplicate{sanityWarning.dupCount === 1 ? '' : 's'}</p>
                <p className="text-[var(--text-muted)] mt-1">
                  {sanityWarning.dupCount} of these result{sanityWarning.dupCount === 1 ? ' is' : 's are'} already in your records
                  {sanityWarning.dupExamples.length > 0 && <> — e.g. {sanityWarning.dupExamples.join('; ')}</>}.
                  Saving again would double-count them on your trends.
                </p>
              </div>
            )}
            {sanityWarning && sanityWarning.nameFiles.length > 0 && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                <p className="font-medium text-[var(--text-main)]">⚠️ A name doesn't match your demographics</p>
                <p className="text-[var(--text-muted)] mt-1">
                  A name on {sanityWarning.nameFiles.length === 1
                    ? <strong className="text-[var(--text-main)]">{sanityWarning.nameFiles[0]}</strong>
                    : `${sanityWarning.nameFiles.length} of these files`} doesn't match your demographics —
                  sure {sanityWarning.nameFiles.length === 1 ? "it's" : "they're"} yours and not a family member's?
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setSanityWarning(null)}>Go back</Button>
            <Button onClick={() => { setSanityWarning(null); void persistApproved(); }}>Save anyway</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🎨✨ GORGEOUS SPARKLY UPLOAD AREA */}
      <Card className={`border-2 border-dashed transition-all duration-500 transform ${
        isDragOver
          ? 'border-[var(--accent-orange)] bg-gradient-to-br from-orange-50 to-purple-50 shadow-2xl scale-105 animate-pulse'
          : 'border-[var(--border-soft)] hover:border-[var(--hover-glow)] hover:shadow-lg hover:scale-102'
      }`}>
        <CardContent className="p-8">
          <div
            className="text-center space-y-4"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
              isDragOver
                ? 'bg-gradient-to-br from-orange-500 to-purple-600 text-white shadow-lg animate-bounce'
                : 'bg-gradient-to-br from-blue-100 to-purple-100 text-blue-600 hover:from-blue-200 hover:to-purple-200'
            }`}>
              {isDragOver ? (
                <Sparkles className="h-8 w-8 animate-spin" />
              ) : (
                <Upload className="h-8 w-8" />
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-main)] mb-2">
                {mode === 'lab'
                  ? '🧪 Lab Result Parser'
                  : mode === 'medical'
                    ? '📄 Medical Document Parser'
                    : '📄 Medical Document Parser'}
              </h3>
              <p className="text-[var(--text-muted)] mb-2">
                {mode === 'lab'
                  ? 'Upload lab panels and blood work. Pulls test names, values, units, and reference ranges into your Labs dashboard. Skips the diagnosis-extraction model so a panel name (like "Myositis Panel") never gets mistaken for a diagnosis.'
                  : mode === 'medical'
                    ? 'Upload visit notes, after-visit summaries, imaging reports, or other medical records. The NER engine extracts events, flags dismissed findings, and builds your timeline. For lab panels, use the Lab Result uploader instead.'
                    : 'Upload medical documents, lab reports, imaging results, or any medical records. Our NER engine will extract events, flag dismissed findings, and build your timeline.'}
              </p>

              {/* Demographics hint + first-time model download */}
              <div className="text-xs text-[var(--text-muted)] mb-4 space-y-1">
                <p>
                  💡 <a href="/demographics" className="underline text-[var(--accent-purple)] hover:text-[var(--accent-orange)]">Fill out Demographics first</a> — we use your name and birthday to filter personal info from results.
                </p>
                {!isModelLoaded() && (
                  <div className="mt-2 rounded-lg border border-border bg-muted/60 p-3 text-left text-[var(--text-main)] space-y-2">
                    <p>
                      The optional document-parsing feature downloads a medical language model from
                      Hugging Face the first time it is used. This requires an internet connection and
                      will contact Hugging Face's servers directly from your device. <strong>No medical
                      documents, extracted text, or journal content are uploaded</strong> — only the model
                      itself is downloaded.
                    </p>
                    <p>
                      If you prefer additional privacy, you are encouraged to use a VPN when downloading
                      the model. 🛡️ This feature is entirely optional; the app functions fully without it,
                      and data can always be entered manually. We plan to offer a bundled/offline model
                      option in a future release.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                </Button>

                {/* 📋 PASTE TEXT — Google Keep / notes apps / MyChart. Medical-event
                    extraction (NER) only runs in the medical importer; lab-only mode
                    is PDF-geometry (pasted text has no column positions), so paste is
                    hidden there to avoid offering extraction it won't perform. */}
                <Dialog open={showPasteModal} onOpenChange={(open) => {
                  setShowPasteModal(open);
                  if (!open) {
                    setParseError(null);
                  }
                }}>
                  {mode !== 'lab' && (
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <ClipboardPaste className="h-4 w-4" />
                        Paste Text
                      </Button>
                    </DialogTrigger>
                  )}
                  <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <ClipboardPaste className="h-5 w-5 text-primary" />
                        Paste Medical Notes
                      </DialogTitle>
                      <DialogDescription>
                        Paste from Google Keep, a notes app, an email, or MyChart. The parser pulls out medical events, flags dismissed findings, and notes providers — then shows you everything for review before anything is saved.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                      {/* 🎨 QUICK TEMPLATES */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Quick Templates (click to use)</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {pasteTemplates.map((template, idx) => (
                            <button
                              key={idx}
                              onClick={() => setPastedText(prev => prev ? prev + '\n\n' + template.example : template.example)}
                              className="flex items-center gap-2 p-2 text-left text-sm border border-[var(--border-soft)] rounded-lg hover:bg-[var(--surface-2)] hover:border-primary transition-colors"
                            >
                              <template.icon className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="text-foreground">{template.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="pasteText">Your notes</Label>
                          <span className={`text-xs ${pastedText.length > 10000 ? 'text-warning' : 'text-muted-foreground'}`}>
                            {pastedText.length.toLocaleString()} characters
                            {pastedText.length > 0 && ` • ~${Math.ceil(pastedText.split(/\s+/).filter(w => w).length / 200)} min read`}
                          </span>
                        </div>
                        <Textarea
                          id="pasteText"
                          value={pastedText}
                          onChange={(e) => setPastedText(e.target.value)}
                          placeholder={`Paste your medical notes here...

Example formats that work great:
• Diagnosed with Type 2 Diabetes - January 15, 2024
• Started Metformin 500mg twice daily
• 3/15/2024 - Blood work showed elevated A1C
• Surgery: Appendectomy at City Hospital
• Dr. Smith said my symptoms were "just anxiety" (we'll flag that!)

Or just paste your whole Google Keep note - we'll figure it out!`}
                          className="min-h-[200px] font-mono text-sm"
                          disabled={isParsing}
                        />
                      </div>

                      {/* Error display */}
                      {parseError && (
                        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-destructive text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>{parseError}</span>
                          </div>
                        </div>
                      )}

                      <div className="bg-[var(--surface-2)] border border-[var(--border-soft)] rounded-lg p-3">
                        <div className="flex items-center gap-2 text-[var(--text-main)] text-sm font-medium mb-1">
                          <Sparkles className="h-4 w-4" />
                          What the parser looks for
                        </div>
                        <div className="text-xs text-[var(--text-muted)] space-y-1">
                          <p><strong className="text-[var(--text-main)]">Events:</strong> diagnoses, surgeries, medications, tests, treatments, hospitalizations</p>
                          <p><strong className="text-[var(--text-main)]">Dismissed findings:</strong> things noted as "incidental" or "normal variant" that may be worth a second look</p>
                          <p><strong className="text-[var(--text-main)]">Providers:</strong> doctor names and organizations</p>
                          <p><strong className="text-[var(--text-main)]">Dates:</strong> most formats (MM/DD/YYYY, Jan 15 2024, etc.)</p>
                          <p className="pt-1 italic">Everything lands on a review screen first — nothing is saved until you approve it.</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center gap-2 pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPastedText('')}
                          disabled={!pastedText || isParsing}
                          className="text-muted-foreground"
                        >
                          Clear
                        </Button>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setShowPasteModal(false)} disabled={isParsing}>
                            Cancel
                          </Button>
                          <Button
                            onClick={handlePasteTextSubmit}
                            disabled={!pastedText.trim() || isParsing}
                            className="gap-2 min-w-[140px]"
                          >
                            {isParsing ? (
                              <>
                                <Sparkles className="h-4 w-4 animate-spin" />
                                Parsing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4" />
                                Parse & Extract
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <span className="text-[var(--text-muted)] text-sm">
                  or drag and drop files here
                </span>
              </div>
              
              <p className="text-xs text-[var(--text-muted)] mt-3">
                Supports: PDF, Images (JPG, PNG), Text files • Max 50MB per file
              </p>
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif,.txt,.html"
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* 📁 UPLOADED FILES STATUS */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[var(--text-main)] flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Processing Files ({files.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {files.map((file) => (
              <div key={file.id} className="border border-[var(--border-soft)] rounded-lg p-4 bg-[var(--surface-1)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="text-[var(--text-muted)]">
                      {getFileIcon(file.file.type)}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text-main)] truncate max-w-xs">
                        {file.file.name}
                      </p>
                      <p className="text-sm text-[var(--text-muted)]">
                        {(file.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {file.status === 'parsed' && (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Parsed
                      </Badge>
                    )}
                    {file.status === 'parsed' && file.nameMismatch && (
                      <Badge className="bg-warning/10 text-warning border-warning/30" title="Your name wasn't found on this document">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Name?
                      </Badge>
                    )}
                    {file.status === 'error' && (
                      <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Error
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="text-[var(--text-muted)] hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                {file.status !== 'error' && (
                  <Progress
                    value={file.progress}
                    className="mb-2"
                  />
                )}

                {/* Status Messages */}
                {file.status === 'processing' && (
                  <p className="text-sm text-[var(--text-muted)]">
                    🧠 Analyzing document with NER + section parsing...
                  </p>
                )}

                {file.status === 'parsed' && file.parsedEvents && (
                  <p className="text-sm text-green-600">
                    ✅ {(() => {
                      const eventCount = file.parsedEvents.length
                      const labCount = file.parsedLabCount ?? 0
                      // In lab mode the NER step is intentionally skipped, so the
                      // events count is always 0 and would mislead the reader.
                      // Show whichever counts are non-zero; if both, show both.
                      if (mode === 'lab') {
                        return `Found ${labCount} lab result${labCount === 1 ? '' : 's'}`
                      }
                      if (mode === 'medical') {
                        return `Found ${eventCount} potential medical event${eventCount === 1 ? '' : 's'}`
                      }
                      // mixed mode — surface both
                      const parts: string[] = []
                      parts.push(`${eventCount} medical event${eventCount === 1 ? '' : 's'}`)
                      if (labCount > 0) parts.push(`${labCount} lab result${labCount === 1 ? '' : 's'}`)
                      return `Found ${parts.join(' + ')}`
                    })()}
                  </p>
                )}

                {file.status === 'error' && file.error && (
                  <p className="text-sm text-destructive">
                    ❌ {file.error}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 👁️ PREVIEW PARSED EVENTS + LABS */}
      {(allParsedEvents.length > 0 || allParsedLabs.length > 0) && !showPreview && (
        <Card className="border-[var(--accent-orange)]">
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <div className="text-[var(--text-main)]">
                <h3 className="text-lg font-semibold mb-2">
                  🎉 Found{" "}
                  {allParsedEvents.length > 0 && (
                    <>{allParsedEvents.length} medical event{allParsedEvents.length === 1 ? '' : 's'}</>
                  )}
                  {allParsedEvents.length > 0 && allParsedLabs.length > 0 && ' + '}
                  {allParsedLabs.length > 0 && (
                    <>{allParsedLabs.length} lab result{allParsedLabs.length === 1 ? '' : 's'}</>
                  )}!
                </h3>
                <p className="text-[var(--text-muted)]">
                  Review and approve before they're saved to your timeline + Lab Results.
                  Anything you uncheck won't be saved.
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={handlePreview}
                  className="bg-[var(--btn-bg)] text-[var(--btn-text)] border-[var(--btn-border)] hover:bg-[var(--btn-hover-bg)]"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Review
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFiles([]);
                    setAllParsedEvents([]);
                    setAllParsedLabs([]);
                  }}
                  className="border-[var(--border-soft)] text-[var(--text-muted)]"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 📋 DETAILED EVENT PREVIEW & EDITING */}
      {showPreview && (allParsedEvents.length > 0 || allParsedLabs.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[var(--text-main)] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Review &amp; Approve
                {allParsedEvents.length > 0 && ` · ${allParsedEvents.length} event${allParsedEvents.length === 1 ? '' : 's'}`}
                {allParsedLabs.length > 0 && ` · ${allParsedLabs.length} lab${allParsedLabs.length === 1 ? '' : 's'}`}
              </span>
              <Button
                variant="ghost"
                onClick={() => setShowPreview(false)}
                className="text-[var(--text-muted)]"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {allParsedEvents.map((event, index) => (
              <div key={event.id} className="border border-[var(--border-soft)] rounded-lg p-4 bg-[var(--surface-1)]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {editingEventId === event.id ? (
                        <input
                          type="text"
                          value={event.title}
                          onChange={(e) => handleEditEvent(event.id, 'title', e.target.value)}
                          className="font-semibold text-[var(--text-main)] bg-[var(--surface-2)] border border-primary rounded px-2 py-1 flex-1"
                          placeholder="Event title..."
                        />
                      ) : (
                        <h4 className="font-semibold text-[var(--text-main)] cursor-pointer hover:text-primary"
                            onClick={() => toggleEditMode(event.id)}>
                          {event.title}
                        </h4>
                      )}
                      <Badge className={getConfidenceColor(event.confidence)}>
                        {event.confidence}% confidence
                      </Badge>
                      {event.needsReview && (
                        <Badge variant="outline" className="border-warning/40 text-warning">
                          Needs Review
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-[var(--text-muted)]">Date:</span>
                        {editingEventId === event.id ? (
                          <input
                            type="date"
                            value={event.date}
                            onChange={(e) => handleEditEvent(event.id, 'date', e.target.value)}
                            className="ml-2 text-[var(--text-main)] bg-[var(--surface-2)] border border-primary rounded px-1"
                          />
                        ) : (
                          <span className="ml-2 text-[var(--text-main)] cursor-pointer hover:text-primary"
                                onClick={() => toggleEditMode(event.id)}>
                            {event.date}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Type:</span>
                        {editingEventId === event.id ? (
                          <select
                            value={event.type}
                            onChange={(e) => handleEditEvent(event.id, 'type', e.target.value)}
                            className="ml-2 text-[var(--text-main)] bg-[var(--surface-2)] border border-primary rounded px-1"
                          >
                            <option value="diagnosis">Diagnosis</option>
                            <option value="surgery">Surgery</option>
                            <option value="hospitalization">Hospitalization</option>
                            <option value="treatment">Treatment</option>
                            <option value="test">Test</option>
                            <option value="medication">Medication</option>
                            <option value="dismissed_findings">Dismissed Finding</option>
                          </select>
                        ) : (
                          <span className="ml-2 text-[var(--text-main)] cursor-pointer hover:text-primary"
                                onClick={() => toggleEditMode(event.id)}>
                            {event.type}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 🏥 GORGEOUS PROVIDER DISPLAY */}
                    {event.provider_info && (
                      <div className="bg-[var(--surface-2)] border border-[var(--border-soft)] rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Stethoscope className="h-4 w-4 text-primary" />
                          <span className="font-medium text-[var(--text-main)]">Detected provider</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[var(--text-main)] font-medium">{event.provider_info.name}</span>
                            {event.provider_info.specialty && (
                              <div className="text-[var(--text-muted)]">{event.provider_info.specialty}</div>
                            )}
                          </div>
                          <div>
                            {event.provider_info.organization && (
                              <div className="text-[var(--text-muted)]">{event.provider_info.organization}</div>
                            )}
                            {event.provider_info.phone && (
                              <div className="text-[var(--text-muted)]">{event.provider_info.phone}</div>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                            {event.provider_info.confidence}% confidence
                          </Badge>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={providerToggleStates[event.provider_info.name.toLowerCase()] || false}
                              onChange={(e) => {
                                const providerKey = event.provider_info?.name.toLowerCase();
                                if (providerKey) {
                                  setProviderToggleStates(prev => ({
                                    ...prev,
                                    [providerKey]: e.target.checked
                                  }));
                                }
                              }}
                              className="rounded border-green-300 text-green-600 focus:ring-green-500"
                            />
                            <span className={`font-medium ${
                              providerToggleStates[event.provider_info.name.toLowerCase()]
                                ? 'text-green-700'
                                : 'text-muted-foreground'
                            }`}>
                              {providerToggleStates[event.provider_info.name.toLowerCase()]
                                ? '✅ Add Provider'
                                : '❌ Skip Provider'
                              }
                            </span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* 🚨 GORGEOUS DISMISSED FINDINGS DISPLAY - NOW EDITABLE! */}
                    {event.incidentalFindings && event.incidentalFindings.length > 0 && (
                      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <span className="font-medium text-destructive">🚨 Potentially Dismissed Findings</span>
                          <Sparkles className="h-3 w-3 text-orange-500" />
                          <button
                            onClick={() => toggleEditMode(event.id)}
                            className="ml-auto text-xs text-destructive hover:opacity-80 underline"
                          >
                            ✏️ Edit
                          </button>
                        </div>

                        {editingEventId === event.id ? (
                          <textarea
                            value={event.incidentalFindings.map(f =>
                              `${f.finding}\n${f.whyItMatters} (${f.significance} significance)`
                            ).join('\n\n')}
                            onChange={(e) => {
                              // Parse the edited text back into findings format
                              const lines = e.target.value.split('\n\n');
                              const updatedFindings = lines.map(line => {
                                const parts = line.split('\n');
                                const finding = parts[0] || '';
                                const whyItMatters = parts[1]?.replace(/ \([^)]*\)$/, '') || '';
                                const significance = parts[1]?.match(/\(([^)]*) significance\)/)?.[1] || 'moderate';
                                return { finding, whyItMatters, significance };
                              }).filter(f => f.finding.trim());

                              handleEditEvent(event.id, 'incidentalFindings', updatedFindings);
                            }}
                            className="w-full text-sm text-destructive bg-[var(--surface-2)] border border-destructive/30 rounded p-2 min-h-32"
                            placeholder="Edit findings... Format: Finding text\nWhy it matters (significance level)"
                          />
                        ) : (
                          <div className="space-y-2 cursor-pointer hover:bg-destructive/5" onClick={() => toggleEditMode(event.id)}>
                            {event.incidentalFindings.slice(0, 3).map((finding, idx) => (
                              <div key={idx} className="bg-[var(--surface-2)]/50 rounded p-2 border border-destructive/20">
                                <div className="font-medium text-destructive text-sm">{finding.finding}</div>
                                <div className="text-xs text-destructive/80">{finding.whyItMatters}</div>
                                <div className="flex gap-1 mt-1">
                                  <Badge className={`text-xs ${
                                    finding.significance === 'critical' ? 'bg-destructive/10 text-destructive' :
                                    finding.significance === 'high' ? 'bg-warning/10 text-warning' :
                                    finding.significance === 'moderate' ? 'bg-warning/10 text-warning' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {finding.significance} significance
                                  </Badge>
                                </div>
                              </div>
                            ))}
                            {event.incidentalFindings.length > 3 && (
                              <div className="text-xs text-destructive italic">
                                +{event.incidentalFindings.length - 3} more findings detected... (click to edit all)
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {editingEventId === event.id ? (
                      <textarea
                        value={event.description}
                        onChange={(e) => handleEditEvent(event.id, 'description', e.target.value)}
                        className="w-full text-sm text-[var(--text-main)] mb-2 bg-[var(--surface-2)] border border-primary rounded p-2 min-h-20"
                        placeholder="Event description..."
                      />
                    ) : (
                      <p className="text-sm text-[var(--text-main)] mb-2 bg-[var(--surface-2)] rounded p-2 max-h-20 overflow-y-auto cursor-pointer hover:bg-[var(--surface-1)]"
                         onClick={() => toggleEditMode(event.id)}>
                        {event.description.length > 200 ?
                          `${event.description.substring(0, 200)}...` :
                          event.description
                        }
                      </p>
                    )}

                    {event.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {event.tags.map((tag, tagIndex) => (
                          <Badge key={tagIndex} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="text-xs text-[var(--text-muted)]">
                      Sources: {event.sources.join(', ')}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`${editingEventId === event.id ? 'text-green-600 hover:text-green-700' : 'text-primary hover:opacity-80'}`}
                      onClick={() => toggleEditMode(event.id)}
                    >
                      {editingEventId === event.id ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Edit3 className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[var(--text-muted)] hover:text-destructive"
                      onClick={() => {
                        setAllParsedEvents(prev => prev.filter(e => e.id !== event.id));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* ✨ GORGEOUS EDIT INSTRUCTIONS */}
                <div className="text-xs text-[var(--text-muted)] italic flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {editingEventId === event.id ? (
                    <span className="text-green-600">✏️ Editing mode active! Click ✓ to save changes.</span>
                  ) : (
                    <span>💡 Click any field or the edit button to customize this event!</span>
                  )}
                </div>

                {/* ✅ INDIVIDUAL ACCEPT/DISMISS BUTTONS */}
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 font-medium"
                    onClick={() => {
                      handleConfirmSingleEvent(event);
                      setAllParsedEvents(prev => prev.filter(e => e.id !== event.id));
                    }}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Add to Timeline
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[var(--border-soft)] text-[var(--text-muted)] hover:text-destructive hover:border-destructive/30"
                    onClick={() => {
                      setAllParsedEvents(prev => prev.filter(e => e.id !== event.id));
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Skip
                  </Button>
                </div>
              </div>
            ))}

            {/* 🧪 LAB RESULTS REVIEW (auto mode only) */}
            {allParsedLabs.length > 0 && (
              <div className="border-t border-[var(--border-soft)] pt-4 mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
                    🧪 Lab Results ({allParsedLabs.filter(l => l._included).length}/{allParsedLabs.length})
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAllParsedLabs(prev => prev.map(l => ({ ...l, _included: true })))}
                    >
                      All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAllParsedLabs(prev => prev.map(l => ({ ...l, _included: false })))}
                    >
                      None
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Uncheck any rows that aren't real labs (e.g. a panel name the medical parser
                  confused for a test). Click a test name, value, or unit to edit it. The
                  collection date defaults to today — fix it per-file before approving.
                </p>
                {/* Group labs by source file. Each group gets a header with a date
                    picker that applies to the whole batch from that file. */}
                {(() => {
                  const filenames = Array.from(new Set(allParsedLabs.map(l => l._filename)))
                  return filenames.map(filename => {
                    const fileLabs = allParsedLabs.filter(l => l._filename === filename)
                    const includedInFile = fileLabs.filter(l => l._included).length
                    return (
                      <div
                        key={filename}
                        className="border border-[var(--border-soft)] rounded-md p-3 bg-[var(--surface-1)] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-sm font-medium text-[var(--text-main)] truncate flex-1 min-w-0">
                            📄 {filename}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">
                            {includedInFile}/{fileLabs.length} included
                          </span>
                          <label className="flex items-center gap-2 text-xs text-[var(--text-main)]">
                            <span>Collection date:</span>
                            <input
                              type="date"
                              value={labFileDates[filename] || ''}
                              onChange={(e) =>
                                setLabFileDates(prev => ({ ...prev, [filename]: e.target.value }))
                              }
                              className="border border-[var(--border-soft)] rounded px-2 py-0.5 bg-[var(--surface-2)] text-[var(--text-main)]"
                            />
                          </label>
                        </div>
                        <div className="space-y-1 max-h-60 overflow-y-auto">
                          {fileLabs.map(lab => (
                            <div
                              key={lab._id}
                              className={`flex flex-wrap items-center gap-2 p-2 rounded border text-sm transition-colors ${
                                lab._included
                                  ? 'border-[var(--border-soft)] bg-[var(--surface-2)] dark:bg-[var(--surface-2)]'
                                  : 'border-dashed border-[var(--border-soft)] opacity-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={lab._included}
                                onChange={(e) =>
                                  setAllParsedLabs(prev =>
                                    prev.map(l =>
                                      l._id === lab._id ? { ...l, _included: e.target.checked } : l
                                    )
                                  )
                                }
                                className="h-4 w-4 shrink-0"
                              />
                              <input
                                type="text"
                                value={lab.test_name}
                                onChange={(e) =>
                                  setAllParsedLabs(prev =>
                                    prev.map(l =>
                                      l._id === lab._id ? { ...l, test_name: e.target.value } : l
                                    )
                                  )
                                }
                                className="font-medium text-[var(--text-main)] bg-transparent border border-transparent hover:border-[var(--border-soft)] focus:border-primary focus:bg-[var(--surface-2)] rounded px-1 py-0.5 flex-1 min-w-0"
                                title="Edit test name"
                              />
                              <input
                                type="text"
                                value={lab.value_text}
                                onChange={(e) =>
                                  setAllParsedLabs(prev =>
                                    prev.map(l =>
                                      l._id === lab._id ? { ...l, value_text: e.target.value } : l
                                    )
                                  )
                                }
                                className="font-mono text-[var(--text-main)] bg-transparent border border-transparent hover:border-[var(--border-soft)] focus:border-primary focus:bg-[var(--surface-2)] rounded px-1 py-0.5 w-24 text-right"
                                title="Edit value"
                              />
                              <input
                                type="text"
                                value={lab.unit}
                                onChange={(e) =>
                                  setAllParsedLabs(prev =>
                                    prev.map(l =>
                                      l._id === lab._id ? { ...l, unit: e.target.value } : l
                                    )
                                  )
                                }
                                className="font-mono text-[var(--text-muted)] bg-transparent border border-transparent hover:border-[var(--border-soft)] focus:border-primary focus:bg-[var(--surface-2)] rounded px-1 py-0.5 w-20 text-xs"
                                title="Edit unit"
                                placeholder="unit"
                              />
                              {lab.is_abnormal && (
                                <Badge className="bg-destructive/10 text-destructive text-xs shrink-0">
                                  {lab.flag || 'ABNL'}
                                </Badge>
                              )}
                              {/* Typo-check banner — wraps to its own line below the row. Soft
                                  prompt to verify the EXTRACTION, not the patient's value. */}
                              {lab.needs_typo_check && lab._included && (
                                <div className={`basis-full mt-1 flex items-start gap-2 text-xs rounded px-2 py-1.5 ${
                                  lab.typo_check_severity === 'critical'
                                    ? 'bg-destructive/10 text-destructive border border-destructive/30'
                                    : 'bg-warning/10 text-warning border border-warning/30'
                                }`}>
                                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-px" />
                                  <span className="flex-1">
                                    <span className="font-medium">Verify reading: </span>
                                    {lab.typo_check_reason || 'value looks unusually far from expected — please double-check it came through correctly'}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}

            {/* Confirm Actions */}
            <div className="flex gap-3 justify-center pt-4 border-t border-[var(--border-soft)] flex-wrap">
              <Button
                onClick={handleConfirmEvents}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Approved
                {allParsedEvents.length > 0 && ` · ${allParsedEvents.length} event${allParsedEvents.length === 1 ? '' : 's'}`}
                {allParsedLabs.filter(l => l._included).length > 0 &&
                  ` · ${allParsedLabs.filter(l => l._included).length} lab${allParsedLabs.filter(l => l._included).length === 1 ? '' : 's'}`}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
                className="border-[var(--border-soft)] text-[var(--text-muted)]"
              >
                Continue Editing
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
