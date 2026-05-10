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

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Edit2, Save, X, Tag, Eye, EyeOff } from "lucide-react"
import { db } from "@/lib/database"
import type { UserTag } from "@/lib/database"
import { toast } from "@/hooks/use-toast"

interface UserTagsManagerProps {
  className?: string
}

const CATEGORY_OPTIONS = [
  { value: 'health', label: '🏥 Health & Medical' },
  { value: 'tracker', label: '📊 Trackers' },
  { value: 'journal', label: '📝 Journal' },
  { value: 'calendar', label: '📅 Calendar' },
  { value: 'planning', label: '📋 Planning' },
  { value: 'mental-health', label: '🧠 Mental Health' },
  { value: 'physical-health', label: '💪 Physical Health' },
  { value: 'work-life', label: '💼 Work & Life' },
  { value: 'fun-motivation', label: '🎉 Fun & Motivation' }
]

const TAG_COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
  '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43',
  '#a55eea', '#26de81', '#fd79a8', '#fdcb6e', '#6c5ce7'
]

export function UserTagsManager({ className }: UserTagsManagerProps) {
  // TODO: Migrate to WatermelonDB
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          User Tags Management
        </CardTitle>
        <CardDescription>
          Tag management temporarily disabled during database migration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          User tags will be restored after WatermelonDB migration is complete.
        </p>
      </CardContent>
    </Card>
  )
}

export function UserTagsManagerOLD({ className }: UserTagsManagerProps) {
  const [tags, setTags] = useState<UserTag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingTag, setEditingTag] = useState<UserTag | null>(null)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const [newTagCategories, setNewTagCategories] = useState<string[]>([])
  const [showAddForm, setShowAddForm] = useState(false)

  // Load tags from database
  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = async () => {
    try {
      setIsLoading(true)
      const allTags = await db.user_tags.orderBy('tag_name').toArray()
      setTags(allTags)
    } catch (error) {
      console.error('Failed to load tags:', error)
      toast({
        title: "Error",
        description: "Failed to load tags",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createTag = async () => {
    if (!newTagName.trim()) {
      toast({
        title: "Error",
        description: "Tag name is required",
        variant: "destructive"
      })
      return
    }

    // Check for duplicate names
    const exists = tags.some(tag => tag.tag_name.toLowerCase() === newTagName.trim().toLowerCase())
    if (exists) {
      toast({
        title: "Error",
        description: "A tag with this name already exists",
        variant: "destructive"
      })
      return
    }

    try {
      const now = new Date().toISOString()
      const newTag: Omit<UserTag, 'id'> = {
        tag_name: newTagName.trim(),
        color: newTagColor,
        category_restrictions: newTagCategories,
        is_hidden: false,
        created_at: now,
        updated_at: now
      }

      await db.user_tags.add(newTag)
      await loadTags()
      
      // Reset form
      setNewTagName("")
      setNewTagColor(TAG_COLORS[0])
      setNewTagCategories([])
      setShowAddForm(false)

      toast({
        title: "Success",
        description: `Tag "${newTagName}" created successfully`
      })
    } catch (error) {
      console.error('Failed to create tag:', error)
      toast({
        title: "Error",
        description: "Failed to create tag",
        variant: "destructive"
      })
    }
  }

  const updateTag = async (tag: UserTag) => {
    if (!tag.tag_name.trim()) {
      toast({
        title: "Error",
        description: "Tag name is required",
        variant: "destructive"
      })
      return
    }

    try {
      await db.user_tags.update(tag.id!, {
        ...tag,
        updated_at: new Date().toISOString()
      })
      await loadTags()
      setEditingTag(null)

      toast({
        title: "Success",
        description: `Tag "${tag.tag_name}" updated successfully`
      })
    } catch (error) {
      console.error('Failed to update tag:', error)
      toast({
        title: "Error",
        description: "Failed to update tag",
        variant: "destructive"
      })
    }
  }

  const deleteTag = async (tagId: number, tagName: string) => {
    if (!confirm(`Are you sure you want to delete the tag "${tagName}"? This action cannot be undone.`)) {
      return
    }

    try {
      await db.user_tags.delete(tagId)
      await loadTags()

      toast({
        title: "Success",
        description: `Tag "${tagName}" deleted successfully`
      })
    } catch (error) {
      console.error('Failed to delete tag:', error)
      toast({
        title: "Error",
        description: "Failed to delete tag",
        variant: "destructive"
      })
    }
  }

  const toggleTagVisibility = async (tag: UserTag) => {
    try {
      await db.user_tags.update(tag.id!, {
        is_hidden: !tag.is_hidden,
        updated_at: new Date().toISOString()
      })
      await loadTags()

      toast({
        title: "Success",
        description: `Tag "${tag.tag_name}" ${tag.is_hidden ? 'shown' : 'hidden'}`
      })
    } catch (error) {
      console.error('Failed to toggle tag visibility:', error)
      toast({
        title: "Error",
        description: "Failed to update tag visibility",
        variant: "destructive"
      })
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            User Tags Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading tags...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          User Tags Manager
        </CardTitle>
        <CardDescription>
          Create and manage your custom tags for organizing tracker data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Tag Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Your Tags ({tags.length})</h3>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              variant={showAddForm ? "outline" : "default"}
              size="sm"
            >
              {showAddForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {showAddForm ? 'Cancel' : 'Add Tag'}
            </Button>
          </div>

          {showAddForm && (
            <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-tag-name">Tag Name</Label>
                  <Input
                    id="new-tag-name"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Enter tag name..."
                    onKeyDown={(e) => e.key === 'Enter' && createTag()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-tag-color">Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {TAG_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          newTagColor === color ? 'border-foreground' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Category Restrictions (optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Select which categories this tag can appear in. Leave empty for all categories.
                </p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((category) => (
                    <Badge
                      key={category.value}
                      variant={newTagCategories.includes(category.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (newTagCategories.includes(category.value)) {
                          setNewTagCategories(newTagCategories.filter(c => c !== category.value))
                        } else {
                          setNewTagCategories([...newTagCategories, category.value])
                        }
                      }}
                    >
                      {category.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={createTag} disabled={!newTagName.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tag
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Existing Tags List */}
        <div className="space-y-3">
          {tags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tags created yet</p>
              <p className="text-sm">Create your first tag to get started!</p>
            </div>
          ) : (
            tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-card"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: tag.color || '#6b7280' }}
                  />
                  
                  {editingTag?.id === tag.id ? (
                    <div className="flex-1 space-y-2">
                      <Input
                        value={editingTag?.tag_name || ''}
                        onChange={(e) => editingTag && setEditingTag({ ...editingTag, tag_name: e.target.value })}
                        className="text-sm"
                      />
                      <div className="flex gap-2 flex-wrap">
                        {CATEGORY_OPTIONS.map((category) => (
                          <Badge
                            key={category.value}
                            variant={editingTag?.category_restrictions?.includes(category.value) ? "default" : "outline"}
                            className="cursor-pointer text-xs"
                            onClick={() => {
                              if (!editingTag) return
                              const current = editingTag.category_restrictions || []
                              if (current.includes(category.value)) {
                                setEditingTag({
                                  ...editingTag,
                                  category_restrictions: current.filter(c => c !== category.value)
                                })
                              } else {
                                setEditingTag({
                                  ...editingTag,
                                  category_restrictions: [...current, category.value]
                                })
                              }
                            }}
                          >
                            {category.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${tag.is_hidden ? 'opacity-50' : ''}`}>
                          {tag.tag_name}
                        </span>
                        {tag.is_hidden && (
                          <Badge variant="secondary" className="text-xs">
                            Hidden
                          </Badge>
                        )}
                      </div>
                      {tag.category_restrictions && tag.category_restrictions.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {tag.category_restrictions.map((cat) => {
                            const categoryInfo = CATEGORY_OPTIONS.find(c => c.value === cat)
                            return (
                              <Badge key={cat} variant="outline" className="text-xs">
                                {categoryInfo?.label || cat}
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {editingTag?.id === tag.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editingTag && updateTag(editingTag)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingTag(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleTagVisibility(tag)}
                        title={tag.is_hidden ? 'Show tag' : 'Hide tag'}
                      >
                        {tag.is_hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingTag(tag)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteTag(tag.id!, tag.tag_name)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Help Text */}
        <div className="text-sm text-muted-foreground space-y-2 pt-4 border-t">
          <p><strong>💡 Tips:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Tags help you organize and filter your tracker data</li>
            <li>Use category restrictions to show tags only where relevant</li>
            <li>Hidden tags won't appear in main views but are still searchable</li>
            <li>Colors help you quickly identify different types of tags</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
