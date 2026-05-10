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
 * TEXT PARSERS INDEX
 * 
 * Central export for all text parsing functionality
 */

// Core parser engine
export { TextParser, createParser, mergeParseResults } from './core';

// Types
export type {
  ParsedField,
  ParseResult,
  ParserPattern,
  ParserConfig,
  ProviderData,
  MedicationData,
  InsuranceData
} from './types';

// Parser configurations
export { providerParserConfig } from './configs/provider';

// React component
export { default as TextParserComponent } from '../../components/text-parser';

// Convenience functions for common use cases
import { TextParser } from './core';
import { providerParserConfig } from './configs/provider';

/**
 * Quick provider parsing function
 */
export function parseProviderText(text: string) {
  const parser = new TextParser(providerParserConfig);
  return parser.parse(text);
}

/**
 * Test function to validate parser configs
 */
export function testParser(config: any, sampleText: string) {
  const parser = new TextParser(config);
  return parser.parse(sampleText);
}
