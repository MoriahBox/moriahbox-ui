'use client'

import Link from 'next/link'
import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '@/components/providers/LanguageProvider'

interface ApiMenuItem {
  id: string
  name: string
  type: 'MEAL' | 'RECIPE'
  description: string | null
  tag: string | null
}

const TYPE_VISUAL = {
  MEAL:   { emoji: '🍲', tagColor: 'bg-[#e8f5ee] text-[#2d6e42]', bg: 'bg-[#f2faf5]' },
  RECIPE: { emoji: '📦', tagColor: 'bg-[#1a4a2a] text-white',     bg: 'bg-[#fffaf0]' },
} as const

const SLIDE_INTERVAL = 3500

export function MenuPreview() {
  const { t, lang } = useLanguage()
  const { menuPreview, menuItemTypes } = t
  const [apiItems, setApiItems] = useState<ApiMenuItem[] | null>(null)
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
    fetch(`${base}/api/menu?size=8&language=${lang}`)
      .then(r => r.json())
      .then(data => setApiItems(data.content ?? []))
      .catch(() => setApiItems([]))
  }, [])

  const startTimer = useCallback((length: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % length)
    }, SLIDE_INTERVAL)
  }, [])

  useEffect(() => {
    if (!apiItems || apiItems.length <= 1) return
    startTimer(apiItems.length)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [apiItems, startTimer])

  function goTo(index: number) {
    if (!apiItems) return
    setCurrent(index)
    startTimer(apiItems.length)
  }

  return (
    <section className="bg-white border-b border-[#d8e8dc] px-6 py-16 md:py-20">
      <div className="max-w-5xl mx-auto">

        {/* Section title */}
        <div className="mb-10 text-center">
          <span className="inline-block bg-[#1a4a2a] text-white text-[11px] font-medium tracking-[1.5px] uppercase px-3.5 py-1.5 rounded mb-5">
            {menuPreview.badge}
          </span>
          <h2 className="font-serif text-3xl md:text-4xl font-black text-[#1a4a2a] leading-tight">
            {menuPreview.title}
          </h2>
        </div>

        {/* Loading skeleton */}
        {apiItems === null && (
          <div className="h-52 rounded-lg bg-[#d8ead1] animate-pulse" />
        )}

        {/* Carousel */}
        {apiItems !== null && apiItems.length > 0 && (
          <>
            <div className="flex items-center gap-3">
              <button
                onClick={() => goTo((current - 1 + apiItems.length) % apiItems.length)}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-[#d8e8dc] bg-white text-[#2d6e42] hover:bg-[#f2faf5] transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Sliding track — each slide is 1/n of the total strip width */}
              <div className="flex-1 overflow-hidden rounded-lg">
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{
                    width: `${apiItems.length * 100}%`,
                    transform: `translateX(-${current * (100 / apiItems.length)}%)`,
                  }}
                >
                  {apiItems.map(item => {
                    const v = TYPE_VISUAL[item.type] ?? TYPE_VISUAL.MEAL
                    return (
                      <div
                        key={item.id}
                        style={{ width: `${100 / apiItems.length}%` }}
                        className={`${v.bg} border border-[#d8e8dc] p-8 flex gap-6 items-start`}
                      >
                        <span className="text-[64px] leading-none shrink-0 mt-1" role="img" aria-label={item.name}>
                          {v.emoji}
                        </span>
                        <div className="flex flex-col gap-3 min-w-0 flex-1">
                          <div>
                            <p className="text-[11px] text-amber-600 font-semibold uppercase tracking-wide mb-1">
                              {menuItemTypes[item.type]}
                            </p>
                            <p className="font-serif text-[22px] font-black text-[#1a4a2a] leading-tight">
                              {item.name}
                            </p>
                          </div>
                          {item.tag && (
                            <span className={`self-start text-[11px] font-medium px-2.5 py-1 rounded-full ${v.tagColor}`}>
                              {item.tag}
                            </span>
                          )}
                          <p className="text-[14px] text-[#5a6e60] leading-relaxed max-w-xl">
                            {item.description ?? ''}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <button
                onClick={() => goTo((current + 1) % apiItems.length)}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-[#d8e8dc] bg-white text-[#2d6e42] hover:bg-[#f2faf5] transition-colors"
                aria-label="Next"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Dot indicators */}
            <div className="flex justify-center gap-2 mt-5">
              {apiItems.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to item ${i + 1}`}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    i === current ? 'bg-[#2d6e42]' : 'bg-[#d8e8dc] hover:bg-[#b8ddc4]'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {apiItems !== null && apiItems.length === 0 && (
          <p className="text-[14px] text-[#5a6e60] text-center">{menuPreview.seeAll}</p>
        )}

        <div className="mt-10 text-center">
          <Link
            href="/menu"
            className="inline-block bg-[#2d6e42] hover:bg-[#1a4a2a] text-white text-[15px] font-medium px-8 py-3 rounded-md transition-colors"
          >
            {menuPreview.browseBtn}
          </Link>
        </div>
      </div>
    </section>
  )
}
