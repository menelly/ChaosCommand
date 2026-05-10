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
 * 🏥💪 REVOLUTIONARY PIN-BASED SQLITE DATABASE SYSTEM
 * 
 * Patent-worthy hybrid architecture that automatically routes medical data
 * to the optimal storage system based on data type and user PIN isolation.
 * 
 * Co-created by Ren & Ace for the Medical Gaslighting Detector™
 */

'use client';

import Database from '@tauri-apps/plugin-sql';

// 🎯 MEDICAL DATA INTERFACES
export interface MedicalEvent {
  id: string;
  type: 'diagnosis' | 'surgery' | 'hospitalization' | 'treatment' | 'test' | 'medication' | 'dismissed_findings';
  title: string;
  date: string;
  endDate?: string;
  provider?: string;
  providerId?: string;
  location?: string;
  description: string;
  status: 'active' | 'resolved' | 'ongoing' | 'scheduled' | 'needs_review';
  severity?: 'mild' | 'moderate' | 'severe' | 'critical';
  tags: string[];
  confidence?: number;
  sources?: string[];
  needsReview?: boolean;
  suggestions?: string[];
  rawText?: string;
  incidentalFindings?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface Provider {
  id: string;
  name: string;
  specialty: string;
  organization: string;
  phone: string;
  address: string;
  website?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  providerId: string;
  providerName: string;
  appointmentDate: string;
  appointmentTime: string;
  type: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 🏗️ PIN-BASED SQLITE DATABASE CLASS
export class MedicalSQLiteDB {
  private db: Database | null = null;
  private userPin: string;
  private dbName: string;

  constructor(userPin?: string) {
    this.userPin = userPin || 'default';
    this.dbName = `medical_data_${this.userPin}.db`;
  }

  // 🚀 INITIALIZE DATABASE WITH MEDICAL SCHEMA
  async initialize(): Promise<void> {
    try {
      console.log(`🔄 Attempting to initialize SQLite database: ${this.dbName}`);

      // Check if we're in a Tauri environment
      if (typeof window === 'undefined' || !window.__TAURI__) {
        throw new Error('Not in Tauri environment - SQLite not available');
      }

      // Connect to PIN-specific database
      this.db = await Database.load(`sqlite:${this.dbName}`);
      console.log(`✅ Connected to SQLite database: ${this.dbName}`);

      // Create medical events table
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS medical_events (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          date TEXT NOT NULL,
          end_date TEXT,
          provider TEXT,
          provider_id TEXT,
          location TEXT,
          description TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          severity TEXT,
          tags TEXT, -- JSON array
          confidence INTEGER DEFAULT 0,
          sources TEXT, -- JSON array
          needs_review BOOLEAN DEFAULT FALSE,
          suggestions TEXT, -- JSON array
          raw_text TEXT,
          incidental_findings TEXT, -- JSON array
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // Create providers table
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS providers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          specialty TEXT NOT NULL,
          organization TEXT NOT NULL,
          phone TEXT,
          address TEXT,
          website TEXT,
          notes TEXT,
          tags TEXT, -- JSON array
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // Create appointments table
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS appointments (
          id TEXT PRIMARY KEY,
          provider_id TEXT NOT NULL,
          provider_name TEXT NOT NULL,
          appointment_date TEXT NOT NULL,
          appointment_time TEXT NOT NULL,
          type TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'scheduled',
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (provider_id) REFERENCES providers (id)
        )
      `);

      // Create indexes for performance
      await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_medical_events_date ON medical_events(date)`);
      await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_medical_events_type ON medical_events(type)`);
      await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_medical_events_provider ON medical_events(provider_id)`);
      await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date)`);
      await this.db.execute(`CREATE INDEX IF NOT EXISTS idx_appointments_provider ON appointments(provider_id)`);

      console.log(`🏥 SQLite database initialized for PIN: ${this.userPin}`);
    } catch (error) {
      console.error('❌ Failed to initialize SQLite database:', error);
      throw error;
    }
  }

  // 🏥 MEDICAL EVENTS OPERATIONS
  async saveMedicalEvent(event: MedicalEvent): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execute(`
      INSERT OR REPLACE INTO medical_events (
        id, type, title, date, end_date, provider, provider_id, location,
        description, status, severity, tags, confidence, sources, needs_review,
        suggestions, raw_text, incidental_findings, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      event.id, event.type, event.title, event.date, event.endDate || null,
      event.provider || null, event.providerId || null, event.location || null,
      event.description, event.status, event.severity || null,
      JSON.stringify(event.tags), event.confidence || 0,
      JSON.stringify(event.sources || []), event.needsReview || false,
      JSON.stringify(event.suggestions || []), event.rawText || null,
      JSON.stringify(event.incidentalFindings || []),
      event.createdAt, event.updatedAt
    ]);
  }

  async getMedicalEvents(startDate?: string, endDate?: string): Promise<MedicalEvent[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = 'SELECT * FROM medical_events';
    let params: any[] = [];

    if (startDate && endDate) {
      query += ' WHERE date BETWEEN ? AND ?';
      params = [startDate, endDate];
    } else if (startDate) {
      query += ' WHERE date >= ?';
      params = [startDate];
    } else if (endDate) {
      query += ' WHERE date <= ?';
      params = [endDate];
    }

    query += ' ORDER BY date DESC';

    const results = await this.db.select<any[]>(query, params);
    
    return results.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      date: row.date,
      endDate: row.end_date,
      provider: row.provider,
      providerId: row.provider_id,
      location: row.location,
      description: row.description,
      status: row.status,
      severity: row.severity,
      tags: JSON.parse(row.tags || '[]'),
      confidence: row.confidence,
      sources: JSON.parse(row.sources || '[]'),
      needsReview: row.needs_review,
      suggestions: JSON.parse(row.suggestions || '[]'),
      rawText: row.raw_text,
      incidentalFindings: JSON.parse(row.incidental_findings || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async deleteMedicalEvent(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.execute('DELETE FROM medical_events WHERE id = ?', [id]);
  }

  // 🏥 PROVIDERS OPERATIONS
  async saveProvider(provider: Provider): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execute(`
      INSERT OR REPLACE INTO providers (
        id, name, specialty, organization, phone, address, website, notes, tags, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      provider.id, provider.name, provider.specialty, provider.organization,
      provider.phone, provider.address, provider.website || null, provider.notes || null,
      JSON.stringify(provider.tags || []), provider.createdAt, provider.updatedAt
    ]);
  }

  async getProviders(): Promise<Provider[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.select<any[]>('SELECT * FROM providers ORDER BY name');
    
    return results.map(row => ({
      id: row.id,
      name: row.name,
      specialty: row.specialty,
      organization: row.organization,
      phone: row.phone,
      address: row.address,
      website: row.website,
      notes: row.notes,
      tags: JSON.parse(row.tags || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async deleteProvider(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.execute('DELETE FROM providers WHERE id = ?', [id]);
  }

  // 📅 APPOINTMENTS OPERATIONS
  async saveAppointment(appointment: Appointment): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execute(`
      INSERT OR REPLACE INTO appointments (
        id, provider_id, provider_name, appointment_date, appointment_time, type, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      appointment.id, appointment.providerId, appointment.providerName,
      appointment.appointmentDate, appointment.appointmentTime, appointment.type,
      appointment.status, appointment.notes || null, appointment.createdAt, appointment.updatedAt
    ]);
  }

  async getAppointments(startDate?: string, endDate?: string): Promise<Appointment[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = 'SELECT * FROM appointments';
    let params: any[] = [];

    if (startDate && endDate) {
      query += ' WHERE appointment_date BETWEEN ? AND ?';
      params = [startDate, endDate];
    }

    query += ' ORDER BY appointment_date DESC, appointment_time DESC';

    const results = await this.db.select<any[]>(query, params);
    
    return results.map(row => ({
      id: row.id,
      providerId: row.provider_id,
      providerName: row.provider_name,
      appointmentDate: row.appointment_date,
      appointmentTime: row.appointment_time,
      type: row.type,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  // 🔍 SEARCH AND ANALYTICS
  async searchMedicalEvents(searchTerm: string): Promise<MedicalEvent[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.select<any[]>(`
      SELECT * FROM medical_events 
      WHERE title LIKE ? OR description LIKE ? OR provider LIKE ?
      ORDER BY date DESC
    `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);

    return results.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      date: row.date,
      endDate: row.end_date,
      provider: row.provider,
      providerId: row.provider_id,
      location: row.location,
      description: row.description,
      status: row.status,
      severity: row.severity,
      tags: JSON.parse(row.tags || '[]'),
      confidence: row.confidence,
      sources: JSON.parse(row.sources || '[]'),
      needsReview: row.needs_review,
      suggestions: JSON.parse(row.suggestions || '[]'),
      rawText: row.raw_text,
      incidentalFindings: JSON.parse(row.incidental_findings || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  // 🔄 DATABASE MANAGEMENT
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

// 🌟 GLOBAL INSTANCE MANAGER
let globalSQLiteDB: MedicalSQLiteDB | null = null;

export async function getMedicalSQLiteDB(userPin?: string): Promise<MedicalSQLiteDB> {
  if (!globalSQLiteDB || (userPin && globalSQLiteDB['userPin'] !== userPin)) {
    globalSQLiteDB = new MedicalSQLiteDB(userPin);
    await globalSQLiteDB.initialize();
  }
  return globalSQLiteDB;
}
