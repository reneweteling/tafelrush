// The preview for tafelrush.nl and every page without its own picture.

import { ImageResponse } from 'next/og'

import { Brand, C, Glitch, OG_SIZE, ogFonts, Phone, Pill, screen } from '@/lib/og'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = 'Tafel Rush: tafels oefenen door ze hardop te zeggen'

export default async function Image() {
  const [fonts, goed, fout] = await Promise.all([ogFonts(), screen('3-goed'), screen('4-fout')])

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: C.bg,
          color: C.fg,
          fontFamily: 'DM Sans',
        }}>
        <div
          style={{
            position: 'absolute',
            right: -160,
            top: -220,
            width: 760,
            height: 760,
            borderRadius: 999,
            background: C.pink,
            opacity: 0.22,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 120,
            bottom: -320,
            width: 620,
            height: 620,
            borderRadius: 999,
            background: C.lime,
            opacity: 0.12,
            display: 'flex',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 0 64px 72px', width: 640 }}>
          <Brand />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Glitch size={112}>TAFEL</Glitch>
            <Glitch size={112} color={C.lime}>
              RUSH
            </Glitch>
            <div style={{ display: 'flex', marginTop: 28, fontSize: 34, lineHeight: 1.25, color: C.fg }}>
              De app zegt de som. Jij zegt het antwoord. Hardop.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Pill bg={C.lime}>Gratis voor iPhone en Android</Pill>
            <Pill bg={C.surface} color={C.muted}>
              tafelrush.nl
            </Pill>
          </div>
        </div>

        <Phone src={fout} width={290} rotate={-8} style={{ position: 'absolute', left: 690, top: 90 }} />
        <Phone src={goed} width={310} rotate={7} style={{ position: 'absolute', left: 880, top: 40 }} />
      </div>
    ),
    { ...size, fonts },
  )
}
