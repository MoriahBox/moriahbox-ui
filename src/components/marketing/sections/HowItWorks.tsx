'use client'

import { useLanguage } from '@/components/providers/LanguageProvider'

export function HowItWorks() {
  const { t } = useLanguage()
  const { howItWorks } = t

  return (
    <section id="how-it-works" className="bg-[#f2faf5] border-b border-[#d8e8dc] px-6 py-20 md:px-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-black text-[#1a4a2a] leading-tight mb-5">
            {howItWorks.title}
          </h2>
          <span className="inline-block bg-[#1a4a2a] text-white text-[11px] font-medium tracking-[1.5px] uppercase px-3.5 py-1.5 rounded mb-3">
            {howItWorks.audienceBadge}
          </span>
          <h3 className="font-serif text-3xl md:text-4xl font-black text-[#1a4a2a] leading-tight mb-4">
            {howItWorks.badge[0]}{' '}
            <em className="not-italic text-amber-500">{howItWorks.badge[1]}</em>{' '}
            {howItWorks.badge[2]}{' '}
            <em className="not-italic text-amber-500">{howItWorks.badge[3]}</em>
          </h3>
          <p className="text-[15px] text-[#5a6e60] leading-relaxed max-w-md mx-auto">
            {howItWorks.sub}
          </p>
        </div>

        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {howItWorks.steps.map((step, index) => (
            <li
              key={step.number}
              className="bg-white border border-[#d8e8dc] rounded-md p-6 flex flex-col gap-4 relative"
            >
              {index < howItWorks.steps.length - 1 && (
                <span
                  className="hidden lg:block absolute top-[52px] right-0 translate-x-1/2 w-6 h-px bg-[#b8ddc4] z-10"
                  aria-hidden="true"
                />
              )}

              <div className="flex items-start justify-between">
                <span className="text-[32px]" role="img" aria-label={step.title}>
                  {step.emoji}
                </span>
                <span className="font-serif text-[28px] font-black text-[#d8e8dc] leading-none select-none">
                  {step.number}
                </span>
              </div>

              <div>
                <p className="text-[14px] font-semibold text-[#1a4a2a] mb-1">{step.title}</p>
                <p className="text-[13px] text-[#5a6e60] leading-relaxed">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
