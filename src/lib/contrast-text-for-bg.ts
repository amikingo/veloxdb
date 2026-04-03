/**
 * Pick readable text colors for a solid-ish background (hex or rgb/rgba from canvas/CSS).
 */

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n))
}

function srgbChannelToLinear(c: number) {
  const x = clamp01(c)
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(r: number, g: number, b: number) {
  const R = srgbChannelToLinear(r / 255)
  const G = srgbChannelToLinear(g / 255)
  const B = srgbChannelToLinear(b / 255)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

export function rgbCssToHex(cssColor: string): string {
  const rgb = parseRgbLike(cssColor)
  if (!rgb) return '#808080'
  const h = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0')
  return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`
}

function parseRgbLike(input: string): { r: number; g: number; b: number } | null {
  const s = input.trim()
  const hex = s.match(/^#([0-9a-fA-F]{6})$/)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
  }
  const short = s.match(/^#([0-9a-fA-F]{3})$/)
  if (short) {
    const h = short[1]
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    }
  }
  const m = s.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*[\d.]+\s*)?\)$/,
  )
  if (!m) return null
  return {
    r: Math.round(Number(m[1])),
    g: Math.round(Number(m[2])),
    b: Math.round(Number(m[3])),
  }
}

/** Strong contrast for primary label on `headerFill`. */
export function contrastTextForBg(cssColor: string): string {
  const rgb = parseRgbLike(cssColor)
  if (!rgb) return 'rgb(15, 15, 15)'
  const L = relativeLuminance(rgb.r, rgb.g, rgb.b)
  return L > 0.55 ? 'rgb(15, 15, 15)' : 'rgb(250, 250, 250)'
}

/** Secondary line (schema) on same header background. */
export function contrastMutedForBg(cssColor: string): string {
  const rgb = parseRgbLike(cssColor)
  if (!rgb) return 'rgba(15, 15, 15, 0.62)'
  const L = relativeLuminance(rgb.r, rgb.g, rgb.b)
  return L > 0.55 ? 'rgba(15, 15, 15, 0.58)' : 'rgba(250, 250, 250, 0.65)'
}
