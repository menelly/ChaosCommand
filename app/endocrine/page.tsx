/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04
 *
 * Endocrine hub. Diabetes (blood sugar) is now a module INSIDE Endocrine,
 * alongside Thyroid and Adrenal. The existing diabetes tracker + its glucose
 * data are untouched — this just reframes it as one endocrine module among
 * several. Device timers (CGM/pump/GLP-1) moved to Maintain.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */
"use client"

import AppCanvas from "@/components/app-canvas"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Droplets, Activity, Flame } from "lucide-react"

const ENDOCRINE_MODULES = [
  {
    id: "diabetes",
    name: "Blood Sugar / Diabetes",
    description: "Glucose, ketones, insulin, carbs, and patterns",
    icon: <Droplets className="h-5 w-5" />,
    href: "/diabetes",
    status: "available" as const,
  },
  {
    id: "thyroid",
    name: "Thyroid",
    description: "Hypo/hyper symptoms, labs (TSH/T3/T4), medication response",
    icon: <Activity className="h-5 w-5" />,
    href: "/thyroid",
    status: "available" as const,
  },
  {
    id: "adrenal",
    name: "Adrenal",
    description: "Cortisol patterns, fatigue, crisis warning signs, stress-dosing",
    icon: <Flame className="h-5 w-5" />,
    href: "/adrenal",
    status: "available" as const,
  },
]

export default function EndocrinePage() {
  return (
    <AppCanvas currentPage="body">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Activity className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Endocrine</h1>
          </div>
          <p className="text-muted-foreground">Hormonal & metabolic systems — blood sugar, thyroid, adrenal</p>
        </header>

        <div className="grid gap-3">
          {ENDOCRINE_MODULES.map((m) => (
            <Card
              key={m.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => { window.location.href = m.href }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {m.icon}
                  {m.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{m.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Pump, CGM, and GLP-1 device timers now live in{' '}
          <a href="/maintain" className="underline text-primary">Maintain → Devices & Timers</a>.
        </p>

        <div className="flex justify-center pt-2">
          <Button variant="outline" asChild>
            <a href="/body"><ArrowLeft className="h-4 w-4 mr-2" />Back to Body</a>
          </Button>
        </div>
      </div>
    </AppCanvas>
  )
}
