'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, Plus, ShoppingCart } from 'lucide-react'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/sections/Footer'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { formatCurrency } from '@/lib/format'
import { useCart } from '@/features/cart/CartContext'
import { MenuItemEditDialog } from '@/components/menu/MenuItemEditDialog'
import { MenuItem } from '@/types/menu'
import { useAuth } from '@/features/auth/AuthContext'

type FilterType = 'ALL' | 'MEAL' | 'RECIPE'

const TYPE_VISUAL = {
  MEAL:   { emoji: '🍲', tagColor: 'bg-[#e8f5ee] text-[#2d6e42]', bg: 'bg-[#f2faf5]' },
  RECIPE: { emoji: '📦', tagColor: 'bg-amber-100 text-amber-600', bg: 'bg-[#fffaf0]' },
} as const

const SIZE_ORDER = ['SINGLE', 'COUPLE', 'FAMILY']

export default function MenuPage() {
  const { t, lang } = useLanguage()
  const { menuPage, menuItemTypes, boxSizes, menuItemDialog } = t
  const { addItem, decrementItem, items: cartItems } = useCart()
  const { isAdmin } = useAuth()

  /** qty of a given (menuItemId, size) combination currently in the cart */
  const cartQty = (menuItemId: string, size: string) =>
    cartItems.find(i => i.menuItemId === menuItemId && i.boxSize === size)?.quantity ?? 0

  const [items, setItems] = useState<MenuItem[] | null>(null)
  const [fetchError, setFetchError] = useState(false)
  const [filter, setFilter] = useState<FilterType>('ALL')
  const [modal, setModal] = useState<MenuItem | 'new' | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  function handleQuickAdd(item: MenuItem, size: string, price: number) {
    addItem({ menuItemId: item.id, itemName: item.name, boxSize: size, price, quantity: 1 })
  }

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
    fetch(`${base}/api/menu?size=50&sort=name,asc`)
      .then(r => r.json())
      .then(data => setItems(data.content))
      .catch(() => setFetchError(true))
  }, [])

  function handleSaved(saved: MenuItem) {
    setItems(prev => {
      if (!prev) return [saved]
      const exists = prev.some(i => i.id === saved.id)
      const updated = exists
        ? prev.map(i => i.id === saved.id ? saved : i)
        : [...prev, saved]
      return updated.sort((a, b) => a.name.localeCompare(b.name))
    })
  }

  async function handleOpenEdit(item: MenuItem) {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
    const res = await fetch(`${base}/api/menu/${item.id}`)
    setModal(res.ok ? await res.json() as MenuItem : item)
  }

  async function handleDelete(id: string) {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
    const res = await fetch(`${base}/api/menu/${id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      setItems(prev => prev ? prev.filter(i => i.id !== id) : null)
    }
    setDeleting(null)
  }

  const visible = items?.filter(item => filter === 'ALL' || item.type === filter) ?? []

  const filterBtnClass = (active: boolean) =>
    `text-[13px] font-medium px-4 py-1.5 rounded-full border transition-colors ${
      active
        ? 'bg-[#2d6e42] text-white border-[#2d6e42]'
        : 'text-[#5a6e60] border-[#d8e8dc] hover:border-[#2d6e42] hover:text-[#2d6e42]'
    }`

  return (
    <div className="max-w-6xl mx-auto bg-white shadow-2xl min-h-screen">
      <Navbar />

      <main className="px-6 py-16 md:px-12">
        <div className="max-w-5xl mx-auto">

          <div className="mb-10">
            <span className="inline-block bg-[#1a4a2a] text-white text-[11px] font-medium tracking-[1.5px] uppercase px-3.5 py-1.5 rounded mb-5">
              {menuPage.badge}
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-black text-[#1a4a2a] leading-tight">
              {menuPage.title}
            </h1>
          </div>

          {items && (
            <div className="flex items-center gap-2 flex-wrap mb-8">
              <button className={filterBtnClass(filter === 'ALL')} onClick={() => setFilter('ALL')}>
                {menuPage.filterAll}
              </button>
              <button className={filterBtnClass(filter === 'MEAL')} onClick={() => setFilter('MEAL')}>
                {menuPage.filterMeals}
              </button>
              <button className={filterBtnClass(filter === 'RECIPE')} onClick={() => setFilter('RECIPE')}>
                {menuPage.filterBoxes}
              </button>
              {isAdmin && (
                <button
                  onClick={() => setModal('new')}
                  className="ml-auto flex items-center gap-1.5 bg-[#2d6e42] hover:bg-[#1a4a2a] text-white text-[13px] font-medium px-4 py-1.5 rounded-full transition-colors"
                >
                  <Plus size={14} /> {menuPage.newItem}
                </button>
              )}
            </div>
          )}

          {!items && !fetchError && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border border-[#d8e8dc] rounded-md p-6 animate-pulse bg-[#f2faf5] h-40" />
              ))}
            </div>
          )}

          {fetchError && (
            <p className="text-[#5a6e60] text-[14px]">{menuPage.errorMsg}</p>
          )}

          {items && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {visible.map(item => {
                const v = TYPE_VISUAL[item.type] ?? TYPE_VISUAL.MEAL
                const priceEntries = Object.entries(item.prices)
                  .sort(([a], [b]) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b))
                const isConfirmingDelete = deleting === item.id
                return (
                  <div key={item.id} className={`${v.bg} border border-[#d8e8dc] rounded-md p-6 flex gap-4`}>
                    {item.primaryImage?.cdnThumbnailUrl ? (
                      <img
                        src={item.primaryImage.cdnThumbnailUrl}
                        alt={item.primaryImage.description ?? item.name}
                        className="w-[56px] h-[56px] rounded object-cover shrink-0 mt-0.5"
                      />
                    ) : (
                      <span className="text-[40px] shrink-0 leading-none mt-0.5" role="img" aria-label={item.name}>
                        {v.emoji}
                      </span>
                    )}
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <div className="flex items-center gap-2 flex-wrap flex-1">
                          <Link
                            href={`/menu/${item.id}`}
                            className="text-[15px] font-semibold text-[#1a4a2a] hover:text-[#2d6e42] hover:underline underline-offset-2 transition-colors"
                          >
                            {item.name}
                          </Link>
                          {item.tag && (
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${v.tagColor}`}>
                              {item.tag}
                            </span>
                          )}
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1 shrink-0">
                            {isConfirmingDelete ? (
                              <span className="flex items-center gap-1.5 text-[12px]">
                                <button onClick={() => handleDelete(item.id)} className="text-red-600 font-medium hover:underline">
                                  {menuPage.deleteConfirm}
                                </button>
                                <span className="text-[#c8d8cc]">|</span>
                                <button onClick={() => setDeleting(null)} className="text-[#5a6e60] hover:underline">
                                  {menuPage.deleteCancel}
                                </button>
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(item)}
                                  aria-label="Edit"
                                  className="p-1.5 rounded hover:bg-black/10 text-[#5a6e60] hover:text-[#1a4a2a] transition-colors"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => setDeleting(item.id)}
                                  aria-label="Delete"
                                  className="p-1.5 rounded hover:bg-black/10 text-[#5a6e60] hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-[12px] text-amber-600 font-medium tracking-wide uppercase">
                        {menuItemTypes[item.type]}
                      </p>
                      {item.description && (
                        <p className="text-[13px] text-[#5a6e60] leading-relaxed">{item.description}</p>
                      )}
                      {priceEntries.length > 0 && (
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          {priceEntries.map(([size, price]) => {
                            const qty = cartQty(item.id, size)
                            const inCart = qty > 0
                            return (
                              <div
                                key={size}
                                className={`inline-flex items-center rounded-full border text-[11px] font-medium transition-colors ${
                                  inCart
                                    ? 'border-[#2d6e42] bg-[#f2faf5] text-[#2d6e42]'
                                    : 'border-[#d8e8dc] text-[#5a6e60] hover:border-[#2d6e42] hover:text-[#2d6e42]'
                                }`}
                              >
                                <button
                                  onClick={() => handleQuickAdd(item, size, Number(price))}
                                  aria-label={`${t.cart.addToCart} — ${boxSizes[size as keyof typeof boxSizes]}`}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 hover:opacity-75 transition-opacity"
                                >
                                  <ShoppingCart size={10} />
                                  {boxSizes[size as keyof typeof boxSizes]} · {formatCurrency(Number(price), lang)}
                                  {inCart && (
                                    <span className="ml-0.5 font-semibold">×{qty}</span>
                                  )}
                                </button>
                                {inCart && (
                                  <>
                                    <span className="w-px h-3 bg-[#2d6e42]/30 shrink-0" />
                                    <button
                                      onClick={() => decrementItem(item.id, size)}
                                      aria-label={t.cart.removeItem}
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-bold text-red-400 hover:text-red-600 transition-colors"
                                    >
                                      <Trash2 size={10} />1
                                    </button>
                                  </>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </main>

      {isAdmin && (
        <MenuItemEditDialog
          mode={modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      <Footer />
    </div>
  )
}
