import type { PendingModelForeignKey } from '@/features/model/apply-entire-model'
import type { TableKey } from '@/features/model/model-types'

export function remapPendingForeignKeysOnColumnRename(
  pendingForeignKeys: PendingModelForeignKey[],
  tableKey: TableKey,
  sourceColumnName: string,
  nextColumnName: string,
): PendingModelForeignKey[] {
  if (!nextColumnName.trim() || nextColumnName === sourceColumnName) return pendingForeignKeys
  return pendingForeignKeys.map((fk) => {
    if (fk.fromKey === tableKey && fk.fromColumn === sourceColumnName) {
      return { ...fk, fromColumn: nextColumnName }
    }
    if (fk.toKey === tableKey && fk.toColumn === sourceColumnName) {
      return { ...fk, toColumn: nextColumnName }
    }
    return fk
  })
}
