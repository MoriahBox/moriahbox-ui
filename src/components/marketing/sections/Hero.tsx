'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/components/providers/LanguageProvider'

interface HeroMenuItem {
  id: string
  name: string
  type: 'MEAL' | 'RECIPE'
  primaryImage: { cdnThumbnailUrl: string; description: string | null } | null
}

const TYPE_CONFIG = {
  MEAL:   { emoji: '🍲', bg: 'bg-[#e8f5ee]' },
  RECIPE: { emoji: '📦', bg: 'bg-[#fdf3e0]' },
} as const

export function Hero() {
  const { t, lang } = useLanguage()
  const { hero, menuItemTypes } = t
  const driveCard = hero.cards[3]

  const [items, setItems] = useState<HeroMenuItem[] | null>(null)

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
    fetch(`${base}/api/menu?size=20&language=${lang}`)
      .then(r => r.json())
      .then(data => {
        const all: HeroMenuItem[] = data.content ?? []
        const meals   = all.filter(i => i.type === 'MEAL').slice(0, 2)
        const recipes = all.filter(i => i.type === 'RECIPE').slice(0, 1)
        setItems([meals[0], recipes[0], meals[1]].filter(Boolean) as HeroMenuItem[])
      })
      .catch(() => setItems([]))
  }, [])

  return (
    <section className="bg-[#f2faf5] border-b border-[#d8e8dc] py-20 md:py-28 overflow-hidden">
      <div className="max-w-5xl mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

          {/* Left: copy */}
          <div className="text-center md:text-left">
            <span className="inline-block bg-[#1a4a2a] text-white text-[11px] font-medium tracking-[1.5px] uppercase px-3.5 py-1.5 rounded mb-6">
              {hero.badge}
            </span>
            <h1 className="font-serif text-[36px] md:text-[42px] lg:text-[48px] font-black text-[#1a4a2a] leading-tight tracking-tight mb-6">
              {hero.headline}
            </h1>
            <p className="text-[16px] text-[#5a6e60] leading-relaxed mb-10 max-w-lg mx-auto md:mx-0">
              {hero.sub}
            </p>
            <div className="flex justify-center md:justify-start gap-3 flex-wrap">
              <Link
                href="/menu"
                className="bg-[#2d6e42] hover:bg-[#1a4a2a] text-white text-[15px] font-medium px-8 py-3 rounded-md transition-colors"
              >
                {hero.cta1}
              </Link>
              <Link
                href="#how-it-works"
                className="bg-white hover:bg-[#edf7f1] text-[#2d6e42] text-[15px] font-medium px-8 py-3 rounded-md border border-[#b8ddc4] transition-colors"
              >
                {hero.cta2}
              </Link>
            </div>
          </div>

          {/* Right: 2×2 preview cards */}
          <div className="grid grid-cols-2 gap-3">
            {items === null
              ? [1, 2, 3].map(i => (
                  <div key={i} className="bg-[#e8f5ee] rounded-xl p-5 h-[110px] animate-pulse" />
                ))
              : items.length > 0
                ? items.map(item => {
                    const cfg = TYPE_CONFIG[item.type]
                    return (
                      <div key={item.id} className={`${cfg.bg} rounded-xl p-5 flex flex-col gap-2`}>
                        {item.primaryImage?.cdnThumbnailUrl ? (
                          <img
                            src={item.primaryImage.cdnThumbnailUrl}
                            alt={item.primaryImage.description ?? item.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <span className="text-[40px] leading-none">{cfg.emoji}</span>
                        )}
                        <p className="font-serif text-[15px] font-black text-[#1a4a2a] leading-tight">{item.name}</p>
                        <p className="text-[12px] text-[#5a6e60]">{menuItemTypes[item.type]}</p>
                      </div>
                    )
                  })
                : hero.cards.slice(0, 3).map(card => (
                    <div key={card.label} className={`${card.bg} rounded-xl p-5 flex flex-col gap-2`}>
                      <span className="text-[40px] leading-none">{card.emoji}</span>
                      <p className="font-serif text-[15px] font-black text-[#1a4a2a] leading-tight">{card.label}</p>
                      <p className="text-[12px] text-[#5a6e60]">{card.sub}</p>
                    </div>
                  ))
            }
            {/* Drive with us — always hardcoded */}
            <div className={`${driveCard.bg} rounded-xl p-5 flex flex-col gap-2`}>
              <span className="text-[40px] leading-none">{driveCard.emoji}</span>
              <p className="font-serif text-[15px] font-black text-[#1a4a2a] leading-tight">{driveCard.label}</p>
              <p className="text-[12px] text-[#5a6e60]">{driveCard.sub}</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
