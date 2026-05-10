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
 * TEST PIN SETUP UTILITY
 * 
 * Creates a test PIN with bland oatmeal data for analytics development
 * Allows switching between real data and test data easily
 */

import { blandDataGenerator } from './bland-data-generator'
import { gSpot2Generator } from './g-spot-2.0-advanced-bland-generator'
import { getDB, initializeDatabase } from './dexie-db'
import { DailyDataRecord } from './dexie-db'

export interface TestPinConfig {
  testPin: string
  daysOfData: number
  includeReproductiveHealth: boolean
  includeSurvivalData: boolean
}

export class TestPinManager {
  private static readonly TEST_PIN_KEY = 'chaos-test-pins'
  
  /**
   * Get list of existing test PINs
   */
  static getTestPins(): string[] {
    const stored = localStorage.getItem(TestPinManager.TEST_PIN_KEY)
    return stored ? JSON.parse(stored) : []
  }
  
  /**
   * Add a PIN to the test PIN list
   */
  static addTestPin(pin: string): void {
    const testPins = TestPinManager.getTestPins()
    if (!testPins.includes(pin)) {
      testPins.push(pin)
      localStorage.setItem(TestPinManager.TEST_PIN_KEY, JSON.stringify(testPins))
    }
  }
  
  /**
   * Remove a PIN from the test PIN list
   */
  static removeTestPin(pin: string): void {
    const testPins = TestPinManager.getTestPins().filter(p => p !== pin)
    localStorage.setItem(TestPinManager.TEST_PIN_KEY, JSON.stringify(testPins))
  }
  
  /**
   * Check if a PIN is marked as a test PIN
   */
  static isTestPin(pin: string): boolean {
    return TestPinManager.getTestPins().includes(pin)
  }
  
  /**
   * Create a new test PIN with bland data
   */
  static async createTestPin(config: TestPinConfig): Promise<void> {
    try {
      console.log(`🧪 Creating test PIN: ${config.testPin}`)
      
      // Initialize database for the test PIN
      await initializeDatabase(config.testPin)
      const testDB = getDB(config.testPin)
      
      // Generate WORKING bland data for all trackers! 🔧
      console.log(`🥣 Generating ${config.daysOfData} days of reliable bland data...`)
      const blandData = blandDataGenerator.generateAllBlandData(config.daysOfData)
      
      // Add reproductive health data if requested
      if (config.includeReproductiveHealth) {
        const reproData = TestPinManager.generateBlandReproductiveData(config.daysOfData)
        blandData.push(...reproData)
      }
      
      // Add survival button data if requested
      if (config.includeSurvivalData) {
        const survivalData = TestPinManager.generateBlandSurvivalData(config.daysOfData)
        blandData.push(...survivalData)
      }
      
      // Clear any existing data and insert WORKING bland data
      await testDB.daily_data.clear()
      console.log(`💾 Storing ${blandData.length} records of reliable test data...`)
      await testDB.daily_data.bulkAdd(blandData)
      
      // Mark this PIN as a test PIN
      TestPinManager.addTestPin(config.testPin)
      
      console.log(`✅ Test PIN created successfully with ${blandData.length} records of reliable bland data!`)
      
    } catch (error) {
      console.error('❌ Failed to create test PIN:', error)
      throw error
    }
  }
  
  /**
   * Generate bland reproductive health data
   */
  private static generateBlandReproductiveData(daysBack: number): DailyDataRecord[] {
    const dates: string[] = []
    const today = new Date()
    
    for (let i = daysBack; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      dates.push(date.toISOString().split('T')[0])
    }
    
    return dates.map((date, index) => {
      // Create a boring 28-day cycle pattern
      const cycleDay = (index % 28) + 1
      const isFlowDay = cycleDay <= 5
      const isOvulationDay = cycleDay >= 12 && cycleDay <= 16
      
      return {
        date,
        category: 'tracker' as const,
        subcategory: 'reproductive-health',
        content: {
          entries: [{
            id: `test-repro-${date}-${Math.random()}`,
            cycleDay,
            flow: isFlowDay ? 'medium' : 'none',
            symptoms: isFlowDay ? ['mild cramps'] : isOvulationDay ? ['mild bloating'] : [],
            mood: 'normal',
            cervicalMucus: isOvulationDay ? 'clear' : 'none',
            notes: 'regular cycle',
            createdAt: `${date}T10:00:00.000Z`,
            updatedAt: `${date}T10:00:00.000Z`
          }]
        },
        tags: ['reproductive-health', 'normal'],
        metadata: {
          created_at: `${date}T10:00:00.000Z`,
          updated_at: `${date}T10:00:00.000Z`,
          user_id: 'test-user',
          version: 1
        }
      }
    })
  }
  
  /**
   * Generate bland survival button data
   */
  private static generateBlandSurvivalData(daysBack: number): DailyDataRecord[] {
    const dates: string[] = []
    const today = new Date()
    
    for (let i = daysBack; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      dates.push(date.toISOString().split('T')[0])
    }
    
    return dates.map(date => ({
      date,
      category: 'tracker' as const,
      subcategory: 'survival',
      content: {
        entries: [{
          id: `test-survival-${date}-${Math.random()}`,
          time: '3:00 PM',
          level: Math.floor(Math.random() * 3) + 6, // 6-8 (normal range)
          triggers: ['normal day'],
          coping: ['rest', 'water'],
          notes: 'doing okay',
          createdAt: `${date}T15:00:00.000Z`,
          updatedAt: `${date}T15:00:00.000Z`
        }]
      },
      tags: ['survival', 'normal'],
      metadata: {
        created_at: `${date}T15:00:00.000Z`,
        updated_at: `${date}T15:00:00.000Z`,
        user_id: 'test-user',
        version: 1
      }
    }))
  }
  
  /**
   * Quick setup for common test scenarios
   */
  static async createQuickTestPin(scenario: 'basic' | 'full' | 'analytics'): Promise<string> {
    const testPin = `test-${scenario}-${Date.now().toString().slice(-4)}`
    
    const configs = {
      basic: {
        testPin,
        daysOfData: 14,
        includeReproductiveHealth: false,
        includeSurvivalData: true
      },
      full: {
        testPin,
        daysOfData: 60,
        includeReproductiveHealth: true,
        includeSurvivalData: true
      },
      analytics: {
        testPin,
        daysOfData: 90,
        includeReproductiveHealth: true,
        includeSurvivalData: true
      }
    }
    
    await TestPinManager.createTestPin(configs[scenario])
    return testPin
  }
}

// Export convenience functions
export const createTestPin = TestPinManager.createTestPin
export const createQuickTestPin = TestPinManager.createQuickTestPin
export const getTestPins = TestPinManager.getTestPins
export const isTestPin = TestPinManager.isTestPin
