'use client'

import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/sections/Footer'
import { useLanguage } from '@/components/providers/LanguageProvider'

export default function PrivacyPage() {
  const { t } = useLanguage()
  const p = t.privacyPage

  return (
    <div className="max-w-6xl mx-auto bg-white shadow-2xl min-h-screen">
      <Navbar />

      {/* Header */}
      <section className="bg-[#fffaf0] border-b border-[#d8e8dc] px-6 py-20 md:px-12">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block bg-[#1a4a2a] text-white text-[11px] font-medium tracking-[1.5px] uppercase px-3.5 py-1.5 rounded mb-6">
            {p.badge}
          </span>
          <h1 className="font-serif text-3xl md:text-4xl font-black text-[#1a4a2a] leading-tight mb-4">
            {p.title}
          </h1>
          <p className="text-[13px] text-[#5a6e60]">{p.updatedAt}</p>
        </div>
      </section>

      {/* Content */}
      <section className="px-6 py-16 md:px-12">
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          <p className="text-[15px] text-[#5a6e60] leading-relaxed">{p.intro}</p>
          {p.sections.map((section) => (
            <div key={section.title} className="border-t border-[#d8e8dc] pt-6">
              <h2 className="text-[16px] font-semibold text-[#1a4a2a] mb-3">{section.title}</h2>
              <p className="text-[14px] text-[#5a6e60] leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}
