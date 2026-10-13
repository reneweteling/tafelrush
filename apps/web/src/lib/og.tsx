// Building blocks for the link previews (WhatsApp, iMessage, Instagram DM, X).
// Rendered by next/og (Satori): every element with more than one child needs display flex.

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const OG_SIZE = { width: 1200, height: 630 }

export const C = {
  bg: '#101018',
  surface: '#1C1C28',
  line: '#2E2E40',
  fg: '#F4F4F8',
  muted: '#A0A0B8',
  lime: '#C6FF3D',
  pink: '#FF3D8B',
  cyan: '#3DDCFF',
}

const asset = (...p: string[]) => join(process.cwd(), 'src/assets', ...p)

export async function ogFonts() {
  const [display, body] = await Promise.all([readFile(asset('Unbounded_900Black.ttf')), readFile(asset('DMSans_700Bold.ttf'))])
  return [
    { name: 'Unbounded', data: display, weight: 900 as const },
    { name: 'DM Sans', data: body, weight: 700 as const },
  ]
}

/** A screenshot as a data URI; Satori can't fetch local files itself. */
export async function screen(name: string): Promise<string> {
  return `data:image/jpeg;base64,${(await readFile(asset('og', `${name}.jpg`))).toString('base64')}`
}

export function OgMark({ size }: { size: number }) {
  const bar = (fill: string, rot: number) => (
    <rect x="42" y="8" width="16" height="84" rx="8" fill={fill} transform={`rotate(${rot} 50 50)`} />
  )
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <g transform="translate(5 4)">
        {bar(C.pink, 45)}
        {bar(C.pink, -45)}
      </g>
      {bar(C.lime, 45)}
      {bar(C.lime, -45)}
    </svg>
  )
}

/** Mark plus wordmark, top-left on every card. */
export function Brand({ color = C.fg }: { color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'Unbounded', fontSize: 28, color }}>
      <OgMark size={48} />
      TAFEL RUSH
    </div>
  )
}

/** Display text with the app's pink/cyan glitch offset behind it. */
export function Glitch({ children, size, color = C.fg }: { children: string; size: number; color?: string }) {
  const layer = (c: string, x: number, y: number) => (
    <div style={{ position: 'absolute', left: x, top: y, color: c, display: 'flex' }}>{children}</div>
  )
  const o = Math.round(size * 0.05)
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        fontFamily: 'Unbounded',
        fontSize: size,
        lineHeight: 1,
        letterSpacing: -size * 0.03,
      }}>
      {layer(C.cyan, -o, 0)}
      {layer(C.pink, o, o * 0.6)}
      <div style={{ position: 'relative', color, display: 'flex' }}>{children}</div>
    </div>
  )
}

/** A phone: the screenshot in a dark rounded bezel. */
export function Phone({ src, width, rotate = 0, style }: { src: string; width: number; rotate?: number; style?: React.CSSProperties }) {
  const pad = Math.round(width * 0.035)
  return (
    <div
      style={{
        display: 'flex',
        padding: pad,
        background: '#05050A',
        borderRadius: width * 0.16,
        border: `2px solid ${C.line}`,
        transform: `rotate(${rotate}deg)`,
        boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
        ...style,
      }}>
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img src={src} width={width - pad * 2} height={((width - pad * 2) * 2622) / 1206} style={{ borderRadius: width * 0.13 }} />
    </div>
  )
}

export function Pill({ children, bg, color = C.bg, size = 26 }: { children: string; bg: string; color?: string; size?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        background: bg,
        color,
        borderRadius: 999,
        padding: `${size * 0.45}px ${size * 0.9}px`,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        fontFamily: 'DM Sans',
        fontSize: size,
      }}>
      {children}
    </div>
  )
}
