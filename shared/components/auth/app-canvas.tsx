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
"use client"

import { useState } from "react"

// Simplified canvas component - sidebar is now handled at layout level

interface AppCanvasProps {
  children: React.ReactNode
  currentPage?: string
}

export default function AppCanvas({ children, currentPage = "index" }: AppCanvasProps) {
  // Simplified canvas - sidebar is now handled at layout level
  const [deviceOverride, setDeviceOverride] = useState<'desktop' | 'tablet' | 'mobile' | null>(null)

  // Apply device override classes
  const getDeviceClasses = () => {
    if (deviceOverride === 'mobile') return 'max-w-sm mx-auto'
    if (deviceOverride === 'tablet') return 'max-w-2xl mx-auto'
    return '' // desktop - full width
  }



  return (
    <div className={`min-h-screen bg-background ${getDeviceClasses()}`}>
      {/* Content Area */}
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}
