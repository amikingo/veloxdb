import { useMemo, useState, type ReactNode } from 'react'
import { CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'

export type TreeDataItem = {
  id: string
  name: ReactNode
  children?: TreeDataItem[]
  disabled?: boolean
  className?: string
  icon?: React.ComponentType<{ className?: string }>
  openIcon?: React.ComponentType<{ className?: string }>
  selectedIcon?: React.ComponentType<{ className?: string }>
  actions?: ReactNode
  onClick?: () => void
  data?: unknown
}

export type TreeRenderItemParams = {
  item: TreeDataItem
  level: number
  isExpanded: boolean
  isSelected: boolean
  hasChildren: boolean
  toggle: () => void
  select: () => void
}

type TreeViewProps = React.HTMLAttributes<HTMLDivElement> & {
  data: TreeDataItem[] | TreeDataItem
  initialSelectedItemId?: string
  onSelectChange?: (item: TreeDataItem | undefined) => void
  renderItem?: (params: TreeRenderItemParams) => React.ReactNode
  expandAll?: boolean
}

function collectIds(items: TreeDataItem[]): string[] {
  const ids: string[] = []
  for (const item of items) {
    ids.push(item.id)
    if (item.children?.length) {
      ids.push(...collectIds(item.children))
    }
  }
  return ids
}

export function TreeView({
  data,
  initialSelectedItemId,
  onSelectChange,
  renderItem,
  expandAll = false,
  className,
  ...props
}: TreeViewProps) {
  const items = useMemo(() => (Array.isArray(data) ? data : [data]), [data])
  const [selectedId, setSelectedId] = useState<string | undefined>(initialSelectedItemId)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(expandAll ? collectIds(items) : []),
  )

  const toggle = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const select = (item: TreeDataItem) => {
    setSelectedId(item.id)
    onSelectChange?.(item)
    item.onClick?.()
  }

  const renderNode = (item: TreeDataItem, level: number): ReactNode => {
    const hasChildren = Boolean(item.children?.length)
    const isExpanded = expandedIds.has(item.id)
    const isSelected = selectedId === item.id

    if (renderItem) {
      return (
        <div key={item.id}>
          {renderItem({
            item,
            level,
            isExpanded,
            isSelected,
            hasChildren,
            toggle: () => toggle(item.id),
            select: () => select(item),
          })}
          {hasChildren && isExpanded ? item.children?.map((child) => renderNode(child, level + 1)) : null}
        </div>
      )
    }

    return (
      <div key={item.id}>
        <button
          type="button"
          className={cn(
            'flex h-8 w-full items-center gap-1 px-2 text-left text-xs transition hover:bg-accent hover:text-accent-foreground',
            isSelected && 'bg-accent text-accent-foreground',
            item.className,
          )}
          style={{ paddingLeft: `${8 + level * 14}px` }}
          disabled={item.disabled}
          onClick={() => {
            select(item)
            if (hasChildren) toggle(item.id)
          }}
        >
          <span className="inline-flex size-4 items-center justify-center text-muted-foreground">
            {hasChildren ? (isExpanded ? <CaretDownIcon className="size-3.5" /> : <CaretRightIcon className="size-3.5" />) : null}
          </span>
          <span className="truncate">{item.name}</span>
          {item.actions ? <span className="ml-auto">{item.actions}</span> : null}
        </button>
        {hasChildren && isExpanded ? item.children?.map((child) => renderNode(child, level + 1)) : null}
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)} {...props}>
      {items.map((item) => renderNode(item, 0))}
    </div>
  )
}
