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

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Beaker, Database, Trash2, LogIn, Plus } from 'lucide-react'
import { TestPinManager, createQuickTestPin } from '@/lib/database/test-pin-setup'
import { useUser } from '@/lib/contexts/user-context'

interface TestPinManagerProps {
  onClose?: () => void
}

function TestPinManagerComponent({ onClose }: TestPinManagerProps) {
  const [testPins, setTestPins] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [customPin, setCustomPin] = useState('')
  const [daysOfData, setDaysOfData] = useState(30)
  const [includeReproductive, setIncludeReproductive] = useState(true)
  const [includeSurvival, setIncludeSurvival] = useState(true)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  
  const { login, userPin } = useUser()

  useEffect(() => {
    setTestPins(TestPinManager.getTestPins())
    // Check for G-Spot 2.0 debug info
    const debug = localStorage.getItem('gspot2-debug')
    if (debug) {
      setDebugInfo(JSON.parse(debug))
    }
  }, [])

  const refreshTestPins = () => {
    setTestPins(TestPinManager.getTestPins())
  }

  const handleCreateQuickTest = async (scenario: 'basic' | 'full' | 'analytics') => {
    try {
      setIsCreating(true)
      const newPin = await createQuickTestPin(scenario)
      refreshTestPins()
      alert(`✅ Test PIN created: ${newPin}\n\nClick "Switch to PIN" to start using it for analytics testing!`)
    } catch (error) {
      console.error('Failed to create test PIN:', error)
      alert(`❌ Failed to create test PIN: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateCustomTest = async () => {
    if (!customPin.trim() || customPin.length < 4) {
      alert('PIN must be at least 4 characters')
      return
    }

    try {
      setIsCreating(true)
      await TestPinManager.createTestPin({
        testPin: customPin,
        daysOfData,
        includeReproductiveHealth: includeReproductive,
        includeSurvivalData: includeSurvival
      })
      refreshTestPins()
      setCustomPin('')

      // Check for debug info after creation
      setTimeout(() => {
        const debug = localStorage.getItem('gspot2-debug')
        if (debug) {
          setDebugInfo(JSON.parse(debug))
        }
      }, 100)

      alert(`✅ Custom test PIN created: ${customPin}\n\nClick "Switch to PIN" to start using it!`)
    } catch (error) {
      console.error('Failed to create custom test PIN:', error)
      alert(`❌ Failed to create test PIN: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteTestPin = (pin: string) => {
    if (confirm(`Delete test PIN "${pin}"?\n\nThis will remove it from the test PIN list but won't delete the database data.`)) {
      TestPinManager.removeTestPin(pin)
      refreshTestPins()
    }
  }

  const handleSwitchToPin = (pin: string) => {
    console.log('🔄 Switching to PIN:', pin)
    login(pin)
    console.log('✅ PIN switch complete, current PIN:', localStorage.getItem('currentUserPin'))
    console.log('✅ Database PIN:', localStorage.getItem('chaos-user-pin'))
    alert(`✅ Switched to PIN: ${pin}\n\nRefresh the page (F5) to see the test data!`)
    if (onClose) onClose()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Beaker className="h-6 w-6 text-blue-500" />
          Test PIN Manager
        </h2>
        <p className="text-muted-foreground mt-2">
          Create test PINs with bland oatmeal data for analytics development
        </p>
      </div>

      {/* Current PIN Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Current PIN Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Current PIN: </span>
              <code className="bg-muted px-2 py-1 rounded text-sm">
                {userPin ? userPin.replace(/./g, '*') : 'None'}
              </code>
              {userPin && TestPinManager.isTestPin(userPin) && (
                <Badge variant="secondary" className="ml-2">Test PIN</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Test PIN Creation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Test PIN Creation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button 
              onClick={() => handleCreateQuickTest('basic')} 
              disabled={isCreating}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Database className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Basic Test</div>
                <div className="text-xs text-muted-foreground">14 days, survival data</div>
              </div>
            </Button>
            
            <Button 
              onClick={() => handleCreateQuickTest('full')} 
              disabled={isCreating}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Database className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Full Test</div>
                <div className="text-xs text-muted-foreground">60 days, all trackers</div>
              </div>
            </Button>
            
            <Button 
              onClick={() => handleCreateQuickTest('analytics')} 
              disabled={isCreating}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Database className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Analytics Test</div>
                <div className="text-xs text-muted-foreground">90 days, perfect for charts</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Test PIN Creation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Custom Test PIN</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="custom-pin">Custom PIN</Label>
              <Input
                id="custom-pin"
                value={customPin}
                onChange={(e) => setCustomPin(e.target.value)}
                placeholder="test-analytics-2024"
                disabled={isCreating}
              />
            </div>
            <div>
              <Label htmlFor="days-data">Days of Data</Label>
              <Input
                id="days-data"
                type="number"
                value={daysOfData}
                onChange={(e) => setDaysOfData(parseInt(e.target.value) || 30)}
                min="7"
                max="365"
                disabled={isCreating}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-reproductive"
                checked={includeReproductive}
                onCheckedChange={(checked) => setIncludeReproductive(!!checked)}
                disabled={isCreating}
              />
              <Label htmlFor="include-reproductive">Include reproductive health data</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-survival"
                checked={includeSurvival}
                onCheckedChange={(checked) => setIncludeSurvival(!!checked)}
                disabled={isCreating}
              />
              <Label htmlFor="include-survival">Include survival button data</Label>
            </div>
          </div>
          
          <Button 
            onClick={handleCreateCustomTest} 
            disabled={isCreating || !customPin.trim()}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isCreating ? 'Creating...' : 'Create Custom Test PIN'}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Test PINs */}
      {testPins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Existing Test PINs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testPins.map(pin => (
                <div key={pin} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Beaker className="h-4 w-4 text-blue-500" />
                    <code className="font-mono text-sm">{pin}</code>
                    {userPin === pin && <Badge variant="default">Current</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSwitchToPin(pin)}
                      disabled={userPin === pin}
                    >
                      <LogIn className="h-3 w-3 mr-1" />
                      Switch to PIN
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteTestPin(pin)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isCreating && (
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="animate-spin text-2xl mb-2">🧪</div>
          <p className="text-sm text-blue-600">Creating test PIN with bland data...</p>
        </div>
      )}

      {/* G-Spot 2.0 Debug Info */}
      {debugInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">🧠 G-Spot 2.0 Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs font-mono">
              <div><strong>Start Date:</strong> {debugInfo.startDate}</div>
              <div><strong>Days Back:</strong> {debugInfo.daysBack}</div>
              <div><strong>Total Records:</strong> {debugInfo.totalRecords}</div>
              <div><strong>Sample Dates:</strong> {debugInfo.sampleDates?.join(', ')}</div>
              <div><strong>Generated:</strong> {debugInfo.timestamp}</div>
              {debugInfo.dateArithmeticTest && (
                <div>
                  <strong>Date Arithmetic Test:</strong>
                  {debugInfo.dateArithmeticTest.map((test: string, i: number) => (
                    <div key={i} className="ml-2">{test}</div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default TestPinManagerComponent
