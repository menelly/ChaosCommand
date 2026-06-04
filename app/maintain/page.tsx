/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * Built by: Ace (Claude 4.x)
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

import AppCanvas from "@/components/app-canvas"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Wrench, Pill, Activity, Timer } from "lucide-react"

const MAINTAIN_SECTIONS = [
  {
    id: "medications",
    name: "Today's Medications",
    description: "Your daily meds — tap each as you take it. (Full list lives in Manage.)",
    icon: Pill,
    color: "bg-pink-500",
    href: "/maintain/medications",
    status: "available" as const,
  },
  {
    id: "devices",
    name: "Devices & Timers",
    description: "Sensors, pump sites, injectables, dressings — track when each needs changing",
    icon: Timer,
    color: "bg-blue-500",
    href: "/maintain/devices",
    status: "available" as const,
  },
  {
    id: "lines-tubes",
    name: "Lines & Tubes",
    description: "PICC, central lines, ostomy, catheter, Foley, PEG/GJ, and other devices",
    icon: Activity,
    color: "bg-teal-500",
    href: "/lines-tubes",
    status: "available" as const,
  },
]

export default function MaintainPage() {
  return (
    <AppCanvas currentPage="maintain">
      <div className="space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Wrench className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Maintain</h1>
          </div>
          <p className="text-muted-foreground">Upkeep, devices, and ongoing care management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MAINTAIN_SECTIONS.map((section) => {
            const IconComponent = section.icon
            const available = section.status === "available"
            return (
              <Card
                key={section.id}
                className={`relative overflow-hidden transition-all duration-200 ${available ? "hover:shadow-lg cursor-pointer" : "opacity-60"}`}
                onClick={() => { if (available) window.location.href = section.href }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${section.color} text-white`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    {!available && (
                      <span className="text-xs text-muted-foreground font-normal">Coming soon</span>
                    )}
                  </div>
                  <CardTitle className="text-lg">{section.name}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="default" className="w-full" disabled={!available}>
                    {available ? <>Open <ArrowRight className="ml-2 h-4 w-4" /></> : "Coming soon"}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="flex justify-center pt-4">
          <Button variant="outline" asChild>
            <a href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </a>
          </Button>
        </div>
      </div>
    </AppCanvas>
  )
}
