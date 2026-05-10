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
 * PROVIDER TEXT PARSER CONFIG
 * 
 * Patterns for parsing healthcare provider information from various sources
 * (AdventHealth, Mayo Clinic, Kaiser, etc.)
 */

import { ParserConfig, ParserPattern } from '../types';

// Helper functions for transformations
const cleanName = (name: string): string => {
  return name
    .replace(/,?\s*(MD|DO|NP|PA|FNP-C|RN|DDS|DMD|OD|PharmD|PhD|APRN|CNP|CRNP)\s*$/i, '')
    .replace(/Dr\.?\s*/i, '')
    .trim();
};

const cleanPhone = (phone: string): string => {
  // Extract just the digits and format
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
};

const cleanAddress = (address: string): string => {
  return address
    .replace(/^(Directions to|Address:?)\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Provider parsing patterns
const providerPatterns: ParserPattern[] = [
  // Names - look for credentials after names
  {
    name: 'name_with_credentials',
    regex: /([A-Z][a-z]+ (?:[A-Z][a-z]+ )*[A-Z][a-z]+),?\s*(?:MD|DO|NP|PA|FNP-C|RN|DDS|DMD|OD|PharmD|PhD|APRN|CNP|CRNP)/i,
    field: 'name',
    confidence: 0.7,
    transform: cleanName,
    priority: 10
  },
  
  // Names - Dr. prefix
  {
    name: 'name_with_dr_prefix',
    regex: /Dr\.?\s+([A-Z][a-z]+ (?:[A-Z][a-z]+ )*[A-Z][a-z]+)/i,
    field: 'name',
    confidence: 0.65,
    transform: cleanName,
    priority: 9
  },

  // Phone numbers
  {
    name: 'phone_standard',
    regex: /(?:Call|Phone|Tel|Contact).*?(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/i,
    field: 'phone',
    confidence: 0.95,
    transform: cleanPhone,
    priority: 8
  },
  
  {
    name: 'phone_standalone',
    regex: /(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/,
    field: 'phone',
    confidence: 0.8,
    transform: cleanPhone,
    priority: 7
  },

  // Specialties
  {
    name: 'specialty_common',
    regex: /(Family Medicine|Internal Medicine|Pediatrics|Cardiology|Dermatology|Orthopedics|Neurology|Psychiatry|Radiology|Emergency Medicine|Anesthesiology|Pathology|Surgery|Oncology|Endocrinology|Gastroenterology|Pulmonology|Nephrology|Rheumatology|Urology|Ophthalmology|Otolaryngology|Obstetrics|Gynecology|Plastic Surgery)/i,
    field: 'specialty',
    confidence: 0.9,
    priority: 6
  },

  // Organizations/Health Systems
  {
    name: 'organization_health_system',
    regex: /(AdventHealth|Mayo Clinic|Kaiser Permanente|Cleveland Clinic|Johns Hopkins|Mount Sinai|NYU Langone|UCLA Health|UCSF Health|Stanford Health|Scripps|Sutter Health|Providence|Intermountain|Geisinger|Partners HealthCare|Mass General|Brigham|Children's Hospital|Memorial Sloan Kettering)(?:\s+(?:Medical Group|Health System|Hospital|Clinic))?/i,
    field: 'organization',
    confidence: 0.9,
    priority: 5
  },

  {
    name: 'organization_medical_group',
    regex: /([A-Z][a-zA-Z\s]+(?:Medical Group|Health Group|Physician Group|Associates|Clinic))/,
    field: 'organization',
    confidence: 0.7,
    priority: 4
  },



  // ⚠️ ADDRESS PARSING WARNING: Currently US-centric patterns
  // These patterns work best with US addresses and may not work well with international addresses

  // Addresses - US ZIP code patterns (5 digits or 5+4)
  {
    name: 'address_with_zip_plus_four',
    regex: /([0-9]+[^0-9]*(?:Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Lane|Ln|Road|Rd|Parkway|Pkwy|Place|Pl|Circle|Cir|Court|Ct|Way)[^0-9]*[0-9]{5}-[0-9]{4})/i,
    field: 'address',
    confidence: 0.8,
    transform: cleanAddress,
    priority: 5
  },

  // Addresses - US 5-digit ZIP
  {
    name: 'address_with_zip',
    regex: /([0-9]+[^0-9]*(?:Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Lane|Ln|Road|Rd|Parkway|Pkwy|Place|Pl|Circle|Cir|Court|Ct|Way)[^0-9]*[0-9]{5})/i,
    field: 'address',
    confidence: 0.7,
    transform: cleanAddress,
    priority: 4
  },

  // Addresses - 3 number groups + 5-digit ZIP+4 (street + suite + building)
  {
    name: 'address_three_numbers_zip_plus_four',
    regex: /([0-9]+[^0-9]+[0-9]+[^0-9]+[0-9]+[^0-9]+[0-9]{5}-[0-9]{4})/i,
    field: 'address',
    confidence: 0.8,
    transform: cleanAddress,
    priority: 8
  },

  // Addresses - 3 number groups + 5-digit ZIP (street + suite + building)
  {
    name: 'address_three_numbers_zip',
    regex: /([0-9]+[^0-9]+[0-9]+[^0-9]+[0-9]+[^0-9]+[0-9]{5})/i,
    field: 'address',
    confidence: 0.7,
    transform: cleanAddress,
    priority: 7
  },

  // Addresses - 2 number groups + 5-digit ZIP+4
  {
    name: 'address_two_numbers_zip_plus_four',
    regex: /([0-9]+[^0-9]*[0-9]+[^0-9]*[0-9]{5}-[0-9]{4})/i,
    field: 'address',
    confidence: 0.7,
    transform: cleanAddress,
    priority: 6
  },

  // Addresses - 2 number groups + 5-digit ZIP
  {
    name: 'address_two_numbers_zip',
    regex: /([0-9]+[^0-9]*[0-9]+[^0-9]*[0-9]{5})/i,
    field: 'address',
    confidence: 0.6,
    transform: cleanAddress,
    priority: 5
  },

  // Addresses - 1 number group + 5-digit ZIP+4 (no suite)
  {
    name: 'address_one_number_zip_plus_four',
    regex: /([0-9]+[^0-9]*[0-9]{5}-[0-9]{4})/i,
    field: 'address',
    confidence: 0.6,
    transform: cleanAddress,
    priority: 4
  },

  // Addresses - 1 number group + 5-digit ZIP (no suite)
  {
    name: 'address_one_number_zip',
    regex: /([0-9]+[^0-9]*[0-9]{5})/i,
    field: 'address',
    confidence: 0.5,
    transform: cleanAddress,
    priority: 3
  },

  // City, State, ZIP - but don't use as address, just for splitting
  {
    name: 'city_state_zip',
    regex: /([A-Z][a-z\s]+),\s*([A-Z]{2})\s+([0-9]{5}(?:-[0-9]{4})?)/,
    field: 'location',
    confidence: 0.9,
    priority: 2
  },



  // New patient status
  {
    name: 'accepts_new_patients',
    regex: /(Accepts New Patients|Accepting New Patients|New Patients Welcome)/i,
    field: 'acceptsNewPatients',
    confidence: 0.9,
    transform: () => 'Yes',
    priority: 1
  },

  {
    name: 'not_accepting_patients',
    regex: /(Not Accepting New Patients|Closed to New Patients)/i,
    field: 'acceptsNewPatients',
    confidence: 0.9,
    transform: () => 'No',
    priority: 1
  }
];

// Post-processing function to clean up and enhance results
const postProcessProvider = (result: any) => {
  // Split location into city, state, zip if we got it as one field
  if (result.data.location) {
    const locationMatch = result.data.location.value.match(/([A-Z][a-z\s]+),\s*([A-Z]{2})\s+([0-9]{5}(?:-[0-9]{4})?)/);
    if (locationMatch) {
      result.data.city = {
        value: locationMatch[1].trim(),
        confidence: result.data.location.confidence,
        source: 'location_split'
      };
      result.data.state = {
        value: locationMatch[2],
        confidence: result.data.location.confidence,
        source: 'location_split'
      };
      result.data.zipCode = {
        value: locationMatch[3],
        confidence: result.data.location.confidence,
        source: 'location_split'
      };
      delete result.data.location;
    }
  }

  return result;
};

export const providerParserConfig: ParserConfig = {
  name: 'provider',
  description: 'Parse healthcare provider information from text',
  patterns: providerPatterns,
  requiredFields: ['name'], // At minimum we need a name
  postProcess: postProcessProvider
};
