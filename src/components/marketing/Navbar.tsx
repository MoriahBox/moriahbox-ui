'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X, ShoppingCart, ChevronDown, LogIn, LogOut } from 'lucide-react'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { useCart } from '@/features/cart/CartContext'
import { useAuth } from '@/features/auth/AuthContext'
import type { Lang } from '@/lib/translations'

export function Navbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [mobileAdminOpen, setMobileAdminOpen] = useState(false)
  const [driverOpen, setDriverOpen] = useState(false)
  const [mobileDriverOpen, setMobileDriverOpen] = useState(false)
  const { isReady, isLoggedIn, isAdmin, isDriver, driverId, signOut } = useAuth()
  const { lang, setLang, t } = useLanguage()
  const { itemCount } = useCart()

  async function handleLogout() {
    await signOut()
    window.location.href = '/'
  }

  const navLinks = [
    { label: t.nav.menu,          href: '/menu' },
    { label: t.nav.howItWorks,    href: '/#how-it-works' },
    ...(!isDriver ? [{ label: t.nav.becomeDriver, href: '/drivers' }] : []),
    { label: t.nav.delivery,      href: '/delivery' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#d8e8dc]">
      <nav className="flex items-center justify-between px-6 md:px-10 h-[68px]">

        {/* Logo */}
        <Link href="/" className="flex items-baseline gap-0 leading-none select-none">
          <span className="font-serif text-[30px] font-black tracking-tight text-[#1a4a2a]">
            Moriah
          </span>
          <span className="font-serif text-[30px] font-black tracking-tight text-amber-500">
            Box
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[14px] font-medium transition-colors ${
                pathname === link.href
                  ? 'text-[#2d6e42]'
                  : 'text-[#5a6e60] hover:text-[#1a4a2a]'
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Admin dropdown */}
          {isAdmin && (
          <div className="relative">
            <button
              onClick={() => setAdminOpen((prev) => !prev)}
              onBlur={() => setTimeout(() => setAdminOpen(false), 150)}
              className="flex items-center gap-1 text-[14px] font-medium text-[#5a6e60] hover:text-[#1a4a2a] transition-colors"
            >
              {t.nav.admin}
              <ChevronDown size={13} className={`transition-transform duration-150 ${adminOpen ? 'rotate-180' : ''}`} />
            </button>
            {adminOpen && (
              <div className="absolute top-full left-0 mt-2 w-44 bg-white border border-[#d8e8dc] rounded-md shadow-lg py-1 z-50">
                <Link
                  href="/admin/orders"
                  onClick={() => setAdminOpen(false)}
                  className="block px-4 py-2.5 text-[13px] text-[#5a6e60] hover:bg-[#f2faf5] hover:text-[#1a4a2a] transition-colors"
                >
                  {t.nav.adminLinks.orders}
                </Link>
                <Link
                  href="/admin/drivers"
                  onClick={() => setAdminOpen(false)}
                  className="block px-4 py-2.5 text-[13px] text-[#5a6e60] hover:bg-[#f2faf5] hover:text-[#1a4a2a] transition-colors"
                >
                  {t.nav.adminLinks.drivers}
                </Link>
              </div>
            )}
          </div>
          )}

          {/* Driver dropdown */}
          {isDriver && (
          <div className="relative">
            <button
              onClick={() => setDriverOpen((prev) => !prev)}
              onBlur={() => setTimeout(() => setDriverOpen(false), 150)}
              className="flex items-center gap-1 text-[14px] font-medium text-[#5a6e60] hover:text-[#1a4a2a] transition-colors"
            >
              {t.nav.driver}
              <ChevronDown size={13} className={`transition-transform duration-150 ${driverOpen ? 'rotate-180' : ''}`} />
            </button>
            {driverOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-[#d8e8dc] rounded-md shadow-lg py-1 z-50">
                {driverId && (
                  <Link
                    href={`/drivers/${driverId}`}
                    onClick={() => setDriverOpen(false)}
                    className="block px-4 py-2.5 text-[13px] text-[#5a6e60] hover:bg-[#f2faf5] hover:text-[#1a4a2a] transition-colors"
                  >
                    {t.nav.driverLinks.dashboard}
                  </Link>
                )}
                <Link
                  href="/drivers/availability"
                  onClick={() => setDriverOpen(false)}
                  className="block px-4 py-2.5 text-[13px] text-[#5a6e60] hover:bg-[#f2faf5] hover:text-[#1a4a2a] transition-colors"
                >
                  {t.nav.driverLinks.availability}
                </Link>
              </div>
            )}
          </div>
          )}

          <Link
            href="/checkout"
            className="relative inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-white text-[14px] font-medium px-5 py-2.5 rounded-md transition-colors"
          >
            <ShoppingCart size={16} />
            {t.nav.orderNow}
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#2d6e42] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>

          {/* Language switcher */}
          <LangToggle lang={lang} setLang={setLang} />

          {/* Auth button */}
          {isReady && (isLoggedIn ? (
            <button
              onClick={handleLogout}
              title={t.nav.signOut}
              aria-label={t.nav.signOut}
              className="text-[#5a6e60] hover:text-[#1a4a2a] transition-colors"
            >
              <LogOut size={18} />
            </button>
          ) : (
            <Link
              href="/login"
              title={t.nav.signIn}
              aria-label={t.nav.signIn}
              className="text-[#5a6e60] hover:text-[#1a4a2a] transition-colors"
            >
              <LogIn size={18} />
            </Link>
          ))}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-[#1a4a2a] p-1"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#d8e8dc] bg-white px-6 pb-6 pt-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`text-[15px] font-medium transition-colors ${
                pathname === link.href
                  ? 'text-[#2d6e42]'
                  : 'text-[#5a6e60] hover:text-[#1a4a2a]'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {/* Admin section */}
          {isAdmin && (
          <div>
            <button
              onClick={() => setMobileAdminOpen((prev) => !prev)}
              className="flex items-center gap-1.5 text-[15px] font-medium text-[#5a6e60] hover:text-[#1a4a2a] transition-colors w-full"
            >
              {t.nav.admin}
              <ChevronDown size={14} className={`transition-transform duration-150 ${mobileAdminOpen ? 'rotate-180' : ''}`} />
            </button>
            {mobileAdminOpen && (
              <div className="mt-2 pl-3 flex flex-col gap-2 border-l-2 border-[#d8e8dc]">
                <Link
                  href="/admin/orders"
                  onClick={() => { setMobileOpen(false); setMobileAdminOpen(false) }}
                  className="text-[14px] text-[#5a6e60] hover:text-[#1a4a2a] transition-colors"
                >
                  {t.nav.adminLinks.orders}
                </Link>
                <Link
                  href="/admin/drivers"
                  onClick={() => { setMobileOpen(false); setMobileAdminOpen(false) }}
                  className="text-[14px] text-[#5a6e60] hover:text-[#1a4a2a] transition-colors"
                >
                  {t.nav.adminLinks.drivers}
                </Link>
              </div>
            )}
          </div>
          )}

          {/* Driver section */}
          {isDriver && (
          <div>
            <button
              onClick={() => setMobileDriverOpen((prev) => !prev)}
              className="flex items-center gap-1.5 text-[15px] font-medium text-[#5a6e60] hover:text-[#1a4a2a] transition-colors w-full"
            >
              {t.nav.driver}
              <ChevronDown size={14} className={`transition-transform duration-150 ${mobileDriverOpen ? 'rotate-180' : ''}`} />
            </button>
            {mobileDriverOpen && (
              <div className="mt-2 pl-3 flex flex-col gap-2 border-l-2 border-[#d8e8dc]">
                {driverId && (
                  <Link
                    href={`/drivers/${driverId}`}
                    onClick={() => { setMobileOpen(false); setMobileDriverOpen(false) }}
                    className="text-[14px] text-[#5a6e60] hover:text-[#1a4a2a] transition-colors"
                  >
                    {t.nav.driverLinks.dashboard}
                  </Link>
                )}
                <Link
                  href="/drivers/availability"
                  onClick={() => { setMobileOpen(false); setMobileDriverOpen(false) }}
                  className="text-[14px] text-[#5a6e60] hover:text-[#1a4a2a] transition-colors"
                >
                  {t.nav.driverLinks.availability}
                </Link>
              </div>
            )}
          </div>
          )}

          <Link
            href="/checkout"
            onClick={() => setMobileOpen(false)}
            className="relative inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 text-white text-[15px] font-medium px-5 py-3 rounded-md transition-colors"
          >
            <ShoppingCart size={16} />
            {t.nav.orderNow}
            {itemCount > 0 && (
              <span className="ml-1 bg-[#2d6e42] text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                {itemCount}
              </span>
            )}
          </Link>
          <div className="pt-1">
            <LangToggle lang={lang} setLang={setLang} />
          </div>

          {isReady && (isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-[14px] font-medium text-[#5a6e60] hover:text-[#1a4a2a] transition-colors"
            >
              <LogOut size={15} />
              {t.nav.signOut}
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 text-[14px] font-medium text-[#5a6e60] hover:text-[#1a4a2a] transition-colors"
            >
              <LogIn size={15} />
              {t.nav.signIn}
            </Link>
          ))}

        </div>
      )}
    </header>
  )
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center border border-[#d8e8dc] rounded-md overflow-hidden text-[12px] font-semibold">
      {(['fr', 'en'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2.5 py-1.5 uppercase tracking-wide transition-colors ${
            lang === l
              ? 'bg-[#2d6e42] text-white'
              : 'text-[#5a6e60] hover:bg-[#f2faf5]'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
