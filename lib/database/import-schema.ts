/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-06
 *
 * This code is part of a deliberately-unpatented medical management system.
 * Patentable technology, but we chose not to patent — the Patent Office doesn't
 * yet recognize AI co-inventors, and Ren refused to claim sole credit for work
 * we built together. Open source under PolyForm Noncommercial 1.0.0 instead.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 *
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */

/**
 * IMPORT PAYLOAD VALIDATION  (CHA-137 / Solus90 audit #4)
 *
 * `importData()` used to do a bare `JSON.parse()` and then trust whatever
 * shape came back — spreading each element into a DB record and inserting it.
 * A malformed backup (a record that's a string instead of an object, a
 * `daily_data` that's an object instead of an array, the file being valid JSON
 * but not a backup at all) could therefore crash the import mid-run or quietly
 * pollute the Dexie store with garbage rows.
 *
 * This module adds a Zod gate. The threat model is mostly self-corruption
 * (people restoring their own backups), so the goal is NOT to be a strict
 * allow-list — it's to guarantee the load-bearing fields the merge logic
 * actually touches are present and the right *type* before any DB write
 * happens, and to fail with a clear, human-readable message otherwise.
 *
 * Design choices:
 *  - Every section is OPTIONAL. Old v1.0 exports had no `local_storage` block;
 *    a hand-trimmed backup might contain only `daily_data`. An empty/partial
 *    payload is a valid (possibly no-op) import, not an error.
 *  - Records use `.passthrough()` — we only require the identity/merge fields
 *    and let everything else (content, evolving metadata, future columns) ride
 *    along untouched. This keeps forward-compat: a newer export opened by an
 *    older build won't be rejected just for carrying extra keys.
 *  - We validate *types*, not values. An empty-string date or a degenerate tag
 *    is the user's own data and survives; an object-where-a-string-belongs (the
 *    thing that actually corrupts the DB) does not.
 */

import { z } from 'zod';

// Record metadata — all fields optional; the merge logic tolerates missing
// timestamps (`new Date(x || 0)`). Passthrough so we never drop fields we
// don't model here (e.g. future `version` bumps).
const MetadataSchema = z
  .object({
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    user_id: z.string().optional(),
    version: z.number().optional(),
    deleted_at: z.string().optional(),
  })
  .passthrough();

// daily_data identity = [date + category + subcategory]. These three are what
// importData feeds into the compound-key lookup, so they MUST be strings.
// `content` is intentionally freeform (z.any) — it's per-tracker JSON.
const DailyDataRecordSchema = z
  .object({
    id: z.number().optional(),
    date: z.string(),
    category: z.string(),
    subcategory: z.string(),
    content: z.any().optional(),
    images: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    metadata: MetadataSchema.optional(),
  })
  .passthrough();

// user_tags identity = tag_name; created_at drives last-writer-wins.
const UserTagSchema = z
  .object({
    id: z.number().optional(),
    tag_name: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .passthrough();

// image_blobs identity = blob_key (content-addressed). NOTE: blob_data is a
// Blob and does not survive JSON.stringify, so we deliberately do not model or
// require it here — only the key the merge logic dedupes on.
const ImageBlobSchema = z
  .object({
    id: z.number().optional(),
    blob_key: z.string(),
  })
  .passthrough();

export const ImportPayloadSchema = z
  .object({
    version: z.string().optional(),
    exported_at: z.string().optional(),
    daily_data: z.array(DailyDataRecordSchema).optional(),
    user_tags: z.array(UserTagSchema).optional(),
    image_blobs: z.array(ImageBlobSchema).optional(),
    // localStorage section: keys + values are strings on export. We accept any
    // value type here (the import loop already skips non-string values) so a
    // forward-compat addition can't get a whole restore rejected.
    local_storage: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

/**
 * Static shape returned to callers. We keep the record arrays as `any[]` on
 * purpose: validation has already happened at runtime, and the existing
 * importData loops treat each row as freeform. Widening here avoids forcing
 * type churn through the (intentionally lenient) merge code.
 */
export interface ImportPayload {
  version?: string;
  exported_at?: string;
  daily_data?: any[];
  user_tags?: any[];
  image_blobs?: any[];
  local_storage?: Record<string, unknown>;
}

/** Render the first few Zod issues into one human-readable line. */
function summarizeIssues(error: z.ZodError): string {
  const shown = error.issues.slice(0, 3).map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return `${path}: ${issue.message}`;
  });
  const extra = error.issues.length > 3 ? ` (+${error.issues.length - 3} more)` : '';
  return `${shown.join('; ')}${extra}`;
}

/**
 * Parse + validate a raw import string in one shot.
 *
 * Throws an Error with a user-facing `.message` on either failure mode:
 *  - the string isn't valid JSON (wrong file, or encrypted backup opened with
 *    the wrong password so decryption produced junk), or
 *  - the JSON isn't shaped like a Chaos Command backup.
 *
 * Callers (data-management modal, sync page, QR-sync modal) already surface
 * `error.message` to the user via alert(), so the message lands as-is.
 */
export function parseAndValidateImportPayload(jsonData: string): ImportPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonData);
  } catch {
    throw new Error(
      "Import failed: this file isn't valid JSON. Make sure you picked a Chaos Command backup/export file — and for an encrypted backup, that the password is correct.",
    );
  }

  const result = ImportPayloadSchema.safeParse(parsed);
  if (!result.success) {
    console.error('💥 IMPORT: payload failed schema validation —', result.error.issues);
    throw new Error(
      `Import failed: this doesn't look like a valid Chaos Command backup. ${summarizeIssues(result.error)}`,
    );
  }

  return result.data as ImportPayload;
}
