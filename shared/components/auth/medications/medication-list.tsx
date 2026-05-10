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
 * MEDICATION LIST COMPONENT
 * 
 * Displays a list of medications using the MedicationCard component.
 * Handles loading states and empty states.
 */

'use client';

import { Loader2, Pill, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { MedicationCard } from './medication-card';
import { Medication } from '@/lib/types/medication-types';

interface MedicationListProps {
  medications: Medication[];
  onEdit: (medication: Medication) => void;
  onDelete: (id: string) => void;
  onUpdateReminders: (id: string, enabled: boolean, times?: string[]) => Promise<void>;
  onRefillRequestSent: (id: string) => void;
  onMedsAcquired: (id: string) => void;
  onResetRefillTimer: (id: string, newRefillDate: string) => void;
  isLoading?: boolean;
}

export function MedicationList({
  medications,
  onEdit,
  onDelete,
  onUpdateReminders,
  onRefillRequestSent,
  onMedsAcquired,
  onResetRefillTimer,
  isLoading = false,
}: MedicationListProps) {
  // ============================================================================
  // LOADING STATE
  // ============================================================================
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading medications...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // EMPTY STATE
  // ============================================================================
  
  if (medications.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Pill className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No medications found</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            Get started by adding your first medication. Only a medication name is required!
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            <span>Try adjusting your search or filters</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // MEDICATION LIST
  // ============================================================================
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Your Medications ({medications.length})
        </h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {medications.map((medication) => (
          <MedicationCard
            key={medication.id}
            medication={medication}
            onEdit={onEdit}
            onDelete={onDelete}
            onUpdateReminders={onUpdateReminders}
            onRefillRequestSent={onRefillRequestSent}
            onMedsAcquired={onMedsAcquired}
            onResetRefillTimer={onResetRefillTimer}
          />
        ))}
      </div>
    </div>
  );
}
