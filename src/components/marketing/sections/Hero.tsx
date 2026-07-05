'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/providers/LanguageProvider'

export function Hero() {
  const { t } = useLanguage()
  const { hero } = t

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
            {hero.cards.map(card => (
              <div key={card.label} className={`${card.bg} rounded-xl p-5 flex flex-col gap-2`}>
                <span className="text-[40px] leading-none">{card.emoji}</span>
                <p className="font-serif text-[15px] font-black text-[#1a4a2a] leading-tight">{card.label}</p>
                <p className="text-[12px] text-[#5a6e60]">{card.sub}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
