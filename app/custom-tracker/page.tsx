'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, CheckCircle, History, BarChart3, Pencil, Trash2 } from 'lucide-react'
import { useDailyData } from '@/lib/database'
import { useToast } from '@/hooks/use-toast'
import type { TrackerField, CustomTracker } from '@/components/forge/tracker-builder'
import CustomTrackerAnalytics from '@/components/forge/custom-tracker-analytics'

interface HistoryEntry {
  date: string
  subcategory: string
  content: {
    trackerId: string
    trackerName: string
    values: Record<string, any>
    savedAt: string
  }
}

export default function CustomTrackerPage() {
  const searchParams = useSearchParams()
  const trackerId = searchParams.get('id')
  const [tracker, setTracker] = useState<CustomTracker | null>(null)
  const [values, setValues] = useState<Record<string, any>>({})
  const [saved, setSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('track')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const { getCategoryData, saveData, getDateRange, deleteData } = useDailyData()
  const { toast } = useToast()

  useEffect(() => {
    loadTracker()
  }, [trackerId])

  // Load history whenever tab changes to history/analytics or refreshTrigger changes
  useEffect(() => {
    if (tracker && (activeTab === 'history' || activeTab === 'analytics')) {
      loadHistory()
    }
  }, [tracker, activeTab, refreshTrigger])

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

  const loadHistory = async () => {
    if (!tracker || !trackerId) return
    setHistoryLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const allRecords = await getDateRange('2000-01-01', today, tracker.category || 'custom')
      const filtered = allRecords
        .filter(r => r.subcategory?.startsWith(`custom-${trackerId}`))
        .sort((a, b) => b.date.localeCompare(a.date))
      setHistoryEntries(filtered as HistoryEntry[])
    } catch (error) {
      console.error('Error loading history:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleSave = async () => {
    if (!tracker) return
    try {
      const date = editingDate || new Date().toISOString().split('T')[0]
      await saveData(
        date,
        tracker.category || 'custom',
        `custom-${tracker.id}`,
        { trackerId: tracker.id, trackerName: tracker.name, values, savedAt: new Date().toISOString() },
        [`custom-tracker`, tracker.name.toLowerCase()]
      )
      setSaved(true)
      setEditingDate(null)
      setRefreshTrigger(prev => prev + 1)
      toast({ title: "Saved!", description: `${tracker.name} data saved for ${date}.` })
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Error saving tracker data:', error)
      toast({ title: "Error", description: "Failed to save tracker data.", variant: "destructive" })
    }
  }

  const handleEdit = (entry: HistoryEntry) => {
    setValues(entry.content.values || {})
    setEditingDate(entry.date)
    setActiveTab('track')
  }

  const handleDelete = async (entry: HistoryEntry) => {
    if (!tracker) return
    try {
      await deleteData(entry.date, tracker.category || 'custom', entry.subcategory)
      setRefreshTrigger(prev => prev + 1)
      toast({ title: "Deleted", description: `Entry for ${entry.date} removed.` })
    } catch (error) {
      console.error('Error deleting entry:', error)
      toast({ title: "Error", description: "Failed to delete entry.", variant: "destructive" })
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

  const renderFieldValue = (field: TrackerField, value: any) => {
    if (value === undefined || value === null || value === '') return <span className="text-muted-foreground italic">--</span>
    switch (field.type) {
      case 'checkbox':
        return <span>{value ? 'Yes' : 'No'}</span>
      case 'multiselect':
      case 'tags':
        if (Array.isArray(value)) {
          return (
            <div className="flex flex-wrap gap-1">
              {value.map((v: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">{v}</Badge>
              ))}
            </div>
          )
        }
        return <span>{String(value)}</span>
      case 'scale':
      case 'number':
        return <span className="font-mono font-bold">{value}</span>
      default:
        return <span>{String(value)}</span>
    }
  }

  // Build entries array for analytics component: flat objects with date + field values
  const analyticsEntries = historyEntries.map(entry => ({
    date: entry.date,
    ...entry.content.values
  }))

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

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{tracker.name}</h1>
          {tracker.description && (
            <p className="text-muted-foreground">{tracker.description}</p>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="track" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Track
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Track Tab */}
          <TabsContent value="track" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingDate ? `Editing entry for ${editingDate}` : "Today's Entry"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {tracker.fields.map(renderField)}

                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex-1" size="lg">
                    {saved ? (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5 mr-2" />
                        {editingDate ? `Save for ${editingDate}` : "Save Today's Data"}
                      </>
                    )}
                  </Button>
                  {editingDate && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        setEditingDate(null)
                        setValues({})
                      }}
                    >
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            {historyLoading ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 text-muted-foreground">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  Loading history...
                </div>
              </div>
            ) : historyEntries.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <History className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No Entries Yet</h3>
                    <p className="text-muted-foreground">
                      Start tracking with <strong>{tracker.name}</strong> to see your history here.
                    </p>
                    <Button variant="outline" onClick={() => setActiveTab('track')}>
                      Go to Track
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              historyEntries.map((entry, idx) => (
                <Card key={`${entry.date}-${idx}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{entry.date}</CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(entry)}
                          title="Edit this entry"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(entry)}
                          title="Delete this entry"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {entry.content.savedAt && (
                      <p className="text-xs text-muted-foreground">
                        Saved {new Date(entry.content.savedAt).toLocaleString()}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2">
                      {tracker.fields.map(field => {
                        const val = entry.content.values?.[field.id]
                        return (
                          <div key={field.id} className="flex items-start justify-between gap-4 text-sm">
                            <span className="text-muted-foreground font-medium shrink-0">{field.name}:</span>
                            <div className="text-right">{renderFieldValue(field, val)}</div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <CustomTrackerAnalytics tracker={tracker} entries={analyticsEntries} />
          </TabsContent>
        </Tabs>
      </div>
    </AppCanvas>
  )
}
