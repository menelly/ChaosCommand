/*
 * Copyright (c) 2025-2026 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 *
 * Gaslight Garage - "No REALLY, and I have proof"
 * Your medical evidence locker.
 */
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import AppCanvas from "@/components/app-canvas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { TagInput } from "@/components/tag-input"
import { useDailyData } from "@/lib/database/hooks/use-daily-data"
import { db, CATEGORIES, formatDateForStorage, getCurrentTimestamp } from "@/lib/database/dexie-db"
import {
  Upload, Image as ImageIcon, X, ChevronDown, ChevronUp,
  Calendar, FileText, Search, Trash2, Edit3, CheckCircle, AlertTriangle
} from "lucide-react"

// Quick-add tags for medical gaslighting situations
const QUICK_TAGS = [
  { label: "Nope", tag: "nope", color: "bg-red-100 text-red-700 border-red-300" },
  { label: "I Know", tag: "i-know", color: "bg-purple-100 text-purple-700 border-purple-300" },
  { label: "Dismissed", tag: "dismissed", color: "bg-orange-100 text-orange-700 border-orange-300" },
  { label: "Contradicted", tag: "contradicted", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  { label: "Proof", tag: "proof", color: "bg-green-100 text-green-700 border-green-300" },
  { label: "Gaslit", tag: "gaslit", color: "bg-pink-100 text-pink-700 border-pink-300" },
  { label: "They Said", tag: "they-said", color: "bg-blue-100 text-blue-700 border-blue-300" },
  { label: "I Said", tag: "i-said", color: "bg-indigo-100 text-indigo-700 border-indigo-300" },
]

interface GarageEntry {
  id: string
  title: string
  description: string
  date: string         // When the incident/evidence is from (backdatable)
  addedDate: string    // When it was added to the garage
  tags: string[]
  imageKeys: string[]  // References to image_blobs
  provider?: string    // Which provider/doctor if relevant
  category: string     // "rash", "lab", "message", "portal", "other"
}

const EVIDENCE_CATEGORIES = [
  { value: "lab", label: "Lab Results", icon: "🧪" },
  { value: "rash", label: "Rash / Visible Symptom", icon: "📸" },
  { value: "message", label: "Patient Portal Message", icon: "💬" },
  { value: "note", label: "Doctor's Note", icon: "📋" },
  { value: "screenshot", label: "Screenshot", icon: "🖥️" },
  { value: "comparison", label: "Before/After", icon: "🔄" },
  { value: "document", label: "Document / Letter", icon: "📄" },
  { value: "other", label: "Other Evidence", icon: "📁" },
]

export default function GaslightGaragePage() {
  const { saveData, getAllCategoryData } = useDailyData()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [evidenceDate, setEvidenceDate] = useState(formatDateForStorage(new Date()))
  const [tags, setTags] = useState<string[]>([])
  const [category, setCategory] = useState("other")
  const [provider, setProvider] = useState("")
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  // Gallery state
  const [entries, setEntries] = useState<GarageEntry[]>([])
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [entryImages, setEntryImages] = useState<Record<string, string[]>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Load existing entries
  const loadEntries = useCallback(async () => {
    try {
      const records = await getAllCategoryData(CATEGORIES.USER)
      const garageRecords = records
        ?.filter((r: any) => r.subcategory === 'gaslight-garage')
        ?.map((r: any) => {
          const content = typeof r.content === 'string' ? JSON.parse(r.content) : r.content
          return content as GarageEntry
        })
        ?.sort((a: GarageEntry, b: GarageEntry) => b.date.localeCompare(a.date)) || []

      setEntries(garageRecords)
    } catch (e) {
      console.error("Failed to load garage entries:", e)
    }
  }, [getAllCategoryData])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedImages(prev => [...prev, ...files])

    // Create previews
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  // Toggle quick tag
  const toggleQuickTag = (tag: string) => {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  // Save entry
  const handleSubmit = async () => {
    if (!title.trim()) return
    setIsSubmitting(true)

    try {
      const entryId = `garage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Save images to blob storage
      const imageKeys: string[] = []
      for (const file of selectedImages) {
        const blobKey = `garage-img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        await db.image_blobs.put({
          blob_key: blobKey,
          blob_data: file,
          filename: file.name,
          mime_type: file.type,
          size: file.size,
          created_at: getCurrentTimestamp(),
          linked_records: [entryId],
        })
        imageKeys.push(blobKey)
      }

      const entry: GarageEntry = {
        id: entryId,
        title: title.trim(),
        description: description.trim(),
        date: evidenceDate,
        addedDate: formatDateForStorage(new Date()),
        tags,
        imageKeys,
        provider: provider.trim() || undefined,
        category,
      }

      await saveData(
        evidenceDate,
        CATEGORIES.USER,
        'gaslight-garage',
        JSON.stringify(entry)
      )

      // Reset form
      setTitle("")
      setDescription("")
      setEvidenceDate(formatDateForStorage(new Date()))
      setTags([])
      setCategory("other")
      setProvider("")
      setSelectedImages([])
      setImagePreviews([])
      setShowForm(false)

      // Reload entries
      await loadEntries()
      console.log(`🔥 Evidence filed: ${entry.title}`)
    } catch (e) {
      console.error("Failed to save evidence:", e)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Load images for an entry when expanded
  const loadEntryImages = async (entry: GarageEntry) => {
    if (entryImages[entry.id]) return // Already loaded
    const urls: string[] = []
    for (const key of entry.imageKeys) {
      try {
        const blob = await db.image_blobs.where('blob_key').equals(key).first()
        if (blob) {
          urls.push(URL.createObjectURL(blob.blob_data))
        }
      } catch (e) {
        console.error(`Failed to load image ${key}:`, e)
      }
    }
    setEntryImages(prev => ({ ...prev, [entry.id]: urls }))
  }

  // Delete entry
  const deleteEntry = async (entry: GarageEntry) => {
    try {
      // Delete associated images
      for (const key of entry.imageKeys) {
        await db.image_blobs.where('blob_key').equals(key).delete()
      }
      // Delete the record
      await db.daily_data
        .where('[date+category+subcategory]')
        .equals([entry.date, CATEGORIES.USER, 'gaslight-garage'])
        .filter((r: any) => {
          const content = typeof r.content === 'string' ? JSON.parse(r.content) : r.content
          return content.id === entry.id
        })
        .delete()

      await loadEntries()
    } catch (e) {
      console.error("Failed to delete entry:", e)
    }
  }

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = !searchQuery ||
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.provider?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTag = !filterTag || entry.tags.includes(filterTag)
    return matchesSearch && matchesTag
  })

  // Get all unique tags across entries for filter
  const allTags = [...new Set(entries.flatMap(e => e.tags))]

  return (
    <AppCanvas currentPage="manage">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2 flex items-center justify-center gap-2">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            Gaslight Garage
          </h1>
          <p className="text-lg text-[var(--text-muted)] italic">
            "No REALLY, and I have proof."
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Your medical evidence locker. Photos, screenshots, messages, receipts.
          </p>
        </header>

        {/* Add Evidence Button */}
        {!showForm && (
          <div className="flex justify-center mb-6">
            <Button
              onClick={() => setShowForm(true)}
              className="bg-[var(--accent-primary)] text-[var(--text-main)] hover:opacity-90 font-medium border-2 border-[var(--accent-primary)]"
            >
              <Upload className="h-4 w-4 mr-2" />
              File New Evidence
            </Button>
          </div>
        )}

        {/* Add Evidence Form */}
        {showForm && (
          <Card className="mb-6 border-[var(--border-soft)] bg-[var(--bg-card)]">
            <CardHeader>
              <CardTitle className="text-[var(--text-main)] flex items-center gap-2">
                <FileText className="h-5 w-5" />
                File New Evidence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div>
                <Label className="text-[var(--text-main)]">What happened?</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., 'Dr. Smith said labs were normal — they were not'"
                  className="mt-1"
                />
              </div>

              {/* Date (backdatable!) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[var(--text-main)] flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    When did this happen?
                  </Label>
                  <Input
                    type="date"
                    value={evidenceDate}
                    onChange={e => setEvidenceDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[var(--text-main)]">Provider (optional)</Label>
                  <Input
                    value={provider}
                    onChange={e => setProvider(e.target.value)}
                    placeholder="Dr. Dismissive"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Evidence Category */}
              <div>
                <Label className="text-[var(--text-main)]">Type of evidence</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {EVIDENCE_CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                        category === cat.value
                          ? 'bg-[var(--accent-primary)] text-[var(--text-main)] border-[var(--accent-primary)] font-medium'
                          : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-soft)] hover:border-[var(--accent-primary)]'
                      }`}
                      style={category === cat.value ? { textShadow: '0 1px 2px rgba(0,0,0,0.2)' } : {}}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-[var(--text-main)]">The receipts (describe what happened)</Label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What did they say? What actually happened? Why does this matter?"
                  className="mt-1 min-h-24"
                />
              </div>

              {/* Quick Tags */}
              <div>
                <Label className="text-[var(--text-main)] mb-2 block">Quick tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {QUICK_TAGS.map(qt => (
                    <button
                      key={qt.tag}
                      onClick={() => toggleQuickTag(qt.tag)}
                      className={`px-3 py-1 rounded-full text-sm border transition-all ${
                        tags.includes(qt.tag)
                          ? qt.color + ' font-medium'
                          : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-soft)] opacity-60 hover:opacity-100'
                      }`}
                    >
                      {qt.label}
                    </button>
                  ))}
                </div>
                <TagInput
                  value={tags.filter(t => !QUICK_TAGS.some(qt => qt.tag === t))}
                  onChange={customTags => {
                    const quickTags = tags.filter(t => QUICK_TAGS.some(qt => qt.tag === t))
                    setTags([...quickTags, ...customTags])
                  }}
                  placeholder="Add custom tags..."
                />
              </div>

              {/* Image Upload */}
              <div>
                <Label className="text-[var(--text-main)]">Upload evidence (photos, screenshots)</Label>
                <div
                  className="mt-1 border-2 border-dashed border-[var(--border-soft)] rounded-lg p-6 text-center cursor-pointer hover:border-[var(--accent-primary)] transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-8 w-8 mx-auto text-[var(--text-muted)] mb-2" />
                  <p className="text-sm text-[var(--text-muted)]">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    JPG, PNG, GIF, PDF — your receipts, your proof
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleImageSelect}
                />

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-3">
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={preview}
                          alt={`Evidence ${idx + 1}`}
                          className="h-24 w-24 object-cover rounded-lg border border-[var(--border-soft)]"
                        />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={!title.trim() || isSubmitting}
                  className="bg-[var(--accent-primary)] text-[var(--text-main)] hover:opacity-90 flex-1 font-medium border-2 border-[var(--accent-primary)]"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Filing..." : "File Evidence"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="border-[var(--border-soft)] text-[var(--text-muted)]"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search & Filter */}
        {entries.length > 0 && (
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search evidence..."
                className="pl-9"
              />
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {filterTag && (
                  <button
                    onClick={() => setFilterTag(null)}
                    className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 border border-red-300"
                  >
                    Clear filter <X className="h-3 w-3 inline" />
                  </button>
                )}
                {allTags.slice(0, 6).map(tag => (
                  <button
                    key={tag}
                    onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                    className={`px-2 py-1 rounded-full text-xs border transition-all ${
                      filterTag === tag
                        ? 'bg-[var(--accent-primary)] text-[var(--text-main)] border-[var(--accent-primary)] font-medium'
                        : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-soft)]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Evidence Gallery */}
        {filteredEntries.length === 0 && entries.length === 0 ? (
          <Card className="border-[var(--border-soft)] bg-[var(--bg-card)]">
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-4 opacity-30" />
              <p className="text-[var(--text-muted)] text-lg mb-2">
                No evidence filed yet
              </p>
              <p className="text-[var(--text-muted)] text-sm">
                When they say "that's normal" and it's not — this is where the receipts go.
              </p>
            </CardContent>
          </Card>
        ) : filteredEntries.length === 0 ? (
          <p className="text-center text-[var(--text-muted)] py-8">
            No evidence matches your search.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map(entry => {
              const catInfo = EVIDENCE_CATEGORIES.find(c => c.value === entry.category)
              const isExpanded = expandedEntry === entry.id

              return (
                <Card key={entry.id} className="border-[var(--border-soft)] bg-[var(--bg-card)]">
                  <CardContent className="py-4">
                    {/* Header row */}
                    <div
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => {
                        setExpandedEntry(isExpanded ? null : entry.id)
                        if (!isExpanded) loadEntryImages(entry)
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{catInfo?.icon || "📁"}</span>
                          <h3 className="font-semibold text-[var(--text-main)]">{entry.title}</h3>
                          {entry.imageKeys.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <ImageIcon className="h-3 w-3 mr-1" />
                              {entry.imageKeys.length}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {entry.date}
                          </span>
                          {entry.provider && (
                            <span>Provider: {entry.provider}</span>
                          )}
                        </div>
                        {entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {entry.tags.map(tag => {
                              const quickTag = QUICK_TAGS.find(qt => qt.tag === tag)
                              return (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className={`text-xs ${quickTag?.color || ''}`}
                                >
                                  {quickTag?.label || tag}
                                </Badge>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[var(--text-muted)] hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm("Delete this evidence? This cannot be undone.")) {
                              deleteEntry(entry)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-[var(--text-muted)]" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-[var(--text-muted)]" />
                        )}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-[var(--border-soft)]">
                        {entry.description && (
                          <p className="text-sm text-[var(--text-main)] mb-4 whitespace-pre-wrap">
                            {entry.description}
                          </p>
                        )}

                        {/* Images */}
                        {entryImages[entry.id] && entryImages[entry.id].length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {entryImages[entry.id].map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={url}
                                  alt={`Evidence ${idx + 1}`}
                                  className="w-full h-48 object-cover rounded-lg border border-[var(--border-soft)] hover:border-[var(--accent-primary)] transition-colors cursor-pointer"
                                />
                              </a>
                            ))}
                          </div>
                        )}

                        {entry.imageKeys.length > 0 && !entryImages[entry.id] && (
                          <p className="text-sm text-[var(--text-muted)] italic">Loading images...</p>
                        )}

                        <p className="text-xs text-[var(--text-muted)] mt-3">
                          Filed on {entry.addedDate}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-center gap-4 mt-8 text-sm">
          <Button variant="outline" asChild>
            <a href="/manage">
              ← Back to Manage
            </a>
          </Button>
        </div>
      </div>
    </AppCanvas>
  )
}
