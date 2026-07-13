'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { formatDate } from '@/lib/format'
import { apiFetch } from '@/lib/api'
import type { Driver, DriverStatus } from '@/types/driver'

const STATUS_COLORS: Record<DriverStatus, string> = {
  PENDING:   'bg-amber-100 text-amber-700',
  APPROVED:  'bg-emerald-100 text-emerald-700',
  SUSPENDED: 'bg-orange-100 text-orange-700',
  REJECTED:  'bg-red-100 text-red-700',
}

interface Props {
  driverId: string | null
  onClose: () => void
}

export function DriverSlideOver({ driverId, onClose }: Props) {
  const { t, lang } = useLanguage()
  const d = t.adminOrdersPage.driverPanel
  const statusLabels = t.adminDriversPage.statusLabels

  const [driver, setDriver] = useState<Driver | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!driverId) { setDriver(null); return }
    setLoading(true)
    setError(false)
    setDriver(null)
    apiFetch(`/api/drivers/${driverId}`)
      .then(async r => {
        if (!r.ok) throw new Error()
        setDriver(await r.json() as Driver)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [driverId])

  const open = driverId !== null

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 z-50 h-full w-80 bg-white shadow-2xl transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#d8e8dc]">
          <h2 className="text-[15px] font-semibold text-[#1a4a2a]">{d.title}</h2>
          <button onClick={onClose} className="text-[#5a6e60] hover:text-[#1a4a2a] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5 overflow-y-auto h-[calc(100%-61px)]">
          {loading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 rounded-md bg-[#e8f0ea] animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <p className="text-[13px] text-[#5a6e60]">{d.loadError}</p>
          )}

          {driver && (
            <div className="flex flex-col gap-5">
              <Row label={d.name} value={driver.name} large />
              <Row label={d.email} value={driver.email} />
              <Row label={d.phone} value={driver.phone} />
              <Row label={d.license} value={driver.licenseNumber} mono />
              <div>
                <p className="text-[11px] font-medium text-[#5a6e60] uppercase tracking-wide mb-1.5">{d.status}</p>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[driver.status]}`}>
                  {statusLabels[driver.status]}
                </span>
              </div>
              {driver.approvedAt && (
                <Row
                  label={d.approvedAt}
                  value={formatDate(driver.approvedAt, lang)}
                />
              )}
              <div className="pt-3 border-t border-[#d8e8dc]">
                <a
                  href="/admin/drivers"
                  className="text-[13px] font-medium text-[#2d6e42] hover:text-[#1a4a2a] transition-colors"
                >
                  {d.viewProfile} →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function Row({ label, value, large, mono }: { label: string; value: string; large?: boolean; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-[#5a6e60] uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`${large ? 'text-[15px] font-semibold' : 'text-[13px]'} ${mono ? 'font-mono' : ''} text-[#1a4a2a]`}>
        {value}
      </p>
    </div>
  )
}
