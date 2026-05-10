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

import { useState, useEffect } from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, Brain, Settings, CheckCircle, AlertTriangle } from 'lucide-react'

interface StartupWizardProps {
  onComplete: (aiEnabled: boolean) => void
}

interface SetupStep {
  id: string
  name: string
  description: string
  completed: boolean
  error?: string
}

export function StartupWizard({ onComplete }: StartupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([
    { id: 'database', name: 'Database Setup', description: 'Initializing your personal data vault...', completed: false },
    { id: 'trackers', name: 'Tracker Modules', description: 'Setting up your tracking systems...', completed: false },
    { id: 'themes', name: 'Theme System', description: 'Loading your chaos aesthetic...', completed: false },
    { id: 'settings', name: 'User Preferences', description: 'Configuring your command center...', completed: false }
  ])
  const [showAIChoice, setShowAIChoice] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Simulate database setup process
    const setupDatabase = async () => {
      const steps = [...setupSteps]
      
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i)
        setProgress((i / steps.length) * 100)
        
        // Simulate setup time for each step
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))
        
        steps[i].completed = true
        setSetupSteps([...steps])
      }
      
      setProgress(100)
      setCurrentStep(steps.length)
      
      // Show AI choice after setup is complete
      setTimeout(() => {
        setShowAIChoice(true)
      }, 500)
    }

    setupDatabase()
  }, [])

  const handleAIChoice = (enableAI: boolean) => {
    onComplete(enableAI)
  }

  if (showAIChoice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl bg-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-foreground">
              Choose Your Assistant Level
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Your Command Center is ready! Would you like AI assistance or prefer manual control?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {/* AI Enabled Option */}
              <Card className="cursor-pointer hover:bg-accent/10 transition-colors border-border hover:border-primary"
                    onClick={() => handleAIChoice(true)}>
                <CardHeader className="text-center">
                  <Brain className="w-12 h-12 mx-auto text-primary mb-2" />
                  <CardTitle className="text-xl text-foreground">Smart Assistant</CardTitle>
                  <Badge variant="secondary" className="bg-primary/20 text-primary">
                    Recommended for Desktop
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Voice note processing</li>
                    <li>• Medical document analysis</li>
                    <li>• Pattern recognition</li>
                    <li>• Helpful insights</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-4">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Requires download & modern hardware
                  </p>
                </CardContent>
              </Card>

              {/* Manual Option */}
              <Card className="cursor-pointer hover:bg-accent/10 transition-colors border-border hover:border-accent"
                    onClick={() => handleAIChoice(false)}>
                <CardHeader className="text-center">
                  <Settings className="w-12 h-12 mx-auto text-accent mb-2" />
                  <CardTitle className="text-xl text-foreground">Manual Control</CardTitle>
                  <Badge variant="secondary" className="bg-accent/20 text-accent">
                    Perfect for Older Hardware
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Lightning fast startup</li>
                    <li>• Full manual control</li>
                    <li>• Works on any device</li>
                    <li>• Privacy-first approach</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-4">
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    No downloads, works everywhere
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <p className="text-center text-sm text-muted-foreground">
              Don't worry - you can change this later in Settings!
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-card border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-foreground">
            Building Your Command Zone
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Setting up your personal management system...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Progress value={progress} className="h-3" />
            <div className="text-center text-sm text-muted-foreground">
              {progress < 100 ? `${Math.round(progress)}% Complete` : 'Setup Complete!'}
            </div>
          </div>

          <div className="space-y-3">
            {setupSteps.map((step, index) => (
              <div key={step.id} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                step.completed ? 'bg-green-500/10 border border-green-500/30' :
                index === currentStep ? 'bg-primary/10 border border-primary/30' :
                'bg-gray-500/10 border border-gray-500/30'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  step.completed ? 'bg-green-500' :
                  index === currentStep ? 'bg-primary' :
                  'bg-gray-500'
                }`}>
                  {step.completed ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : index === currentStep ? (
                    <Zap className="w-4 h-4 text-white animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <div className="flex-1">
                  <div className={`font-medium ${
                    step.completed ? 'text-green-600' :
                    index === currentStep ? 'text-foreground' :
                    'text-muted-foreground'
                  }`}>
                    {step.name}
                  </div>
                  <div className={`text-sm ${
                    step.completed ? 'text-green-600' :
                    index === currentStep ? 'text-primary' :
                    'text-muted-foreground'
                  }`}>
                    {step.completed ? 'Complete!' : step.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
