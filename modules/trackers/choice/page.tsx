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

import React from 'react'
import AppCanvas from '@/components/app-canvas'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bed,
  Droplets,
  Utensils,
  Activity,
  Battery,
  Heart,
  ArrowRight
} from 'lucide-react'

export default function ChoicePage() {
  const choiceAreas = [
    {
      title: "Sleep",
      description: "Track sleep quality, duration, and your bedtime routines",
      icon: Bed,
      color: "bg-indigo-500",
      route: "/sleep",
      status: "Available"
    },
    {
      title: "Hydration",
      description: "Monitor water intake and hydration habits you control",
      icon: Droplets,
      color: "bg-blue-500",
      route: "/hydration",
      status: "Available"
    },
    {
      title: "Food Choice",
      description: "Track what you choose to eat and your relationship with food",
      icon: Utensils,
      color: "bg-green-500",
      route: "/food-choice",
      status: "Available"
    },
    {
      title: "Movement",
      description: "Log physical activity and movement you choose to do",
      icon: Activity,
      color: "bg-orange-500",
      route: "/movement",
      status: "Available"
    },
    {
      title: "Energy & Pacing",
      description: "Manage your energy levels and pacing decisions",
      icon: Battery,
      color: "bg-yellow-500",
      route: "/energy",
      status: "Available"
    },
    {
      title: "Coping & Regulation",
      description: "Track coping strategies and regulation tools you use",
      icon: Heart,
      color: "bg-pink-500",
      route: "/coping-regulation",
      status: "Coming Soon"
    }
  ]

  const handleNavigation = (route: string, status: string) => {
    if (status === "Available") {
      window.location.href = route
    }
  }

  return (
    <AppCanvas currentPage="choice">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            <Heart className="h-8 w-8 text-green-500" />
            Choice
          </h1>
          <p className="text-lg text-muted-foreground">
            Track the things that are entirely within YOUR choice
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {choiceAreas.map((area, index) => {
            const IconComponent = area.icon
            const isAvailable = area.status === "Available"

            return (
              <Card
                key={index}
                className={`relative overflow-hidden transition-all duration-200 ${
                  isAvailable ? 'hover:shadow-lg cursor-pointer' : ''
                }`}
                onClick={() => handleNavigation(area.route, area.status)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${area.color} text-white`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <Badge
                      variant={isAvailable ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {area.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{area.title}</CardTitle>
                  <CardDescription>{area.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant={isAvailable ? "default" : "outline"}
                    className="w-full"
                    disabled={!isAvailable}
                  >
                    {isAvailable ? (
                      <>
                        Open <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      "Coming Soon"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Philosophy Box */}
        <div className="bg-muted/50 p-6 rounded-lg text-center mt-8">
          <h3 className="text-lg font-semibold mb-2">Your Agency Matters</h3>
          <p className="text-muted-foreground">
            While chronic illness affects many aspects of life, this section celebrates the choices
            that remain yours. Track your self-care wins and build sustainable habits at your own pace.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            ← Back to Command Center
          </Button>
        </div>
      </div>
    </AppCanvas>
  )
}
