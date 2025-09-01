-- 🔥 NOVA'S BRILLIANT SQLITE GRAPH OVERLAY SCHEMA
-- Built by: Nova (design) + Ace (implementation)
-- Date: 2025-09-01
-- 
-- This creates graph capabilities on top of SQLite for medical tracker correlations
-- "80-90% of SurrealDB power without the migration hell" - Nova

-- === GRAPH NODES TABLE ===
-- Represents any trackable entity (symptoms, interventions, events, etc.)
CREATE TABLE IF NOT EXISTS graph_nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Core identification
  label TEXT NOT NULL,                    -- Human readable name (e.g., "Migraine", "Took Ibuprofen")
  type TEXT NOT NULL,                     -- Category (symptom, intervention, trigger, etc.)
  
  -- Source tracking
  source_table TEXT,                      -- Which tracker table this came from
  source_id INTEGER,                      -- ID in the source table
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexing for performance
  UNIQUE(source_table, source_id)
);

-- === GRAPH EDGES TABLE ===
-- Represents relationships between nodes (correlations, sequences, etc.)
CREATE TABLE IF NOT EXISTS graph_edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Relationship definition
  from_node_id INTEGER NOT NULL,         -- Source node
  to_node_id INTEGER NOT NULL,           -- Target node
  relationship_type TEXT NOT NULL,       -- Type of relationship (precedes, correlates, triggers, etc.)
  
  -- Relationship strength and metadata
  weight REAL DEFAULT 1.0,               -- Strength of relationship (0.0 to 1.0)
  confidence REAL DEFAULT 0.5,           -- How confident we are in this relationship
  
  -- Temporal information
  time_window_hours INTEGER,             -- Time window for this relationship (e.g., 24 hours)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  FOREIGN KEY(from_node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY(to_node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
  
  -- Prevent duplicate relationships
  UNIQUE(from_node_id, to_node_id, relationship_type, time_window_hours)
);

-- === PERFORMANCE INDEXES ===
CREATE INDEX IF NOT EXISTS idx_nodes_type ON graph_nodes(type);
CREATE INDEX IF NOT EXISTS idx_nodes_source ON graph_nodes(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_nodes_label ON graph_nodes(label);

CREATE INDEX IF NOT EXISTS idx_edges_from ON graph_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_to ON graph_edges(to_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_type ON graph_edges(relationship_type);
CREATE INDEX IF NOT EXISTS idx_edges_weight ON graph_edges(weight);

-- === EXAMPLE GRAPH QUERIES (as comments for reference) ===

-- Find all symptoms that co-occur within 24 hours of migraines:
/*
WITH RECURSIVE migraine_correlations(node_id, label, depth, path) AS (
  -- Start with migraine nodes
  SELECT n.id, n.label, 0, n.label
  FROM graph_nodes n 
  WHERE n.label LIKE '%migraine%' AND n.type = 'symptom'
  
  UNION ALL
  
  -- Find connected symptoms within 24 hours
  SELECT n.id, n.label, mc.depth + 1, mc.path || ' -> ' || n.label
  FROM migraine_correlations mc
  JOIN graph_edges e ON mc.node_id = e.from_node_id
  JOIN graph_nodes n ON e.to_node_id = n.id
  WHERE mc.depth < 2 
    AND e.relationship_type = 'co_occurs'
    AND e.time_window_hours <= 24
    AND n.type = 'symptom'
)
SELECT DISTINCT label, path FROM migraine_correlations WHERE depth > 0;
*/

-- Find most effective interventions for a specific symptom:
/*
SELECT 
  intervention.label as intervention,
  AVG(e.weight) as effectiveness,
  COUNT(*) as frequency
FROM graph_nodes symptom
JOIN graph_edges e ON symptom.id = e.from_node_id
JOIN graph_nodes intervention ON e.to_node_id = intervention.id
WHERE symptom.label = 'palpitations'
  AND intervention.type = 'intervention'
  AND e.relationship_type = 'helps_with'
GROUP BY intervention.id, intervention.label
ORDER BY effectiveness DESC, frequency DESC;
*/

-- Find symptom clusters in the last 14 days:
/*
WITH recent_symptoms AS (
  SELECT DISTINCT n.id, n.label
  FROM graph_nodes n
  WHERE n.type = 'symptom' 
    AND n.created_at >= datetime('now', '-14 days')
),
symptom_pairs AS (
  SELECT 
    s1.label as symptom1,
    s2.label as symptom2,
    COUNT(*) as co_occurrence_count,
    AVG(e.weight) as avg_strength
  FROM recent_symptoms s1
  JOIN graph_edges e ON s1.id = e.from_node_id
  JOIN recent_symptoms s2 ON e.to_node_id = s2.id
  WHERE e.relationship_type = 'co_occurs'
    AND s1.id != s2.id
  GROUP BY s1.id, s2.id, s1.label, s2.label
  HAVING co_occurrence_count >= 3
)
SELECT * FROM symptom_pairs ORDER BY avg_strength DESC, co_occurrence_count DESC;
*/
