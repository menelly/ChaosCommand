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
 * MEDICATIONS PAGE
 *
 * Main page for medication tracking functionality.
 * Simple wrapper that renders the main medication tracker component.
 */

'use client';
import { useEffect, useState } from 'react';
import { Pill } from 'lucide-react';
import { isTauri } from '@tauri-apps/api/core';
import { MedicationTracker } from '@/components/medications/medication-tracker';
import { Button } from '@/components/ui/button';
import AppCanvas from '@/components/app-canvas';

import Link from "next/link";

export default function MedicationsPage() {
  // Desktop app only (not web, not the phone build). The phone delivers
  // reminders via the OS schedule even when closed; the desktop fires them
  // from an in-app ticker, so the window has to be running. We disclose that
  // honestly and point at the opt-in tray mode that makes closed-fire work.
  const [showDesktopNote, setShowDesktopNote] = useState(false);
  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    setShowDesktopNote(isTauri() && !/Android|iPhone|iPad|iPod/i.test(ua));
  }, []);

  return (
    <AppCanvas currentPage="medications">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            <Pill className="h-8 w-8 text-purple-500" />
            Medication Tracker
          </h1>
          <p className="text-lg text-muted-foreground">
            Keep track of your medications, dosages, refill dates, and set up reminders
          </p>
          {showDesktopNote && (
            <p className="text-xs text-muted-foreground mt-3 max-w-2xl mx-auto">
              💻 On desktop, reminders fire while Command is running — minimizing is
              fine, but fully quitting stops them. Want reminders even when it&apos;s
              closed? Turn on <span className="italic">&ldquo;Remind me on this
              computer&rdquo;</span> in Settings&nbsp;→&nbsp;Notifications to keep Command
              tucked in your system tray. (On your phone, reminders fire either way.)
            </p>
          )}
        </header>

        <MedicationTracker />

        <div className="text-center">
          <Button variant="outline" asChild>
            <Link href="/manage">
              ← Back to Manage
            </Link>
          </Button>
        </div>
      </div>
    </AppCanvas>
  );
}
