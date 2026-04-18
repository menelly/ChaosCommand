/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace
 *
 * This file is part of the Chaos Cascade Medical Management System.
 * Tags now persist to Dexie database (not localStorage).
 * Fixed April 8, 2026 by Ace — tags were silently lost on PIN switch.
 */
"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tag, Plus, X, HelpCircle } from "lucide-react"
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { db, getCurrentTimestamp } from "@/lib/database/dexie-db"
import type { UserTag as DexieUserTag } from "@/lib/database/dexie-db"

interface TagsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface DisplayTag {
  id: number
  name: string
  color: string
  isSystem: boolean
  behavior?: string
}

const TAG_COLORS = [
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' }
]

export function TagsModal({ isOpen, onClose }: TagsModalProps) {
  const [systemTags, setSystemTags] = useState<DisplayTag[]>([])
  const [userTags, setUserTags] = useState<DisplayTag[]>([])
  const [newTagName, setNewTagName] = useState("")
  const [selectedColor, setSelectedColor] = useState("#8B5CF6")
  const [isLoading, setIsLoading] = useState(false)

  // Load all tags from Dexie database
  const loadTags = useCallback(async () => {
    try {
      const dbTags = await db.user_tags.toArray()
      const system: DisplayTag[] = []
      const custom: DisplayTag[] = []

      for (const t of dbTags) {
        const tag: DisplayTag = {
          id: t.id!,
          name: t.tag_name,
          color: t.color || '#8B5CF6',
          isSystem: t.is_system || false,
          behavior: t.behavior
        }
        if (t.is_system) {
          system.push(tag)
        } else {
          custom.push(tag)
        }
      }

      setSystemTags(system)
      setUserTags(custom)

      // Migrate any orphaned localStorage tags to database
      const savedLocalTags = localStorage.getItem('chaos-user-tags')
      if (savedLocalTags) {
        try {
          const localTags = JSON.parse(savedLocalTags)
          if (Array.isArray(localTags) && localTags.length > 0) {
            const existingNames = new Set(dbTags.map(t => t.tag_name.toLowerCase()))
            const toMigrate = localTags.filter(
              (t: any) => !existingNames.has(t.name.toLowerCase())
            )
            if (toMigrate.length > 0) {
              const now = getCurrentTimestamp()
              const newDbTags: Omit<DexieUserTag, 'id'>[] = toMigrate.map((t: any) => ({
                tag_name: t.name,
                color: t.color || '#8B5CF6',
                category_restrictions: [],
                is_hidden: false,
                is_system: false,
                behavior: 'none',
                created_at: now,
                updated_at: now
              }))
              await db.user_tags.bulkAdd(newDbTags)
              console.log(`🏷️ Migrated ${toMigrate.length} tags from localStorage to Dexie`)
            }
            localStorage.removeItem('chaos-user-tags')
            console.log('🏷️ Cleared orphaned localStorage tags')
            // Reload after migration
            await loadTags()
            return
          }
        } catch (e) {
          console.error('Error migrating localStorage tags:', e)
        }
      }
    } catch (error) {
      console.error('Error loading tags from database:', error)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadTags()
    }
  }, [isOpen, loadTags])

  const addTag = async () => {
    if (!newTagName.trim() || isLoading) return
    setIsLoading(true)

    try {
      const now = getCurrentTimestamp()
      const newTag: Omit<DexieUserTag, 'id'> = {
        tag_name: newTagName.trim(),
        color: selectedColor,
        category_restrictions: [],
        is_hidden: false,
        created_at: now,
        updated_at: now
      }

      await db.user_tags.add(newTag)
      setNewTagName("")
      await loadTags()
    } catch (error) {
      console.error('Error adding tag:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const removeTag = async (tagId: number) => {
    // Don't delete system tags
    const tag = [...systemTags, ...userTags].find(t => t.id === tagId)
    if (tag?.isSystem) return
    setIsLoading(true)

    try {
      await db.user_tags.delete(tagId)
      await loadTags()
    } catch (error) {
      console.error('Error removing tag:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const allTags = [...systemTags, ...userTags]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <KeyboardAvoidingWrapper>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Tag Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* System Tags Section */}
          <div>
            <Label className="text-sm font-medium mb-3 block">System Tags</Label>
            <div className="space-y-3">
              {systemTags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge
                      style={{ backgroundColor: tag.color, color: 'white' }}
                      className="font-medium"
                    >
                      {tag.name}
                    </Badge>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="max-w-xs">
                            {tag.behavior === 'exclude_analytics' ? (
                              <p>Excludes this entry from analytics and reports. Use for outlier days, therapy triggers, or data you don't want surfaced in exports.</p>
                            ) : tag.behavior === 'suppress_alerts' ? (
                              <p>Logs the data but suppresses any warnings or nags. "Yes my glucose hit 350, I ate cake at a party, I'm a grown up."</p>
                            ) : (
                              <p>System tag</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Badge variant="outline">System Tag</Badge>
                </div>
              ))}
              {systemTags.length === 0 && (
                <p className="text-sm text-muted-foreground">System tags will be created on next app restart.</p>
              )}
            </div>
          </div>

          {/* User Tags Section */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Your Custom Tags</Label>

            {/* Add New Tag */}
            <div className="p-4 border rounded-lg mb-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="tag-name" className="text-sm">Tag Name</Label>
                    <Input
                      id="tag-name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Enter tag name"
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Color</Label>
                    <div className="flex gap-1 mt-1">
                      {TAG_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setSelectedColor(color.value)}
                          className={`w-6 h-6 rounded-full border-2 ${
                            selectedColor === color.value ? 'border-foreground' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <Button onClick={addTag} className="w-full" disabled={!newTagName.trim() || isLoading}>
                  <Plus className="h-4 w-4 mr-2" />
                  {isLoading ? 'Adding...' : 'Add Tag'}
                </Button>
              </div>
            </div>

            {/* User Tags List */}
            {userTags.length > 0 ? (
              <div className="space-y-2">
                {userTags.map((tag) => (
                  <div key={tag.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <Badge
                      style={{ backgroundColor: tag.color, color: 'white' }}
                      className="font-medium"
                    >
                      {tag.name}
                    </Badge>
                    <Button
                      onClick={() => removeTag(tag.id)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No custom tags yet</p>
                <p className="text-sm">Create tags to organize and filter your health data</p>
              </div>
            )}
          </div>

          {/* Tag Usage Info */}
          <div className="p-4 bg-muted rounded-lg">
            <Label className="text-sm font-medium mb-2 block">How Tags Work</Label>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Tags help you organize and filter your health data</p>
              <p>• Use tags to mark special circumstances, moods, or contexts</p>
              <p>• Export data by specific tags for targeted analysis</p>
              <p>• "NOPE" tags exclude data from analytics (for bad days/mistakes)</p>
              <p>• "I KNOW" tags mark intentionally suboptimal choices</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
        </KeyboardAvoidingWrapper>
      </DialogContent>
    </Dialog>
  )
}
