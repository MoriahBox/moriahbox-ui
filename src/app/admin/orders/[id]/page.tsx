'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/sections/Footer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { formatCurrency, formatDate } from '@/lib/format'
import { apiFetch } from '@/lib/api'
import type { DriverSlot } from '@/types/driver'

type OrderStatus = 'PENDING' | 'PAID' | 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED' | 'PAYMENT_FAILED' | 'PAYMENT_INTENT_FAILED' | 'CANCELLED' | 'REFUNDED'
type OrderType = 'DELIVERY' | 'PICKUP'

interface DeliveryAddress {
  street: string
  city: string
  postalCode: string
  province: string
  country: string
}

interface OrderItem {
  id: string
  menuItemId: string
  itemName: string
  boxSize: string
  price: number
  quantity: number
  lineTotal: number
}

interface OrderDetail {
  id: string
  displayId: string
  status: OrderStatus
  orderType: OrderType
  customerEmail: string
  deliveryAddress: DeliveryAddress | null
  deliveryDate: string | null
  deliverySlot: DriverSlot | null
  items: OrderItem[]
  deliveryFee: number
  totalAmount: number
  createdAt: string
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING:               'bg-amber-100 text-amber-700',
  PAID:                  'bg-green-100 text-green-700',
  CONFIRMED:             'bg-blue-100 text-blue-700',
  DISPATCHED:            'bg-cyan-100 text-cyan-700',
  DELIVERED:             'bg-emerald-100 text-emerald-700',
  PAYMENT_FAILED:        'bg-red-100 text-red-700',
  PAYMENT_INTENT_FAILED: 'bg-orange-100 text-orange-700',
  CANCELLED:             'bg-gray-100 text-gray-600',
  REFUNDED:              'bg-purple-100 text-purple-700',
}

const SOFT_DELETABLE_STATUSES: OrderStatus[] = ['CANCELLED', 'PAYMENT_INTENT_FAILED', 'PAYMENT_FAILED', 'REFUNDED']

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t, lang } = useLanguage()
  const p = t.adminOrdersPage
  const d = p.detail

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function executeDelete() {
    setConfirmOpen(false)
    setDeleteError(null)
    const res = await apiFetch(`/api/orders/${id}`, { method: 'DELETE' }).catch(() => null)
    if (!res || !res.ok) {
      setDeleteError(d.deleteError)
      return
    }
    router.push('/admin/orders')
  }

  useEffect(() => {
    apiFetch(`/api/orders/${id}`)
      .then(async r => {
        if (!r.ok) throw new Error()
        setOrder(await r.json() as OrderDetail)
      })
      .catch(() => setLoadError(true))
  }, [id])

  if (loadError) {
    return (
      <>
      <div className="max-w-6xl mx-auto bg-white shadow-2xl min-h-screen">
        <Navbar />
        <main className="px-6 py-16 md:px-12">
          <Link href="/admin/orders" className="text-[13px] text-[#2d6e42] hover:underline mb-6 inline-block">
            ← {d.back}
          </Link>
          <p className="text-[14px] text-[#5a6e60]">{p.error}</p>
        </main>
        <Footer />
      </div>
      </>
    )
  }

  if (!order) {
    return (
      <>
      <div className="max-w-6xl mx-auto bg-white shadow-2xl min-h-screen">
        <Navbar />
        <main className="px-6 py-16 md:px-12">
          <div className="h-6 w-32 bg-[#d8e8dc] animate-pulse rounded mb-6" />
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-md bg-[#d8e8dc] animate-pulse" />)}
          </div>
        </main>
        <Footer />
      </div>
      </>
    )
  }

  return (
    <>
    <div className="max-w-6xl mx-auto bg-white shadow-2xl min-h-screen">
      <Navbar />
      <main className="px-6 py-16 md:px-12">
        <span className="inline-block bg-[#1a4a2a] text-white text-[11px] font-medium tracking-[1.5px] uppercase px-3.5 py-1.5 rounded mb-5">
          {p.badge}
        </span>
        <h1 className="font-serif text-2xl md:text-3xl font-black text-[#1a4a2a] mb-6">{d.title}</h1>

        <Link href="/admin/orders" className="text-[13px] text-[#2d6e42] hover:underline mb-8 inline-block">
          ← {d.back}
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[18px] font-mono font-bold text-[#1a4a2a] mb-1">{order.displayId}</p>
            <p className="text-[11px] text-[#8a9e90] font-mono mb-2">{order.id}</p>
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded-full text-[12px] font-medium ${STATUS_COLORS[order.status]}`}>
                {p.statusLabels[order.status]}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[12px] font-medium ${
                order.orderType === 'PICKUP' ? 'bg-blue-100 text-blue-700' : 'bg-[#e8f5ee] text-[#2d6e42]'
              }`}>
                {p.orderTypeLabels[order.orderType]}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-[12px] text-[#5a6e60]">
              {formatDate(order.createdAt, lang)}
            </p>
            {SOFT_DELETABLE_STATUSES.includes(order.status) && (
              <button
                onClick={() => setConfirmOpen(true)}
                className="text-[13px] font-medium text-red-500 hover:text-red-700 transition-colors"
              >
                {d.deleteOrder}
              </button>
            )}
            {deleteError && (
              <p className="text-[12px] text-red-600">{deleteError}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Customer */}
          <section className="bg-white border border-[#d8e8dc] rounded-lg p-5">
            <h2 className="text-[13px] font-semibold text-[#3a5a44] uppercase tracking-wide mb-3">{d.customer}</h2>
            <p className="text-[14px] text-[#1a4a2a]">{order.customerEmail}</p>
          </section>

          {/* Items */}
          <section className="bg-white border border-[#d8e8dc] rounded-lg overflow-hidden">
            <h2 className="text-[13px] font-semibold text-[#3a5a44] uppercase tracking-wide p-5 pb-3">{d.items}</h2>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-y border-[#d8e8dc] bg-[#f2faf5]">
                  <th className="text-left px-5 py-2.5 font-medium text-[#5a6e60]">{d.tableItem}</th>
                  <th className="text-left px-4 py-2.5 font-medium text-[#5a6e60]">{d.tableSize}</th>
                  <th className="text-right px-4 py-2.5 font-medium text-[#5a6e60]">{d.tableQty}</th>
                  <th className="text-right px-4 py-2.5 font-medium text-[#5a6e60]">{d.tableUnit}</th>
                  <th className="text-right px-5 py-2.5 font-medium text-[#5a6e60]">{d.tableLineTotal}</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map(item => (
                  <tr key={item.id} className="border-b border-[#d8e8dc] last:border-0">
                    <td className="px-5 py-3 text-[#1a4a2a]">{item.itemName}</td>
                    <td className="px-4 py-3 text-[#5a6e60]">{item.boxSize}</td>
                    <td className="px-4 py-3 text-right text-[#5a6e60]">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-[#5a6e60]">{formatCurrency(Number(item.price), lang)}</td>
                    <td className="px-5 py-3 text-right text-[#1a4a2a] font-medium">{formatCurrency(Number(item.lineTotal), lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Delivery or Pickup */}
          {order.orderType === 'DELIVERY' && order.deliveryAddress && (
            <section className="bg-white border border-[#d8e8dc] rounded-lg p-5">
              <h2 className="text-[13px] font-semibold text-[#3a5a44] uppercase tracking-wide mb-3">{d.delivery}</h2>
              <div className="text-[14px] text-[#1a4a2a] flex flex-col gap-1">
                <p>{order.deliveryAddress.street}</p>
                <p>{order.deliveryAddress.city}, {order.deliveryAddress.province} {order.deliveryAddress.postalCode}</p>
                <p>{order.deliveryAddress.country}</p>
                {order.deliveryDate && (
                  <p className="mt-2 text-[#5a6e60]">
                    {formatDate(order.deliveryDate, lang)}
                    {order.deliverySlot && ` · ${d.slotLabels[order.deliverySlot]}`}
                  </p>
                )}
              </div>
            </section>
          )}

          {order.orderType === 'PICKUP' && (
            <section className="bg-white border border-[#d8e8dc] rounded-lg p-5">
              <h2 className="text-[13px] font-semibold text-[#3a5a44] uppercase tracking-wide mb-3">{d.pickup}</h2>
              <p className="text-[14px] text-[#1a4a2a]">{d.pickupAddress}</p>
            </section>
          )}

          {/* Payment */}
          <section className="bg-white border border-[#d8e8dc] rounded-lg p-5">
            <h2 className="text-[13px] font-semibold text-[#3a5a44] uppercase tracking-wide mb-3">{d.payment}</h2>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[13px] text-[#5a6e60]">
                <span>{d.subtotal}</span>
                <span>{formatCurrency(order.items.reduce((s, i) => s + Number(i.lineTotal), 0), lang)}</span>
              </div>
              {Number(order.deliveryFee) > 0 && (
                <div className="flex justify-between text-[13px] text-[#5a6e60]">
                  <span>{d.deliveryFee}</span>
                  <span>{formatCurrency(Number(order.deliveryFee), lang)}</span>
                </div>
              )}
              <div className="flex justify-between text-[14px] pt-2 border-t border-[#d8e8dc]">
                <span className="font-semibold text-[#1a4a2a]">{d.total}</span>
                <span className="font-bold text-[#1a4a2a]">{formatCurrency(Number(order.totalAmount), lang)}</span>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>

    {confirmOpen && (
      <ConfirmDialog
        message={d.deleteConfirm}
        confirmLabel={d.deleteOrder}
        cancelLabel={p.cancelLabel}
        onConfirm={executeDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    )}
    </>
  )
}
