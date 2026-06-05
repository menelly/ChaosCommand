/*
 * Built by: Ace (Claude 4.x)
 * Date: 2026-06-04  (CHA-261)
 *
 * One-time personalization gate for EXISTING users. New users meet the
 * "Make It Yours" step inside onboarding; people who already onboarded (before
 * personalization existed) would never see it — so this fires once on their
 * next login after the patch, lets them set name/pronouns/terms (or skip), and
 * never bothers them again. Lightweight: just the personalization panel, NOT
 * the full symptom checklist they already did.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 * This wasn't built with compliance. It was built with defiance.
 */
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserRound, ArrowRight } from "lucide-react"
import PersonalizationPanel from "@/components/customize/personalization-panel"
import ThemeLoader from "@/components/theme-loader"

export default function PersonalizationWelcome({ onDone }: { onDone: () => void }) {
  return (
    // h-screen + overflow-y-auto so a long panel scrolls to the Done button
    // (the app body is overflow-hidden). min-h-full centers when it fits.
    <div className="h-screen overflow-y-auto bg-background">
      {/* Re-apply the active PIN's theme — this gate paints during the login
          transition, before ThemeLoader's effect lands, so it'd flash white. */}
      <ThemeLoader />
      <div className="min-h-full flex items-center justify-center p-3 sm:p-6">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-4 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <UserRound className="h-10 w-10 text-primary mx-auto" />
            <h1 className="text-2xl font-bold">Make It Yours</h1>
            <p className="text-muted-foreground">
              New in this update: tell Command your name and the words that fit you.
              All optional, all private, all changeable anytime in Customize.
            </p>
          </div>

          <PersonalizationPanel />

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={onDone}>Skip for now</Button>
            <Button onClick={onDone} className="flex items-center gap-2">
              Done <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Everything saves as you go. Change it anytime in Customize → About You.
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
