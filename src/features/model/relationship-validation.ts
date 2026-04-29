import type { ForeignKeyEdge } from '@/data/types'
import type { PendingModelForeignKey } from '@/features/model/apply-entire-model'
import type { TableKey } from '@/features/model/model-types'

function splitTableKey(key: TableKey): { schema: string; table: string } {
  const [schema = '', table = ''] = key.split('.')
  return { schema, table }
}

export type RelationshipInput = {
  fromKey: TableKey
  fromColumn: string
  toKey: TableKey
  toColumn: string
}

export function isSelfRelationship(input: RelationshipInput): boolean {
  return input.fromKey === input.toKey && input.fromColumn === input.toColumn
}

export function isDuplicateCommittedRelationship(
  input: RelationshipInput,
  foreignKeys: ForeignKeyEdge[],
): boolean {
  const from = splitTableKey(input.fromKey)
  const to = splitTableKey(input.toKey)
  return foreignKeys.some(
    (fk) =>
      fk.fromSchema === from.schema &&
      fk.fromTable === from.table &&
      fk.fromColumn === input.fromColumn &&
      fk.toSchema === to.schema &&
      fk.toTable === to.table &&
      fk.toColumn === input.toColumn,
  )
}

export function isDuplicatePendingRelationship(
  input: RelationshipInput,
  pendingForeignKeys: PendingModelForeignKey[],
): boolean {
  return pendingForeignKeys.some(
    (fk) =>
      fk.fromKey === input.fromKey &&
      fk.fromColumn === input.fromColumn &&
      fk.toKey === input.toKey &&
      fk.toColumn === input.toColumn,
  )
}

export function canQueueRelationship(
  input: RelationshipInput,
  foreignKeys: ForeignKeyEdge[],
  pendingForeignKeys: PendingModelForeignKey[],
): boolean {
  if (!input.fromColumn.trim() || !input.toColumn.trim()) return false
  if (isSelfRelationship(input)) return false
  if (isDuplicateCommittedRelationship(input, foreignKeys)) return false
  if (isDuplicatePendingRelationship(input, pendingForeignKeys)) return false
  return true
}
