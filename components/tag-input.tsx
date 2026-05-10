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

import { useState, KeyboardEvent } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X, Plus } from "lucide-react"

interface TagInputProps {
  value?: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  className?: string
  maxTags?: number
  disabled?: boolean
}

export function TagInput({
  value = [],
  onChange,
  placeholder = "Type a tag and press Enter...",
  className = "",
  maxTags,
  disabled = false
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("")

  // Simple tag management functions
  const addTag = (tagName: string) => {
    const trimmedTag = tagName.trim()

    if (!trimmedTag) return
    if (value.includes(trimmedTag)) return
    if (maxTags && value.length >= maxTags) return

    onChange([...value, trimmedTag])
    setInputValue("")
  }

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag if input is empty and backspace is pressed
      removeTag(value[value.length - 1])
    } else if (e.key === 'Escape') {
      setInputValue("")
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Current Tags */}
      {value && value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <span>{tag}</span>
              {!disabled && (
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                  aria-label={`Remove ${tag} tag`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Input Field */}
      {!disabled && (!maxTags || value.length < maxTags) && (
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1"
          />
          {inputValue && (
            <Button
              type="button"
              size="sm"
              onClick={() => addTag(inputValue)}
              disabled={!inputValue.trim() || value.includes(inputValue.trim())}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Max tags reached message */}
      {maxTags && value.length >= maxTags && (
        <p className="text-sm text-muted-foreground">
          Maximum {maxTags} tags reached
        </p>
      )}

      {/* Help text */}
      {!disabled && value.length === 0 && (
        <p className="text-xs text-muted-foreground">
          💡 Type a tag name and press Enter to add it.
        </p>
      )}
    </div>
  )
}

export default TagInput;
