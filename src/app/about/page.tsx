'use client'

import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/sections/Footer'
import { useLanguage } from '@/components/providers/LanguageProvider'

export default function AboutPage() {
  const { t } = useLanguage()
  const p = t.aboutPage

  return (
    <div className="max-w-6xl mx-auto bg-white shadow-2xl min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="bg-[#fffaf0] border-b border-[#d8e8dc] px-6 py-20 md:px-12">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block bg-[#1a4a2a] text-white text-[11px] font-medium tracking-[1.5px] uppercase px-3.5 py-1.5 rounded mb-6">
            {p.badge}
          </span>
          <h1 className="font-serif text-3xl md:text-4xl font-black text-[#1a4a2a] leading-tight mb-5">
            {p.title}
          </h1>
          <p className="text-[16px] text-[#5a6e60] leading-relaxed max-w-xl">
            {p.subtitle}
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="px-6 py-16 md:px-12 border-b border-[#d8e8dc]">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block bg-[#1a4a2a] text-white text-[11px] font-medium tracking-[1.5px] uppercase px-3.5 py-1.5 rounded mb-5">
            {p.missionBadge}
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-black text-[#1a4a2a] mb-5">
            {p.missionTitle}
          </h2>
          <p className="text-[15px] text-[#5a6e60] leading-relaxed">
            {p.mission}
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[#f2faf5] px-6 py-16 md:px-12 border-b border-[#d8e8dc]">
        <div className="max-w-5xl mx-auto">
          <span className="inline-block bg-[#1a4a2a] text-white text-[11px] font-medium tracking-[1.5px] uppercase px-3.5 py-1.5 rounded mb-8">
            {p.valuesBadge}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {p.values.map((v) => (
              <div key={v.title} className="bg-white border border-[#d8e8dc] rounded-lg p-6">
                <span className="text-[32px] block mb-4" role="img" aria-label={v.title}>{v.emoji}</span>
                <h3 className="text-[15px] font-semibold text-[#1a4a2a] mb-2">{v.title}</h3>
                <p className="text-[13px] text-[#5a6e60] leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="px-6 py-16 md:px-12">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block bg-[#1a4a2a] text-white text-[11px] font-medium tracking-[1.5px] uppercase px-3.5 py-1.5 rounded mb-5">
            {p.storyBadge}
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-black text-[#1a4a2a] mb-5">
            {p.storyTitle}
          </h2>
          <p className="text-[15px] text-[#5a6e60] leading-relaxed">
            {p.story}
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
