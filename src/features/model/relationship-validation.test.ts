import { describe, expect, it } from 'vitest'

import { canQueueRelationship } from '@/features/model/relationship-validation'

describe('canQueueRelationship', () => {
  it('rejects self-relationships on same key and column', () => {
    expect(
      canQueueRelationship(
        {
          fromKey: 'public.users',
          fromColumn: 'id',
          toKey: 'public.users',
          toColumn: 'id',
        },
        [],
        [],
      ),
    ).toBe(false)
  })

  it('rejects duplicates from committed relationships', () => {
    expect(
      canQueueRelationship(
        {
          fromKey: 'public.orders',
          fromColumn: 'user_id',
          toKey: 'public.users',
          toColumn: 'id',
        },
        [
          {
            fromSchema: 'public',
            fromTable: 'orders',
            fromColumn: 'user_id',
            toSchema: 'public',
            toTable: 'users',
            toColumn: 'id',
          },
        ],
        [],
      ),
    ).toBe(false)
  })

  it('rejects duplicates from pending relationships', () => {
    expect(
      canQueueRelationship(
        {
          fromKey: 'public.orders',
          fromColumn: 'user_id',
          toKey: 'public.users',
          toColumn: 'id',
        },
        [],
        [
          {
            id: 'fk-1',
            fromKey: 'public.orders',
            fromColumn: 'user_id',
            toKey: 'public.users',
            toColumn: 'id',
          },
        ],
      ),
    ).toBe(false)
  })

  it('accepts valid new relationships', () => {
    expect(
      canQueueRelationship(
        {
          fromKey: 'public.orders',
          fromColumn: 'customer_id',
          toKey: 'public.customers',
          toColumn: 'id',
        },
        [],
        [],
      ),
    ).toBe(true)
  })
})
