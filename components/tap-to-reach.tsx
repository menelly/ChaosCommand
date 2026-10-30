/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude Opus 5.5)
 *
 * 📞 tap-to-reach.tsx — every crisis number in Command is something you can PRESS.
 *
 * CHA-771: the Safety Plan's 988 card was a number to read, not a button. In a bad
 * moment that one extra step matters, so:
 *   • on a phone: tap → the dialer (tel:) or messages app with the keyword typed (sms:)
 *   • on a desktop: we still try to hand it to the system (Phone Link etc.), AND copy
 *     the number to the clipboard with a toast, because most desktops can't dial.
 *
 * It's a real <a href="tel:…"> so screen readers announce it as a link and a long-press
 * still works, but the click goes through openExternal(), because inside the Tauri
 * webview a bare tel: navigation does nothing at all.
 */
"use client"

import React from 'react'
import { openExternal } from '@/lib/open-external'
import { isMobilePlatform } from '@/lib/platform'
import { useToast } from '@/hooks/use-toast'
import { telHref, smsHref } from '@/lib/services/crisis-contact'

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Hand the link to the OS; on desktop also copy the number and say so. */
export function useReachOut() {
  const { toast } = useToast()
  return async (href: string, display: string, kind: 'call' | 'text' = 'call', keyword?: string) => {
    if (!href) return
    void openExternal(href)
    if (!isMobilePlatform()) {
      const copied = await copyToClipboard(display)
      toast({
        title: copied ? `📋 Copied ${display}` : `📞 ${display}`,
        description: kind === 'text'
          ? `If your messages app didn't open: text ${keyword ?? ''} to ${display} from your phone.`
          : `If nothing opened to dial it: call ${display} from your phone.`,
      })
    }
  }
}

interface TapToCallProps {
  phone: string
  /** What to show. Defaults to the number as stored. */
  children?: React.ReactNode
  className?: string
  title?: string
}

export function TapToCall({ phone, children, className, title }: TapToCallProps) {
  const reach = useReachOut()
  const href = telHref(phone)
  if (!href) return <span className={className}>{children ?? phone}</span>
  return (
    <a
      href={href}
      className={className}
      title={title ?? `Call ${phone}`}
      onClick={(e) => { e.preventDefault(); void reach(href, phone, 'call') }}
    >
      {children ?? phone}
    </a>
  )
}

interface TapToTextProps {
  number: string
  keyword?: string
  children?: React.ReactNode
  className?: string
}

export function TapToText({ number, keyword, children, className }: TapToTextProps) {
  const reach = useReachOut()
  const href = smsHref(number, keyword)
  if (!href) return <span className={className}>{children ?? number}</span>
  return (
    <a
      href={href}
      className={className}
      title={keyword ? `Text ${keyword} to ${number}` : `Text ${number}`}
      onClick={(e) => { e.preventDefault(); void reach(href, number, 'text', keyword) }}
    >
      {children ?? (keyword ? `Text ${keyword} to ${number}` : number)}
    </a>
  )
}
