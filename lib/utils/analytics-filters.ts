/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * Analytics Tag Filtering Utilities
 * Because sometimes data should be ignored, and sometimes you're a grown adult
 * who ate the cake and doesn't need a lecture about it.
 */

// System tags that have special meaning
export const SYSTEM_TAGS = {
  NOPE: ['nope', 'NOPE'],           // Bad data, mistakes, ignore completely
  I_KNOW: ['i-know', 'I KNOW', 'i know', 'I-KNOW'],  // Intentional choices, no nagging
} as const;

// Combined list of all tags that should be excluded from analytics by default
export const ANALYTICS_EXCLUDED_TAGS = [
  ...SYSTEM_TAGS.NOPE,
  ...SYSTEM_TAGS.I_KNOW,
];

/**
 * Check if an entry has a specific tag (case-insensitive)
 */
export function hasTag(entry: { tags?: string[] }, tagToFind: string): boolean {
  if (!entry.tags || entry.tags.length === 0) return false;
  const normalizedTag = tagToFind.toLowerCase();
  return entry.tags.some(tag => tag.toLowerCase() === normalizedTag);
}

/**
 * Check if an entry has ANY of the specified tags (case-insensitive)
 */
export function hasAnyTag(entry: { tags?: string[] }, tagsToFind: readonly string[]): boolean {
  if (!entry.tags || entry.tags.length === 0) return false;
  const normalizedTags = tagsToFind.map(t => t.toLowerCase());
  return entry.tags.some(tag => normalizedTags.includes(tag.toLowerCase()));
}

/**
 * Check if an entry has ALL of the specified tags (case-insensitive)
 */
export function hasAllTags(entry: { tags?: string[] }, tagsToFind: readonly string[]): boolean {
  if (!entry.tags || entry.tags.length === 0) return false;
  const normalizedTags = tagsToFind.map(t => t.toLowerCase());
  const entryTags = entry.tags.map(t => t.toLowerCase());
  return normalizedTags.every(tag => entryTags.includes(tag));
}

/**
 * Filter out entries tagged with NOPE (mistakes, bad data)
 * Use this when you want to exclude data that shouldn't have been recorded
 */
export function excludeNopeEntries<T extends { tags?: string[] }>(entries: T[]): T[] {
  return entries.filter(entry => !hasAnyTag(entry, SYSTEM_TAGS.NOPE));
}

/**
 * Filter out entries tagged with I KNOW (intentional choices)
 * Use this when you want to exclude "yes I know, leave me alone" data
 */
export function excludeIKnowEntries<T extends { tags?: string[] }>(entries: T[]): T[] {
  return entries.filter(entry => !hasAnyTag(entry, SYSTEM_TAGS.I_KNOW));
}

/**
 * Filter out ALL entries that should be excluded from analytics
 * This removes both NOPE and I KNOW tagged entries
 *
 * This is the main function most analytics should use!
 */
export function filterForAnalytics<T extends { tags?: string[] }>(entries: T[]): T[] {
  return entries.filter(entry => !hasAnyTag(entry, ANALYTICS_EXCLUDED_TAGS));
}

/**
 * Filter to ONLY include entries with a specific tag
 * Use this for "show me only entries where I ate bread" type queries
 */
export function filterByTag<T extends { tags?: string[] }>(entries: T[], tag: string): T[] {
  return entries.filter(entry => hasTag(entry, tag));
}

/**
 * Filter to ONLY include entries with ANY of the specified tags
 * Use this for "show me entries with bread OR pasta" type queries
 */
export function filterByAnyTag<T extends { tags?: string[] }>(entries: T[], tags: readonly string[]): T[] {
  return entries.filter(entry => hasAnyTag(entry, tags));
}

/**
 * Filter to ONLY include entries with ALL of the specified tags
 * Use this for "show me entries with BOTH bread AND cheese" type queries
 */
export function filterByAllTags<T extends { tags?: string[] }>(entries: T[], tags: readonly string[]): T[] {
  return entries.filter(entry => hasAllTags(entry, tags));
}

/**
 * Get all unique tags from a set of entries
 * Useful for building tag filter dropdowns
 */
export function getAllUniqueTags<T extends { tags?: string[] }>(entries: T[]): string[] {
  const tagSet = new Set<string>();
  entries.forEach(entry => {
    if (entry.tags) {
      entry.tags.forEach(tag => tagSet.add(tag));
    }
  });
  return Array.from(tagSet).sort();
}

/**
 * Get tag counts from a set of entries
 * Returns { tagName: count } for building tag clouds or stats
 */
export function getTagCounts<T extends { tags?: string[] }>(entries: T[]): Record<string, number> {
  const counts: Record<string, number> = {};
  entries.forEach(entry => {
    if (entry.tags) {
      entry.tags.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    }
  });
  return counts;
}
