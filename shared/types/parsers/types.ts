/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/**
 * PARSER TYPE DEFINITIONS
 *
 * Types for the text parsing system used to extract structured data
 * from healthcare provider documents, prescriptions, etc.
 */

export interface ParserPattern {
  name: string
  regex: RegExp
  field: string
  confidence: number
  transform?: (value: string) => string
  priority: number
}

export interface ParsedField {
  value: string
  confidence: number
  source: string
}

export interface ParseResult {
  success: boolean
  data: Record<string, ParsedField>
  rawMatches: Array<{
    pattern: string
    match: string
    field: string
    confidence: number
  }>
  errors?: string[]
}

export interface ParserConfig {
  name: string
  description: string
  patterns: ParserPattern[]
  requiredFields?: string[]
  postProcess?: (result: ParseResult) => ParseResult
}
