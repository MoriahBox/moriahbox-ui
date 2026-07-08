'use client'

import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/sections/Footer'
import { useLanguage } from '@/components/providers/LanguageProvider'

export default function ContactPage() {
  const { t } = useLanguage()
  const p = t.contactPage

  return (
    <div className="max-w-6xl mx-auto bg-white shadow-2xl min-h-screen">
      <Navbar />

      {/* Header */}
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

      {/* Contact cards */}
      <section className="px-6 py-16 md:px-12">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">

          <div className="bg-white border border-[#d8e8dc] rounded-lg p-6 flex gap-5 items-start">
            <div className="mt-0.5 w-10 h-10 bg-[#e8f5ee] rounded-md flex items-center justify-center shrink-0">
              <Phone size={18} className="text-[#2d6e42]" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#3a5a44] uppercase tracking-wide mb-1">{p.phoneLabel}</p>
              <a href={`tel:${p.phone.replace(/\s/g, '')}`} className="text-[15px] font-medium text-[#2d6e42] hover:underline">
                {p.phone}
              </a>
            </div>
          </div>

          <div className="bg-white border border-[#d8e8dc] rounded-lg p-6 flex gap-5 items-start">
            <div className="mt-0.5 w-10 h-10 bg-[#e8f5ee] rounded-md flex items-center justify-center shrink-0">
              <Mail size={18} className="text-[#2d6e42]" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#3a5a44] uppercase tracking-wide mb-1">{p.emailLabel}</p>
              <a href={`mailto:${p.email}`} className="text-[15px] font-medium text-[#2d6e42] hover:underline">
                {p.email}
              </a>
              <p className="mt-1.5 text-[13px] text-[#5a6e60]">{p.responseTime}</p>
            </div>
          </div>

          <div className="bg-white border border-[#d8e8dc] rounded-lg p-6 flex gap-5 items-start">
            <div className="mt-0.5 w-10 h-10 bg-[#e8f5ee] rounded-md flex items-center justify-center shrink-0">
              <MapPin size={18} className="text-[#2d6e42]" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#3a5a44] uppercase tracking-wide mb-1">{p.addressLabel}</p>
              {p.address.map((line, i) => (
                <p key={i} className="text-[15px] text-[#1a4a2a]">{line}</p>
              ))}
            </div>
          </div>

          <div className="bg-[#f2faf5] border border-[#d8e8dc] rounded-lg p-6 flex gap-5 items-start">
            <div className="mt-0.5 w-10 h-10 bg-white border border-[#d8e8dc] rounded-md flex items-center justify-center shrink-0">
              <MessageCircle size={18} className="text-[#2d6e42]" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#3a5a44] uppercase tracking-wide mb-1">{p.orderSupportLabel}</p>
              <p className="text-[14px] text-[#5a6e60] leading-relaxed">{p.orderSupport}</p>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  )
}
