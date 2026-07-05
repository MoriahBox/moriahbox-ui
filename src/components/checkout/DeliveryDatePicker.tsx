'use client'

import type { DriverSlot, DriverAvailabilityEntry } from '@/types/driver'
import { SLOTS } from '@/lib/slots'
import { getLocale } from '@/lib/format'
import type { Lang } from '@/lib/format'

export interface AvailableSlot {
  areaId: string
  date: string
  entries: DriverAvailabilityEntry[]
}

interface Props {
  availableSlots: AvailableSlot[] | null  // null = loading
  slotLabels: Record<string, string> | null
  selectedDate: string | null
  selectedSlot: DriverSlot | null
  onSelectDate: (date: string) => void
  onSelectSlot: (slot: DriverSlot) => void
  translations: { chooseDate: string; chooseTime: string; noSlotsAvailable: string }
  lang: Lang
}

export function DeliveryDatePicker({
  availableSlots,
  slotLabels,
  selectedDate,
  selectedSlot,
  onSelectDate,
  onSelectSlot,
  translations: t,
  lang,
}: Props) {
  if (availableSlots === null) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-12 w-14 rounded-md bg-[#d8e8dc] animate-pulse" />
        ))}
      </div>
    )
  }

  if (availableSlots.length === 0) {
    return <p className="text-[13px] text-[#5a6e60]">{t.noSlotsAvailable}</p>
  }

  const slotsForSelectedDate: DriverSlot[] = [...new Set(
    (availableSlots.find(s => s.date === selectedDate)?.entries ?? []).map(e => e.slot)
  )].sort((a, b) => SLOTS.indexOf(a) - SLOTS.indexOf(b))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[12px] font-medium text-[#3a5a44] mb-2">{t.chooseDate}</p>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-1.5 w-max">
            {availableSlots.map(({ date }) => {
              const d = new Date(date + 'T12:00:00')
              const locale = getLocale(lang)
              const weekday = d.toLocaleDateString(locale, { weekday: 'short' })
              const dayMonth = d.toLocaleDateString(locale, { day: 'numeric', month: 'numeric' })
              const selected = date === selectedDate
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => onSelectDate(date)}
                  className={[
                    'flex flex-col items-center py-2 px-3 rounded-md border text-[11px] transition-colors',
                    selected
                      ? 'border-[#2d6e42] bg-[#2d6e42] text-white'
                      : 'border-[#d8e8dc] bg-white text-[#1a4a2a] hover:border-[#2d6e42]',
                  ].join(' ')}
                >
                  <span className="font-medium">{weekday}</span>
                  <span>{dayMonth}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {selectedDate && (
        <div>
          <p className="text-[12px] font-medium text-[#3a5a44] mb-2">{t.chooseTime}</p>
          <div className="flex flex-wrap gap-2">
            {slotsForSelectedDate.map(slot => (
              <button
                key={slot}
                type="button"
                onClick={() => onSelectSlot(slot)}
                className={[
                  'px-4 py-2 rounded-full border text-[13px] font-medium transition-colors',
                  selectedSlot === slot
                    ? 'border-[#2d6e42] bg-[#2d6e42] text-white'
                    : 'border-[#d8e8dc] bg-white text-[#1a4a2a] hover:border-[#2d6e42]',
                ].join(' ')}
              >
                {slotLabels?.[slot] ?? slot}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
