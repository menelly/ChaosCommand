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
'use client';

import React, { createContext, useContext, ReactNode } from 'react';

/**
 * PDF RENDERING CONTEXT
 * 
 * Provides components with information about whether they're being rendered
 * for PDF export vs normal PWA usage. This allows components to adapt their
 * behavior and styling accordingly.
 * 
 * USAGE:
 * - PWA: Interactive elements, animations, click handlers
 * - PDF: Static content, print-friendly styling, no interactivity
 */

export interface PDFContextValue {
  /** Whether the component is being rendered for PDF export */
  isPDFMode: boolean;
  
  /** PDF-specific configuration options */
  pdfConfig?: {
    /** Whether to show static versions of interactive elements */
    showStaticVersions: boolean;
    /** Whether to include help text and instructions */
    includeInstructions: boolean;
    /** Color mode for PDF (color vs grayscale) */
    colorMode: 'color' | 'grayscale';
    /** Page size for layout calculations */
    pageSize: 'letter' | 'a4';
  };
}

const PDFContext = createContext<PDFContextValue>({
  isPDFMode: false,
  pdfConfig: {
    showStaticVersions: true,
    includeInstructions: true,
    colorMode: 'color',
    pageSize: 'letter'
  }
});

export interface PDFProviderProps {
  children: ReactNode;
  isPDFMode?: boolean;
  pdfConfig?: PDFContextValue['pdfConfig'];
}

export function PDFProvider({ 
  children, 
  isPDFMode = false, 
  pdfConfig 
}: PDFProviderProps) {
  const defaultConfig: PDFContextValue['pdfConfig'] = {
    showStaticVersions: true,
    includeInstructions: true,
    colorMode: 'color',
    pageSize: 'letter'
  };

  const value: PDFContextValue = {
    isPDFMode,
    pdfConfig: { ...defaultConfig, ...pdfConfig }
  };

  return (
    <PDFContext.Provider value={value}>
      {children}
    </PDFContext.Provider>
  );
}

/**
 * Hook to access PDF rendering context
 * 
 * @returns PDFContextValue with isPDFMode flag and config
 */
export function usePDFMode(): PDFContextValue {
  const context = useContext(PDFContext);
  
  if (!context) {
    // Default to PWA mode if no provider found
    return {
      isPDFMode: false,
      pdfConfig: {
        showStaticVersions: true,
        includeInstructions: true,
        colorMode: 'color',
        pageSize: 'letter'
      }
    };
  }
  
  return context;
}

/**
 * Utility hook for common PDF mode checks
 */
export function usePDFModeUtils() {
  const { isPDFMode, pdfConfig } = usePDFMode();
  
  return {
    isPDFMode,
    isInteractive: !isPDFMode,
    shouldShowAnimations: !isPDFMode,
    shouldShowStaticVersion: isPDFMode && pdfConfig?.showStaticVersions,
    shouldIncludeInstructions: pdfConfig?.includeInstructions ?? true,
    colorMode: pdfConfig?.colorMode ?? 'color',
    pageSize: pdfConfig?.pageSize ?? 'letter'
  };
}
