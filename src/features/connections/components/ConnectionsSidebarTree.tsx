import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import {
  CaretDownIcon,
  CaretRightIcon,
  DatabaseIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SidebarSimpleIcon,
  SpinnerGapIcon,
} from '@phosphor-icons/react'

import type { ConnectionSummary, TableInfo } from '@/data/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TreeView, type TreeDataItem, type TreeRenderItemParams } from '@/components/ui/tree-view'
import { useTableSchemaQuery } from '@/features/schema/queries'

type ConnectionContextMenuTarget = {
  kind: 'connection'
  connection: ConnectionSummary
}

type TableContextMenuTarget = {
  kind: 'table'
  connectionId: string
  table: TableInfo
  onToggleExpanded?: () => void
  isExpanded?: boolean
}

type SidebarContextMenuTarget = ConnectionContextMenuTarget | TableContextMenuTarget

type TableSearchNeedles = {
  fullNeedleLower: string
  schemaNeedleLower: string
  tableNeedleLower: string
}

function getTableSearchNeedles(search: string): TableSearchNeedles {
  const fullNeedleLower = search.trim().toLowerCase()

  const dotIndex = fullNeedleLower.indexOf('.')
  if (dotIndex === -1) {
    return {
      fullNeedleLower,
      schemaNeedleLower: fullNeedleLower,
      tableNeedleLower: fullNeedleLower,
    }
  }

  return {
    fullNeedleLower,
    schemaNeedleLower: fullNeedleLower.slice(0, dotIndex),
    tableNeedleLower: fullNeedleLower.slice(dotIndex + 1),
  }
}

function highlightText(text: string, needleLower: string): ReactNode {
  if (!needleLower) return text

  const lower = text.toLowerCase()
  const parts: ReactNode[] = []

  let start = 0
  let keyIndex = 0

  while (true) {
    const idx = lower.indexOf(needleLower, start)
    if (idx === -1) break

    if (idx > start) {
      parts.push(text.slice(start, idx))
    }

    const match = text.slice(idx, idx + needleLower.length)
    parts.push(
      <span
        key={`h-${keyIndex++}`}
        className="rounded-[2px] bg-sidebar-accent px-0.5 text-sidebar-accent-foreground"
      >
        {match}
      </span>,
    )

    start = idx + needleLower.length
  }

  if (start < text.length) {
    parts.push(text.slice(start))
  }

  return <>{parts}</>
}

function isConnectionContextMenuTarget(
  target: SidebarContextMenuTarget,
): target is ConnectionContextMenuTarget {
  return target.kind === 'connection'
}

function isTableContextMenuTarget(
  target: SidebarContextMenuTarget,
): target is TableContextMenuTarget {
  return target.kind === 'table'
}

type ConnectionsSidebarTreeProps = {
  activeConnection: ConnectionSummary | null
  connections: ConnectionSummary[]
  tables: TableInfo[]
  selectedTable: TableInfo | null
  search: string
  tablesErrorMessage?: string
  isConnectionsLoading?: boolean
  isTablesLoading?: boolean
  isActivatingConnection?: boolean
  onSearchChange: (value: string) => void
  onOpenConnection: () => void
  onSelectConnection: (connection: ConnectionSummary) => void
  onSelectTable: (table: TableInfo) => void
  onOpenTableProperties: (connectionId: string, table: TableInfo) => void
  onToggleCollapsed: () => void
}

type TableTreeItemProps = {
  connectionId: string
  table: TableInfo
  level: number
  isExpanded: boolean
  isSelected: boolean
  highlightSchemaNeedleLower: string
  highlightTableNeedleLower: string
  onSelectTable: (table: TableInfo) => void
  onToggleExpanded: () => void
  onOpenContextMenu: (
    event: ReactMouseEvent<HTMLButtonElement>,
    target: TableContextMenuTarget,
  ) => void
}

const EMPTY_CONNECTIONS: ConnectionSummary[] = []
const EMPTY_TABLES: TableInfo[] = []

const TableTreeItem = memo(function TableTreeItem({
  connectionId,
  table,
  level,
  isExpanded,
  isSelected,
  highlightSchemaNeedleLower,
  highlightTableNeedleLower,
  onSelectTable,
  onToggleExpanded,
  onOpenContextMenu,
}: TableTreeItemProps) {
  const pendingSelectTimeoutRef = useRef<number | null>(null)

  const cancelPendingSelect = useCallback(() => {
    if (pendingSelectTimeoutRef.current != null) {
      window.clearTimeout(pendingSelectTimeoutRef.current)
      pendingSelectTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => cancelPendingSelect()
  }, [cancelPendingSelect])

  const schemaQuery = useTableSchemaQuery({
    connectionId,
    table,
    enabled: isExpanded,
  })

  const errorMessage =
    schemaQuery.error instanceof Error ? schemaQuery.error.message : 'Failed to load fields'

  return (
    <div className="py-0.5">
      <div className="flex min-w-0 items-center">
        <button
          type="button"
          className="flex h-8 w-7 shrink-0 items-center justify-center text-sidebar-foreground/70 transition hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
          onClick={onToggleExpanded}
          aria-label={isExpanded ? 'Collapse table fields' : 'Expand table fields'}
        >
          {isExpanded ? <CaretDownIcon /> : <CaretRightIcon />}
        </button>

        <button
          type="button"
          className={cn(
            'flex h-8 min-w-0 flex-1 items-center gap-2 rounded-sm px-2 text-left text-xs transition hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
            isSelected && 'bg-sidebar-accent text-sidebar-accent-foreground',
          )}
          style={{ paddingLeft: `${8 + level * 14}px` }}
          onClick={(event) => {
            // Delay selection slightly to avoid running previews on double-click.
            if (event.detail > 1) {
              cancelPendingSelect()
              return
            }

            cancelPendingSelect()
            pendingSelectTimeoutRef.current = window.setTimeout(() => {
              onSelectTable(table)
              pendingSelectTimeoutRef.current = null
            }, 250)
          }}
          onContextMenu={(event) => {
            cancelPendingSelect()
            onOpenContextMenu(event, {
              kind: 'table',
              connectionId,
              table,
              onToggleExpanded,
              isExpanded,
            })
          }}
          onDoubleClick={(event) => {
            cancelPendingSelect()
            onOpenContextMenu(event, {
              kind: 'table',
              connectionId,
              table,
              onToggleExpanded,
              isExpanded,
            })
          }}
        >
          <DatabaseIcon className="size-3.5 shrink-0 text-sidebar-foreground/60" />
          <div className="min-w-0">
            <p className="truncate font-medium">
              {highlightText(table.name, highlightTableNeedleLower)}
            </p>
            <p className="truncate text-[11px] text-sidebar-foreground/60">
              {highlightText(table.schema, highlightSchemaNeedleLower)}
            </p>
          </div>
        </button>
      </div>

      {isExpanded ? (
        <div className="ml-8 mr-2 border-l border-sidebar-border/60 pl-3 py-1.5">
          {schemaQuery.isLoading ? (
            <div className="flex items-center gap-2 py-1 text-[11px] text-sidebar-foreground/60">
              <SpinnerGapIcon className="size-3 animate-spin" />
              Loading fields...
            </div>
          ) : null}

          {schemaQuery.isError ? (
            <div className="py-1 text-[11px] text-destructive">{errorMessage}</div>
          ) : null}

          {schemaQuery.data?.length ? (
            <div className="max-h-[170px] space-y-1 overflow-auto pr-1">
              {schemaQuery.data.map((column) => (
                <div
                  key={`${column.tableSchema}.${column.tableName}.${column.columnName}`}
                  className="grid grid-cols-[10px_minmax(0,1fr)] items-start gap-2 rounded-sm px-1 py-1 text-[11px]"
                >
                  <span className="mt-[5px] size-1.5 rounded-full bg-sidebar-foreground/45" />
                  <div className="min-w-0">
                    <div className="truncate text-sidebar-foreground">{column.columnName}</div>
                    <div className="truncate text-sidebar-foreground/60">
                      {column.dataType}
                      {column.isNullable ? ' nullable' : ' not null'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {schemaQuery.data && schemaQuery.data.length === 0 ? (
            <div className="py-1 text-[11px] text-sidebar-foreground/60">
              No fields were returned for this table.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
})

export function ConnectionsSidebarTree({
  activeConnection,
  connections = EMPTY_CONNECTIONS,
  tables = EMPTY_TABLES,
  selectedTable,
  search,
  tablesErrorMessage,
  isConnectionsLoading = false,
  isTablesLoading = false,
  isActivatingConnection = false,
  onSearchChange,
  onOpenConnection,
  onSelectConnection,
  onSelectTable,
  onOpenTableProperties,
  onToggleCollapsed,
}: ConnectionsSidebarTreeProps) {
  void onOpenTableProperties

  const [isTablesPanelExpanded, setIsTablesPanelExpanded] = useState(true)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    target: SidebarContextMenuTarget
  } | null>(null)
  const contextMenuRef = useRef<HTMLDivElement | null>(null)
  const pendingSelectTimeoutRef = useRef<number | null>(null)
  const activeConnectionId = activeConnection?.id ?? null
  const activeTableKey =
    activeConnectionId && selectedTable
      ? `${activeConnectionId}:${selectedTable.schema}.${selectedTable.name}`
      : null

  const { fullNeedleLower, schemaNeedleLower, tableNeedleLower } = useMemo(
    () => getTableSearchNeedles(search),
    [search],
  )
  const isSearching = Boolean(fullNeedleLower)

  const tablesWithSearchKeyLower = useMemo(
    () =>
      tables.map((table) => ({
        table,
        searchKeyLower: `${table.schema}.${table.name}`.toLowerCase(),
      })),
    [tables],
  )

  const filteredTablesWithKeys = useMemo(() => {
    if (!fullNeedleLower) return tablesWithSearchKeyLower

    return tablesWithSearchKeyLower.filter((entry) => entry.searchKeyLower.includes(fullNeedleLower))
  }, [fullNeedleLower, tablesWithSearchKeyLower])

  const tableTreeData = useMemo<TreeDataItem[]>(
    () =>
      filteredTablesWithKeys.map((entry) => ({
        id: `table:${entry.table.schema}.${entry.table.name}`,
        name: `${entry.table.schema}.${entry.table.name}`,
        data: entry.table,
      })),
    [filteredTablesWithKeys],
  )

  const openSidebarContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLElement>, target: SidebarContextMenuTarget) => {
      event.preventDefault()
      event.stopPropagation()

      const padding = 8
      const assumedMenuWidth = 220
      const assumedMenuHeight = 160
      const maxX = Math.max(padding, window.innerWidth - assumedMenuWidth - padding)
      const maxY = Math.max(padding, window.innerHeight - assumedMenuHeight - padding)

      setContextMenu({
        x: Math.min(Math.max(padding, event.clientX), maxX),
        y: Math.min(Math.max(padding, event.clientY), maxY),
        target,
      })
    },
    [],
  )

  useEffect(() => {
    if (!contextMenu) return

    const onPointerDown = (event: PointerEvent) => {
      const menuEl = contextMenuRef.current
      if (!menuEl) return
      const node = event.target
      if (node instanceof Node && menuEl.contains(node)) return
      setContextMenu(null)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null)
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [contextMenu])

  const visibleConnections = useMemo(() => {
    if (!activeConnection) {
      return connections
    }

    return connections.some((connection) => connection.id === activeConnection.id)
      ? connections
      : [activeConnection, ...connections]
  }, [activeConnection, connections])

  const cancelPendingSelect = useCallback(() => {
    if (pendingSelectTimeoutRef.current != null) {
      window.clearTimeout(pendingSelectTimeoutRef.current)
      pendingSelectTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => cancelPendingSelect()
  }, [cancelPendingSelect])

  const scheduleSelectConnection = useCallback(
    (connection: ConnectionSummary) => {
      cancelPendingSelect()
      pendingSelectTimeoutRef.current = window.setTimeout(() => {
        setIsTablesPanelExpanded(true)
        onSelectConnection(connection)
        pendingSelectTimeoutRef.current = null
      }, 250)
    },
    [cancelPendingSelect, onSelectConnection],
  )

  const connectionContextMenuTarget =
    contextMenu && isConnectionContextMenuTarget(contextMenu.target) ? contextMenu.target : null

  const tableContextMenuTarget =
    contextMenu && isTableContextMenuTarget(contextMenu.target) ? contextMenu.target : null

  const renderTablesPanelForConnection = (connection: ConnectionSummary) => {
    if (!isTablesPanelExpanded) return null

    return (
      <div className="ml-6 mr-2 border-l border-sidebar-border/60 pl-3">
        <div className="py-2 pr-1">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-sidebar-foreground/50" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search tables"
              className="border-sidebar-border bg-background/70 pl-8"
            />
          </div>
        </div>

        {tablesErrorMessage ? (
          <div className="px-3 py-4 text-xs text-destructive">{tablesErrorMessage}</div>
        ) : (
          <>
            {!isTablesLoading && filteredTablesWithKeys.length === 0 ? (
              <div className="px-3 py-4 text-xs text-sidebar-foreground/60">
                {isSearching
                  ? 'No tables match the current filter.'
                  : 'No tables were found for this connection.'}
              </div>
            ) : null}

            {isTablesLoading ? (
              <div className="flex items-center gap-2 px-3 py-4 text-xs text-sidebar-foreground/60">
                <SpinnerGapIcon className="size-4 animate-spin" />
                Loading tables...
              </div>
            ) : null}

            {!isTablesLoading && filteredTablesWithKeys.length > 0 ? (
              <div className="max-h-[55vh] overflow-auto py-1 pr-1">
                <TreeView
                  data={tableTreeData}
                  renderItem={(params: TreeRenderItemParams) => {
                    const table = params.item.data as TableInfo | undefined
                    if (!table) return null

                    const tableKey = `${connection.id}:${table.schema}.${table.name}`
                    return (
                      <TableTreeItem
                        connectionId={connection.id}
                        table={table}
                        level={params.level}
                        isExpanded={params.isExpanded}
                        isSelected={activeTableKey === tableKey}
                        highlightSchemaNeedleLower={schemaNeedleLower}
                        highlightTableNeedleLower={tableNeedleLower}
                        onSelectTable={() => {
                          params.select()
                          onSelectTable(table)
                        }}
                        onToggleExpanded={params.toggle}
                        onOpenContextMenu={(event, target) => openSidebarContextMenu(event, target)}
                      />
                    )
                  }}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    )
  }

  return (
    <aside className="flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.24em] text-sidebar-foreground/60">
            Connections
          </p>
          <p className="truncate pt-1 text-xs text-sidebar-foreground/80">
            Browse databases, tables, and fields.
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onOpenConnection}
            aria-label="Create connection"
          >
            <PlusIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCollapsed}
            aria-label="Collapse sidebar"
          >
            <SidebarSimpleIcon />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {contextMenu ? (
          <div
            ref={contextMenuRef}
            className="fixed z-50 w-[220px] rounded-md border border-sidebar-border bg-popover p-1 text-xs shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            role="menu"
            aria-label="Sidebar context menu"
          >
            {connectionContextMenuTarget ? (
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-60"
                onClick={() => {
                  const isActive =
                    activeConnectionId === connectionContextMenuTarget.connection.id
                  if (isActive) {
                    if (isSearching) {
                      setIsTablesPanelExpanded(true)
                    } else {
                      setIsTablesPanelExpanded((prev) => !prev)
                    }
                  } else {
                    setIsTablesPanelExpanded(true)
                    onSelectConnection(connectionContextMenuTarget.connection)
                  }
                  setContextMenu(null)
                }}
                disabled={isActivatingConnection}
              >
                <span>
                  {activeConnectionId === connectionContextMenuTarget.connection.id
                    ? isTablesPanelExpanded
                      ? isSearching
                        ? 'Tables expanded (search)'
                        : 'Collapse tables'
                      : 'Expand tables'
                    : 'Activate connection'}
                </span>
              </button>
            ) : null}

            {tableContextMenuTarget ? (
              <>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  onClick={() => {
                    onSelectTable(tableContextMenuTarget.table)
                    setContextMenu(null)
                  }}
                >
                  <span>Select table (run preview)</span>
                </button>

                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  onClick={() => {
                    tableContextMenuTarget.onToggleExpanded?.()
                    setContextMenu(null)
                  }}
                >
                  <span>{tableContextMenuTarget.isExpanded ? 'Hide fields' : 'Show fields'}</span>
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {isConnectionsLoading ? (
          <div className="flex items-center gap-2 px-3 py-4 text-xs text-sidebar-foreground/60">
            <SpinnerGapIcon className="size-4 animate-spin" />
            Loading saved connections...
          </div>
        ) : null}

        {!isConnectionsLoading && visibleConnections.length === 0 ? (
          <div className="space-y-2 px-3 py-4 text-xs text-sidebar-foreground/60">
            <p>No saved connections yet.</p>
            <p>Add a connection to start browsing tables and fields.</p>
          </div>
        ) : null}

        {!isConnectionsLoading && visibleConnections.length > 0 ? (
          <div className="divide-y divide-sidebar-border/60">
            {visibleConnections.map((connection) => {
              const isActive = activeConnectionId === connection.id

              return (
                <div key={connection.id}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-start gap-2 px-3 py-2.5 text-left text-xs transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
                    )}
                    onClick={(event) => {
                      // Delay activation slightly to avoid reacting to double-click.
                      if (event.detail > 1) {
                        cancelPendingSelect()
                        return
                      }

                      if (isActivatingConnection) return

                      if (isActive) {
                        cancelPendingSelect()
                        if (isSearching) {
                          setIsTablesPanelExpanded(true)
                        } else {
                          setIsTablesPanelExpanded((prev) => !prev)
                        }
                      } else {
                        scheduleSelectConnection(connection)
                      }
                    }}
                    disabled={isActivatingConnection}
                    onContextMenu={(event) => {
                      cancelPendingSelect()
                      openSidebarContextMenu(event, {
                        kind: 'connection',
                        connection,
                      })
                    }}
                    onDoubleClick={(event) => {
                      cancelPendingSelect()
                      openSidebarContextMenu(event, {
                        kind: 'connection',
                        connection,
                      })
                    }}
                  >
                    <span className="pt-0.5 text-sidebar-foreground/70">
                      {isActive ? <CaretDownIcon /> : <CaretRightIcon />}
                    </span>
                    <DatabaseIcon className="mt-0.5 size-3.5 shrink-0 text-sidebar-foreground/70" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{connection.name}</p>
                        {isActive ? (
                          <span className="shrink-0 border border-sidebar-border/80 bg-sidebar-primary px-1 py-0.5 text-[10px] uppercase tracking-[0.18em] text-sidebar-primary-foreground">
                            Active
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>

                  {isActive ? renderTablesPanelForConnection(connection) : null}
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </aside>
  )
}

