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

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Target, Heart, Brain } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Plus, Package, Clock, Moon, ChevronRight, ChevronDown, Backpack } from 'lucide-react'

interface DailyTask {
  id: string
  text: string
  completed: boolean
  createdAt: Date
  subtasks?: DailyTask[]
  isSubtask?: boolean
  parentId?: string
}

interface GearItem {
  id: string
  name: string
  completed: boolean
  essential: boolean
}

interface ScheduleBlock {
  id: string
  name: string
  startTime: string
  endTime: string
  color: string
}

interface ScheduleBlock {
  id: string
  name: string
  startTime: string
  endTime: string
  color: string
}

interface SurvivalBoxItem {
  id: string
  name: string
  completed: boolean
  essential: boolean
}

export default function CommandZone() {
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([])
  const [newTask, setNewTask] = useState('')
  const [gearCheck, setGearCheck] = useState<GearItem[]>([
    { id: '1', name: 'Purse/Bag', completed: false, essential: true },
    { id: '2', name: 'Wallet', completed: false, essential: true },
    { id: '3', name: 'Phone', completed: false, essential: true },
    { id: '4', name: 'Keys', completed: false, essential: true },
  ])
  const [schedule, setSchedule] = useState<ScheduleBlock[]>([
    { id: '1', name: 'Morning Routine', startTime: '08:00', endTime: '09:00', color: 'bg-pink-100' },
    { id: '2', name: 'Work/Focus Time', startTime: '09:00', endTime: '12:00', color: 'bg-blue-100' },
    { id: '3', name: 'Lunch Break', startTime: '12:00', endTime: '13:00', color: 'bg-green-100' },
    { id: '4', name: 'Afternoon Tasks', startTime: '13:00', endTime: '17:00', color: 'bg-purple-100' },
    { id: '5', name: 'Evening Wind Down', startTime: '17:00', endTime: '21:00', color: 'bg-orange-100' },
  ])
  const [survivalBox, setSurvivalBox] = useState<SurvivalBoxItem[]>([
    { id: '1', name: 'Emergency Contacts', completed: false, essential: true },
    { id: '2', name: 'Medications', completed: false, essential: true },
    { id: '3', name: 'Water & Snacks', completed: false, essential: true },
    { id: '4', name: 'Comfort Items', completed: false, essential: false },
  ])

  // Load tasks from localStorage on mount
  useEffect(() => {
    const today = new Date().toDateString()
    const savedTasks = localStorage.getItem(`daily-tasks-${today}`)
    if (savedTasks) {
      setDailyTasks(JSON.parse(savedTasks))
    }

    const savedSurvival = localStorage.getItem(`survival-box-${today}`)
    if (savedSurvival) {
      setSurvivalBox(JSON.parse(savedSurvival))
    }
  }, [])

  // Save tasks to localStorage
  const saveTasks = (tasks: DailyTask[]) => {
    const today = new Date().toDateString()
    localStorage.setItem(`daily-tasks-${today}`, JSON.stringify(tasks))
  }

  const saveSurvivalBox = (items: SurvivalBoxItem[]) => {
    const today = new Date().toDateString()
    localStorage.setItem(`survival-box-${today}`, JSON.stringify(items))
  }

  const addTask = () => {
    if (newTask.trim()) {
      const task: DailyTask = {
        id: Date.now().toString(),
        text: newTask.trim(),
        completed: false,
        createdAt: new Date()
      }
      const updatedTasks = [...dailyTasks, task]
      setDailyTasks(updatedTasks)
      saveTasks(updatedTasks)
      setNewTask('')
    }
  }

  const toggleTask = (taskId: string) => {
    const updatedTasks = dailyTasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    )
    setDailyTasks(updatedTasks)
    saveTasks(updatedTasks)
  }

  const toggleSurvivalItem = (itemId: string) => {
    const updatedItems = survivalBox.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    )
    setSurvivalBox(updatedItems)
    saveSurvivalBox(updatedItems)
  }

  const completedTasks = dailyTasks.filter(task => task.completed).length
  const completedSurvival = survivalBox.filter(item => item.completed).length
  const essentialSurvival = survivalBox.filter(item => item.essential && item.completed).length
  const totalEssential = survivalBox.filter(item => item.essential).length

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-pink-600 mb-2">Command Zone</h1>
        <p className="text-muted-foreground">Your daily quest hub - let's get stuff done! ✨</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-muted/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{completedTasks}</div>
            <div className="text-sm text-muted-foreground">Tasks Done Today</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{essentialSurvival}/{totalEssential}</div>
            <div className="text-sm text-muted-foreground">Survival Essentials</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{completedSurvival}</div>
            <div className="text-sm text-muted-foreground">Total Survival Items</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-pink-500" />
              Today's Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a task for today..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
                className="flex-1"
              />
              <Button onClick={addTask} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {dailyTasks.map(task => (
                <div key={task.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTask(task.id)}
                  />
                  <span className={`flex-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {task.text}
                  </span>
                </div>
              ))}
              {dailyTasks.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No tasks yet - add one above!</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Survival Box */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-500" />
              Survival Box
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {survivalBox.map(item => (
              <div key={item.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => toggleSurvivalItem(item.id)}
                />
                <span className={`flex-1 ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {item.name}
                  {item.essential && <span className="text-destructive ml-1">*</span>}
                </span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">* Essential items</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Tracker Access */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Tracker Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2 hover:bg-red-50"
              onClick={() => window.location.href = '/body'}
            >
              <Heart className="h-6 w-6 text-red-500" />
              <span>Body Tracker</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2 hover:bg-blue-50"
              onClick={() => window.location.href = '/mind'}
            >
              <Brain className="h-6 w-6 text-blue-500" />
              <span>Mind Tracker</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2 hover:bg-purple-50"
              onClick={() => window.location.href = '/choice'}
            >
              <Target className="h-6 w-6 text-purple-500" />
              <span>Choice Tracker</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
