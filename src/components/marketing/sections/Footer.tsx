'use client'

import Link from 'next/link'
import { useLanguage } from '@/components/providers/LanguageProvider'

export function Footer() {
  const { t } = useLanguage()
  const { footer } = t

  return (
    <footer className="bg-[#1a4a2a] text-white px-6 py-16 md:px-12">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#2d6e42]">

          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-baseline gap-0 leading-none select-none">
              <span className="font-serif text-[26px] font-black tracking-tight text-white">Moriah</span>
              <span className="font-serif text-[26px] font-black tracking-tight text-amber-400">Box</span>
            </Link>
            <p className="mt-3 text-[13px] text-[#a8c4b0] leading-relaxed max-w-[200px]">
              {footer.tagline}
            </p>
          </div>

          {/* Link columns */}
          {footer.columns.map((col) => (
            <div key={col.heading}>
              <p className="text-[11px] font-semibold tracking-[1.5px] uppercase text-[#a8c4b0] mb-4">
                {col.heading}
              </p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[14px] text-white hover:text-amber-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[#a8c4b0]">
          <p>© {new Date().getFullYear()} MoriahBox. {footer.allRightsReserved}</p>
          <div className="flex gap-5">
            <Link href="/terms" className="hover:text-white transition-colors">{footer.terms}</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">{footer.privacy}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
