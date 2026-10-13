// The preview picture WhatsApp and friends show for a challenge link.
// It has to make the friend tap: who, what score, and the sums waiting for them.

import { decodeChallenge, describeTables } from '@tafelrush/shared'
import { ImageResponse } from 'next/og'

import { Brand, C, Glitch, OG_SIZE, ogFonts, Pill } from '@/lib/og'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = 'Tafel Rush uitdaging'

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const c = decodeChallenge(decodeURIComponent(code))
  const fonts = await ogFonts()

  if (!c) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: C.bg }}>
          <Brand />
          <Glitch size={110} color={C.lime}>
            Tafel Rush
          </Glitch>
          <div style={{ display: 'flex', fontFamily: 'DM Sans', fontSize: 36, color: C.muted }}>Tafels oefenen. Gewoon hardop.</div>
        </div>
      ),
      { ...size, fonts },
    )
  }

  const who = c.name || 'Iemand'
  const headline = c.reply ? `${who} deed jouw sommen` : `${who} daagt je uit`
  const cta = c.reply ? 'Wie wint?' : c.score === c.sums.length ? 'Foutloos. Durf jij?' : 'Kun jij het beter?'
  const longest = Math.max(...c.sums.map((s) => `${s.a}×${s.b}`.length))
  const tile = Math.min(c.sums.length > 12 ? 30 : 38, Math.floor(190 / longest))

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
            left: -200,
            bottom: -300,
            width: 640,
            height: 640,
            borderRadius: 999,
            background: C.pink,
            opacity: 0.16,
            display: 'flex',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '56px 0 56px 72px', width: 620 }}>
          <Brand />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex' }}>
              <Pill bg={C.pink} size={22}>
                {c.reply ? 'ANTWOORD OP JE UITDAGING' : 'UITDAGING'}
              </Pill>
            </div>
            <div style={{ display: 'flex', fontFamily: 'Unbounded', fontSize: who.length > 9 ? 50 : 62, lineHeight: 1.05, letterSpacing: -1.5 }}>
              {headline}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginTop: 4 }}>
              <Glitch size={c.sums.length >= 10 && c.score >= 10 ? 112 : 128} color={C.lime}>
                {`${c.score}/${c.sums.length}`}
              </Glitch>
              <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 14 }}>
                <div style={{ display: 'flex', fontFamily: 'Unbounded', fontSize: 40, whiteSpace: 'nowrap' }}>{`${c.seconds} sec`}</div>
                <div style={{ display: 'flex', fontSize: 24, color: C.muted }}>denktijd</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', fontFamily: 'Unbounded', fontSize: 40, color: C.fg }}>{cta}</div>
        </div>

        <div
          style={{
            position: 'absolute',
            right: 56,
            top: 52,
            width: 440,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            padding: 34,
            background: C.lime,
            color: C.bg,
            borderRadius: 40,
            transform: 'rotate(4deg)',
            boxShadow: `14px 14px 0 ${C.pink}`,
          }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', fontFamily: 'Unbounded', fontSize: 30, lineHeight: 1.1 }}>Dezelfde sommen</div>
            <div style={{ display: 'flex', fontSize: 24 }}>{describeTables(c.sums)}</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {c.sums.map((s, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: 175,
                  height: 64,
                  borderRadius: 18,
                  background: C.bg,
                  color: C.fg,
                  fontFamily: 'Unbounded',
                  fontSize: tile,
                }}>
                {`${s.a}×${s.b}`}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22 }}>
            <div style={{ display: 'flex' }}>tafelrush.nl</div>
            <div style={{ display: 'flex' }}>Gratis app</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}
