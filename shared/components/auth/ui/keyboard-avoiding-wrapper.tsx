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

import { ReactNode, useEffect, useState } from "react"

interface KeyboardAvoidingWrapperProps {
  children: ReactNode
  className?: string
}

export function KeyboardAvoidingWrapper({ 
  children, 
  className = "" 
}: KeyboardAvoidingWrapperProps) {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    // Only run on mobile/PWA environments
    if (typeof window === 'undefined') return

    const handleResize = () => {
      // Detect virtual keyboard on mobile by viewport height change
      const viewportHeight = window.visualViewport?.height || window.innerHeight
      const windowHeight = window.screen.height
      
      // If viewport is significantly smaller than screen, keyboard is likely open
      const keyboardOpen = windowHeight - viewportHeight > 150
      
      if (keyboardOpen) {
        setKeyboardHeight(windowHeight - viewportHeight)
      } else {
        setKeyboardHeight(0)
      }
    }

    // Listen for viewport changes (mobile keyboard)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize)
      return () => window.visualViewport?.removeEventListener('resize', handleResize)
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div 
      className={`transition-all duration-300 ${className}`}
      style={{
        paddingBottom: keyboardHeight > 0 ? `${Math.min(keyboardHeight, 300)}px` : '0px'
      }}
    >
      {children}
    </div>
  )
}
