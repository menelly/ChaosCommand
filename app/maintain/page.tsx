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
import { ArrowLeft, Wrench, Pill, Activity, Droplets, Stethoscope } from "lucide-react"

const MAINTAIN_SECTIONS = [
  {
    id: "medications",
    name: "Medications & Supplements",
    description: "Track medications, dosing schedules, and refill reminders",
    icon: <Pill className="h-5 w-5" />,
    href: "/medications",
    status: "available" as const,
  },
  {
    id: "lines-tubes",
    name: "Lines & Tubes",
    description: "PICC, central lines, ostomy, catheter, Foley, PEG/GJ, Dexcom, and other devices",
    icon: <Activity className="h-5 w-5" />,
    href: "/lines-tubes",
    status: "coming-soon" as const,
  },
  {
    id: "gu",
    name: "Genitourinary",
    description: "GU symptoms, urinary patterns, and related tracking",
    icon: <Droplets className="h-5 w-5" />,
    href: "/gu",
    status: "coming-soon" as const,
  },
  {
    id: "endocrine",
    name: "Endocrine & Hormonal",
    description: "Hormonal patterns, thyroid, adrenal, and metabolic tracking",
    icon: <Activity className="h-5 w-5" />,
    href: "/endocrine",
    status: "coming-soon" as const,
  },
  {
    id: "postpartum",
    name: "Postpartum Recovery",
    description: "L&D recovery, feeding, and postpartum health tracking",
    icon: <Stethoscope className="h-5 w-5" />,
    href: "/postpartum",
    status: "coming-soon" as const,
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

        <div className="grid gap-3">
          {MAINTAIN_SECTIONS.map((section) => (
            <Card
              key={section.id}
              className={`cursor-pointer transition-colors ${
                section.status === "available"
                  ? "hover:bg-accent/50"
                  : "opacity-60"
              }`}
              onClick={() => {
                if (section.status === "available") {
                  window.location.href = section.href
                }
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    {section.icon}
                    {section.name}
                  </div>
                  {section.status === "coming-soon" && (
                    <span className="text-xs text-muted-foreground font-normal">Coming soon</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{section.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
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
