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

import React, { useState, useEffect } from 'react';
import { useDailyData } from '@/lib/database/hooks/use-daily-data';
import { CATEGORIES, SUBCATEGORIES } from '@/lib/database/dexie-db';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, FileText, Target, TestTube, Pill, Save, Sparkles } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  specialty: string;
  organization: string;
  phone: string;
  address: string;
  rating?: string;
  website?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface AppointmentPlan {
  id: string;
  providerId: string;
  providerName: string;
  appointmentDate: string;
  appointmentTime: string;
  lastVisitNotes: string;
  newSymptoms: string;
  appointmentGoals: string;
  testsToDiscuss: string;
  medicationQuestions: string;
  questionsToAsk: string;
  importedFromTags: string[];
  addToCalendar: boolean;
  reminderEnabled: boolean;
  reminderDays: number;
  createdAt: string;
  updatedAt: string;
}

interface AppointmentPlannerProps {
  onSave?: (plan: AppointmentPlan) => void;
  existingPlan?: AppointmentPlan;
  preSelectedProviderId?: string;
  onBack?: () => void;
}

export default function AppointmentPlanner({ onSave, existingPlan, preSelectedProviderId, onBack }: AppointmentPlannerProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [formData, setFormData] = useState({
    appointmentDate: '',
    appointmentTime: '',
    lastVisitNotes: '',
    newSymptoms: '',
    appointmentGoals: '',
    testsToDiscuss: '',
    medicationQuestions: '',
    questionsToAsk: '',
    addToCalendar: true,
    reminderEnabled: true,
    reminderDays: 1,
  });
  const [importedTags, setImportedTags] = useState<string[]>([]);

  const { getCategoryData, saveData, isLoading } = useDailyData();

  // Load providers from storage
  useEffect(() => {
    const loadProviders = async () => {
      if (isLoading) return;

      try {
        // Get all USER category records and filter for provider subcategories
        const records = await getCategoryData(new Date().toISOString().split('T')[0], CATEGORIES.USER);
        const providerList: any[] = [];

        records.forEach(record => {
          // Check if this record is a provider (subcategory starts with "providers-")
          if (record.subcategory.startsWith(`${SUBCATEGORIES.PROVIDERS}-`) && record.content) {
            try {
              const provider = JSON.parse(record.content);
              providerList.push(provider);
            } catch (error) {
              console.error('Failed to parse provider record:', error);
            }
          }
        });

        setProviders(providerList);
      } catch (error) {
        console.error('Failed to load providers:', error);
      }
    };
    loadProviders();
  }, [getCategoryData, isLoading]);

  // Load existing plan data and handle pre-selected provider
  useEffect(() => {
    if (existingPlan) {
      setSelectedProviderId(existingPlan.providerId);
      setFormData({
        appointmentDate: existingPlan.appointmentDate,
        appointmentTime: existingPlan.appointmentTime,
        lastVisitNotes: existingPlan.lastVisitNotes,
        newSymptoms: existingPlan.newSymptoms,
        appointmentGoals: existingPlan.appointmentGoals,
        testsToDiscuss: existingPlan.testsToDiscuss,
        medicationQuestions: existingPlan.medicationQuestions,
        questionsToAsk: existingPlan.questionsToAsk,
        addToCalendar: existingPlan.addToCalendar ?? true,
        reminderEnabled: existingPlan.reminderEnabled ?? true,
        reminderDays: existingPlan.reminderDays ?? 1,
      });
      setImportedTags(existingPlan.importedFromTags || []);
    } else if (preSelectedProviderId) {
      setSelectedProviderId(preSelectedProviderId);
    }
  }, [existingPlan, preSelectedProviderId]);

  const handleInputChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProviderSelect = (providerId: string) => {
    setSelectedProviderId(providerId);
  };

  // TODO: This will auto-import from symptom/mood/pain tags when those trackers are built
  const handleAutoImportFromTags = () => {
    // Placeholder for tag-based auto-import
    // This will pull recent symptoms, mood changes, pain levels, etc.
    const mockImportedData = {
      newSymptoms: 'Recent fatigue and joint pain (imported from symptom tracker)',
      appointmentGoals: 'Discuss new symptoms and review current treatment plan',
      testsToDiscuss: 'Blood work to check inflammation markers',
      medicationQuestions: 'Side effects from current medication'
    };
    
    const mockTags = ['fatigue', 'joint-pain', 'inflammation'];
    
    setFormData(prev => ({
      ...prev,
      ...mockImportedData
    }));
    setImportedTags(mockTags);
  };

  const handleSave = async () => {
    if (!selectedProviderId || !formData.appointmentDate) {
      alert('Please select a provider and appointment date');
      return;
    }

    const selectedProvider = providers.find(p => p.id === selectedProviderId);
    if (!selectedProvider) return;

    const plan: AppointmentPlan = {
      id: existingPlan?.id || Date.now().toString(),
      providerId: selectedProviderId,
      providerName: selectedProvider.name,
      appointmentDate: formData.appointmentDate,
      appointmentTime: formData.appointmentTime,
      lastVisitNotes: formData.lastVisitNotes,
      newSymptoms: formData.newSymptoms,
      appointmentGoals: formData.appointmentGoals,
      testsToDiscuss: formData.testsToDiscuss,
      medicationQuestions: formData.medicationQuestions,
      questionsToAsk: formData.questionsToAsk,
      importedFromTags: importedTags,
      addToCalendar: formData.addToCalendar,
      reminderEnabled: formData.reminderEnabled,
      reminderDays: formData.reminderDays,
      createdAt: existingPlan?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to storage
    try {
      await saveData(
        new Date().toISOString().split('T')[0],
        CATEGORIES.USER,
        `appointment-plan-${plan.id}`,
        JSON.stringify(plan)
      );

      if (onSave) {
        onSave(plan);
      }
    } catch (error) {
      console.error('Failed to save appointment plan:', error);
      alert('Failed to save appointment plan: ' + error);
    }
  };

  const selectedProvider = providers.find(p => p.id === selectedProviderId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <Calendar className="h-6 w-6 text-blue-500" />
          Appointment Planner
        </h2>
        <p className="text-muted-foreground">
          Prepare for your upcoming appointment with smart data import
        </p>
      </div>

      {/* Provider Selection */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Select Provider
            </Label>
            {importedTags.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoImportFromTags}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Auto-Import from Tags
              </Button>
            )}
          </div>
          
          <Select value={selectedProviderId} onValueChange={handleProviderSelect}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providers.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{provider.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {provider.specialty} • {provider.organization}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedProvider && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm">
                <strong>{selectedProvider.name}</strong> - {selectedProvider.specialty}
              </p>
              <p className="text-sm text-muted-foreground">{selectedProvider.organization}</p>
              {selectedProvider.phone && (
                <p className="text-sm text-blue-600">{selectedProvider.phone}</p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Appointment Details */}
      <Card className="p-6">
        <div className="space-y-4">
          <Label className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Appointment Details
          </Label>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="appointmentDate">Date *</Label>
              <Input
                id="appointmentDate"
                type="date"
                value={formData.appointmentDate}
                onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="appointmentTime">Time</Label>
              <Input
                id="appointmentTime"
                type="time"
                value={formData.appointmentTime}
                onChange={(e) => handleInputChange('appointmentTime', e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Imported Tags Display */}
      {importedTags.length > 0 && (
        <Card className="p-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Auto-Imported from Tags:</Label>
            <div className="flex flex-wrap gap-2">
              {importedTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Planning Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Last Visit Notes */}
        <Card className="p-6">
          <div className="space-y-4">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes from Last Visit
            </Label>
            <Textarea
              value={formData.lastVisitNotes}
              onChange={(e) => handleInputChange('lastVisitNotes', e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </Card>

        {/* New Symptoms */}
        <Card className="p-6">
          <div className="space-y-4">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5" />
              New Symptoms to Discuss
            </Label>
            <Textarea
              value={formData.newSymptoms}
              onChange={(e) => handleInputChange('newSymptoms', e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </Card>

        {/* Appointment Goals */}
        <Card className="p-6">
          <div className="space-y-4">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5" />
              Goals for This Appointment
            </Label>
            <Textarea
              value={formData.appointmentGoals}
              onChange={(e) => handleInputChange('appointmentGoals', e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </Card>

        {/* Tests to Discuss */}
        <Card className="p-6">
          <div className="space-y-4">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Tests I'd Like to Discuss
            </Label>
            <Textarea
              value={formData.testsToDiscuss}
              onChange={(e) => handleInputChange('testsToDiscuss', e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </Card>
      </div>

      {/* Additional Questions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="space-y-4">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Medication Questions
            </Label>
            <Textarea
              value={formData.medicationQuestions}
              onChange={(e) => handleInputChange('medicationQuestions', e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Other Questions to Ask
            </Label>
            <Textarea
              value={formData.questionsToAsk}
              onChange={(e) => handleInputChange('questionsToAsk', e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </Card>
      </div>

      {/* Calendar & Reminder Options */}
      <Card className="p-6">
        <div className="space-y-4">
          <Label className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar & Reminders
          </Label>

          <div className="space-y-4">
            {/* Add to Calendar */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="addToCalendar"
                checked={formData.addToCalendar}
                onChange={(e) => handleInputChange('addToCalendar', e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="addToCalendar" className="text-sm font-medium">
                📅 Add to my daily calendar
              </Label>
            </div>

            {/* Reminder Options */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="reminderEnabled"
                  checked={formData.reminderEnabled}
                  onChange={(e) => handleInputChange('reminderEnabled', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="reminderEnabled" className="text-sm font-medium">
                  🔔 Set reminder
                </Label>
              </div>

              {formData.reminderEnabled && (
                <div className="ml-6 flex items-center gap-2">
                  <Label htmlFor="reminderDays" className="text-sm">
                    Remind me
                  </Label>
                  <select
                    id="reminderDays"
                    value={formData.reminderDays}
                    onChange={(e) => handleInputChange('reminderDays', parseInt(e.target.value))}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value={1}>1 day before</option>
                    <option value={2}>2 days before</option>
                    <option value={3}>3 days before</option>
                    <option value={7}>1 week before</option>
                  </select>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              💡 Calendar entries will appear in your daily view with appointment details and prep notes
            </p>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleSave}
          disabled={!selectedProviderId || !formData.appointmentDate}
          className="gap-2"
          size="lg"
        >
          <Save className="h-5 w-5" />
          {existingPlan ? 'Update Plan' : 'Save Appointment Plan'}
        </Button>
      </div>
    </div>
  );
}
