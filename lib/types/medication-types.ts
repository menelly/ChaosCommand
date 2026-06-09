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
 * MEDICATION TRACKER TYPES
 * 
 * TypeScript interfaces for the medication tracking system.
 * Based on the excellent caresv3 structure but adapted for Dexie/React.
 */

// ============================================================================
// MEDICATION KIND (CHA-307)
// ============================================================================

// What KIND of thing this is. Supplements & OTC interact with prescriptions
// (e.g. 5-HTP + an SSRI, St. John's Wort ↔ tons of Rx, vitamin K ↔ warfarin),
// so the med list / doctor PDF must capture them too — otherwise the picture is
// incomplete at exactly the moment someone reviews for safety. The point here is
// VISIBILITY/COMPLETENESS (show everything together for a human/pharmacist to
// review), NOT auto-diagnosing interactions. A supplement is just a med that
// isn't prescribed — same fields, different label.
export type MedicationKind = 'prescription' | 'otc' | 'supplement';

// Display metadata per kind — reused by the form toggle, the med card badge,
// and the doctor PDF so the wording stays consistent everywhere.
export const MEDICATION_KIND_META: Record<MedicationKind, { label: string; short: string; icon: string }> = {
  prescription: { label: 'Prescription', short: 'Rx', icon: '℞' },
  otc:          { label: 'Over-the-counter', short: 'OTC', icon: '🛒' },
  supplement:   { label: 'Supplement', short: 'Supplement', icon: '🌿' },
};

// Back-compat: anything without a kind (everything created before CHA-307) is a
// prescription. Use this everywhere instead of reading m.kind directly.
export function medicationKind(m: { kind?: MedicationKind }): MedicationKind {
  return m.kind || 'prescription';
}

// ============================================================================
// CORE MEDICATION INTERFACE
// ============================================================================

export interface Medication {
  // Core identification (only brandName OR genericName required)
  id: string;                           // UUID for database
  brandName?: string;                   // "Tylenol", "Advil" - OPTIONAL
  genericName?: string;                 // "acetaminophen", "ibuprofen" - OPTIONAL

  // What kind of thing this is (CHA-307). Optional + defaults to 'prescription'
  // (via medicationKind()) so existing records keep working unchanged.
  kind?: MedicationKind;

  // Dosing information (all optional)
  dose?: string;                        // "500mg", "2 tablets"
  time?: string;                        // "Morning", "8:00 AM", "With dinner"
  requiresFood?: boolean;               // Take with food flag
  
  // Medical provider info (all optional)
  prescribingDoctor?: string;           // "Dr. Sarah Johnson"
  doctorPhone?: string;                 // "(555) 123-4567"
  
  // Pharmacy info (all optional)
  pharmacy?: string;                    // "CVS", "Walgreens"
  pharmacyPhone?: string;               // "(555) 987-6543"
  pharmacyWebsite?: string;             // "https://www.cvs.com" — full URL for online refill portals
  
  // Timeline info (all optional)
  dateStarted?: string;                 // "2025-06-17" - YYYY-MM-DD format
  dateStopped?: string;                 // "2025-09-04" - YYYY-MM-DD format. When you stopped taking it.
  discontinuedReason?: string;          // Free text — why you stopped. "didn't work", "side effects", "switched to X", etc.
  showOnTimeline?: boolean;             // Show on the medical timeline view? Defaults to true (undefined treated as true).
  lastFillDate?: string;                // "2025-06-17" - When prescription was last filled
  refillDate?: string;                  // "2025-07-15" - YYYY-MM-DD format (can be auto-calculated)
  
  // Medical context (all optional)
  conditionTreating?: string;           // "Pain", "Anxiety", "Diabetes"
  
  // Side effects tracking (all optional)
  sideEffectsOnStarting?: string;       // Free text - initial side effects
  persistentSideEffects?: string;       // Free text - ongoing side effects
  
  // General notes (optional)
  notes?: string;                       // Any additional notes

  // Tags system (optional)
  tags?: string[];                      // Custom user-defined tags

  // Status and reminders (optional)
  active?: boolean;                     // Is this medication currently active?
  dailyMaintain?: boolean;             // Show in the daily "taken today" Maintain checklist?
                                        // TRUE = daily scheduled med (BP pill, thyroid, etc.).
                                        // FALSE/undefined = as-needed/emergency (epipen, Baqsimi,
                                        // rescue inhaler) — stays in the Manage registry only.
  enableReminders?: boolean;            // Should we send reminders?
  reminderTimes?: string[];             // ["8:00 AM", "6:30 PM"]

  // Refill reminder system (optional)
  enableRefillReminders?: boolean;      // Should we send refill reminders?
  refillReminderDays?: number;          // Days before refill date to remind (default: 3)
  refillIntervalDays?: number;          // How often to refill (e.g., 30 days, 90 days)
  lastRefillRequestSent?: string;       // ISO timestamp when "refill request sent" was clicked
  lastMedsAcquired?: string;            // ISO timestamp when "meds acquired" was clicked
  
  // Metadata (auto-generated)
  createdAt: string;                    // ISO timestamp
  updatedAt: string;                    // ISO timestamp
}

// ============================================================================
// FORM DATA INTERFACE
// ============================================================================

export interface MedicationFormData {
  // Same as Medication but without metadata
  brandName: string;
  genericName: string;
  kind: MedicationKind;
  dose: string;
  time: string;
  requiresFood: boolean;
  prescribingDoctor: string;
  doctorPhone: string;
  pharmacy: string;
  pharmacyPhone: string;
  pharmacyWebsite: string;
  dateStarted: string;
  dateStopped: string;
  discontinuedReason: string;
  showOnTimeline: boolean;
  lastFillDate: string;
  refillDate: string;
  conditionTreating: string;
  sideEffectsOnStarting: string;
  persistentSideEffects: string;
  notes: string;
  tags: string[];
  active: boolean;
  dailyMaintain: boolean;
  enableReminders: boolean;
  reminderTimes: string[];
  enableRefillReminders: boolean;
  refillReminderDays: number;
  refillIntervalDays: number;
}

// ============================================================================
// DATABASE STORAGE INTERFACE
// ============================================================================

export interface MedicationDatabaseRecord {
  // This is what gets stored in Dexie daily_data table
  date: string;                         // Storage date (usually today for medications)
  category: 'tracker';                  // Always 'tracker'
  subcategory: 'medications';           // Always 'medications'
  content: Medication;                  // The actual medication data
  tags?: string[];                      // Optional tags for searching
}

// ============================================================================
// SEARCH AND FILTER INTERFACES
// ============================================================================

export interface MedicationSearchFilters {
  searchQuery?: string;                 // Search by name, condition, doctor
  activeOnly?: boolean;                 // Show only active medications
  hasReminders?: boolean;               // Show only medications with reminders
  needsRefill?: boolean;                // Show medications needing refill soon
  tags?: string[];                      // Filter by tags
}

export interface MedicationSearchResult {
  medication: Medication;
  matchedFields: string[];              // Which fields matched the search
  relevanceScore: number;               // Search relevance (0-1)
}

// ============================================================================
// COMPONENT PROP INTERFACES
// ============================================================================

export interface MedicationCardProps {
  medication: Medication;
  onEdit: (medication: Medication) => void;
  onDelete: (id: string) => void;
  onToggleReminders: (id: string, enabled: boolean) => void;
  onUpdateReminders: (id: string, times: string[]) => void;
  onRefillRequestSent: (id: string) => void;
  onMedsAcquired: (id: string) => void;
  onResetRefillTimer: (id: string, newRefillDate: string) => void;
}

export interface MedicationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MedicationFormData) => void;
  initialData?: Partial<MedicationFormData>;
  isEditing?: boolean;
}

export interface MedicationListProps {
  medications: Medication[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddNew: () => void;
  onEdit: (medication: Medication) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

// ============================================================================
// HOOK RETURN INTERFACES
// ============================================================================

export interface UseMedicationTrackerReturn {
  // Data
  medications: Medication[];
  filteredMedications: Medication[];
  
  // Actions
  addMedication: (data: MedicationFormData) => Promise<void>;
  updateMedication: (id: string, data: Partial<Medication>) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
  
  // Search and filtering
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: MedicationSearchFilters;
  setFilters: (filters: MedicationSearchFilters) => void;
  
  // Reminders
  updateReminders: (id: string, enabled: boolean, times?: string[]) => Promise<void>;

  // Refill management
  markRefillRequestSent: (id: string) => Promise<void>;
  markMedsAcquired: (id: string) => Promise<void>;
  resetRefillTimer: (id: string, newRefillDate: string) => Promise<void>;
  
  // Status
  isLoading: boolean;
  error: string | null;
  
  // Utility functions
  getMedicationById: (id: string) => Medication | undefined;
  getMedicationsNeedingRefill: (daysAhead?: number) => Medication[];
  searchMedications: (query: string) => MedicationSearchResult[];
}

// ============================================================================
// UTILITY TYPE HELPERS
// ============================================================================

// For creating new medications (without metadata)
export type NewMedication = Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>;

// For updating medications (partial data)
export type MedicationUpdate = Partial<Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>>;

// For form validation
export type MedicationValidationErrors = Partial<Record<keyof MedicationFormData, string>>;

// ============================================================================
// CONSTANTS
// ============================================================================

export const MEDICATION_CATEGORIES = {
  TRACKER: 'tracker' as const,
} as const;

export const MEDICATION_SUBCATEGORIES = {
  MEDICATIONS: 'medications' as const,
} as const;

// Default form data
export const DEFAULT_MEDICATION_FORM: MedicationFormData = {
  brandName: '',
  genericName: '',
  kind: 'prescription',
  dose: '',
  time: '',
  requiresFood: false,
  prescribingDoctor: '',
  doctorPhone: '',
  pharmacy: '',
  pharmacyPhone: '',
  pharmacyWebsite: '',
  dateStarted: '',
  dateStopped: '',
  discontinuedReason: '',
  showOnTimeline: true,
  lastFillDate: '',
  refillDate: '',
  conditionTreating: '',
  sideEffectsOnStarting: '',
  persistentSideEffects: '',
  notes: '',
  tags: [],
  active: true,
  dailyMaintain: false,
  enableReminders: false,
  reminderTimes: [],
  enableRefillReminders: false,
  refillReminderDays: 3,
  refillIntervalDays: 30,
};

// Validation rules
export const MEDICATION_VALIDATION = {
  // At least one name is required
  requiresName: (data: MedicationFormData): boolean => {
    return !!(data.brandName.trim() || data.genericName.trim());
  },
  
  // Phone number format (optional but if provided, should be valid)
  isValidPhone: (phone: string): boolean => {
    if (!phone.trim()) return true; // Optional field
    const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
    return phoneRegex.test(phone);
  },
  
  // Date format validation (optional but if provided, should be valid)
  isValidDate: (date: string): boolean => {
    if (!date.trim()) return true; // Optional field
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(date) && !isNaN(Date.parse(date));
  },
};
