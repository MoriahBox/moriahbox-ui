'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { DeliveryArea } from '@/types/delivery'

const API_BASE = () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export function DeliveryAreas() {
  const { t } = useLanguage()
  const { deliveryAreas } = t

  const [areas, setAreas] = useState<DeliveryArea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE()}/api/delivery/areas?active=true`)
      .then(async r => {
        if (!r.ok) return
        setAreas(await r.json() as DeliveryArea[])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="bg-[#e8f4ed] border-b border-[#d8e8dc] py-16 md:py-20">
      <div className="max-w-5xl mx-auto px-6 md:px-8">

        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-black text-[#1a4a2a] whitespace-nowrap">
            {deliveryAreas.title}
          </h2>
          {!loading && areas.length > 0 && (
            <p className="text-[14px] text-[#5a6e60] mt-2">
              {deliveryAreas.activeZones(areas.length)}
            </p>
          )}
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 rounded-lg bg-[#d8ead1] animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && areas.length === 0 && (
          <p className="text-[14px] text-[#5a6e60] text-center">{deliveryAreas.noAreas}</p>
        )}

        {/* Area cards */}
        {!loading && areas.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {areas.map(area => (
              <div
                key={area.id}
                className="flex items-center gap-2 border border-[#d8e8dc] bg-white rounded-lg px-4 py-3"
              >
                <MapPin size={14} className="shrink-0 text-[#2d6e42]" />
                <div>
                  <p className="text-[13px] font-semibold text-[#1a4a2a] leading-tight">{area.name}</p>
                  <p className="text-[11px] text-[#5a6e60]">{area.postalCode}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/delivery"
            className="text-[13px] font-medium text-[#2d6e42] hover:text-[#1a4a2a] transition-colors"
          >
            {deliveryAreas.viewAll}
          </Link>
        </div>

      </div>
    </section>
  )
}
