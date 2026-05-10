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
import { format } from "date-fns"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, X, Utensils, BarChart3 } from "lucide-react"
import { TagInput } from "@/components/tag-input"

import { FoodChoiceEntry, SimpleFoodEntry, DetailedFoodEntry } from "./food-choice-types"
import { MEAL_TYPES, EATING_MOODS, FOOD_GROUPS } from "./food-choice-constants"

interface FoodChoiceFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: FoodChoiceEntry) => void
  currentEntry: FoodChoiceEntry
  selectedDate: string
  mode: 'simple' | 'detailed'
}

export default function FoodChoiceForm({
  isOpen,
  onClose,
  onSave,
  currentEntry,
  selectedDate,
  mode
}: FoodChoiceFormProps) {
  // Simple form state
  const [mealType, setMealType] = useState('')
  const [mood, setMood] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])

  // Detailed form state
  const [foods, setFoods] = useState<string[]>([])
  const [newFood, setNewFood] = useState('')

  // Recently eaten foods (stored in localStorage)
  const [recentFoods, setRecentFoods] = useState<string[]>([])

  // Load recent foods from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('recentFoods')
    if (stored) {
      try {
        setRecentFoods(JSON.parse(stored))
      } catch (e) {
        console.error('Error loading recent foods:', e)
      }
    }
  }, [])

  // Function to save a food to recent foods
  const saveToRecentFoods = (foodName: string) => {
    const trimmed = foodName.trim()
    if (!trimmed) return

    // Add to recent foods (avoid duplicates, keep most recent first)
    const updated = [trimmed, ...recentFoods.filter(f => f !== trimmed)].slice(0, 12) // Keep top 12
    setRecentFoods(updated)
    localStorage.setItem('recentFoods', JSON.stringify(updated))
  }

  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [fiber, setFiber] = useState('')
  const [selectedFoodGroups, setSelectedFoodGroups] = useState<string[]>([])

  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setMealType('')
    setMood('')
    setNotes('')
    setTags([])
    setFoods([])
    setNewFood('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
    setFiber('')
    setSelectedFoodGroups([])
  }

  const addFood = () => {
    if (newFood.trim() && !foods.includes(newFood.trim())) {
      const trimmedFood = newFood.trim()
      setFoods([...foods, trimmedFood])
      saveToRecentFoods(trimmedFood) // Save to recent foods
      setNewFood('')
    }
  }

  const removeFood = (foodToRemove: string) => {
    setFoods(foods.filter(food => food !== foodToRemove))
  }

  const toggleFoodGroup = (group: string) => {
    setSelectedFoodGroups(prev => 
      prev.includes(group) 
        ? prev.filter(g => g !== group)
        : [...prev, group]
    )
  }

  const handleSave = () => {
    const timestamp = new Date().toISOString()
    const id = `${mode}-${Date.now()}`

    let updatedEntry = { ...currentEntry }

    if (mode === 'simple') {
      const simpleEntry: SimpleFoodEntry = {
        id,
        timestamp,
        didEat: true,
        mealType: mealType || undefined,
        mood: mood || undefined,
        notes: notes || undefined,
        tags
      }
      updatedEntry.simpleEntries = [...currentEntry.simpleEntries, simpleEntry]
    } else {
      const detailedEntry: DetailedFoodEntry = {
        id,
        timestamp,
        mealType: mealType || 'other',
        foods,
        calories: calories ? parseInt(calories) : undefined,
        protein: protein ? parseInt(protein) : undefined,
        carbs: carbs ? parseInt(carbs) : undefined,
        fat: fat ? parseInt(fat) : undefined,
        fiber: fiber ? parseInt(fiber) : undefined,
        foodGroups: selectedFoodGroups,
        notes: notes || undefined,
        tags
      }
      updatedEntry.detailedEntries = [...currentEntry.detailedEntries, detailedEntry]
    }

    onSave(updatedEntry)
    onClose()
  }

  const canSave = mode === 'simple' || (mode === 'detailed' && foods.length > 0)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'simple' ? (
              <>
                <Utensils className="h-5 w-5" />
                🍽️ Feed Your Flesh Suit
              </>
            ) : (
              <>
                <BarChart3 className="h-5 w-5" />
                📊 Detailed Nutrition Tracking
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'simple' 
              ? "Log that you nourished your body - no judgment, just celebration!"
              : "Track detailed nutrition information, macros, and food groups"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Meal Type */}
          <div>
            <Label htmlFor="mealType">What kind of meal? (optional)</Label>
            <Select value={mealType} onValueChange={setMealType}>
              <SelectTrigger>
                <SelectValue placeholder="Select meal type..." />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPES.map((meal) => (
                  <SelectItem key={meal.value} value={meal.value}>
                    {meal.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === 'simple' ? (
            <>
              {/* Eating Mood */}
              <div>
                <Label htmlFor="mood">How did eating feel? (optional)</Label>
                <Select value={mood} onValueChange={setMood}>
                  <SelectTrigger>
                    <SelectValue placeholder="How was the eating experience?" />
                  </SelectTrigger>
                  <SelectContent>
                    {EATING_MOODS.map((moodOption) => (
                      <SelectItem key={moodOption.value} value={moodOption.value}>
                        {moodOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              {/* Foods */}
              <div>
                <Label>What did you eat?</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a food..."
                      value={newFood}
                      onChange={(e) => setNewFood(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addFood()}
                    />
                    <Button onClick={addFood} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Quick add recent foods */}
                  {recentFoods.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <div className="text-xs text-muted-foreground mb-1 w-full">Recently eaten:</div>
                      {recentFoods.slice(0, 8).map((food) => (
                        <Button
                          key={food}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!foods.includes(food)) {
                              setFoods([...foods, food])
                            }
                          }}
                          className="text-xs"
                        >
                          {food}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Selected foods */}
                  {foods.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {foods.map((food) => (
                        <Badge key={food} variant="secondary" className="flex items-center gap-1">
                          {food}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => removeFood(food)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Macros */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="calories">Calories</Label>
                  <Input
                    id="calories"
                    type="number"
                    placeholder="0"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="protein">Protein (g)</Label>
                  <Input
                    id="protein"
                    type="number"
                    placeholder="0"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="carbs">Carbs (g)</Label>
                  <Input
                    id="carbs"
                    type="number"
                    placeholder="0"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="fat">Fat (g)</Label>
                  <Input
                    id="fat"
                    type="number"
                    placeholder="0"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="fiber">Fiber (g)</Label>
                  <Input
                    id="fiber"
                    type="number"
                    placeholder="0"
                    value={fiber}
                    onChange={(e) => setFiber(e.target.value)}
                  />
                </div>
              </div>

              {/* Food Groups */}
              <div>
                <Label>Food Groups</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {FOOD_GROUPS.map((group) => (
                    <Button
                      key={group.value}
                      variant={selectedFoodGroups.includes(group.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleFoodGroup(group.value)}
                      className="text-sm"
                    >
                      {group.label}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder={mode === 'simple' 
                ? "Any thoughts about eating today..."
                : "Notes about this meal, how you felt, etc..."
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Tags */}
          <div>
            <Label htmlFor="tags">Tags (optional)</Label>
            <TagInput
              value={tags}
              onChange={setTags}
              placeholder="Add tags like 'stress', 'celebration', 'comfort food'..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSave} disabled={!canSave} className="flex-1">
              {mode === 'simple' ? '🎉 Celebrate Eating!' : '📊 Save Nutrition Data'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
