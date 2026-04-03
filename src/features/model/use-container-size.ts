import { useLayoutEffect, useState, type RefObject } from 'react'

export function useContainerSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 640, h: 480 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setSize({
        w: Math.max(1, Math.floor(r.width)),
        h: Math.max(1, Math.floor(r.height)),
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])

  return size
}
