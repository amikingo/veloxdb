import type { ColumnInfo } from '@/data/types'
import { TABLE_NODE_WIDTH } from '@/features/model/table-node-metrics'

const HEADER_H = 40
const ROW_H = 18
const MAX_ROWS = 8
const PAD = 10

/** World-space point on the right edge of a column row (for relationship rubber-band). */
export function columnAnchorWorld(
  tablePos: { x: number; y: number },
  columnName: string,
  columns: ColumnInfo[],
): { x: number; y: number } {
  const idx = columns.findIndex((c) => c.columnName === columnName)
  const rowIndex = idx < 0 ? 0 : Math.min(idx, MAX_ROWS - 1)
  const localY = HEADER_H + 4 + rowIndex * ROW_H + ROW_H / 2
  return {
    x: tablePos.x + TABLE_NODE_WIDTH,
    y: tablePos.y + localY,
  }
}

/** Left-edge anchor (optional use for incoming edges later). */
export function columnAnchorWorldLeft(
  tablePos: { x: number; y: number },
  columnName: string,
  columns: ColumnInfo[],
): { x: number; y: number } {
  const p = columnAnchorWorld(tablePos, columnName, columns)
  return { x: tablePos.x + PAD, y: p.y }
}

