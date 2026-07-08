'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/sections/Footer'
import { useLanguage } from '@/components/providers/LanguageProvider'

export default function DriversPage() {
  const { t } = useLanguage()
  const { driverCTA, driversPage } = t

  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="max-w-6xl mx-auto bg-white shadow-2xl min-h-screen">
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-[#fffaf0] border-b border-[#d8e8dc] px-6 py-20 md:px-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block bg-[#1a4a2a] text-white text-[11px] font-medium tracking-[1.5px] uppercase px-3.5 py-1.5 rounded mb-6">
              {driversPage.heroBadge}
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-black text-[#1a4a2a] leading-tight mb-5">
              {driverCTA.titleLines[0]}
              <br />
              {driverCTA.titleLines[1]}{' '}
              <em className="not-italic text-amber-500">{driverCTA.titleAccent}</em>
            </h1>
            <p className="text-[15px] text-[#5a6e60] leading-relaxed mb-8 max-w-sm">
              {driversPage.heroSub}
            </p>
            <Link
              href="/drivers/apply"
              className="inline-block bg-amber-400 hover:bg-amber-500 text-white text-[15px] font-medium px-8 py-3 rounded-md transition-colors"
            >
              {driversPage.heroCta}
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
      </section>

      {/* ── How it works ── */}
      <section className="px-6 py-16 md:px-12 border-b border-[#d8e8dc]">
        <div className="max-w-5xl mx-auto">
          <span className="inline-block bg-[#1a4a2a] text-white text-[11px] font-medium tracking-[1.5px] uppercase px-3.5 py-1.5 rounded mb-5">
            {driversPage.howBadge}
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-black text-[#1a4a2a] mb-10">
            {driversPage.howTitle}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {driversPage.howSteps.map((step) => (
              <div key={step.number} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-[#2d6e42] tracking-widest">{step.number}</span>
                  <span className="text-[24px]" role="img" aria-label={step.title}>{step.emoji}</span>
                </div>
                <p className="text-[14px] font-semibold text-[#1a4a2a]">{step.title}</p>
                <p className="text-[13px] text-[#5a6e60] leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="bg-[#f2faf5] px-6 py-16 md:px-12 border-b border-[#d8e8dc]">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block bg-[#1a4a2a] text-white text-[11px] font-medium tracking-[1.5px] uppercase px-3.5 py-1.5 rounded mb-5">
            {driversPage.faqBadge}
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-black text-[#1a4a2a] mb-8">
            {driversPage.faqTitle}
          </h2>

          <ul className="flex flex-col divide-y divide-[#d8e8dc] border border-[#d8e8dc] rounded-md overflow-hidden">
            {driversPage.faqItems.map((item, i) => {
              const isOpen = openIndex === i
              return (
                <li key={i} className="bg-white">
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[#f9fdfb] transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className="text-[14px] font-semibold text-[#1a4a2a]">{item.question}</span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-[#2d6e42] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <p className="px-5 pb-4 text-[14px] text-[#5a6e60] leading-relaxed">
                      {item.answer}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* ── Apply CTA ── */}
      <section className="bg-[#1a4a2a] px-6 py-16 md:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block bg-white/10 text-white text-[11px] font-medium tracking-[1.5px] uppercase px-3.5 py-1.5 rounded mb-5">
            {driversPage.applyBadge}
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-black text-white mb-4">
            {driversPage.applyTitle}
          </h2>
          <p className="text-[15px] text-white/70 mb-8">
            {driversPage.applySub}
          </p>
          <Link
            href="/drivers/apply"
            className="inline-block bg-amber-400 hover:bg-amber-500 text-white text-[15px] font-medium px-10 py-3.5 rounded-md transition-colors"
          >
            {driversPage.applyCta}
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
