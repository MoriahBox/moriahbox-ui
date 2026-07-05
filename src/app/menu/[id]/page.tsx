'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, ShoppingCart, Trash2 } from 'lucide-react'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/sections/Footer'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { formatCurrency } from '@/lib/format'
import { useCart } from '@/features/cart/CartContext'
import { MenuItemEditDialog } from '@/components/menu/MenuItemEditDialog'
import { MenuItem } from '@/types/menu'
import { useAuth } from '@/features/auth/AuthContext'

const TYPE_VISUAL = {
  MEAL:   { emoji: '🍲', tagColor: 'bg-[#e8f5ee] text-[#2d6e42]', bg: 'bg-[#f2faf5]' },
  RECIPE: { emoji: '📦', tagColor: 'bg-amber-100 text-amber-600', bg: 'bg-[#fffaf0]' },
} as const

const SIZE_ORDER = ['SINGLE', 'COUPLE', 'FAMILY']

export default function MenuItemPage() {
  const { id } = useParams<{ id: string }>()
  const { t, lang } = useLanguage()
  const { menuItemTypes, boxSizes, cart: cartT, menuItemPage: p } = t
  const [imgIndex, setImgIndex] = useState(0)
  const { addItem, decrementItem, items: cartItems } = useCart()

  const { isAdmin } = useAuth()
  const [item, setItem] = useState<MenuItem | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
    fetch(`${base}/api/menu/${id}`)
      .then(async r => {
        if (r.status === 404) { setNotFound(true); return }
        if (!r.ok) throw new Error()
        setItem(await r.json() as MenuItem)
      })
      .catch(() => setError(true))
  }, [id])

  const backLink = (
    <Link
      href="/menu"
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#5a6e60] hover:text-[#2d6e42] transition-colors mb-10"
    >
      <ArrowLeft size={14} /> {p.backToMenu}
    </Link>
  )

  if (notFound || error) {
    return (
      <div className="max-w-6xl mx-auto bg-white shadow-2xl min-h-screen">
        <Navbar />
        <main className="px-6 py-16 md:px-12">
          <div className="max-w-3xl mx-auto">
            {backLink}
            <p className="text-[#5a6e60] text-[14px]">
              {notFound ? p.notFound : p.loadError}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="max-w-6xl mx-auto bg-white shadow-2xl min-h-screen">
        <Navbar />
        <main className="px-6 py-16 md:px-12">
          <div className="max-w-3xl mx-auto">
            <div className="h-5 w-28 bg-[#e8f0ea] rounded animate-pulse mb-10" />
            <div className="h-8 w-64 bg-[#e8f0ea] rounded animate-pulse mb-4" />
            <div className="h-4 w-full bg-[#e8f0ea] rounded animate-pulse mb-2" />
            <div className="h-4 w-3/4 bg-[#e8f0ea] rounded animate-pulse mb-8" />
            <div className="flex gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-7 w-24 bg-[#e8f0ea] rounded animate-pulse" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const v = TYPE_VISUAL[item.type] ?? TYPE_VISUAL.MEAL
  const allImages = [
    ...(item.primaryImage ? [item.primaryImage] : []),
    ...(item.additionalImages ?? []),
  ]
  const safeIndex = allImages.length > 0 ? Math.min(imgIndex, allImages.length - 1) : 0
  const priceEntries = Object.entries(item.prices)
    .sort(([a], [b]) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b))

  const cartQty = (size: string) =>
    cartItems.find(i => i.menuItemId === item?.id && i.boxSize === size)?.quantity ?? 0

  function handleQuickAdd(size: string, price: number) {
    if (!item) return
    addItem({ menuItemId: item.id, itemName: item.name, boxSize: size, price, quantity: 1 })
  }

  return (
    <div className="max-w-6xl mx-auto bg-white shadow-2xl min-h-screen">
      <Navbar />

      <main className="px-6 py-16 md:px-12">
        <div className="max-w-3xl mx-auto">

          {/* Back + Edit */}
          <div className="flex items-center justify-between mb-10">
            <Link
              href="/menu"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#5a6e60] hover:text-[#2d6e42] transition-colors"
            >
              <ArrowLeft size={14} /> {p.backToMenu}
            </Link>
            {isAdmin && (
              <button
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#5a6e60] hover:text-[#2d6e42] border border-[#d8e8dc] hover:border-[#2d6e42] px-3 py-1.5 rounded transition-colors"
              >
                <Pencil size={13} /> {p.edit}
              </button>
            )}
          </div>

          {/* Hero */}
          <div className={`${v.bg} border border-[#d8e8dc] rounded-lg overflow-hidden mb-8`}>
            {allImages.length > 0 ? (
              <div className="relative">
                <img
                  src={allImages[safeIndex].cdnUrl}
                  alt={allImages[safeIndex].description ?? item.name}
                  className="w-full max-h-[360px] object-cover"
                />
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setImgIndex(i => (i - 1 + allImages.length) % allImages.length)}
                      aria-label="Previous photo"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1 transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() => setImgIndex(i => (i + 1) % allImages.length)}
                      aria-label="Next photo"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {allImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setImgIndex(i)}
                          aria-label={`Photo ${i + 1}`}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${i === safeIndex ? 'bg-white' : 'bg-white/40'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : null}
            <div className="p-8">
              <div className="flex gap-5 items-start">
                {allImages.length === 0 && (
                  <span className="text-[56px] leading-none shrink-0" role="img" aria-label={item.name}>
                    {v.emoji}
                  </span>
                )}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-medium tracking-[1.2px] uppercase text-amber-600">
                      {menuItemTypes[item.type]}
                    </span>
                    {item.tag && (
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${v.tagColor}`}>
                        {item.tag}
                      </span>
                    )}
                  </div>
                  <h1 className="font-serif text-2xl md:text-3xl font-black text-[#1a4a2a] leading-tight">
                    {item.name}
                  </h1>
                  {item.description && (
                    <p className="text-[14px] text-[#5a6e60] leading-relaxed mt-1">{item.description}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing — add-to-cart pills */}
          {priceEntries.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[11px] font-medium tracking-[1.5px] uppercase text-[#5a6e60] mb-3">
                {p.sizesPricing}
              </h2>
              <div className="flex gap-2 flex-wrap">
                {priceEntries.map(([size, price]) => {
                  const qty = cartQty(size)
                  const inCart = qty > 0
                  return (
                    <div
                      key={size}
                      className={`inline-flex items-center rounded-full border text-[13px] font-medium transition-colors ${
                        inCart
                          ? 'border-[#2d6e42] bg-[#f2faf5] text-[#2d6e42]'
                          : 'border-[#d8e8dc] text-[#5a6e60] hover:border-[#2d6e42] hover:text-[#2d6e42]'
                      }`}
                    >
                      <button
                        onClick={() => handleQuickAdd(size, Number(price))}
                        aria-label={`${cartT.addToCart} — ${boxSizes[size as keyof typeof boxSizes]}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 hover:opacity-75 transition-opacity"
                      >
                        <ShoppingCart size={13} />
                        {boxSizes[size as keyof typeof boxSizes]} · {formatCurrency(Number(price), lang)}
                        {inCart && (
                          <span className="ml-0.5 font-semibold">×{qty}</span>
                        )}
                      </button>
                      {inCart && (
                        <>
                          <span className="w-px h-3.5 bg-[#2d6e42]/30 shrink-0" />
                          <button
                            onClick={() => decrementItem(item?.id ?? '', size)}
                            aria-label={cartT.removeItem}
                            className="inline-flex items-center gap-0.5 px-2 py-1.5 text-[12px] font-bold text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={12} />1
                          </button>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Recipe steps */}
          {item.type === 'RECIPE' && item.steps && item.steps.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[11px] font-medium tracking-[1.5px] uppercase text-[#5a6e60] mb-4">
                {p.howToPrepare}
              </h2>
              <ol className="flex flex-col gap-4">
                {item.steps.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-[#2d6e42] text-white text-[12px] font-semibold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-[14px] text-[#3a5a44] leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

        </div>
      </main>

      {isAdmin && (
        <MenuItemEditDialog
          mode={editOpen ? item : null}
          onClose={() => setEditOpen(false)}
          onSaved={updated => { setItem(updated); setEditOpen(false) }}
        />
      )}

      <Footer />
    </div>
  )
}
