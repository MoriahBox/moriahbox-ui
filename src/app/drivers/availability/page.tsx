'use client'

import { useState, useEffect, useCallback } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/sections/Footer'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { SLOTS, fetchSlotDefinitions, buildSlotLabels } from '@/lib/slots'
import { formatDate } from '@/lib/format'
import { apiFetch } from '@/lib/api'
import { createClient } from '@/lib/supabase'
import type { DriverAvailability, DriverAvailabilityEntry, DriverSlot } from '@/types/driver'
import type { DeliveryArea } from '@/types/delivery'

interface PanelState {
  date: string
  entries: Set<string>          // "${areaId}:${slot}"
  saving: boolean
  editingDate: string | null
  editingEntries: Set<string>
  editSaving: boolean
  deletingDate: string | null
  schedule: DriverAvailability[] | null
  scheduleLoading: boolean
  feedback: string | null
  feedbackIsError: boolean
}

const defaultPanel = (): PanelState => ({
  date: '',
  entries: new Set(),
  saving: false,
  editingDate: null,
  editingEntries: new Set(),
  editSaving: false,
  deletingDate: null,
  schedule: null,
  scheduleLoading: true,
  feedback: null,
  feedbackIsError: false,
})

function encodeEntry(e: DriverAvailabilityEntry): string {
  return `${e.areaId}:${e.slot}`
}

function decodeEntries(keys: Set<string>): Array<{ areaId: string; slot: string }> {
  return [...keys].map(key => {
    const idx = key.indexOf(':')
    return { areaId: key.slice(0, idx), slot: key.slice(idx + 1) }
  })
}

export default function DriverAvailabilityPage() {
  const { t, lang } = useLanguage()
  const p = t.driverAvailabilityPage
  const a = t.adminDriversPage.availability

  const [driverId, setDriverId] = useState<string | null>(null)
  const [areas, setAreas] = useState<DeliveryArea[]>([])
  const [slotLabels, setSlotLabels] = useState<Record<string, string>>({})
  const [panel, setPanel] = useState<PanelState>(defaultPanel())

  const today = new Date().toISOString().split('T')[0]
  const activeAreas = areas.filter(a => a.active)
  const areaMap = new Map(areas.map(a => [a.id, a.name]))

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      const meta = (session?.user?.app_metadata ?? {}) as Record<string, string>
      setDriverId(meta['driverId'] ?? null)
    })
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}/api/delivery/areas`)
      .then(r => r.ok ? r.json() : [])
      .then((list: DeliveryArea[]) => setAreas(list))
      .catch(() => {})
    fetchSlotDefinitions().then(defs => setSlotLabels(buildSlotLabels(defs))).catch(() => {})
  }, [])

  const fetchSchedule = useCallback(async (id: string) => {
    setPanel(prev => ({ ...prev, scheduleLoading: true, schedule: null }))
    try {
      const res = await apiFetch(`/api/drivers/${id}/availability`)
      const data = res.ok ? await res.json() as DriverAvailability[] : []
      setPanel(prev => ({ ...prev, schedule: data, scheduleLoading: false }))
    } catch {
      setPanel(prev => ({ ...prev, schedule: [], scheduleLoading: false }))
    }
  }, [])

  useEffect(() => {
    if (driverId) fetchSchedule(driverId)
  }, [driverId, fetchSchedule])

  function toggleEntry(key: string) {
    setPanel(prev => {
      const next = new Set(prev.entries)
      next.has(key) ? next.delete(key) : next.add(key)
      return { ...prev, entries: next, feedback: null }
    })
  }

  function toggleEditEntry(key: string) {
    setPanel(prev => {
      const next = new Set(prev.editingEntries)
      next.has(key) ? next.delete(key) : next.add(key)
      return { ...prev, editingEntries: next }
    })
  }

  async function saveNewAvailability() {
    if (!driverId || !panel.date || panel.entries.size === 0) return
    setPanel(prev => ({ ...prev, saving: true, feedback: null }))
    try {
      const res = await apiFetch(`/api/drivers/${driverId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: panel.date, entries: decodeEntries(panel.entries) }),
      })
      if (res.ok) {
        setPanel(prev => ({ ...prev, saving: false, feedback: a.success, feedbackIsError: false, date: '', entries: new Set() }))
        fetchSchedule(driverId)
      } else {
        setPanel(prev => ({ ...prev, saving: false, feedback: a.error, feedbackIsError: true }))
      }
    } catch {
      setPanel(prev => ({ ...prev, saving: false, feedback: a.error, feedbackIsError: true }))
    }
  }

  function startEditing(entry: DriverAvailability) {
    setPanel(prev => ({
      ...prev,
      editingDate: entry.date,
      editingEntries: new Set(entry.entries.map(encodeEntry)),
      feedback: null,
    }))
  }

  function cancelEditing() {
    setPanel(prev => ({ ...prev, editingDate: null, editingEntries: new Set() }))
  }

  async function saveEditedSlots() {
    if (!driverId || panel.editingEntries.size === 0) return
    setPanel(prev => ({ ...prev, editSaving: true, feedback: null }))
    try {
      const res = await apiFetch(`/api/drivers/${driverId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: panel.editingDate, entries: decodeEntries(panel.editingEntries) }),
      })
      if (res.ok) {
        setPanel(prev => ({ ...prev, editSaving: false, editingDate: null, editingEntries: new Set(), feedback: a.updateSuccess, feedbackIsError: false }))
        fetchSchedule(driverId)
      } else {
        setPanel(prev => ({ ...prev, editSaving: false, feedback: a.error, feedbackIsError: true }))
      }
    } catch {
      setPanel(prev => ({ ...prev, editSaving: false, feedback: a.error, feedbackIsError: true }))
    }
  }

  async function removeAvailability(date: string) {
    if (!driverId) return
    setPanel(prev => ({ ...prev, deletingDate: date, feedback: null }))
    try {
      const res = await apiFetch(`/api/drivers/${driverId}/availability/${date}`, { method: 'DELETE' })
      if (res.ok) {
        setPanel(prev => ({ ...prev, deletingDate: null, feedback: a.removeSuccess, feedbackIsError: false }))
        fetchSchedule(driverId)
      } else {
        setPanel(prev => ({ ...prev, deletingDate: null, feedback: a.removeError, feedbackIsError: true }))
      }
    } catch {
      setPanel(prev => ({ ...prev, deletingDate: null, feedback: a.removeError, feedbackIsError: true }))
    }
  }

  function formatScheduleEntries(entries: DriverAvailabilityEntry[]): string {
    const sorted = [...entries].sort(
      (x, y) => SLOTS.indexOf(x.slot as DriverSlot) - SLOTS.indexOf(y.slot as DriverSlot)
    )
    const byArea = new Map<string, string[]>()
    for (const { areaId, slot } of sorted) {
      const name = areaMap.get(areaId) ?? areaId.slice(0, 8) + '…'
      const label = a.slotLabels[slot as DriverSlot] ?? slot
      if (!byArea.has(name)) byArea.set(name, [])
      byArea.get(name)!.push(label)
    }
    return [...byArea.entries()].map(([name, slots]) => `${name}: ${slots.join(', ')}`).join(' · ')
  }

  return (
    <div className="max-w-6xl mx-auto bg-white shadow-2xl min-h-screen">
      <Navbar />
      <main className="px-6 py-16 md:px-12">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block bg-[#1a4a2a] text-white text-[11px] font-medium tracking-[1.5px] uppercase px-3.5 py-1.5 rounded mb-5">
            {p.badge}
          </span>
          <h1 className="font-serif text-2xl md:text-3xl font-black text-[#1a4a2a] mb-10">{p.title}</h1>

          <div className="border border-[#d8e8dc] rounded-md bg-white overflow-hidden">
            <div className="bg-[#f9fdfb] px-5 py-4 flex flex-col gap-5">

              {/* Current schedule */}
              <div>
                <p className="text-[13px] font-semibold text-[#1a4a2a] mb-2">{a.currentTitle}</p>
                {panel.scheduleLoading && (
                  <div className="flex gap-2">
                    {[1, 2].map(i => <div key={i} className="h-8 w-32 rounded bg-[#d8e8dc] animate-pulse" />)}
                  </div>
                )}
                {!panel.scheduleLoading && panel.schedule?.length === 0 && (
                  <p className="text-[12px] text-[#5a6e60]">{a.noSchedule}</p>
                )}
                {!panel.scheduleLoading && panel.schedule && panel.schedule.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {panel.schedule.map(entry => (
                      <li key={entry.id}>
                        {panel.editingDate === entry.date ? (
                          /* Inline edit form */
                          <div className="flex flex-wrap items-start gap-3 bg-white border border-[#2d6e42] rounded-md px-3 py-2">
                            <span className="text-[12px] font-medium text-[#1a4a2a] shrink-0 pt-1">{formatDate(entry.date, lang)}</span>
                            <div className="flex-1 overflow-x-auto">
                              <table className="text-[11px]">
                                <thead>
                                  <tr>
                                    <th className="text-left pr-4 py-0.5 text-[#5a6e60] font-medium">{a.areaLabel}</th>
                                    {SLOTS.map(slot => (
                                      <th key={slot} className="px-2 py-0.5 text-center text-[#5a6e60] font-medium">
                                        {a.slotLabels[slot]}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {activeAreas.map(area => (
                                    <tr key={area.id}>
                                      <td className="pr-4 py-0.5 text-[#1a4a2a] font-medium whitespace-nowrap">{area.name}</td>
                                      {SLOTS.map(slot => {
                                        const key = `${area.id}:${slot}`
                                        return (
                                          <td key={slot} className="px-2 py-0.5 text-center">
                                            <input
                                              type="checkbox"
                                              checked={panel.editingEntries.has(key)}
                                              onChange={() => toggleEditEntry(key)}
                                              className="accent-[#2d6e42]"
                                            />
                                          </td>
                                        )
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="flex gap-2 shrink-0 pt-1">
                              <button
                                onClick={saveEditedSlots}
                                disabled={panel.editSaving || panel.editingEntries.size === 0}
                                className="text-[11px] font-medium bg-[#2d6e42] hover:bg-[#1a4a2a] text-white px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {panel.editSaving ? a.saving : a.save}
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="text-[11px] font-medium border border-[#d8e8dc] text-[#5a6e60] hover:bg-[#f2faf5] px-3 py-1 rounded transition-colors"
                              >
                                {a.cancel}
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Read-only row */
                          <div className="flex items-center gap-2 bg-white border border-[#d8e8dc] rounded-md px-3 py-1.5">
                            <span className="text-[12px] font-medium text-[#1a4a2a] shrink-0">{formatDate(entry.date, lang)}</span>
                            <span className="text-[#d8e8dc]">·</span>
                            <span className="text-[12px] text-[#5a6e60] flex-1">
                              {formatScheduleEntries(entry.entries)}
                            </span>
                            {entry.date >= today && (
                              <button
                                onClick={() => startEditing(entry)}
                                disabled={panel.editingDate !== null || panel.deletingDate === entry.date}
                                title={a.editSlots}
                                className="p-1 text-[#5a6e60] hover:text-[#2d6e42] disabled:opacity-40 transition-colors"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => removeAvailability(entry.date)}
                              disabled={panel.deletingDate === entry.date || panel.editingDate === entry.date}
                              title={a.remove}
                              className="p-1 text-[#5a6e60] hover:text-red-600 disabled:opacity-40 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {panel.feedback && (
                  <p className={`mt-2 text-[12px] ${panel.feedbackIsError ? 'text-red-600' : 'text-[#2d6e42]'}`}>
                    {panel.feedback}
                  </p>
                )}
              </div>

              {/* Add new availability form */}
              <div className="border-t border-[#d8e8dc] pt-4">
                <p className="text-[13px] font-semibold text-[#1a4a2a] mb-3">{a.title}</p>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[#3a5a44] mb-1">{a.dateLabel}</label>
                    <input
                      type="date"
                      min={today}
                      value={panel.date}
                      onChange={e => setPanel(prev => ({ ...prev, date: e.target.value, feedback: null }))}
                      className="border border-[#d8e8dc] rounded-md px-3 py-2 text-[13px] text-[#1a4a2a] focus:outline-none focus:ring-2 focus:ring-[#2d6e42]"
                    />
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-[#3a5a44] mb-2">{a.slotsLabel}</p>
                    {activeAreas.length === 0 ? (
                      <p className="text-[12px] text-[#5a6e60]">{a.noAreas}</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="text-[12px]">
                          <thead>
                            <tr>
                              <th className="text-left pr-6 py-1 text-[#5a6e60] font-medium">{a.areaLabel}</th>
                              {SLOTS.map(slot => (
                                <th key={slot} className="px-3 py-1 text-center text-[#5a6e60] font-medium whitespace-nowrap">
                                  {a.slotLabels[slot]}
                                  <span className="block font-normal text-[#8a9e90] text-[10px]">{slotLabels[slot] ?? slot}</span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {activeAreas.map(area => (
                              <tr key={area.id}>
                                <td className="pr-6 py-1 text-[#1a4a2a] font-medium whitespace-nowrap">{area.name}</td>
                                {SLOTS.map(slot => {
                                  const key = `${area.id}:${slot}`
                                  return (
                                    <td key={slot} className="px-3 py-1 text-center">
                                      <input
                                        type="checkbox"
                                        checked={panel.entries.has(key)}
                                        onChange={() => toggleEntry(key)}
                                        className="accent-[#2d6e42]"
                                      />
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <div>
                    <button
                      onClick={saveNewAvailability}
                      disabled={panel.saving || !panel.date || panel.entries.size === 0}
                      className="bg-[#2d6e42] hover:bg-[#1a4a2a] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-medium px-5 py-2 rounded-md transition-colors"
                    >
                      {panel.saving ? a.saving : a.save}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
