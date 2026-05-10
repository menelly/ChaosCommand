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
import { Star, Home, Settings, HelpCircle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface CalendarSidebarProps {
  currentMonth: number
  onMonthSelect: (monthIndex: number) => void
}

interface SavedPage {
  id: string
  title: string
  type: 'month' | 'week' | 'day'
  date: string
  url: string
}

export default function CalendarSidebar({ currentMonth, onMonthSelect }: CalendarSidebarProps) {
  const [savedPages, setSavedPages] = useState<SavedPage[]>([])
  const [showSaved, setShowSaved] = useState(false)

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  // Load saved pages from storage
  useEffect(() => {
    // TODO: Load from actual storage when implemented
    setSavedPages([]) // Start with empty array - no fake data!
  }, [])

  const handleHomeClick = () => {
    window.location.href = '/'
  }

  const handleSettingsClick = () => {
    window.location.href = '/settings'
  }

  const handleSavedPageClick = (page: SavedPage) => {
    window.location.href = page.url
  }

  const removeSavedPage = (pageId: string) => {
    setSavedPages(prev => prev.filter(p => p.id !== pageId))
    // TODO: Remove from storage
  }

  return (
    <div
      style={{
        width: "200px",
        backgroundColor: 'var(--surface-1)',
        color: "var(--text-main)",
        borderLeft: `2px solid var(--accent-orange)`,
      }}
      className="flex flex-col p-3 navigation-sidebar flex-shrink-0"
    >
      {/* Home Button */}
      <Button
        onClick={handleHomeClick}
        className="mb-3 p-2 w-full"
        variant="outline"
        title="Home - Command Center"
      >
        <Home className="h-4 w-4 mr-2" />
        Home
      </Button>

      {/* Saved Pages Section */}
      <div className="mb-4">
        <Button
          onClick={() => setShowSaved(!showSaved)}
          variant="ghost"
          className="w-full justify-start p-2 text-sm"
        >
          <Star className="h-4 w-4 mr-2" />
          Saved Pages ({savedPages.length})
        </Button>
        
        {showSaved && (
          <div className="ml-2 mt-2 space-y-1">
            {savedPages.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">
                No saved pages yet. Click the star on any calendar page to save it!
              </p>
            ) : (
              savedPages.map(page => (
                <div key={page.id} className="flex items-center gap-1">
                  <Button
                    onClick={() => handleSavedPageClick(page)}
                    variant="ghost"
                    className="flex-1 justify-start text-xs p-1 h-auto"
                    title={`Go to ${page.title}`}
                  >
                    {page.type === 'month' && '📅'}
                    {page.type === 'week' && '📋'}
                    {page.type === 'day' && '📝'}
                    <span className="ml-1 truncate">{page.title}</span>
                  </Button>
                  <Button
                    onClick={() => removeSavedPage(page.id)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    title="Remove from saved"
                  >
                    ×
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border mb-4"></div>

      {/* Month Navigation */}
      <div className="flex-1">
        <div className="text-center text-xs font-bold mb-3 py-2 px-2 rounded bg-surface-2 border">
          MONTHS
        </div>
        
        {/* Months in chronological order starting from current */}
        <div className="space-y-1">
          {Array.from({ length: 12 }, (_, i) => {
            const monthIndex = (currentMonth + i) % 12
            const month = monthNames[monthIndex]
            const isCurrent = i === 0

            return (
              <Button
                key={monthIndex}
                onClick={() => onMonthSelect(monthIndex)}
                variant={isCurrent ? "default" : "ghost"}
                className={`w-full text-sm p-2 h-auto ${
                  isCurrent
                    ? "font-bold justify-center"
                    : "justify-start"
                }`}
                title={isCurrent ? "Current Month" : `Go to ${month}`}
              >
                {isCurrent ? month.toUpperCase() : month}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="mt-4 pt-4 border-t border-border space-y-2">
        {/* Help Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start p-2 text-sm"
              title="Help & Tips"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Help
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>📅 Calendar Help</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 text-sm">
                  <div>
                    <strong>Navigation:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Click date numbers to go to daily view</li>
                      <li>Click "W#" buttons to go to weekly view</li>
                      <li>Use arrow buttons or sidebar months to navigate</li>
                    </ul>
                  </div>
                  
                  <div>
                    <strong>Writing:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Click in any date cell to start typing</li>
                      <li>Text will wrap and resize automatically</li>
                      <li>Changes save when you click elsewhere</li>
                    </ul>
                  </div>
                  
                  <div>
                    <strong>Bookmarks:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Click the star to save any calendar page</li>
                      <li>Access saved pages from the sidebar</li>
                      <li>Perfect for important dates or planning periods</li>
                    </ul>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {/* Settings */}
        <Button
          onClick={handleSettingsClick}
          variant="ghost"
          className="w-full justify-start p-2 text-sm"
          title="Settings & Customization"
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>
    </div>
  )
}
