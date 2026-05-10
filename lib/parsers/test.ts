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
 * PARSER TESTING
 * 
 * Test the parser with real-world examples
 */

import { parseProviderText } from './index';

// Your AdventHealth example
const adventHealthExample = `
Vola H Le Roux, FNP-C

Family Medicine

 AdventHealth Medical Group
Provider Networks
 Accepts New Patients

Download Contact Information
Tabbed links for navigating sub-sections5 items. To interact with these items, press Control-Option-Shift-Right Arrow
Item 1 of 5
Book an appointment
 Item 3 of 5
Locations
 Item 4 of 5
Expertise
 Item 5 of 5
Reviews and Comments
Locationsfor Vola H Le Roux, FNP-C
A- Daytona Beach
Daytona Beach
About 2.4 miles away
Directions to AdventHealth Medical Group Family Medicine at Daytona Beach305 Memorial Medical Pkwy
Suite 402
Daytona Beach, FL  32117
Call AdventHealth Medical Group Family Medicine at Daytona Beach at386-231-3525
`;

// Test function
export function testAdventHealthParsing() {
  console.log('🧪 Testing AdventHealth Provider Parsing...\n');
  
  const result = parseProviderText(adventHealthExample);
  
  console.log('📊 Parse Result:');
  console.log(`Success: ${result.success}`);
  console.log(`Confidence: ${Math.round(result.confidence * 100)}%\n`);
  
  console.log('📋 Extracted Data:');
  Object.entries(result.data).forEach(([field, data]: [string, any]) => {
    console.log(`${field}: "${data.value}" (${Math.round(data.confidence * 100)}% confidence)`);
  });
  
  if (result.errors && result.errors.length > 0) {
    console.log('\n⚠️ Errors:');
    result.errors.forEach(error => console.log(`- ${error}`));
  }
  
  if (result.unparsedText && result.unparsedText.length > 10) {
    console.log('\n📝 Unparsed Text:');
    console.log(result.unparsedText);
  }
  
  return result;
}

// Run test if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  testAdventHealthParsing();
}
