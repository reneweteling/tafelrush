// The preview picture WhatsApp and friends show for a challenge link.

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { decodeChallenge, describeTables } from '@tafelrush/shared'
import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Tafel Rush uitdaging'

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const c = decodeChallenge(decodeURIComponent(code))
  const [display, body] = await Promise.all([
    readFile(join(process.cwd(), 'src/assets/Unbounded_900Black.ttf')),
    readFile(join(process.cwd(), 'src/assets/DMSans_700Bold.ttf')),
  ])
  const who = c?.name || 'Iemand'
  const headline = !c ? 'Tafel Rush' : c.reply ? `${who} deed jouw sommen` : `${who} daagt je uit`
  const score = c ? `${c.score}/10 in ${c.seconds} sec` : 'Tafels oefenen, hardop'
  const sub = c ? `Zelfde 10 sommen, ${describeTables(c.sums)}. Kun jij het beter?` : ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#101018',
          color: '#F4F4F8',
          padding: 70,
          fontFamily: 'DM Sans',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontFamily: 'Unbounded', fontSize: 34 }}>
          <svg width="64" height="64" viewBox="0 0 100 100">
            <g transform="translate(5 4)">
              <rect x="42" y="8" width="16" height="84" rx="8" fill="#FF3D8B" transform="rotate(45 50 50)" />
              <rect x="42" y="8" width="16" height="84" rx="8" fill="#FF3D8B" transform="rotate(-45 50 50)" />
            </g>
            <rect x="42" y="8" width="16" height="84" rx="8" fill="#C6FF3D" transform="rotate(45 50 50)" />
            <rect x="42" y="8" width="16" height="84" rx="8" fill="#C6FF3D" transform="rotate(-45 50 50)" />
          </svg>
          TAFEL RUSH
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontFamily: 'Unbounded', fontSize: 76, lineHeight: 1, letterSpacing: -2 }}>{headline}</div>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              background: '#FF3D8B',
              color: '#101018',
              borderRadius: 28,
              padding: '18px 30px',
              fontFamily: 'Unbounded',
              fontSize: 52,
            }}>
            {score}
          </div>
          {sub ? <div style={{ fontSize: 34, color: '#A0A0B8' }}>{sub}</div> : null}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Unbounded', data: display, weight: 900 },
        { name: 'DM Sans', data: body, weight: 700 },
      ],
    },
  )
}
