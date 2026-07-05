'use client'

import { useLanguage } from '@/components/providers/LanguageProvider'

export function Testimonials() {
  const { t } = useLanguage()
  const { testimonials } = t

  return (
    <section className="bg-[#f2faf5] border-b border-[#d8e8dc] px-6 py-20 md:px-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12 text-center">
          <span className="inline-block bg-[#1a4a2a] text-white text-[11px] font-medium tracking-[1.5px] uppercase px-3.5 py-1.5 rounded mb-5">
            {testimonials.badge}
          </span>
          <h2 className="font-serif text-3xl md:text-4xl font-black text-[#1a4a2a] leading-tight">
            {testimonials.title}
          </h2>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.items.map((item) => (
            <li
              key={item.name}
              className="bg-white border border-[#d8e8dc] rounded-md p-6 flex flex-col gap-5"
            >
              <span className="font-serif text-[48px] text-[#d8e8dc] leading-none select-none" aria-hidden="true">
                &ldquo;
              </span>
              <p className="text-[14px] text-[#5a6e60] leading-relaxed -mt-6">{item.quote}</p>
              <div className="flex items-center gap-3 mt-auto">
                <div
                  className={`${item.accentBg} ${item.accentText} w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0`}
                  aria-hidden="true"
                >
                  {item.initials}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#1a4a2a]">{item.name}</p>
                  <p className="text-[12px] text-[#5a6e60]">{item.detail}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
