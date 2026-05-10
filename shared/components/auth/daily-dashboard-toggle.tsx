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

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { LayoutDashboard, Plus, Minus } from "lucide-react"

interface DailyDashboardToggleProps {
  trackerId: string
  trackerName: string
  description?: string
  variant?: 'button' | 'switch' | 'compact'
  className?: string
}

export default function DailyDashboardToggle({ 
  trackerId, 
  trackerName, 
  description,
  variant = 'compact',
  className = ""
}: DailyDashboardToggleProps) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Load current state from localStorage
  useEffect(() => {
    const savedWidgets = localStorage.getItem('daily-dashboard-widgets')
    if (savedWidgets) {
      try {
        const enabledWidgets = JSON.parse(savedWidgets)
        setIsEnabled(enabledWidgets.includes(trackerId))
      } catch (error) {
        console.error('Failed to parse dashboard settings:', error)
      }
    }
  }, [trackerId])

  // Toggle the widget on/off
  const toggleWidget = async () => {
    setIsLoading(true)
    
    try {
      const savedWidgets = localStorage.getItem('daily-dashboard-widgets')
      let enabledWidgets: string[] = []
      
      if (savedWidgets) {
        enabledWidgets = JSON.parse(savedWidgets)
      }

      const newEnabled = !isEnabled
      const newEnabledWidgets = newEnabled
        ? [...enabledWidgets, trackerId]
        : enabledWidgets.filter(id => id !== trackerId)

      localStorage.setItem('daily-dashboard-widgets', JSON.stringify(newEnabledWidgets))
      setIsEnabled(newEnabled)

      // Optional: Show a brief success message
      console.log(`${trackerName} ${newEnabled ? 'added to' : 'removed from'} daily dashboard`)
      
    } catch (error) {
      console.error('Failed to update dashboard settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Button variant - larger, more prominent
  if (variant === 'button') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isEnabled ? "default" : "outline"}
              size="sm"
              onClick={toggleWidget}
              disabled={isLoading}
              className={`flex items-center gap-2 ${className}`}
            >
              <LayoutDashboard className="h-4 w-4" />
              {isEnabled ? (
                <>
                  <Minus className="h-3 w-3" />
                  Remove from Daily
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3" />
                  Add to Daily
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isEnabled 
                ? `Remove ${trackerName} from daily dashboard`
                : `Add ${trackerName} widget to daily dashboard`
              }
            </p>
            {description && (
              <p className="text-xs opacity-75 mt-1">{description}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Switch variant - clean toggle with label
  if (variant === 'switch') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Switch
          id={`dashboard-${trackerId}`}
          checked={isEnabled}
          onCheckedChange={toggleWidget}
          disabled={isLoading}
        />
        <Label 
          htmlFor={`dashboard-${trackerId}`}
          className="text-sm cursor-pointer"
        >
          Daily Dashboard
        </Label>
      </div>
    )
  }

  // Compact variant - small icon button (default)
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isEnabled ? "default" : "ghost"}
            size="sm"
            onClick={toggleWidget}
            disabled={isLoading}
            className={`h-8 w-8 p-0 ${className}`}
          >
            {isEnabled ? (
              <Minus className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isEnabled 
              ? `Remove from daily dashboard`
              : `Add to daily dashboard`
            }
          </p>
          <p className="text-xs opacity-75">
            {trackerName} widget
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Hook for checking if a tracker is enabled (useful for conditional rendering)
export function useDailyDashboardStatus(trackerId: string) {
  const [isEnabled, setIsEnabled] = useState(false)

  useEffect(() => {
    const checkStatus = () => {
      const savedWidgets = localStorage.getItem('daily-dashboard-widgets')
      if (savedWidgets) {
        try {
          const enabledWidgets = JSON.parse(savedWidgets)
          setIsEnabled(enabledWidgets.includes(trackerId))
        } catch (error) {
          console.error('Failed to parse dashboard settings:', error)
        }
      }
    }

    checkStatus()

    // Listen for storage changes (in case user toggles in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'daily-dashboard-widgets') {
        checkStatus()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [trackerId])

  return isEnabled
}
