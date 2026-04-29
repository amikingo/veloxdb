import { beforeEach, describe, expect, it } from 'vitest'

import { useCanvasStore } from '@/features/model/state/canvas-store'

function resetStore() {
  const state = useCanvasStore.getState()
  useCanvasStore.setState(
    {
      ...state,
      connectionId: 'test',
      activeViewId: 'default',
      viewsRegistry: { activeViewId: 'default', views: [{ id: 'default', name: 'Default' }] },
      diagramTool: 'select',
      selectedKeys: [],
      primaryKey: null,
      onCanvas: [],
      positions: {},
      viewport: { x: 0, y: 0, scale: 1 },
      modelTitle: 'test',
      headerColorsByKey: {},
      snapToGrid: true,
      columnDetail: 'full',
      diagramGroups: [],
      modelTab: 'diagram',
      identityDraftByKey: {},
      columnOverridesByKey: {},
      columnIdentityOverridesByKey: {},
      pendingAddColumnsByKey: {},
      pendingForeignKeys: [],
      selectedEdge: null,
      pendingRules: [],
      pendingTriggers: [],
      pendingRlsPolicies: [],
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    },
    true,
  )
}

describe('canvas store history and editing', () => {
  beforeEach(() => {
    resetStore()
  })

  it('supports undo and redo across layout and draft edits', () => {
    const store = useCanvasStore.getState()
    store.setOnCanvas(['public.users'])
    store.setPositions({ 'public.users': { x: 100, y: 200 } })
    store.setModelTitle('next title')
    store.setIdentityDraftByKey({
      'public.users': { schema: 'public', name: 'users_v2' },
    })

    expect(useCanvasStore.getState().modelTitle).toBe('next title')
    expect(useCanvasStore.getState().identityDraftByKey['public.users']?.name).toBe('users_v2')
    expect(useCanvasStore.getState().canUndo).toBe(true)

    useCanvasStore.getState().undo()
    expect(useCanvasStore.getState().identityDraftByKey['public.users']).toBeUndefined()
    useCanvasStore.getState().undo()
    expect(useCanvasStore.getState().modelTitle).toBe('test')

    useCanvasStore.getState().redo()
    useCanvasStore.getState().redo()
    expect(useCanvasStore.getState().modelTitle).toBe('next title')
    expect(useCanvasStore.getState().identityDraftByKey['public.users']?.name).toBe('users_v2')
  })

  it('prunes invalid selection when table is removed from on-canvas', () => {
    const store = useCanvasStore.getState()
    store.setOnCanvas(['public.users', 'public.orders'])
    store.replaceSelection(['public.users', 'public.orders'], 'public.orders')
    store.setOnCanvas(['public.users'])

    const next = useCanvasStore.getState()
    expect(next.selectedKeys).toEqual(['public.users'])
    expect(next.primaryKey).toBe('public.users')
  })

  it('quick column edit remaps pending relationships and selected edge', () => {
    const store = useCanvasStore.getState()
    store.setPendingForeignKeys([
      {
        id: 'fk-1',
        fromKey: 'public.orders',
        fromColumn: 'user_id',
        toKey: 'public.users',
        toColumn: 'id',
      },
    ])
    store.setSelectedEdge({
      id: 'fk-1',
      kind: 'pending',
      fromKey: 'public.orders',
      fromColumn: 'user_id',
      toKey: 'public.users',
      toColumn: 'id',
    })

    store.applyQuickColumnEdit('public.orders', 'user_id', {
      nextColumnName: 'account_id',
      nextDataType: 'uuid',
    })

    const next = useCanvasStore.getState()
    expect(next.pendingForeignKeys[0]?.fromColumn).toBe('account_id')
    expect(next.selectedEdge?.fromColumn).toBe('account_id')
    expect(next.columnIdentityOverridesByKey['public.orders']?.user_id).toEqual({
      nextColumnName: 'account_id',
      nextDataType: 'uuid',
    })
  })
})
