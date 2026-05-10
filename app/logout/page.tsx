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
'use client'

import React, { useEffect } from 'react'
import { useUser } from '@/lib/contexts/user-context'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const { logout } = useUser()
  const router = useRouter()

  useEffect(() => {
    // Immediately logout and redirect to home/login
    logout()
    router.push('/')
  }, [logout, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-2xl mb-2">🚪</div>
        <p className="text-muted-foreground">Logging out...</p>
      </div>
    </div>
  )
}
