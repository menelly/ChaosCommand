'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import AppCanvas from '@/components/app-canvas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, CheckCircle } from 'lucide-react'
import { useDailyData } from '@/lib/database'
import { useToast } from '@/hooks/use-toast'
import type { TrackerField, CustomTracker } from '@/components/forge/tracker-builder'

export default function CustomTrackerPage() {
  const searchParams = useSearchParams()
  const trackerId = searchParams.get('id')
  const [tracker, setTracker] = useState<CustomTracker | null>(null)
  const [values, setValues] = useState<Record<string, any>>({})
  const [saved, setSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { getCategoryData, saveData } = useDailyData()
  const { toast } = useToast()

  useEffect(() => {
    loadTracker()
  }, [trackerId])

  const loadTracker = async () => {
    if (!trackerId) { setIsLoading(false); return }
    try {
      const today = new Date().toISOString().split('T')[0]
      const records = await getCategoryData(today, 'user')
      const customTrackerRecord = records.find(r => r.subcategory === 'custom-trackers')

      if (customTrackerRecord?.content?.trackers) {
        const found = customTrackerRecord.content.trackers.find(
          (t: CustomTracker) => t.id === trackerId
        )
        if (found) {
          setTracker(found)
          // Load any existing data for today
          const dataRecords = await getCategoryData(today, found.category || 'custom')
          const existingData = dataRecords.find(r => r.subcategory === `custom-${trackerId}`)
          if (existingData?.content?.values) {
            setValues(existingData.content.values)
          }
        }
      }
    } catch (error) {
      console.error('Error loading custom tracker:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!tracker) return
    try {
      const today = new Date().toISOString().split('T')[0]
      await saveData(
        today,
        tracker.category || 'custom',
        `custom-${tracker.id}`,
        { trackerId: tracker.id, trackerName: tracker.name, values, savedAt: new Date().toISOString() },
        [`custom-tracker`, tracker.name.toLowerCase()]
      )
      setSaved(true)
      toast({ title: "Saved!", description: `${tracker.name} data saved for today.` })
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Error saving tracker data:', error)
      toast({ title: "Error", description: "Failed to save tracker data.", variant: "destructive" })
    }
  }

  const updateValue = (fieldId: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldId]: value }))
  }

  const renderField = (field: TrackerField) => {
    switch (field.type) {
      case 'scale':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="font-medium">{field.name} {field.required && <span className="text-red-500">*</span>}</Label>
            {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{field.min ?? 0}</span>
              <Slider
                value={[values[field.id] ?? field.min ?? 0]}
                onValueChange={([v]) => updateValue(field.id, v)}
                min={field.min ?? 0}
                max={field.max ?? 10}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-bold text-primary min-w-[2ch] text-center">
                {values[field.id] ?? field.min ?? 0}
              </span>
              <span className="text-sm text-muted-foreground">{field.max ?? 10}</span>
            </div>
          </div>
        )

      case 'dropdown':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="font-medium">{field.name} {field.required && <span className="text-red-500">*</span>}</Label>
            {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
            <Select value={values[field.id] || ''} onValueChange={(v) => updateValue(field.id, v)}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.name}...`} />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      case 'checkbox':
        return (
          <div key={field.id} className="flex items-center gap-3 py-2">
            <Checkbox
              checked={!!values[field.id]}
              onCheckedChange={(checked) => updateValue(field.id, checked)}
            />
            <div>
              <Label className="font-medium cursor-pointer">{field.name}</Label>
              {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
            </div>
          </div>
        )

      case 'multiselect':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="font-medium">{field.name} {field.required && <span className="text-red-500">*</span>}</Label>
            {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
            <div className="flex flex-wrap gap-2">
              {(field.options || []).map((opt) => {
                const selected = (values[field.id] || []).includes(opt)
                return (
                  <Badge
                    key={opt}
                    variant={selected ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const current = values[field.id] || []
                      updateValue(field.id, selected ? current.filter((v: string) => v !== opt) : [...current, opt])
                    }}
                  >
                    {opt}
                  </Badge>
                )
              })}
            </div>
          </div>
        )

      case 'text':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="font-medium">{field.name} {field.required && <span className="text-red-500">*</span>}</Label>
            {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
            <Textarea
              value={values[field.id] || ''}
              onChange={(e) => updateValue(field.id, e.target.value)}
              placeholder={`Enter ${field.name}...`}
            />
          </div>
        )

      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="font-medium">{field.name} {field.required && <span className="text-red-500">*</span>}</Label>
            {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
            <Input
              type="number"
              value={values[field.id] || ''}
              onChange={(e) => updateValue(field.id, parseFloat(e.target.value) || '')}
              placeholder={`Enter ${field.name}...`}
              min={field.min}
              max={field.max}
            />
          </div>
        )

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="font-medium">{field.name} {field.required && <span className="text-red-500">*</span>}</Label>
            {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
            <Input
              type="date"
              value={values[field.id] || ''}
              onChange={(e) => updateValue(field.id, e.target.value)}
            />
          </div>
        )

      case 'time':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="font-medium">{field.name} {field.required && <span className="text-red-500">*</span>}</Label>
            {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
            <Input
              type="time"
              value={values[field.id] || ''}
              onChange={(e) => updateValue(field.id, e.target.value)}
            />
          </div>
        )

      case 'tags':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="font-medium">{field.name} {field.required && <span className="text-red-500">*</span>}</Label>
            {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
            <Input
              value={values[field.id]?.join(', ') || ''}
              onChange={(e) => updateValue(field.id, e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
              placeholder="Enter tags separated by commas..."
            />
          </div>
        )

      default:
        return (
          <div key={field.id} className="space-y-2">
            <Label className="font-medium">{field.name}</Label>
            <Input
              value={values[field.id] || ''}
              onChange={(e) => updateValue(field.id, e.target.value)}
              placeholder={`Enter ${field.name}...`}
            />
          </div>
        )
    }
  }

  if (isLoading) {
    return (
      <AppCanvas currentPage="custom-trackers">
        <div className="text-center py-16">
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            Loading tracker...
          </div>
        </div>
      </AppCanvas>
    )
  }

  if (!tracker) {
    return (
      <AppCanvas currentPage="custom-trackers">
        <div className="max-w-2xl mx-auto text-center py-16">
          <h1 className="text-2xl font-bold mb-4">Tracker Not Found</h1>
          <p className="text-muted-foreground mb-6">This custom tracker may have been removed or doesn't exist yet.</p>
          <Button onClick={() => window.location.href = '/custom'} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Custom Trackers
          </Button>
        </div>
      </AppCanvas>
    )
  }

  return (
    <AppCanvas currentPage="custom-trackers">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button onClick={() => window.location.href = '/custom'} variant="outline" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Custom Trackers
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{tracker.name}</CardTitle>
            {tracker.description && (
              <p className="text-muted-foreground">{tracker.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {tracker.fields.map(renderField)}

            <Button onClick={handleSave} className="w-full" size="lg">
              {saved ? (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save Today's Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppCanvas>
  )
}
