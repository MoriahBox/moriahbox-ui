'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/sections/Footer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { useAuth } from '@/features/auth/AuthContext'
import { apiFetch } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { fetchSlotDefinitions, buildSlotLabels } from '@/lib/slots'
import type { DriverSlot, EarningsSummary } from '@/types/driver'

type Tab = 'orders' | 'earnings'
type OrderType = 'DELIVERY' | 'PICKUP'

interface OrderSummary {
  id: string
  status: string
  orderType: OrderType
  customerEmail: string
  deliveryDate: string | null
  deliverySlot: DriverSlot | null
  totalAmount: number
  assignedDriverId: string | null
  createdAt: string
}

interface PageResponse {
  content: OrderSummary[]
  totalPages: number
  totalElements: number
  number: number
}

interface DateFilters {
  from: string
  to: string
}

const STATUS_COLORS: Record<string, string> = {
  DISPATCHED: 'bg-cyan-100 text-cyan-700',
  DELIVERED: 'bg-green-100 text-green-700',
}
const EMPTY_FILTERS: DateFilters = { from: '', to: '' }

export default function DriverDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t, lang } = useLanguage()
  const { isAdmin, driverId: jwtDriverId } = useAuth()
  const p = t.driverDashboardPage
  const shared = t.adminOrdersPage

  const [tab, setTab] = useState<Tab>('orders')

  // Orders state
  const [ordersData, setOrdersData] = useState<PageResponse | null>(null)
  const [ordersLoadError, setOrdersLoadError] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [draft, setDraft] = useState<DateFilters>(EMPTY_FILTERS)
  const [applied, setApplied] = useState<DateFilters>(EMPTY_FILTERS)
  const [deliverConfirmId, setDeliverConfirmId] = useState<string | null>(null)
  const [deliverError, setDeliverError] = useState<string | null>(null)
  const [slotLabels, setSlotLabels] = useState<Record<string, string>>({})

  // Earnings state
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null)
  const [earningsError, setEarningsError] = useState(false)

  // Driver self-access guard: redirect a driver to their own page if they hit another driver's UUID
  useEffect(() => {
    if (!isAdmin && jwtDriverId !== null && jwtDriverId !== id) {
      router.replace(`/drivers/${jwtDriverId}`)
    }
  }, [id, jwtDriverId, isAdmin, router])

  const fetchOrders = useCallback((pageNum: number, size: number, filters: DateFilters) => {
    setOrdersData(null)
    setOrdersLoadError(false)
    const params = new URLSearchParams({
      page: String(pageNum),
      size: String(size),
      sort: 'createdDt,desc',
      assignedDriverId: id,
    })
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
    apiFetch(`/api/orders?${params}`)
      .then(async r => { if (!r.ok) throw new Error(); setOrdersData(await r.json() as PageResponse) })
      .catch(() => setOrdersLoadError(true))
  }, [id])

  useEffect(() => {
    fetchOrders(page, pageSize, applied)
  }, [fetchOrders, page, pageSize, applied])

  useEffect(() => {
    fetchSlotDefinitions().then(defs => setSlotLabels(buildSlotLabels(defs))).catch(() => {})
  }, [])

  useEffect(() => {
    if (tab !== 'earnings') return
    setEarnings(null)
    setEarningsError(false)
    apiFetch(`/api/drivers/${id}/earnings`)
      .then(async r => { if (!r.ok) throw new Error(); setEarnings(await r.json() as EarningsSummary) })
      .catch(() => setEarningsError(true))
  }, [tab, id])

  function applyFilters() { setPage(0); setApplied(draft) }
  function resetFilters() { setDraft(EMPTY_FILTERS); setPage(0); setApplied(EMPTY_FILTERS) }
  function handlePageSizeChange(newSize: number) { setPageSize(newSize); setPage(0) }

  async function executeDeliver(orderId: string) {
    setDeliverConfirmId(null)
    setDeliverError(null)
    const res = await apiFetch(`/api/orders/${orderId}/deliver`, { method: 'POST' }).catch(() => null)
    if (!res || !res.ok) { setDeliverError(t.driverOrdersPage.deliverError); return }
    fetchOrders(page, pageSize, applied)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'orders', label: p.tabs.orders },
    { key: 'earnings', label: p.tabs.earnings },
  ]

  const earningsPeriods = earnings
    ? [
        { period: earnings.currentWeek, label: p.earnings.periods.currentWeek, estimated: false },
        { period: earnings.nextWeek,    label: p.earnings.periods.nextWeek,    estimated: true  },
        { period: earnings.pastWeek,    label: p.earnings.periods.pastWeek,    estimated: false },
        { period: earnings.pastMonth,   label: p.earnings.periods.pastMonth,   estimated: false },
      ]
    : []

  return (
    <>
      <div className="max-w-6xl mx-auto bg-white shadow-2xl min-h-screen">
        <Navbar />
        <main className="px-6 py-16 md:px-12">
          <span className="inline-block bg-[#1a4a2a] text-white text-[11px] font-medium tracking-[1.5px] uppercase px-3.5 py-1.5 rounded mb-5">
            {p.badge}
          </span>
          <h1 className="font-serif text-2xl md:text-3xl font-black text-[#1a4a2a] mb-8">{p.title}</h1>

          {/* Tab bar */}
          <div className="flex gap-1 mb-8 border-b border-[#d8e8dc]">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                  tab === key
                    ? 'border-[#2d6e42] text-[#2d6e42]'
                    : 'border-transparent text-[#5a6e60] hover:text-[#1a4a2a]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Orders tab */}
          {tab === 'orders' && (
            <div>
              <div className="bg-white border border-[#d8e8dc] rounded-lg p-4 mb-6 flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#5a6e60] uppercase tracking-wide">{shared.filters.from}</label>
                  <input
                    type="date"
                    value={draft.from}
                    onChange={e => setDraft(d => ({ ...d, from: e.target.value }))}
                    className="text-[13px] border border-[#d8e8dc] rounded-md px-3 py-1.5 text-[#1a4a2a] bg-white focus:outline-none focus:border-[#2d6e42]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[#5a6e60] uppercase tracking-wide">{shared.filters.to}</label>
                  <input
                    type="date"
                    value={draft.to}
                    onChange={e => setDraft(d => ({ ...d, to: e.target.value }))}
                    className="text-[13px] border border-[#d8e8dc] rounded-md px-3 py-1.5 text-[#1a4a2a] bg-white focus:outline-none focus:border-[#2d6e42]"
                  />
                </div>
                <div className="flex gap-2 pb-0.5">
                  <button onClick={applyFilters} className="px-4 py-1.5 bg-[#2d6e42] text-white text-[13px] font-medium rounded-md hover:bg-[#1a4a2a] transition-colors">
                    {shared.filters.apply}
                  </button>
                  <button onClick={resetFilters} className="px-4 py-1.5 border border-[#d8e8dc] text-[#5a6e60] text-[13px] font-medium rounded-md hover:bg-[#f2faf5] transition-colors">
                    {shared.filters.reset}
                  </button>
                </div>
              </div>

              {deliverError && <p className="text-[13px] text-red-600 mb-4">{deliverError}</p>}

              {!ordersData && !ordersLoadError && (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-14 rounded-md bg-[#d8e8dc] animate-pulse" />
                  ))}
                </div>
              )}

              {ordersLoadError && <p className="text-[14px] text-[#5a6e60]">{shared.error}</p>}
              {ordersData && ordersData.content.length === 0 && <p className="text-[14px] text-[#5a6e60]">{shared.empty}</p>}

              {ordersData && ordersData.content.length > 0 && (
                <div className="bg-white border border-[#d8e8dc] rounded-lg overflow-hidden">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-[#d8e8dc] bg-[#f2faf5]">
                        <th className="text-left px-4 py-3 font-semibold text-[#3a5a44]">{shared.columns.id}</th>
                        <th className="text-left px-4 py-3 font-semibold text-[#3a5a44]">{shared.columns.customer}</th>
                        <th className="text-left px-4 py-3 font-semibold text-[#3a5a44]">{shared.columns.status}</th>
                        <th className="text-left px-4 py-3 font-semibold text-[#3a5a44]">{shared.columns.delivery}</th>
                        <th className="text-right px-4 py-3 font-semibold text-[#3a5a44]">{shared.columns.total}</th>
                        <th className="text-left px-4 py-3 font-semibold text-[#3a5a44]">{shared.columns.placedOn}</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {ordersData.content.map((order, idx) => {
                        const deliveryInfo = order.orderType === 'PICKUP'
                          ? shared.orderTypeLabels.PICKUP
                          : order.deliveryDate
                            ? `${formatDate(order.deliveryDate, lang)}${order.deliverySlot ? ' · ' + (slotLabels[order.deliverySlot] ?? order.deliverySlot) : ''}`
                            : '—'
                        return (
                          <tr key={order.id} className={`border-b border-[#d8e8dc] last:border-0 ${idx % 2 === 1 ? 'bg-[#f9fdfb]' : ''}`}>
                            <td className="px-4 py-3 font-mono text-[12px] text-[#5a6e60]">{order.id.slice(0, 8)}…</td>
                            <td className="px-4 py-3 text-[#1a4a2a]">{order.customerEmail}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                {(shared.statusLabels as Record<string, string>)[order.status] ?? order.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[#5a6e60]">{deliveryInfo}</td>
                            <td className="px-4 py-3 text-right text-[#1a4a2a] font-medium">{formatCurrency(Number(order.totalAmount), lang)}</td>
                            <td className="px-4 py-3 text-[#5a6e60]">{formatDate(order.createdAt, lang)}</td>
                            <td className="px-4 py-3 text-right">
                              {order.status === 'DISPATCHED' && (
                                <button
                                  onClick={() => setDeliverConfirmId(order.id)}
                                  className="text-cyan-600 hover:text-cyan-800 text-[13px] font-medium transition-colors"
                                >
                                  {t.driverOrdersPage.markDelivered}
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {ordersData && (
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => setPage(n => Math.max(0, n - 1))}
                    disabled={page === 0}
                    className="px-4 py-1.5 border border-[#d8e8dc] text-[13px] font-medium text-[#5a6e60] rounded-md hover:bg-[#f2faf5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {shared.pagination.prev}
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-[#5a6e60]">
                      {page + 1} {shared.pagination.of} {ordersData.totalPages || 1}
                    </span>
                    <select
                      value={pageSize}
                      onChange={e => handlePageSizeChange(Number(e.target.value))}
                      className="text-[13px] border border-[#d8e8dc] rounded-md px-2 py-1 text-[#1a4a2a] bg-white focus:outline-none focus:border-[#2d6e42]"
                    >
                      {[10, 20, 50].map(s => (
                        <option key={s} value={s}>{s} {shared.pagination.perPage}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => setPage(n => Math.min((ordersData.totalPages || 1) - 1, n + 1))}
                    disabled={page >= (ordersData.totalPages || 1) - 1}
                    className="px-4 py-1.5 border border-[#d8e8dc] text-[13px] font-medium text-[#5a6e60] rounded-md hover:bg-[#f2faf5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {shared.pagination.next}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Earnings tab */}
          {tab === 'earnings' && (
            <div>
              {!earnings && !earningsError && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-28 rounded-lg bg-[#e8f0ea] animate-pulse" />
                  ))}
                </div>
              )}

              {earningsError && <p className="text-[14px] text-[#5a6e60]">{p.earnings.error}</p>}

              {earnings && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {earningsPeriods.map(({ period, label, estimated }) => (
                    <div key={label} className="border border-[#d8e8dc] rounded-lg p-5">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-[13px] font-semibold text-[#3a5a44] uppercase tracking-wide">{label}</h3>
                        {estimated && (
                          <span className="text-[11px] font-medium tracking-[1.5px] uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                            {p.earnings.estimatedBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#5a6e60] mb-3">
                        {formatDate(period.periodStart, lang)} – {formatDate(period.periodEnd, lang)}
                      </p>
                      <p className="font-serif text-2xl font-black text-[#1a4a2a] mb-1">
                        {formatCurrency(Number(period.amount), lang)}
                      </p>
                      <p className="text-[13px] text-[#5a6e60]">
                        {period.deliveries} {p.earnings.deliveries}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
        <Footer />
      </div>

      {deliverConfirmId && (
        <ConfirmDialog
          message={t.driverOrdersPage.markDeliveredConfirm}
          confirmLabel={t.driverOrdersPage.markDelivered}
          cancelLabel={shared.cancelLabel}
          onConfirm={() => executeDeliver(deliverConfirmId)}
          onCancel={() => setDeliverConfirmId(null)}
        />
      )}
    </>
  )
}
