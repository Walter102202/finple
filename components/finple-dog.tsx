'use client'

import { useEffect, useState, type MouseEvent } from 'react'

export function FinpleDog({
  className = '',
  askPulse = 0,
}: {
  className?: string
  askPulse?: number
}) {
  const [pupil, setPupil] = useState({ x: 0, y: 0 })
  const [blinking, setBlinking] = useState(false)
  const [excited, setExcited] = useState(false)
  const [thinking, setThinking] = useState(false)

  // dispara la mirada pensativa + signo "?" cuando el usuario pregunta
  useEffect(() => {
    if (askPulse === 0) return
    setThinking(true)
    const id = setTimeout(() => setThinking(false), 2200)
    return () => clearTimeout(id)
  }, [askPulse])

  // idle blink — every 3.5–6s, eyes close for 140ms
  useEffect(() => {
    let cancelled = false
    let id: ReturnType<typeof setTimeout>
    function loop() {
      const delay = 3500 + Math.random() * 2500
      id = setTimeout(() => {
        if (cancelled) return
        setBlinking(true)
        id = setTimeout(() => {
          if (cancelled) return
          setBlinking(false)
          loop()
        }, 140)
      }, delay)
    }
    loop()
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [])

  function onMove(e: MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = (e.clientX - cx) / (rect.width / 2)
    const dy = (e.clientY - cy) / (rect.height / 2)
    const clamp = (n: number) => Math.max(-1, Math.min(1, n))
    setPupil({ x: clamp(dx) * 2.8, y: clamp(dy) * 2.8 })
  }

  function onLeave() {
    setPupil({ x: 0, y: 0 })
  }

  function onClick() {
    if (excited) return
    setExcited(true)
    setTimeout(() => setExcited(false), 620)
  }

  const showSquint = excited
  const showClosed = blinking && !excited
  const showOpen = !showSquint && !showClosed

  return (
    <div
      className={`relative inline-block ${excited ? 'animate-finple-bounce' : ''} ${className}`}
    >
      <svg
        role="img"
        aria-label="Mascota Finple — haz click para saludarla"
        viewBox="0 0 320 320"
        className="h-72 w-72 cursor-pointer select-none md:h-[22rem] md:w-[22rem]"
        xmlns="http://www.w3.org/2000/svg"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onClick={onClick}
      >
        <defs>
          <radialGradient id="halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F5D8C4" stopOpacity="0.85" />
            <stop offset="65%" stopColor="#F5E7D7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#F5F1E8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="furShade" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="75%" stopColor="#FBF7EE" />
            <stop offset="100%" stopColor="#F2EEE3" />
          </radialGradient>
          <linearGradient id="earTint" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F0DFC7" />
            <stop offset="100%" stopColor="#D9C3A2" />
          </linearGradient>
          <linearGradient id="tongue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E89AA0" />
            <stop offset="100%" stopColor="#D7848C" />
          </linearGradient>
          <radialGradient id="nose" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#3A3A3A" />
            <stop offset="100%" stopColor="#0F0F0F" />
          </radialGradient>
        </defs>

        {/* Halo / Claude-burst nod */}
        <circle cx="160" cy="160" r="150" fill="url(#halo)" />
        <g stroke="#D97757" strokeOpacity="0.22" strokeWidth="3" strokeLinecap="round">
          <line x1="160" y1="20" x2="160" y2="40" />
          <line x1="160" y1="280" x2="160" y2="300" />
          <line x1="20" y1="160" x2="40" y2="160" />
          <line x1="280" y1="160" x2="300" y2="160" />
          <line x1="58" y1="58" x2="74" y2="74" />
          <line x1="246" y1="246" x2="262" y2="262" />
          <line x1="58" y1="262" x2="74" y2="246" />
          <line x1="246" y1="74" x2="262" y2="58" />
        </g>

        {/* Pixel accents — Claude Code style flecks */}
        <g fill="#D97757" opacity="0.55">
          <rect x="34" y="78" width="6" height="6" />
          <rect x="280" y="220" width="6" height="6" />
          <rect x="50" y="246" width="5" height="5" />
          <rect x="270" y="78" width="5" height="5" />
          <rect x="22" y="180" width="4" height="4" />
          <rect x="296" y="146" width="4" height="4" />
        </g>

        {/* Soft warm shadow under the head */}
        <ellipse cx="160" cy="252" rx="92" ry="10" fill="#D97757" opacity="0.12" />

        {/* Floppy cream ears */}
        <g>
          <path
            d="M96 112 Q70 130 62 168 Q56 200 70 226 Q86 246 110 238 Q120 232 122 218 Q124 196 120 168 Q117 144 110 124 Q104 110 96 112 Z"
            fill="url(#earTint)"
          />
          <circle cx="72" cy="170" r="9" fill="#E8D2B5" opacity="0.7" />
          <circle cx="80" cy="200" r="10" fill="#E8D2B5" opacity="0.7" />
          <circle cx="98" cy="226" r="9" fill="#E8D2B5" opacity="0.7" />

          <path
            d="M224 112 Q250 130 258 168 Q264 200 250 226 Q234 246 210 238 Q200 232 198 218 Q196 196 200 168 Q203 144 210 124 Q216 110 224 112 Z"
            fill="url(#earTint)"
          />
          <circle cx="248" cy="170" r="9" fill="#E8D2B5" opacity="0.7" />
          <circle cx="240" cy="200" r="10" fill="#E8D2B5" opacity="0.7" />
          <circle cx="222" cy="226" r="9" fill="#E8D2B5" opacity="0.7" />
        </g>

        {/* Curly fur halo around the head */}
        <g fill="url(#furShade)">
          <circle cx="100" cy="120" r="22" />
          <circle cx="118" cy="96" r="20" />
          <circle cx="142" cy="84" r="20" />
          <circle cx="160" cy="78" r="18" />
          <circle cx="178" cy="84" r="20" />
          <circle cx="202" cy="96" r="20" />
          <circle cx="220" cy="120" r="22" />
          <circle cx="92" cy="158" r="22" />
          <circle cx="228" cy="158" r="22" />
          <circle cx="100" cy="200" r="22" />
          <circle cx="220" cy="200" r="22" />
          <circle cx="124" cy="232" r="22" />
          <circle cx="160" cy="244" r="22" />
          <circle cx="196" cy="232" r="22" />
        </g>

        <ellipse cx="160" cy="170" rx="80" ry="78" fill="url(#furShade)" />

        <g fill="#FFFFFF">
          <circle cx="148" cy="72" r="11" />
          <circle cx="160" cy="64" r="12" />
          <circle cx="172" cy="72" r="11" />
          <circle cx="156" cy="80" r="9" />
          <circle cx="166" cy="80" r="9" />
        </g>
        <circle cx="152" cy="78" r="6" fill="#F2EEE3" opacity="0.7" />
        <circle cx="170" cy="78" r="6" fill="#F2EEE3" opacity="0.7" />

        <g fill="#FFFFFF">
          <circle cx="108" cy="218" r="14" />
          <circle cx="212" cy="218" r="14" />
          <circle cx="132" cy="240" r="14" />
          <circle cx="188" cy="240" r="14" />
        </g>

        <ellipse cx="108" cy="196" rx="13" ry="8" fill="#D97757" opacity="0.20" />
        <ellipse cx="212" cy="196" rx="13" ry="8" fill="#D97757" opacity="0.20" />

        {/* Eyes — interactive */}
        {showOpen && (
          <g
            transform={`translate(${(thinking ? 0 : pupil.x).toFixed(2)} ${(thinking ? -6 : pupil.y).toFixed(2)})`}
            style={{ transition: thinking ? 'transform 200ms ease-out' : undefined }}
          >
            <circle cx="130" cy="160" r="8.5" fill="#191919" />
            <circle cx="190" cy="160" r="8.5" fill="#191919" />
            <circle cx="132.5" cy="156.5" r="2.6" fill="#FFFFFF" />
            <circle cx="192.5" cy="156.5" r="2.6" fill="#FFFFFF" />
            <circle cx="127" cy="163" r="1.2" fill="#FFFFFF" opacity="0.7" />
            <circle cx="187" cy="163" r="1.2" fill="#FFFFFF" opacity="0.7" />
          </g>
        )}
        {showClosed && (
          <g
            stroke="#191919"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          >
            <path d="M120 160 Q130 167 140 160" />
            <path d="M180 160 Q190 167 200 160" />
          </g>
        )}
        {showSquint && (
          <g
            stroke="#191919"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            <path d="M120 152 L134 160 L120 168" />
            <path d="M200 152 L186 160 L200 168" />
          </g>
        )}

        {/* Nose */}
        <path
          d="M160 188 Q146 186 144 196 Q144 206 160 210 Q176 206 176 196 Q174 186 160 188 Z"
          fill="url(#nose)"
        />
        <ellipse cx="156" cy="193" rx="2.5" ry="1.8" fill="#5A5A5A" opacity="0.8" />

        {/* Smile */}
        <path
          d="M160 211 Q160 220 148 222"
          stroke="#191919"
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M160 211 Q160 220 172 222"
          stroke="#191919"
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
        />

        {/* Tongue */}
        <path
          d="M148 220 Q146 230 148 244 Q150 256 160 260 Q170 256 172 244 Q174 230 172 220 Q166 224 160 224 Q154 224 148 220 Z"
          fill="url(#tongue)"
        />
        <path
          d="M160 226 Q160 244 160 256"
          stroke="#C97480"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
        <ellipse cx="156" cy="232" rx="2.5" ry="6" fill="#F4BEC2" opacity="0.6" />

        {/* Claude-Code-style pixel badge replacing the F disc */}
        <g
          key={`fjump-${askPulse}`}
          className={askPulse > 0 ? 'animate-finple-f-jump' : ''}
        >
          {/* outer white outline */}
          <rect x="218" y="232" width="48" height="36" fill="#FFFFFF" />
          {/* legs (white outline) */}
          <rect x="226" y="268" width="10" height="8" fill="#FFFFFF" />
          <rect x="248" y="268" width="10" height="8" fill="#FFFFFF" />
          {/* inner coral body */}
          <rect x="222" y="236" width="40" height="28" fill="#BD5D3A" />
          {/* coral leg cores */}
          <rect x="228" y="268" width="6" height="6" fill="#BD5D3A" />
          <rect x="250" y="268" width="6" height="6" fill="#BD5D3A" />
          {/* F mark in cream */}
          <text
            x="242"
            y="259"
            textAnchor="middle"
            fontFamily="ui-monospace, 'Courier New', monospace"
            fontSize="18"
            fontWeight="900"
            fill="#F5F1E8"
          >
            F
          </text>
        </g>
      </svg>

      {/* Speech bubble — appears on click */}
      <div
        aria-hidden
        className={`pointer-events-none absolute right-2 top-6 origin-bottom-left select-none rounded-2xl rounded-bl-sm bg-white px-3 py-1 text-sm font-extrabold text-coral shadow-soft transition-all duration-200 md:right-4 md:top-10 ${
          excited ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        }`}
      >
        ¡guau!
      </div>

      {/* "?" flotante — aparece al preguntar */}
      {askPulse > 0 && (
        <div
          key={`qpop-${askPulse}`}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-2 select-none font-serif text-6xl font-bold text-coral animate-finple-q-pop md:top-4 md:text-7xl"
          style={{ textShadow: '0 2px 8px rgba(217,119,87,0.25)' }}
        >
          ?
        </div>
      )}
    </div>
  )
}
