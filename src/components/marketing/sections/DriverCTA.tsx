'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/providers/LanguageProvider'

export function DriverCTA() {
  const { t } = useLanguage()
  const { driverCTA } = t

  return (
    <section className="bg-[#fffaf0] border-b border-[#d8e8dc] px-6 py-20 md:px-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-3">
          <span className="inline-block bg-[#1a4a2a] text-white text-[11px] font-medium tracking-[1.5px] uppercase px-3.5 py-1.5 rounded">
            {driverCTA.badge}
          </span>
        </div>

        <h2 className="font-serif text-3xl md:text-4xl font-black text-[#1a4a2a] leading-tight text-center mb-10">
          {driverCTA.titleLines[0]}{' '}{driverCTA.titleLines[1]}{' '}
          <em className="not-italic text-amber-500">{driverCTA.titleAccent}</em>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-[15px] text-[#5a6e60] leading-relaxed mb-8 max-w-sm">
              {driverCTA.sub}
            </p>
            <Link
              href="/drivers"
              className="inline-block bg-amber-400 hover:bg-amber-500 text-white text-[15px] font-medium px-8 py-3 rounded-md transition-colors"
            >
              {driverCTA.cta}
            </Link>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {driverCTA.perks.map((perk) => (
              <li
                key={perk.label}
                className="bg-white border border-[#d8e8dc] rounded-md px-5 py-4 flex items-center gap-4"
              >
                <span className="text-[26px]" role="img" aria-label={perk.label}>
                  {perk.emoji}
                </span>
                <p className="text-[14px] font-medium text-[#1a4a2a]">{perk.label}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
