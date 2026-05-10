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
import { Calendar, User, FileText, ThumbsUp, ThumbsDown, TestTube, Heart, Pill, Save, Star } from 'lucide-react';

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

interface AppointmentReview {
  id: string;
  providerId: string;
  providerName: string;
  appointmentDate: string;
  wentWell: string;
  couldImprove: string;
  testsOrReferrals: string;
  doctorFeeling: string;
  diagnosisMedChanges: string;
  followUpNeeded: string;
  overallRating: number;
  createdAt: string;
  updatedAt: string;
}

interface AppointmentReviewProps {
  onSave?: (review: AppointmentReview) => void;
  existingReview?: AppointmentReview;
  preSelectedProviderId?: string;
}

export default function AppointmentReview({ onSave, existingReview, preSelectedProviderId }: AppointmentReviewProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>(preSelectedProviderId || '');
  const [formData, setFormData] = useState({
    appointmentDate: '',
    wentWell: '',
    couldImprove: '',
    testsOrReferrals: '',
    doctorFeeling: '',
    diagnosisMedChanges: '',
    followUpNeeded: '',
    overallRating: 0,
  });

  const { getCategoryData, saveData, isLoading } = useDailyData();

  // Load providers from storage
  useEffect(() => {
    const loadProviders = async () => {
      if (isLoading) return;

      try {
        const records = await getCategoryData(CATEGORIES.USER, SUBCATEGORIES.PROVIDERS);
        const providerList: any[] = [];

        records.forEach(record => {
          if (record.content) {
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

  // Load existing review data
  useEffect(() => {
    if (existingReview) {
      setSelectedProviderId(existingReview.providerId);
      setFormData({
        appointmentDate: existingReview.appointmentDate,
        wentWell: existingReview.wentWell,
        couldImprove: existingReview.couldImprove,
        testsOrReferrals: existingReview.testsOrReferrals,
        doctorFeeling: existingReview.doctorFeeling,
        diagnosisMedChanges: existingReview.diagnosisMedChanges,
        followUpNeeded: existingReview.followUpNeeded,
        overallRating: existingReview.overallRating,
      });
    }
  }, [existingReview]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProviderSelect = (providerId: string) => {
    setSelectedProviderId(providerId);
  };

  const handleSave = async () => {
    if (!selectedProviderId || !formData.appointmentDate) {
      alert('Please select a provider and appointment date');
      return;
    }

    const selectedProvider = providers.find(p => p.id === selectedProviderId);
    if (!selectedProvider) return;

    const review: AppointmentReview = {
      id: existingReview?.id || Date.now().toString(),
      providerId: selectedProviderId,
      providerName: selectedProvider.name,
      appointmentDate: formData.appointmentDate,
      wentWell: formData.wentWell,
      couldImprove: formData.couldImprove,
      testsOrReferrals: formData.testsOrReferrals,
      doctorFeeling: formData.doctorFeeling,
      diagnosisMedChanges: formData.diagnosisMedChanges,
      followUpNeeded: formData.followUpNeeded,
      overallRating: formData.overallRating,
      createdAt: existingReview?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to storage
    try {
      await saveData(
        new Date().toISOString().split('T')[0],
        CATEGORIES.USER,
        `appointment-review-${review.id}`,
        JSON.stringify(review)
      );

      if (onSave) {
        onSave(review);
      }
    } catch (error) {
      console.error('Failed to save appointment review:', error);
      alert('Failed to save appointment review: ' + error);
    }
  };

  const selectedProvider = providers.find(p => p.id === selectedProviderId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <FileText className="h-6 w-6 text-green-500" />
          Appointment Review
        </h2>
        <p className="text-muted-foreground">
          Record details about your recent appointment
        </p>
      </div>

      {/* Provider Selection */}
      <Card className="p-6">
        <div className="space-y-4">
          <Label className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Select Provider
          </Label>
          
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
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm">
                <strong>{selectedProvider.name}</strong> - {selectedProvider.specialty}
              </p>
              <p className="text-sm text-muted-foreground">{selectedProvider.organization}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Appointment Date */}
      <Card className="p-6">
        <div className="space-y-4">
          <Label className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Appointment Date
          </Label>
          
          <Input
            type="date"
            value={formData.appointmentDate}
            onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
          />
        </div>
      </Card>

      {/* Overall Rating */}
      <Card className="p-6">
        <div className="space-y-4">
          <Label className="text-lg font-semibold flex items-center gap-2">
            <Star className="h-5 w-5" />
            Overall Rating
          </Label>
          
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button
                key={rating}
                variant={formData.overallRating >= rating ? "default" : "outline"}
                size="sm"
                onClick={() => handleInputChange('overallRating', rating)}
                className="w-12 h-12"
              >
                <Star className={`h-5 w-5 ${formData.overallRating >= rating ? 'fill-current' : ''}`} />
              </Button>
            ))}
          </div>
          {formData.overallRating > 0 && (
            <p className="text-sm text-muted-foreground">
              {formData.overallRating} out of 5 stars
            </p>
          )}
        </div>
      </Card>

      {/* Review Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* What Went Well */}
        <Card className="p-6">
          <div className="space-y-4">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-green-500" />
              What Went Well?
            </Label>
            <Textarea
              value={formData.wentWell}
              onChange={(e) => handleInputChange('wentWell', e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </Card>

        {/* Could Have Improved */}
        <Card className="p-6">
          <div className="space-y-4">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <ThumbsDown className="h-5 w-5 text-orange-500" />
              What Could Have Improved?
            </Label>
            <Textarea
              value={formData.couldImprove}
              onChange={(e) => handleInputChange('couldImprove', e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </Card>

        {/* Tests or Referrals */}
        <Card className="p-6">
          <div className="space-y-4">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <TestTube className="h-5 w-5 text-blue-500" />
              Tests or Referrals
            </Label>
            <Textarea
              value={formData.testsOrReferrals}
              onChange={(e) => handleInputChange('testsOrReferrals', e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </Card>

        {/* Doctor's Attitude */}
        <Card className="p-6">
          <div className="space-y-4">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              How Did the Doctor Seem?
            </Label>
            <Textarea
              value={formData.doctorFeeling}
              onChange={(e) => handleInputChange('doctorFeeling', e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </Card>
      </div>

      {/* Additional Information */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="space-y-4">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <Pill className="h-5 w-5 text-purple-500" />
              Diagnosis & Medication Changes
            </Label>
            <Textarea
              value={formData.diagnosisMedChanges}
              onChange={(e) => handleInputChange('diagnosisMedChanges', e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-500" />
              Follow-Up Needed
            </Label>
            <Textarea
              value={formData.followUpNeeded}
              onChange={(e) => handleInputChange('followUpNeeded', e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleSave}
          disabled={!selectedProviderId || !formData.appointmentDate}
          className="gap-2"
          size="lg"
        >
          <Save className="h-5 w-5" />
          {existingReview ? 'Update Review' : 'Save Appointment Review'}
        </Button>
      </div>
    </div>
  );
}
