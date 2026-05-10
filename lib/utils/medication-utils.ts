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
 * MEDICATION UTILITIES
 * 
 * Helper functions for medication tracking functionality.
 */

import { Medication } from '@/lib/types/medication-types';

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Format a date string for display
 */
export function formatMedicationDate(dateString: string | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Check if a refill date is coming up soon
 */
export function isRefillSoon(refillDate: string | undefined, daysAhead: number = 7): boolean {
  if (!refillDate) return false;
  
  try {
    const today = new Date();
    const refill = new Date(refillDate);
    const daysUntilRefill = Math.ceil((refill.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilRefill <= daysAhead && daysUntilRefill >= 0;
  } catch {
    return false;
  }
}

/**
 * Check if a refill date is overdue
 */
export function isRefillOverdue(refillDate: string | undefined): boolean {
  if (!refillDate) return false;
  
  try {
    const today = new Date();
    const refill = new Date(refillDate);
    return refill < today;
  } catch {
    return false;
  }
}

/**
 * Get the status of a refill date
 */
export function getRefillStatus(refillDate: string | undefined): 'ok' | 'soon' | 'overdue' | null {
  if (!refillDate) return null;
  
  if (isRefillOverdue(refillDate)) return 'overdue';
  if (isRefillSoon(refillDate)) return 'soon';
  return 'ok';
}

// ============================================================================
// PHONE NUMBER UTILITIES
// ============================================================================

/**
 * Format a phone number for display
 */
export function formatPhoneNumber(phone: string | undefined): string {
  if (!phone) return '';
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX if we have 10 digits
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Return original if we can't format it
  return phone;
}

/**
 * Create a tel: link for phone numbers
 */
export function createPhoneLink(phone: string | undefined): string {
  if (!phone) return '';
  
  const digits = phone.replace(/\D/g, '');
  return `tel:${digits}`;
}

// ============================================================================
// MEDICATION NAME UTILITIES
// ============================================================================

/**
 * Get the display name for a medication (brand or generic)
 */
export function getMedicationDisplayName(medication: Medication): string {
  return medication.brandName || medication.genericName || 'Unnamed Medication';
}

/**
 * Get the secondary name for a medication (the other name if both exist)
 */
export function getMedicationSecondaryName(medication: Medication): string | undefined {
  if (medication.brandName && medication.genericName) {
    return medication.brandName ? medication.genericName : medication.brandName;
  }
  return undefined;
}

/**
 * Check if a medication has both brand and generic names
 */
export function hasSecondaryName(medication: Medication): boolean {
  return !!(medication.brandName && medication.genericName);
}

// ============================================================================
// SEARCH UTILITIES
// ============================================================================

/**
 * Search medications by multiple fields
 */
export function searchMedications(medications: Medication[], query: string): Medication[] {
  if (!query.trim()) return medications;
  
  const searchTerm = query.toLowerCase();
  
  return medications.filter(medication => {
    const searchableFields = [
      medication.brandName,
      medication.genericName,
      medication.conditionTreating,
      medication.prescribingDoctor,
      medication.pharmacy,
      medication.notes,
    ];
    
    return searchableFields.some(field => 
      field && field.toLowerCase().includes(searchTerm)
    );
  });
}

// ============================================================================
// REMINDER TIME UTILITIES
// ============================================================================

/**
 * Format a 24-hour time string to 12-hour format
 */
export function formatTimeFor12Hour(time24: string): string {
  try {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return time24;
  }
}

/**
 * Sort reminder times chronologically
 */
export function sortReminderTimes(times: string[]): string[] {
  return [...times].sort((a, b) => {
    try {
      // Convert to 24-hour format for comparison
      const timeA = convertTo24Hour(a);
      const timeB = convertTo24Hour(b);
      return timeA.localeCompare(timeB);
    } catch {
      return a.localeCompare(b);
    }
  });
}

/**
 * Convert 12-hour time to 24-hour format for sorting
 */
function convertTo24Hour(time12: string): string {
  try {
    const [time, period] = time12.split(' ');
    const [hours, minutes] = time.split(':');
    let hour = parseInt(hours, 10);
    
    if (period.toUpperCase() === 'PM' && hour !== 12) {
      hour += 12;
    } else if (period.toUpperCase() === 'AM' && hour === 12) {
      hour = 0;
    }
    
    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  } catch {
    return time12;
  }
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate that a medication has at least one name
 */
export function validateMedicationName(brandName: string, genericName: string): boolean {
  return !!(brandName.trim() || genericName.trim());
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone.trim()) return true; // Optional field
  
  const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
  return phoneRegex.test(phone);
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function validateDateFormat(date: string): boolean {
  if (!date.trim()) return true; // Optional field
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(date) && !isNaN(Date.parse(date));
}

// ============================================================================
// FILTERING UTILITIES
// ============================================================================

/**
 * Filter medications by active status
 */
export function filterActiveMedications(medications: Medication[]): Medication[] {
  return medications.filter(med => med.active !== false);
}

/**
 * Filter medications with reminders enabled
 */
export function filterMedicationsWithReminders(medications: Medication[]): Medication[] {
  return medications.filter(med => med.enableReminders === true);
}

/**
 * Filter medications needing refill soon
 */
export function filterMedicationsNeedingRefill(
  medications: Medication[], 
  daysAhead: number = 7
): Medication[] {
  return medications.filter(med => isRefillSoon(med.refillDate, daysAhead));
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

/**
 * Convert medication data to CSV format
 */
export function medicationToCSV(medications: Medication[]): string {
  const headers = [
    'Brand Name',
    'Generic Name', 
    'Dose',
    'Time',
    'Requires Food',
    'Condition Treating',
    'Prescribing Doctor',
    'Doctor Phone',
    'Pharmacy',
    'Pharmacy Phone',
    'Date Started',
    'Refill Date',
    'Active',
    'Enable Reminders',
    'Reminder Times',
    'Side Effects (Starting)',
    'Persistent Side Effects',
    'Notes'
  ];
  
  const rows = medications.map(med => [
    med.brandName || '',
    med.genericName || '',
    med.dose || '',
    med.time || '',
    med.requiresFood ? 'Yes' : 'No',
    med.conditionTreating || '',
    med.prescribingDoctor || '',
    med.doctorPhone || '',
    med.pharmacy || '',
    med.pharmacyPhone || '',
    med.dateStarted || '',
    med.refillDate || '',
    med.active !== false ? 'Yes' : 'No',
    med.enableReminders ? 'Yes' : 'No',
    med.reminderTimes?.join('; ') || '',
    med.sideEffectsOnStarting || '',
    med.persistentSideEffects || '',
    med.notes || ''
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
    .join('\n');
    
  return csvContent;
}
