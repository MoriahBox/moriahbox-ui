'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/sections/Footer'
import { DeliveryAreaEditDialog } from '@/components/delivery/DeliveryAreaEditDialog'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/features/auth/AuthContext'
import type { DeliveryArea } from '@/types/delivery'

type Tab = 'all' | 'active' | 'inactive'

export default function DeliveryPage() {
  const { t } = useLanguage()
  const { deliveryPage } = t

  const [areas, setAreas] = useState<DeliveryArea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<Tab>('all')
  const [modal, setModal] = useState<DeliveryArea | 'new' | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const { isAdmin } = useAuth()

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}/api/delivery/areas`)
      .then(async r => {
        if (!r.ok) throw new Error()
        setAreas(await r.json() as DeliveryArea[])
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const filtered = areas.filter(a =>
    tab === 'all' ? true : tab === 'active' ? a.active : !a.active
  )

  function handleSaved(saved: DeliveryArea) {
    setAreas(prev => {
      const idx = prev.findIndex(a => a.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name))
    })
  }

  async function handleToggleActive(area: DeliveryArea) {
    setTogglingId(area.id)
    try {
      const res = await apiFetch(`/api/delivery/areas/${area.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !area.active }),
      })
      if (res.ok) handleSaved(await res.json() as DeliveryArea)
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(id: string) {
    await apiFetch(`/api/delivery/areas/${id}`, { method: 'DELETE' })
    setAreas(prev => prev.filter(a => a.id !== id))
    setConfirmDeleteId(null)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: deliveryPage.tabs.all },
    { key: 'active', label: deliveryPage.tabs.active },
    { key: 'inactive', label: deliveryPage.tabs.inactive },
  ]

  return (
    <div className="max-w-6xl mx-auto bg-white shadow-2xl min-h-screen">
      <Navbar />

      <main className="px-6 py-16 md:px-12">
        <div className="max-w-4xl mx-auto">

          <div className="flex items-center justify-between mb-8">
            <h1 className="font-serif text-2xl md:text-3xl font-black text-[#1a4a2a]">
              {deliveryPage.title}
            </h1>
            {isAdmin && (
              <button
                onClick={() => setModal('new')}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium bg-[#2d6e42] text-white px-4 py-2 rounded hover:bg-[#1a4a2a] transition-colors"
              >
                <Plus size={14} /> {deliveryPage.newArea}
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 mb-6 border-b border-[#d8e8dc]">
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

          {error && (
            <p className="text-[#5a6e60] text-[14px]">{deliveryPage.error}</p>
          )}

          {loading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 rounded-lg bg-[#e8f0ea] animate-pulse" />
              ))}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <p className="text-[#5a6e60] text-[14px]">{deliveryPage.empty}</p>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filtered.map(area => (
                <div
                  key={area.id}
                  className="border border-[#d8e8dc] rounded-lg p-4 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[14px] font-semibold text-[#1a4a2a]">{area.name}</p>
                      <p className="text-[12px] text-[#5a6e60] mt-0.5">{area.postalCode}</p>
                    </div>
                    <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded ${
                      area.active
                        ? 'bg-[#e8f5ee] text-[#2d6e42]'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {area.active ? deliveryPage.statusActive : deliveryPage.statusInactive}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1 mt-1">
                      <button
                        onClick={() => setModal(area)}
                        className="p-1.5 rounded text-[#5a6e60] hover:text-[#2d6e42] hover:bg-[#e8f5ee] transition-colors"
                        aria-label="Edit area"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        onClick={() => handleToggleActive(area)}
                        disabled={togglingId === area.id}
                        title={area.active ? deliveryPage.deactivate : deliveryPage.activate}
                        aria-label={area.active ? deliveryPage.deactivate : deliveryPage.activate}
                        className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
                          area.active
                            ? 'text-[#2d6e42] hover:text-[#5a6e60] hover:bg-[#f2faf5]'
                            : 'text-[#5a6e60] hover:text-[#2d6e42] hover:bg-[#e8f5ee]'
                        }`}
                      >
                        {area.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      </button>

                      {confirmDeleteId === area.id ? (
                        <span className="flex items-center gap-1.5 text-[12px] text-[#5a6e60] ml-1">
                          {deliveryPage.confirmDelete}
                          <button
                            onClick={() => handleDelete(area.id)}
                            className="font-medium text-red-600 hover:underline"
                          >
                            {deliveryPage.confirmYes}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="font-medium hover:underline"
                          >
                            {deliveryPage.confirmNo}
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(area.id)}
                          className="p-1.5 rounded text-[#5a6e60] hover:text-red-500 hover:bg-red-50 transition-colors"
                          aria-label="Delete area"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {isAdmin && (
        <DeliveryAreaEditDialog
          mode={modal}
          onClose={() => setModal(null)}
          onSaved={area => { handleSaved(area); setModal(null) }}
        />
      )}

      <Footer />
    </div>
  )
}
