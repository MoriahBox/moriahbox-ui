'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/sections/Footer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DriverSlideOver } from '@/components/ui/DriverSlideOver'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { fetchSlotDefinitions, buildSlotLabels } from '@/lib/slots'
import { formatCurrency, formatDate } from '@/lib/format'
import { apiFetch } from '@/lib/api'
import type { DriverSlot } from '@/types/driver'

interface ReassignableDriver {
  id: string
  name: string
  email: string
  licenseNumber: string
}

type OrderStatus = 'PENDING' | 'PAID' | 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED' | 'PAYMENT_FAILED' | 'PAYMENT_INTENT_FAILED' | 'CANCELLED' | 'REFUNDED'
type OrderType = 'DELIVERY' | 'PICKUP'

interface OrderSummary {
  id: string
  displayId: string
  status: OrderStatus
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

interface Filters {
  status: string
  orderType: string
  customerEmail: string
  from: string
  to: string
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

const EMPTY_FILTERS: Filters = { status: '', orderType: '', customerEmail: '', from: '', to: '' }

const SOFT_DELETABLE_STATUSES: OrderStatus[] = ['CANCELLED', 'PAYMENT_INTENT_FAILED', 'PAYMENT_FAILED', 'REFUNDED']

export default function AdminOrdersPage() {
  const { t, lang } = useLanguage()
  const p = t.adminOrdersPage

  const [data, setData] = useState<PageResponse | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deliverConfirmId, setDeliverConfirmId] = useState<string | null>(null)
  const [deliverError, setDeliverError] = useState<string | null>(null)
  const [reassignId, setReassignId] = useState<string | null>(null)
  const [reassignDriverInput, setReassignDriverInput] = useState('')
  const [reassignError, setReassignError] = useState<string | null>(null)
  const [reassignDrivers, setReassignDrivers] = useState<ReassignableDriver[]>([])
  const [reassignDriversLoading, setReassignDriversLoading] = useState(false)
  const [reassignDriversError, setReassignDriversError] = useState(false)
  const [slotLabels, setSlotLabels] = useState<Record<string, string>>({})
  const [driverPanelId, setDriverPanelId] = useState<string | null>(null)

  const fetchOrders = useCallback((pageNum: number, size: number, filters: Filters) => {
    setData(null)
    setLoadError(false)

    const params = new URLSearchParams({ page: String(pageNum), size: String(size), sort: 'createdDt,desc' })
    if (filters.status)        params.set('status', filters.status)
    if (filters.orderType)     params.set('orderType', filters.orderType)
    if (filters.customerEmail) params.set('customerEmail', filters.customerEmail)
    if (filters.from)          params.set('from', filters.from)
    if (filters.to)            params.set('to', filters.to)

    apiFetch(`/api/orders?${params}`)
      .then(async r => {
        if (!r.ok) throw new Error()
        setData(await r.json() as PageResponse)
      })
      .catch(() => setLoadError(true))
  }, [])

  useEffect(() => { fetchOrders(page, pageSize, applied) }, [fetchOrders, page, pageSize, applied])

  useEffect(() => {
    fetchSlotDefinitions().then(defs => setSlotLabels(buildSlotLabels(defs))).catch(() => {})
  }, [])

  function applyFilters() {
    setPage(0)
    setApplied(draft)
  }

  function resetFilters() {
    setDraft(EMPTY_FILTERS)
    setPage(0)
    setApplied(EMPTY_FILTERS)
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize)
    setPage(0)
  }

  async function executeDelete(orderId: string) {
    setConfirmId(null)
    setDeleteError(null)
    const res = await apiFetch(`/api/orders/${orderId}`, { method: 'DELETE' }).catch(() => null)
    if (!res || !res.ok) {
      setDeleteError(p.deleteError)
      return
    }
    fetchOrders(page, pageSize, applied)
  }

  async function executeDeliver(orderId: string) {
    setDeliverConfirmId(null)
    setDeliverError(null)
    const res = await apiFetch(`/api/orders/${orderId}/deliver`, { method: 'POST' }).catch(() => null)
    if (!res || !res.ok) {
      setDeliverError(p.deliverError)
      return
    }
    fetchOrders(page, pageSize, applied)
  }

  function openReassignDialog(orderId: string) {
    setReassignId(orderId)
    setReassignDriverInput('')
    setReassignError(null)
    setReassignDrivers([])
    setReassignDriversLoading(true)
    setReassignDriversError(false)
    apiFetch(`/api/orders/${orderId}/available-drivers`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: ReassignableDriver[]) => setReassignDrivers(data))
      .catch(() => setReassignDriversError(true))
      .finally(() => setReassignDriversLoading(false))
  }

  async function executeReassign(orderId: string) {
    setReassignError(null)
    const trimmed = reassignDriverInput.trim()
    if (!trimmed) return
    const res = await apiFetch(`/api/orders/${orderId}/reassign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId: trimmed }),
    }).catch(() => null)
    if (!res || !res.ok) {
      setReassignError(p.reassignError)
      return
    }
    setReassignId(null)
    setReassignDriverInput('')
    fetchOrders(page, pageSize, applied)
  }

  const STATUS_OPTIONS: OrderStatus[] = ['PENDING', 'PAID', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'PAYMENT_FAILED', 'PAYMENT_INTENT_FAILED', 'CANCELLED', 'REFUNDED']
  const TYPE_OPTIONS: OrderType[] = ['DELIVERY', 'PICKUP']

  return (
    <>
    <div className="max-w-6xl mx-auto bg-white shadow-2xl min-h-screen">
      <Navbar />
      <main className="px-6 py-16 md:px-12">
      <span className="inline-block bg-[#1a4a2a] text-white text-[11px] font-medium tracking-[1.5px] uppercase px-3.5 py-1.5 rounded mb-5">
        {p.badge}
      </span>
      <h1 className="font-serif text-2xl md:text-3xl font-black text-[#1a4a2a] mb-10">{p.title}</h1>

      {/* Filter bar */}
      <div className="bg-white border border-[#d8e8dc] rounded-lg p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[#5a6e60] uppercase tracking-wide">{p.filters.status}</label>
          <select
            value={draft.status}
            onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}
            className="text-[13px] border border-[#d8e8dc] rounded-md px-3 py-1.5 text-[#1a4a2a] bg-white focus:outline-none focus:border-[#2d6e42]"
          >
            <option value="">{p.filters.all}</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{p.statusLabels[s]}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[#5a6e60] uppercase tracking-wide">{p.filters.orderType}</label>
          <select
            value={draft.orderType}
            onChange={e => setDraft(d => ({ ...d, orderType: e.target.value }))}
            className="text-[13px] border border-[#d8e8dc] rounded-md px-3 py-1.5 text-[#1a4a2a] bg-white focus:outline-none focus:border-[#2d6e42]"
          >
            <option value="">{p.filters.all}</option>
            {TYPE_OPTIONS.map(type => (
              <option key={type} value={type}>{p.orderTypeLabels[type]}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[#5a6e60] uppercase tracking-wide">{p.filters.customerEmail}</label>
          <input
            type="text"
            value={draft.customerEmail}
            onChange={e => setDraft(d => ({ ...d, customerEmail: e.target.value }))}
            placeholder="name@example.com"
            className="text-[13px] border border-[#d8e8dc] rounded-md px-3 py-1.5 text-[#1a4a2a] bg-white focus:outline-none focus:border-[#2d6e42] w-52"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[#5a6e60] uppercase tracking-wide">{p.filters.from}</label>
          <input
            type="date"
            value={draft.from}
            onChange={e => setDraft(d => ({ ...d, from: e.target.value }))}
            className="text-[13px] border border-[#d8e8dc] rounded-md px-3 py-1.5 text-[#1a4a2a] bg-white focus:outline-none focus:border-[#2d6e42]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-[#5a6e60] uppercase tracking-wide">{p.filters.to}</label>
          <input
            type="date"
            value={draft.to}
            onChange={e => setDraft(d => ({ ...d, to: e.target.value }))}
            className="text-[13px] border border-[#d8e8dc] rounded-md px-3 py-1.5 text-[#1a4a2a] bg-white focus:outline-none focus:border-[#2d6e42]"
          />
        </div>

        <div className="flex gap-2 pb-0.5">
          <button
            onClick={applyFilters}
            className="px-4 py-1.5 bg-[#2d6e42] text-white text-[13px] font-medium rounded-md hover:bg-[#1a4a2a] transition-colors"
          >
            {p.filters.apply}
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-1.5 border border-[#d8e8dc] text-[#5a6e60] text-[13px] font-medium rounded-md hover:bg-[#f2faf5] transition-colors"
          >
            {p.filters.reset}
          </button>
        </div>
      </div>

      {/* Loading skeletons */}
      {!data && !loadError && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 rounded-md bg-[#d8e8dc] animate-pulse" />
          ))}
        </div>
      )}

      {loadError && (
        <p className="text-[14px] text-[#5a6e60]">{p.error}</p>
      )}

      {deleteError && (
        <p className="text-[13px] text-red-600 mb-4">{deleteError}</p>
      )}

      {deliverError && (
        <p className="text-[13px] text-red-600 mb-4">{deliverError}</p>
      )}

      {reassignError && (
        <p className="text-[13px] text-red-600 mb-4">{reassignError}</p>
      )}

      {data && data.content.length === 0 && (
        <p className="text-[14px] text-[#5a6e60]">{p.empty}</p>
      )}

      {data && data.content.length > 0 && (
        <>
          <div className="bg-white border border-[#d8e8dc] rounded-lg overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#d8e8dc] bg-[#f2faf5]">
                  <th className="text-left px-4 py-3 font-semibold text-[#3a5a44]">{p.columns.id}</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#3a5a44]">{p.columns.placedOn}</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#3a5a44]">{p.columns.customer}</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#3a5a44]">{p.columns.type}</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#3a5a44]">{p.columns.status}</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#3a5a44]">{p.columns.total}</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#3a5a44]">{p.columns.delivery}</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#3a5a44]">{p.columns.driver}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.content.map((order, idx) => {
                  const createdDate = formatDate(order.createdAt, lang)
                  const deliveryInfo = order.orderType === 'PICKUP'
                    ? p.orderTypeLabels.PICKUP
                    : order.deliveryDate
                      ? `${formatDate(order.deliveryDate, lang)}${order.deliverySlot ? ' · ' + (slotLabels[order.deliverySlot] ?? order.deliverySlot) : ''}`
                      : '—'
                  return (
                    <tr key={order.id} className={`border-b border-[#d8e8dc] last:border-0 ${idx % 2 === 1 ? 'bg-[#f9fdfb]' : ''}`}>
                      <td className="px-4 py-3 font-mono text-[12px]">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-[#2d6e42] hover:text-[#1a4a2a] hover:underline underline-offset-2 transition-colors"
                        >
                          {order.displayId}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#5a6e60]">{createdDate}</td>
                      <td className="px-4 py-3 text-[#1a4a2a]">{order.customerEmail}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          order.orderType === 'PICKUP'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-[#e8f5ee] text-[#2d6e42]'
                        }`}>
                          {p.orderTypeLabels[order.orderType]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[order.status]}`}>
                          {p.statusLabels[order.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[#1a4a2a] font-medium">
                        {formatCurrency(Number(order.totalAmount), lang)}
                      </td>
                      <td className="px-4 py-3 text-[#5a6e60]">{deliveryInfo}</td>
                      <td className="px-4 py-3 font-mono text-[12px]">
                        {order.assignedDriverId ? (
                          <button
                            onClick={() => setDriverPanelId(order.assignedDriverId)}
                            className="text-[#2d6e42] hover:text-[#1a4a2a] hover:underline underline-offset-2 transition-colors"
                          >
                            {order.assignedDriverId.slice(0, 8)}…
                          </button>
                        ) : (
                          <span className="text-[#5a6e60]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {order.status === 'DISPATCHED' && (
                            <button
                              onClick={() => setDeliverConfirmId(order.id)}
                              className="text-cyan-600 hover:text-cyan-800 text-[13px] font-medium transition-colors"
                            >
                              {p.markDelivered}
                            </button>
                          )}
                          {order.status === 'DISPATCHED' && (
                            <button
                              onClick={() => openReassignDialog(order.id)}
                              className="text-[#5a6e60] hover:text-[#1a4a2a] text-[13px] font-medium transition-colors"
                            >
                              {p.reassign}
                            </button>
                          )}
                          {SOFT_DELETABLE_STATUSES.includes(order.status) && (
                            <button
                              onClick={() => setConfirmId(order.id)}
                              className="text-red-500 hover:text-red-700 text-[13px] font-medium transition-colors"
                            >
                              {p.deleteOrder}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

        </>
      )}

      {/* Pagination — always visible once data is loaded */}
      {data && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage(n => Math.max(0, n - 1))}
            disabled={page === 0}
            className="px-4 py-1.5 border border-[#d8e8dc] text-[13px] font-medium text-[#5a6e60] rounded-md hover:bg-[#f2faf5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {p.pagination.prev}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[#5a6e60]">
              {page + 1} {p.pagination.of} {data.totalPages || 1}
            </span>
            <select
              value={pageSize}
              onChange={e => handlePageSizeChange(Number(e.target.value))}
              className="text-[13px] border border-[#d8e8dc] rounded-md px-2 py-1 text-[#1a4a2a] bg-white focus:outline-none focus:border-[#2d6e42]"
            >
              {[10, 20, 50].map(s => (
                <option key={s} value={s}>{s} {p.pagination.perPage}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setPage(n => Math.min((data.totalPages || 1) - 1, n + 1))}
            disabled={page >= (data.totalPages || 1) - 1}
            className="px-4 py-1.5 border border-[#d8e8dc] text-[13px] font-medium text-[#5a6e60] rounded-md hover:bg-[#f2faf5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {p.pagination.next}
          </button>
        </div>
      )}
    </main>
      <Footer />
    </div>
    {confirmId && (
        <ConfirmDialog
          message={p.deleteConfirm}
          confirmLabel={p.deleteOrder}
          cancelLabel={p.cancelLabel}
          onConfirm={() => executeDelete(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {deliverConfirmId && (
        <ConfirmDialog
          message={p.markDeliveredConfirm}
          confirmLabel={p.markDelivered}
          cancelLabel={p.cancelLabel}
          onConfirm={() => executeDeliver(deliverConfirmId)}
          onCancel={() => setDeliverConfirmId(null)}
        />
      )}

      <DriverSlideOver driverId={driverPanelId} onClose={() => setDriverPanelId(null)} />

      {reassignId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setReassignId(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl px-6 py-6 max-w-lg w-full mx-4">
            <h3 className="text-[15px] font-semibold text-[#1a4a2a] mb-4">{p.reassignTitle}</h3>

            {/* Driver list */}
            {reassignDriversLoading && (
              <div className="flex flex-col gap-2 mb-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 rounded-md bg-[#d8e8dc] animate-pulse" />
                ))}
              </div>
            )}

            {!reassignDriversLoading && reassignDriversError && (
              <p className="text-[13px] text-red-600 mb-4">{p.reassignLoadError}</p>
            )}

            {!reassignDriversLoading && !reassignDriversError && reassignDrivers.length === 0 && (
              <p className="text-[13px] text-[#5a6e60] mb-4">{p.reassignNoDrivers}</p>
            )}

            {!reassignDriversLoading && reassignDrivers.length > 0 && (
              <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto mb-4 pr-1">
                {reassignDrivers.map(driver => {
                  const selected = reassignDriverInput === driver.id
                  return (
                    <button
                      key={driver.id}
                      type="button"
                      onClick={() => setReassignDriverInput(driver.id)}
                      className={[
                        'w-full text-left px-4 py-3 rounded-lg border transition-colors',
                        selected
                          ? 'border-[#2d6e42] bg-[#f2faf5]'
                          : 'border-[#d8e8dc] bg-white hover:border-[#2d6e42] hover:bg-[#f9fdfb]',
                      ].join(' ')}
                    >
                      <p className="text-[13px] font-semibold text-[#1a4a2a]">{driver.name}</p>
                      <p className="text-[11px] text-[#5a6e60] font-mono mt-0.5">
                        {driver.id.slice(0, 8)}… · {driver.licenseNumber}
                      </p>
                      <p className="text-[11px] text-[#5a6e60]">{driver.email}</p>
                    </button>
                  )
                })}
              </div>
            )}

            {reassignError && (
              <p className="text-[12px] text-red-600 mb-3">{reassignError}</p>
            )}

            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => setReassignId(null)}
                className="px-4 py-2 text-[13px] font-medium text-[#5a6e60] border border-[#d8e8dc] rounded-md hover:bg-[#f2faf5] transition-colors"
              >
                {p.cancelLabel}
              </button>
              <button
                onClick={() => executeReassign(reassignId)}
                disabled={!reassignDriverInput}
                className="px-4 py-2 text-[13px] font-medium text-white bg-[#2d6e42] hover:bg-[#1a4a2a] rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {p.reassignConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
