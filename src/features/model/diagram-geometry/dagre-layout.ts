import dagre from 'dagre'
import type { ColumnInfo } from '@/data/types'
import type { TableKey, ColumnDetailLevel } from '@/features/model/model-types'
import { TABLE_NODE_WIDTH, tableNodeHeight } from '@/features/model/table-node-metrics'

type DagreLayoutInput = {
  tableKeys: TableKey[]
  columnsByKey: Record<TableKey, ColumnInfo[] | null>
  columnDetail: ColumnDetailLevel
  edges: Array<{ fromKey: TableKey; toKey: TableKey }>
}

type DagreLayoutOutput = Record<TableKey, { x: number; y: number }>

const HORIZONTAL_PAD = 80
const VERTICAL_PAD = 60

export function computeDagreLayout({
  tableKeys,
  columnsByKey,
  columnDetail,
  edges,
}: DagreLayoutInput): DagreLayoutOutput {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: HORIZONTAL_PAD, ranksep: VERTICAL_PAD, marginx: 40, marginy: 40 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const key of tableKeys) {
    const cols = columnsByKey[key] ?? null
    const w = TABLE_NODE_WIDTH
    const h = tableNodeHeight(cols, columnDetail)
    g.setNode(key, { width: w, height: h })
  }

  const edgeSet = new Set<string>()
  for (const edge of edges) {
    if (!tableKeys.includes(edge.fromKey) || !tableKeys.includes(edge.toKey)) continue
    const dedup = `${edge.fromKey}->${edge.toKey}`
    if (edgeSet.has(dedup)) continue
    edgeSet.add(dedup)
    g.setEdge(edge.fromKey, edge.toKey)
  }

  dagre.layout(g)

  const positions: DagreLayoutOutput = {}
  for (const key of tableKeys) {
    const node = g.node(key)
    if (!node) continue
    const cols = columnsByKey[key] ?? null
    const w = TABLE_NODE_WIDTH
    const h = tableNodeHeight(cols, columnDetail)
    positions[key] = {
      x: node.x - w / 2,
      y: node.y - h / 2,
    }
  }

  return positions
}
