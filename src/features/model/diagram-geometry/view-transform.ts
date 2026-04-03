import type { ViewportState } from '@/features/model/model-types'

export function stagePointerToWorld(
  pointer: { x: number; y: number } | null | undefined,
  viewport: ViewportState,
): { x: number; y: number } | null {
  if (!pointer) return null
  return {
    x: (pointer.x - viewport.x) / viewport.scale,
    y: (pointer.y - viewport.y) / viewport.scale,
  }
}

/** World-space rectangle visible in the stage container (approximate AABB in world coords). */
export function worldViewportBounds(
  viewport: ViewportState,
  containerWidth: number,
  containerHeight: number,
): { left: number; top: number; right: number; bottom: number } {
  const left = -viewport.x / viewport.scale
  const top = -viewport.y / viewport.scale
  const right = left + containerWidth / viewport.scale
  const bottom = top + containerHeight / viewport.scale
  return { left, top, right, bottom }
}
