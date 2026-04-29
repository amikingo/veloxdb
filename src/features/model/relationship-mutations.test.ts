import { describe, expect, it } from 'vitest'

import { remapPendingForeignKeysOnColumnRename } from '@/features/model/relationship-mutations'

describe('remapPendingForeignKeysOnColumnRename', () => {
  it('remaps matching source and target references on the renamed table', () => {
    const next = remapPendingForeignKeysOnColumnRename(
      [
        {
          id: 'a',
          fromKey: 'public.orders',
          fromColumn: 'user_id',
          toKey: 'public.users',
          toColumn: 'id',
        },
        {
          id: 'b',
          fromKey: 'public.users',
          fromColumn: 'id',
          toKey: 'public.orders',
          toColumn: 'user_id',
        },
        {
          id: 'c',
          fromKey: 'public.tasks',
          fromColumn: 'owner_id',
          toKey: 'public.users',
          toColumn: 'id',
        },
      ],
      'public.orders',
      'user_id',
      'account_id',
    )

    expect(next[0]).toMatchObject({ fromColumn: 'account_id' })
    expect(next[1]).toMatchObject({ toColumn: 'account_id' })
    expect(next[2]).toMatchObject({ fromColumn: 'owner_id', toColumn: 'id' })
  })

  it('returns original relationships when rename target is empty', () => {
    const relationships = [
      {
        id: 'a',
        fromKey: 'public.orders',
        fromColumn: 'user_id',
        toKey: 'public.users',
        toColumn: 'id',
      },
    ]
    expect(
      remapPendingForeignKeysOnColumnRename(relationships, 'public.orders', 'user_id', ''),
    ).toEqual(relationships)
  })
})
