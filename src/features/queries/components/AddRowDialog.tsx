import { SpinnerGapIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { TableInfo } from '@/data/types'
import { useInsertRowMutation } from '@/features/queries/queries'
import {
  type InsertRowColumnValue,
  isInsertFormColumn,
} from '@/features/queries/result-edits'
import { useTablePropertiesQuery } from '@/features/schema/queries'

type AddRowDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  connectionId: string | undefined
  table: TableInfo | null
  onInserted: () => void
}

export function AddRowDialog({
  open,
  onOpenChange,
  connectionId,
  table,
  onInserted,
}: AddRowDialogProps) {
  const insertMutation = useInsertRowMutation()

  const propertiesQuery = useTablePropertiesQuery({
    connectionId,
    table,
    enabled: open && Boolean(connectionId && table),
  })

  const formColumns = useMemo(
    () => (propertiesQuery.data ?? []).filter(isInsertFormColumn),
    [propertiesQuery.data],
  )

  const [valuesByColumn, setValuesByColumn] = useState<Record<string, string>>({})
  const [validationError, setValidationError] = useState<string | null>(null)

  const tableLabel = table ? `${table.schema}.${table.name}` : '—'

  const resetForm = () => {
    setValuesByColumn({})
    setValidationError(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetForm()
    }
    onOpenChange(next)
  }

  const handleSubmit = async () => {
    if (!connectionId || !table || !propertiesQuery.data) return

    const columns: InsertRowColumnValue[] = []
    const missing: string[] = []

    for (const col of formColumns) {
      const raw = valuesByColumn[col.columnName]?.trim() ?? ''
      if (raw === '') {
        if (!col.isNullable) {
          missing.push(col.columnName)
        } else {
          columns.push({ columnName: col.columnName, value: null })
        }
      } else {
        columns.push({ columnName: col.columnName, value: raw })
      }
    }

    if (missing.length > 0) {
      setValidationError(`Required values missing for: ${missing.join(', ')}`)
      return
    }
    setValidationError(null)

    try {
      await insertMutation.mutateAsync({
        connectionId,
        table,
        columns,
      })
      resetForm()
      onInserted()
      handleOpenChange(false)
    } catch {
      // Mutation surfaces via isError; optional toast could go here.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden border border-border p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>Add row</DialogTitle>
          <DialogDescription>
            Insert into <span className="text-foreground">{tableLabel}</span>. Empty optional fields
            become NULL.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-3">
          {validationError ? (
            <div className="mb-3 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {validationError}
            </div>
          ) : null}

          {propertiesQuery.isLoading ? (
            <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
              <SpinnerGapIcon className="size-4 animate-spin" />
              Loading columns…
            </div>
          ) : null}

          {propertiesQuery.isError ? (
            <div className="py-4 text-xs text-destructive">
              {propertiesQuery.error instanceof Error
                ? propertiesQuery.error.message
                : 'Failed to load table metadata'}
            </div>
          ) : null}

          {propertiesQuery.isSuccess && formColumns.length === 0 ? (
            <div className="py-4 text-xs text-muted-foreground">
              No insertable columns found (e.g. only GENERATED ALWAYS / identity ALWAYS columns).
            </div>
          ) : null}

          {propertiesQuery.isSuccess && formColumns.length > 0 ? (
            <div className="space-y-3">
              {formColumns.map((col) => (
                <div key={col.columnName} className="space-y-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <label className="text-xs font-medium text-foreground" htmlFor={`addrow-${col.columnName}`}>
                      {col.columnName}
                      {!col.isNullable ? <span className="text-destructive"> *</span> : null}
                    </label>
                    <span className="text-[11px] text-muted-foreground">{col.dataType}</span>
                  </div>
                  <Input
                    id={`addrow-${col.columnName}`}
                    value={valuesByColumn[col.columnName] ?? ''}
                    onChange={(e) =>
                      setValuesByColumn((prev) => ({
                        ...prev,
                        [col.columnName]: e.target.value,
                      }))
                    }
                    placeholder={col.isNullable ? 'NULL if empty' : 'Required'}
                    className="text-xs"
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border px-5 py-4">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={insertMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              void handleSubmit()
            }}
            disabled={
              insertMutation.isPending || !connectionId || !table || propertiesQuery.isLoading || formColumns.length === 0
            }
          >
            {insertMutation.isPending ? 'Inserting…' : 'Insert row'}
          </Button>
        </DialogFooter>

        {insertMutation.isError ? (
          <div className="border-t border-border bg-destructive/10 px-5 py-2 text-xs text-destructive">
            {insertMutation.error instanceof Error ? insertMutation.error.message : 'Insert failed'}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
