'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Scroll reveals. Without JS everything stays visible; this adds `js` to <html> so the CSS
 * hides [data-reveal] elements, then marks each one `is-in` once it scrolls into view.
 */
export function Reveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-reveal]')
    if (!('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    // Things already on screen show right away, no flash.
    const vh = window.innerHeight
    els.forEach((el) => {
      if (el.getBoundingClientRect().top < vh * 0.92) el.classList.add('is-in')
      else io.observe(el)
    })
    document.documentElement.classList.add('js')
    return () => io.disconnect()
  }, [])
  return null
}

/** The promo video in a phone frame. Muted autoplay loop, with a sound toggle. */
export function PromoVideo() {
  const ref = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted = true
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) v.play().catch(() => {})
  }, [])

  function playWithSound() {
    const v = ref.current
    if (!v) return
    v.muted = false
    setMuted(false)
    v.currentTime = 0
    v.play().catch(() => {})
  }

  function toggleSound() {
    const v = ref.current
    if (!v) return
    if (v.muted) {
      playWithSound()
    } else {
      v.muted = true
      setMuted(true)
    }
  }

  return (
    <div className="video-frame relative mx-auto w-full max-w-[320px]">
      <div className="relative aspect-[9/16] overflow-hidden rounded-[36px] border-[6px] border-lime bg-ink shadow-[14px_14px_0_var(--color-pink)]">
        <video
          ref={ref}
          className="size-full object-cover"
          poster="/media/tafelrush-promo-poster.webp"
          loop
          muted
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          aria-label="Promovideo van Tafel Rush"
        >
          <source src="/media/tafelrush-promo.mp4" type="video/mp4" />
        </video>

        {!playing && (
          <button
            type="button"
            onClick={playWithSound}
            className="btn-press absolute inset-0 m-auto flex size-20 items-center justify-center rounded-full bg-lime text-ink"
            aria-label="Video afspelen"
          >
            <svg width="30" height="32" viewBox="0 0 20 22" aria-hidden="true">
              <path d="M2 1.5v19a1 1 0 0 0 1.5.86l16-9.5a1 1 0 0 0 0-1.72l-16-9.5A1 1 0 0 0 2 1.5z" fill="currentColor" />
            </svg>
          </button>
        )}
      </div>

      {playing && (
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={!muted}
          className="btn-press absolute bottom-5 left-1/2 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-ink/85 px-4 text-sm font-bold text-fg ring-2 ring-lime backdrop-blur"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H2v6h4l5 4V5z" />
            {muted ? <path d="m23 9-6 6M17 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />}
          </svg>
          {muted ? 'Geluid aan' : 'Geluid uit'}
        </button>
      )}
    </div>
  )
}
