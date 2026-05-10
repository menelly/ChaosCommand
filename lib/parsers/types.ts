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
/**
 * TEXT PARSER TYPES
 * 
 * Reusable text parsing system for extracting structured data
 * from unstructured text (provider info, medications, etc.)
 */

export interface ParsedField {
  value: string;
  confidence: number; // 0-1 score of how confident we are
  source: string; // which regex pattern matched
  originalText?: string; // the original matched text
}

export interface ParseResult {
  success: boolean;
  confidence: number; // overall confidence score
  data: Record<string, ParsedField>;
  unparsedText?: string; // text that couldn't be parsed
  errors?: string[];
}

export interface ParserPattern {
  name: string;
  regex: RegExp;
  field: string;
  confidence: number; // base confidence for this pattern
  transform?: (match: string) => string; // optional transformation
  priority?: number; // higher priority patterns checked first
}

export interface ParserConfig {
  name: string;
  description: string;
  patterns: ParserPattern[];
  requiredFields?: string[]; // fields that must be found for success
  postProcess?: (result: ParseResult) => ParseResult; // cleanup function
}

// Specific parser result types
export interface ProviderData {
  name?: ParsedField;
  specialty?: ParsedField;
  organization?: ParsedField;
  phone?: ParsedField;
  address?: ParsedField;
  city?: ParsedField;
  state?: ParsedField;
  zipCode?: ParsedField;
  acceptsNewPatients?: ParsedField;
  website?: ParsedField;
}

export interface MedicationData {
  drugName?: ParsedField;
  dosage?: ParsedField;
  strength?: ParsedField;
  frequency?: ParsedField;
  instructions?: ParsedField;
  quantity?: ParsedField;
  refills?: ParsedField;
  prescriber?: ParsedField;
  pharmacy?: ParsedField;
  rxNumber?: ParsedField;
}

export interface InsuranceData {
  company?: ParsedField;
  memberNumber?: ParsedField;
  groupNumber?: ParsedField;
  phone?: ParsedField;
  policyNumber?: ParsedField;
  planName?: ParsedField;
}
