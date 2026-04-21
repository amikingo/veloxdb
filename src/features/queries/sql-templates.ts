import type { TableInfo } from '@/data/types'

import { quoteIdent } from '@/lib/sql-ident'

/** Qualified "schema"."table" for SQL snippets. */
export function qualifiedTableName(table: TableInfo): string {
  return `${quoteIdent(table.schema)}.${quoteIdent(table.name)}`
}

export function buildSelectAllSql(table: TableInfo, limit = 200): string {
  const q = qualifiedTableName(table)
  return `SELECT *\nFROM ${q}\nLIMIT ${limit};`
}

export function buildSelectCountSql(table: TableInfo): string {
  const q = qualifiedTableName(table)
  return `SELECT COUNT(*) AS cnt\nFROM ${q};`
}

export function buildInsertTemplateSql(table: TableInfo, columnNames: string[]): string {
  const q = qualifiedTableName(table)
  if (columnNames.length === 0) {
    return `INSERT INTO ${q}\nDEFAULT VALUES;`
  }
  const cols = columnNames.map(quoteIdent).join(', ')
  return `INSERT INTO ${q} (${cols})\nVALUES (/* values */);`
}

export function buildUpdateTemplateSql(table: TableInfo, primaryKeyColumns: string[]): string {
  const q = qualifiedTableName(table)
  const sets = '/* column */ = /* value */'
  if (primaryKeyColumns.length === 0) {
    return `UPDATE ${q}\nSET ${sets}\nWHERE /* condition */;`
  }
  const where = primaryKeyColumns
    .map((c) => `${quoteIdent(c)} = /* value */`)
    .join(' AND ')
  return `UPDATE ${q}\nSET ${sets}\nWHERE ${where};`
}

export function buildDeleteTemplateSql(table: TableInfo, primaryKeyColumns: string[]): string {
  const q = qualifiedTableName(table)
  if (primaryKeyColumns.length === 0) {
    return `DELETE FROM ${q}\nWHERE /* condition */;`
  }
  const where = primaryKeyColumns
    .map((c) => `${quoteIdent(c)} = /* value */`)
    .join(' AND ')
  return `DELETE FROM ${q}\nWHERE ${where};`
}
