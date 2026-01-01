/*
 * 🔥 NOVA'S BRILLIANT SQLITE GRAPH SERVICE
 * Built by: Nova (design) + Ace (implementation)
 * Date: 2025-09-01
 * 
 * This service mirrors tracker data into graph nodes/edges for correlation analysis
 * "Just call mirrorToGraph() after each save" - Nova
 */

import { getDB } from './database/dexie-db'

// === GRAPH NODE INTERFACE ===
interface GraphNode {
  id?: number
  label: string
  type: string
  source_table?: string
  source_id?: number
  created_at: string
  updated_at: string
}

// === GRAPH EDGE INTERFACE ===
interface GraphEdge {
  id?: number
  from_node_id: number
  to_node_id: number
  relationship_type: string
  weight: number
  confidence: number
  time_window_hours?: number
  created_at: string
  updated_at: string
}

// === GRAPH SERVICE CLASS ===
export class GraphService {
  private userPin?: string

  constructor(userPin?: string) {
    this.userPin = userPin
  }

  // Initialize the graph database (using existing Dexie infrastructure)
  async initialize(): Promise<void> {
    try {
      // We'll store graph data in the existing Dexie database
      // using special categories for graph nodes and edges
      const db = getDB(this.userPin)
      console.log('🔥 Graph service initialized with existing Dexie database!')
    } catch (error) {
      console.error('❌ Failed to initialize graph service:', error)
      throw error
    }
  }

  // === CORE MIRRORING FUNCTION ===
  // This is the main function Nova designed - call after each tracker save
  async mirrorToGraph(trackerData: {
    table: string
    id: number
    data: any
    timestamp?: string
  }): Promise<void> {
    try {
      const { table, id, data, timestamp = new Date().toISOString() } = trackerData
      const db = getDB(this.userPin)

      // Extract nodes from the tracker data
      const nodes = this.extractNodes(table, id, data, timestamp)

      // Save nodes to Dexie using graph category
      const graphData = {
        source_table: table,
        source_id: id,
        nodes: nodes,
        timestamp: timestamp
      }

      // Store in Dexie with special graph category
      await db.daily_data.put({
        date: timestamp.split('T')[0], // Extract date part
        category: 'GRAPH_MIRROR',
        subcategory: table,
        content: graphData,
        tags: ['graph', 'correlation', 'analytics'],
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      })

      console.log(`🔗 Mirrored ${table}:${id} to graph with ${nodes.length} nodes`)
    } catch (error) {
      console.error('❌ Failed to mirror to graph:', error)
    }
  }

  // Extract nodes from tracker data
  private extractNodes(table: string, id: number, data: any, timestamp: string): any[] {
    const nodes: any[] = []
    const now = timestamp

    // Extract symptoms
    if (data.symptoms && Array.isArray(data.symptoms)) {
      data.symptoms.forEach((symptom: string) => {
        nodes.push({
          label: symptom,
          type: 'symptom',
          source_table: table,
          source_id: id,
          created_at: now,
          updated_at: now
        })
      })
    }

    // Extract interventions
    if (data.interventions && Array.isArray(data.interventions)) {
      data.interventions.forEach((intervention: string) => {
        nodes.push({
          label: intervention,
          type: 'intervention',
          source_table: table,
          source_id: id,
          created_at: now,
          updated_at: now
        })
      })
    }

    // Extract triggers
    if (data.triggers && Array.isArray(data.triggers)) {
      data.triggers.forEach((trigger: string) => {
        nodes.push({
          label: trigger,
          type: 'trigger',
          source_table: table,
          source_id: id,
          created_at: now,
          updated_at: now
        })
      })
    }

    // Extract single values as nodes
    if (data.mood) {
      nodes.push({
        label: `mood: ${data.mood}`,
        type: 'mood',
        source_table: table,
        source_id: id,
        created_at: now,
        updated_at: now
      })
    }

    if (data.pain_level) {
      nodes.push({
        label: `pain level: ${data.pain_level}`,
        type: 'pain_level',
        source_table: table,
        source_id: id,
        created_at: now,
        updated_at: now
      })
    }

    return nodes
  }

  // Simplified for Dexie - we'll build more complex queries later
  // For now, just store the extracted nodes for future correlation analysis

  // === NOVA'S SIMPLIFIED QUERIES (using Dexie) ===

  // Find symptoms that co-occur with a given symptom
  async findCoOccurringSymptoms(symptomLabel: string, timeWindowHours: number = 24): Promise<any[]> {
    try {
      const db = getDB(this.userPin)

      // Get all graph mirror data
      const graphData = await db.daily_data
        .where('category')
        .equals('GRAPH_MIRROR')
        .toArray()

      // Simple correlation analysis - find entries that contain both symptoms
      const correlations = new Map<string, { count: number, weight: number }>()

      for (const entry of graphData) {
        const nodes = entry.content?.nodes || []
        const hasTargetSymptom = nodes.some((node: any) =>
          node.type === 'symptom' && node.label.toLowerCase().includes(symptomLabel.toLowerCase())
        )

        if (hasTargetSymptom) {
          // Find other symptoms in the same entry
          nodes.forEach((node: any) => {
            if (node.type === 'symptom' && !node.label.toLowerCase().includes(symptomLabel.toLowerCase())) {
              const existing = correlations.get(node.label) || { count: 0, weight: 0 }
              correlations.set(node.label, {
                count: existing.count + 1,
                weight: existing.weight + 0.7 // Default correlation weight
              })
            }
          })
        }
      }

      return Array.from(correlations.entries())
        .map(([symptom, stats]) => ({
          symptom,
          weight: stats.weight / stats.count,
          confidence: Math.min(stats.count / 10, 1) // Confidence based on frequency
        }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 10) // Top 10 correlations
    } catch (error) {
      console.error('Correlation search failed:', error)
      return []
    }
  }

  // Find most effective interventions for a symptom
  async findEffectiveInterventions(symptomLabel: string): Promise<any[]> {
    try {
      const db = getDB(this.userPin)

      // Get all graph mirror data
      const graphData = await db.daily_data
        .where('category')
        .equals('GRAPH_MIRROR')
        .toArray()

      // Simple intervention analysis
      const interventions = new Map<string, { count: number, effectiveness: number }>()

      for (const entry of graphData) {
        const nodes = entry.content?.nodes || []
        const hasTargetSymptom = nodes.some((node: any) =>
          node.type === 'symptom' && node.label.toLowerCase().includes(symptomLabel.toLowerCase())
        )

        if (hasTargetSymptom) {
          // Find interventions in the same entry
          nodes.forEach((node: any) => {
            if (node.type === 'intervention') {
              const existing = interventions.get(node.label) || { count: 0, effectiveness: 0 }
              interventions.set(node.label, {
                count: existing.count + 1,
                effectiveness: existing.effectiveness + 0.8 // Default effectiveness
              })
            }
          })
        }
      }

      return Array.from(interventions.entries())
        .map(([intervention, stats]) => ({
          intervention,
          effectiveness: stats.effectiveness / stats.count,
          frequency: stats.count
        }))
        .sort((a, b) => b.effectiveness - a.effectiveness)
        .slice(0, 10) // Top 10 interventions
    } catch (error) {
      console.error('Intervention search failed:', error)
      return []
    }
  }
}

// Export singleton instance
export const graphService = new GraphService()
