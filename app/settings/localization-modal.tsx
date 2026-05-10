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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Globe } from "lucide-react"

interface LocalizationModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LocalizationModal({ isOpen, onClose }: LocalizationModalProps) {
  const [unitSystem, setUnitSystem] = useState<'freedom' | 'metric'>('freedom')
  const [dateFormat, setDateFormat] = useState<'us' | 'international'>('us')
  const [sundayStart, setSundayStart] = useState(true)
  const [temperatureUnit, setTemperatureUnit] = useState<'fahrenheit' | 'celsius'>('fahrenheit')

  // Load saved localization settings on component mount
  useEffect(() => {
    const savedUnitSystem = localStorage.getItem('chaos-unit-system') as 'freedom' | 'metric' || 'freedom'
    const savedDateFormat = localStorage.getItem('chaos-date-format') as 'us' | 'international' || 'us'
    const savedSundayStart = localStorage.getItem('chaos-sunday-start') !== 'false'
    const savedTemperatureUnit = localStorage.getItem('chaos-temperature-unit') as 'fahrenheit' | 'celsius' || 'fahrenheit'

    setUnitSystem(savedUnitSystem)
    setDateFormat(savedDateFormat)
    setSundayStart(savedSundayStart)
    setTemperatureUnit(savedTemperatureUnit)
  }, [])

  const handleUnitSystemChange = (system: 'freedom' | 'metric') => {
    setUnitSystem(system)
    localStorage.setItem('chaos-unit-system', system)
    
    // Auto-update temperature unit based on system
    const tempUnit = system === 'freedom' ? 'fahrenheit' : 'celsius'
    setTemperatureUnit(tempUnit)
    localStorage.setItem('chaos-temperature-unit', tempUnit)
  }

  const handleDateFormatChange = (format: 'us' | 'international') => {
    setDateFormat(format)
    localStorage.setItem('chaos-date-format', format)
  }

  const handleSundayStartChange = (checked: boolean) => {
    setSundayStart(checked)
    localStorage.setItem('chaos-sunday-start', checked.toString())
  }

  const handleTemperatureUnitChange = (unit: 'fahrenheit' | 'celsius') => {
    setTemperatureUnit(unit)
    localStorage.setItem('chaos-temperature-unit', unit)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Localization Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Unit System */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Measurement System</Label>
            <Select value={unitSystem} onValueChange={handleUnitSystemChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="freedom">
                  <div>
                    <div className="font-medium">🇺🇸 Freedom Units (US)</div>
                    <div className="text-xs text-muted-foreground">Inches, feet, pounds, ounces, Fahrenheit</div>
                  </div>
                </SelectItem>
                <SelectItem value="metric">
                  <div>
                    <div className="font-medium">🌍 Metric System (International)</div>
                    <div className="text-xs text-muted-foreground">Centimeters, meters, kilograms, grams, Celsius</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Format */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Date Format</Label>
            <Select value={dateFormat} onValueChange={handleDateFormatChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us">
                  <div>
                    <div className="font-medium">MM/DD/YYYY (US Style)</div>
                    <div className="text-xs text-muted-foreground">Example: 12/25/2024</div>
                  </div>
                </SelectItem>
                <SelectItem value="international">
                  <div>
                    <div className="font-medium">DD/MM/YYYY (International)</div>
                    <div className="text-xs text-muted-foreground">Example: 25/12/2024</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Week Start */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Calendar Settings</Label>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">
                  Week Start: {sundayStart ? 'Sunday' : 'Monday'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {sundayStart
                    ? '📅 Weeks start on Sunday (US style)'
                    : '📅 Weeks start on Monday (International style)'
                  }
                </div>
              </div>
              <Switch
                checked={sundayStart}
                onCheckedChange={handleSundayStartChange}
              />
            </div>
          </div>

          {/* Temperature Unit Override */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Temperature Unit</Label>
            <Select value={temperatureUnit} onValueChange={handleTemperatureUnitChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fahrenheit">
                  <div>
                    <div className="font-medium">°F Fahrenheit</div>
                    <div className="text-xs text-muted-foreground">US standard temperature scale</div>
                  </div>
                </SelectItem>
                <SelectItem value="celsius">
                  <div>
                    <div className="font-medium">°C Celsius</div>
                    <div className="text-xs text-muted-foreground">International temperature scale</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview Section */}
          <div className="p-4 bg-muted rounded-lg">
            <Label className="text-sm font-medium mb-2 block">Preview</Label>
            <div className="space-y-1 text-sm">
              <div>📏 Height: {unitSystem === 'freedom' ? '5\'6" (66 inches)' : '168 cm'}</div>
              <div>⚖️ Weight: {unitSystem === 'freedom' ? '150 lbs' : '68 kg'}</div>
              <div>💧 Water: {unitSystem === 'freedom' ? '16 fl oz' : '473 ml'}</div>
              <div>🌡️ Temperature: {temperatureUnit === 'fahrenheit' ? '98.6°F' : '37°C'}</div>
              <div>📅 Date: {dateFormat === 'us' ? '07/05/2025' : '05/07/2025'}</div>
              <div>📆 Week: {sundayStart ? 'Sun-Sat' : 'Mon-Sun'}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
