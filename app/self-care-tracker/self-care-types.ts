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
export interface SelfCareEntry {
  id: string
  date: string
  time: string
  
  // Self-Care Activity
  category: 'physical' | 'emotional' | 'mental' | 'spiritual' | 'social' | 'environmental' | 'creative' | 'professional'
  activity: string
  customActivity?: string
  duration: string // how long spent
  
  // Context & Motivation
  motivation: string[] // why you chose this self-care
  energyBefore: number // 1-10 energy level before
  moodBefore: string[] // emotions before
  stressLevelBefore: number // 1-10 stress before
  
  // Experience
  enjoyment: number // 1-10 how much you enjoyed it
  difficulty: number // 1-10 how hard it was to do
  interrupted: boolean // were you interrupted?
  feltGuilty: boolean // did you feel guilty for taking time?
  
  // Results & Impact
  energyAfter: number // 1-10 energy level after
  moodAfter: string[] // emotions after
  stressLevelAfter: number // 1-10 stress after
  physicalImpact: string[] // how your body feels
  mentalImpact: string[] // how your mind feels
  emotionalImpact: string[] // how your heart feels
  
  // Effectiveness & Learning
  effectiveness: number // 1-10 how effective this was
  wouldDoAgain: boolean // would you do this again?
  whatWorked: string[] // what aspects worked well
  whatDidnt: string[] // what could be better
  insights: string // personal insights gained
  
  // Environment & Support
  location: string // where you did this
  alone: boolean // were you alone?
  supportReceived: string[] // who/what supported you
  barriers: string[] // what made it hard
  
  // Planning & Future
  plannedVsSpontaneous: 'planned' | 'spontaneous'
  timeOfDay: string
  seasonalFactors: string[] // weather, season impacts
  nextSteps: string[] // what you want to try next
  
  // General
  notes: string
  tags: string[]
  photos?: string[] // optional photos
  
  // Metadata
  createdAt: string
  updatedAt: string
}

export interface SelfCareActivity {
  value: string
  label: string
  category: 'physical' | 'emotional' | 'mental' | 'spiritual' | 'social' | 'environmental' | 'creative' | 'professional'
  emoji: string
  description: string
  estimatedTime: string
  energyLevel: 'low' | 'medium' | 'high' // energy required
  benefits: string[]
}

export interface SelfCareCategory {
  value: string
  label: string
  emoji: string
  description: string
  color: string
  examples: string[]
}

export interface MoodOption {
  value: string
  label: string
  emoji: string
  category: 'positive' | 'neutral' | 'challenging'
}

export interface MotivationOption {
  value: string
  label: string
  emoji: string
  description: string
}
