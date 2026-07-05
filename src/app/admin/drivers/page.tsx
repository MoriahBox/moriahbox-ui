'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/sections/Footer'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { SLOTS, fetchSlotDefinitions, buildSlotLabels } from '@/lib/slots'
import { formatDate } from '@/lib/format'
import { apiFetch } from '@/lib/api'
import type { Driver, DriverStatus, DriverSlot, DriverAvailability, DriverAvailabilityEntry } from '@/types/driver'
import type { DeliveryArea } from '@/types/delivery'

const statusColors: Record<DriverStatus, string> = {
  PENDING:   'bg-amber-100 text-amber-700',
  APPROVED:  'bg-[#e8f5ee] text-[#2d6e42]',
  SUSPENDED: 'bg-orange-100 text-orange-700',
  REJECTED:  'bg-red-100 text-red-600',
}

interface AvailabilityPanelState {
  date: string
  entries: Set<string>        // "${areaId}:${slot}"
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

const defaultPanel = (): AvailabilityPanelState => ({
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

export default function AdminDriversPage() {
  const { t, lang } = useLanguage()
  const p = t.adminDriversPage

  const [drivers, setDrivers] = useState<Driver[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [areas, setAreas] = useState<DeliveryArea[]>([])
  const [slotLabels, setSlotLabels] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [availabilityPanel, setAvailabilityPanel] = useState<string | null>(null)
  const [panel, setPanel] = useState<AvailabilityPanelState>(defaultPanel())
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch(`/api/drivers?size=50&sort=name,asc`)
      .then(async r => {
        if (!r.ok) throw new Error()
        const page = await r.json() as { content: Driver[] }
        setDrivers(page.content)
      })
      .catch(() => setLoadError(true))
    apiFetch(`/api/delivery/areas`)
      .then(async r => { if (r.ok) setAreas(await r.json() as DeliveryArea[]) })
      .catch(() => {})
    fetchSlotDefinitions().then(defs => setSlotLabels(buildSlotLabels(defs))).catch(() => {})
  }, [])

  const fetchSchedule = useCallback(async (driverId: string) => {
    setPanel(prev => ({ ...prev, scheduleLoading: true, schedule: null }))
    try {
      const res = await apiFetch(`/api/drivers/${driverId}/availability`)
      const data = res.ok ? await res.json() as DriverAvailability[] : []
      setPanel(prev => ({ ...prev, schedule: data, scheduleLoading: false }))
    } catch {
      setPanel(prev => ({ ...prev, schedule: [], scheduleLoading: false }))
    }
  }, [])

  function updateDriverInList(updated: Driver) {
    setDrivers(prev => prev?.map(d => d.id === updated.id ? updated : d) ?? null)
  }

  async function deleteDriver(driverId: string) {
    setDeleteError(null)
    setActionLoading(driverId + ':delete')
    try {
      const res = await apiFetch(`/api/drivers/${driverId}`, { method: 'DELETE' })
      if (res.status === 204) {
        setDrivers(prev => prev?.filter(d => d.id !== driverId) ?? null)
        setDeleteConfirmId(null)
      } else if (res.status === 409) {
        setDeleteError(p.deleteConflict)
        setDeleteConfirmId(null)
      } else {
        setDeleteError(p.deleteError)
        setDeleteConfirmId(null)
      }
    } catch {
      setDeleteError(p.deleteError)
      setDeleteConfirmId(null)
    } finally {
      setActionLoading(null)
    }
  }

  async function doAction(driverId: string, action: 'approve' | 'reject' | 'suspend') {
    setActionLoading(driverId + ':' + action)
    try {
      const res = await apiFetch(`/api/drivers/${driverId}/${action}`, { method: 'POST' })
      if (res.ok) {
        updateDriverInList(await res.json() as Driver)
        if (availabilityPanel === driverId) setAvailabilityPanel(null)
      }
    } finally {
      setActionLoading(null)
    }
  }

  function openAvailabilityPanel(driverId: string) {
    if (availabilityPanel === driverId) {
      setAvailabilityPanel(null)
    } else {
      setAvailabilityPanel(driverId)
      setPanel(defaultPanel())
      fetchSchedule(driverId)
    }
  }

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

  async function saveNewAvailability(driverId: string) {
    if (!panel.date || panel.entries.size === 0) return
    setPanel(prev => ({ ...prev, saving: true, feedback: null }))
    try {
      const res = await apiFetch(`/api/drivers/${driverId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: panel.date, entries: decodeEntries(panel.entries) }),
      })
      if (res.ok) {
        setPanel(prev => ({ ...prev, saving: false, feedback: p.availability.success, feedbackIsError: false, date: '', entries: new Set() }))
        fetchSchedule(driverId)
      } else {
        setPanel(prev => ({ ...prev, saving: false, feedback: p.availability.error, feedbackIsError: true }))
      }
    } catch {
      setPanel(prev => ({ ...prev, saving: false, feedback: p.availability.error, feedbackIsError: true }))
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

  async function saveEditedSlots(driverId: string) {
    if (panel.editingEntries.size === 0) return
    setPanel(prev => ({ ...prev, editSaving: true, feedback: null }))
    try {
      const res = await apiFetch(`/api/drivers/${driverId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: panel.editingDate, entries: decodeEntries(panel.editingEntries) }),
      })
      if (res.ok) {
        setPanel(prev => ({ ...prev, editSaving: false, editingDate: null, editingEntries: new Set(), feedback: p.availability.updateSuccess, feedbackIsError: false }))
        fetchSchedule(driverId)
      } else {
        setPanel(prev => ({ ...prev, editSaving: false, feedback: p.availability.error, feedbackIsError: true }))
      }
    } catch {
      setPanel(prev => ({ ...prev, editSaving: false, feedback: p.availability.error, feedbackIsError: true }))
    }
  }

  async function removeAvailability(driverId: string, date: string) {
    setPanel(prev => ({ ...prev, deletingDate: date, feedback: null }))
    try {
      const res = await apiFetch(`/api/drivers/${driverId}/availability/${date}`, { method: 'DELETE' })
      if (res.ok) {
        setPanel(prev => ({ ...prev, deletingDate: null, feedback: p.availability.removeSuccess, feedbackIsError: false }))
        fetchSchedule(driverId)
      } else {
        setPanel(prev => ({ ...prev, deletingDate: null, feedback: p.availability.removeError, feedbackIsError: true }))
      }
    } catch {
      setPanel(prev => ({ ...prev, deletingDate: null, feedback: p.availability.removeError, feedbackIsError: true }))
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const activeAreas = areas.filter(a => a.active)
  const areaMap = new Map(areas.map(a => [a.id, a.name]))

  function formatScheduleEntries(entries: DriverAvailabilityEntry[]): string {
    const sorted = [...entries].sort(
      (a, b) => SLOTS.indexOf(a.slot as DriverSlot) - SLOTS.indexOf(b.slot as DriverSlot)
    )
    const byArea = new Map<string, string[]>()
    for (const { areaId, slot } of sorted) {
      const name = areaMap.get(areaId) ?? areaId.slice(0, 8) + '…'
      const label = p.availability.slotLabels[slot as DriverSlot] ?? slot
      if (!byArea.has(name)) byArea.set(name, [])
      byArea.get(name)!.push(label)
    }
    return [...byArea.entries()].map(([name, slots]) => `${name}: ${slots.join(', ')}`).join(' · ')
  }

  return (
    <div className="max-w-6xl mx-auto bg-white shadow-2xl min-h-screen">
      <Navbar />
      <main className="px-6 py-16 md:px-12">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block bg-[#1a4a2a] text-white text-[11px] font-medium tracking-[1.5px] uppercase px-3.5 py-1.5 rounded mb-5">
            {p.badge}
          </span>
          <h1 className="font-serif text-2xl md:text-3xl font-black text-[#1a4a2a] mb-10">
            {p.title}
          </h1>

          {!drivers && !loadError && (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-md bg-[#d8e8dc] animate-pulse" />)}
            </div>
          )}
          {loadError && <p className="text-[14px] text-[#5a6e60]">{p.error}</p>}
          {drivers && drivers.length === 0 && <p className="text-[14px] text-[#5a6e60]">{p.empty}</p>}
          {deleteError && <p className="text-[13px] text-red-600 mb-4">{deleteError}</p>}

          {drivers && drivers.length > 0 && (
            <ul className="flex flex-col gap-4">
              {drivers.map(driver => {
                const panelOpen = availabilityPanel === driver.id
                const isActing = (action: string) => actionLoading === driver.id + ':' + action

                return (
                  <li key={driver.id} className="border border-[#d8e8dc] rounded-md bg-white overflow-hidden">
                    {/* Driver header row */}
                    <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                          <p className="text-[15px] font-semibold text-[#1a4a2a]">{driver.name}</p>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColors[driver.status]}`}>
                            {p.statusLabels[driver.status]}
                          </span>
                        </div>
                        <p className="text-[13px] text-[#5a6e60]">{driver.email}</p>
                        <p className="text-[13px] text-[#5a6e60]">{driver.phone} · {driver.licenseNumber}</p>
                      </div>

                      <div className="flex flex-wrap gap-2 shrink-0">
                        {driver.status === 'PENDING' && (
                          <>
                            <ActionButton label={p.actions.approve} loading={isActing('approve')} onClick={() => doAction(driver.id, 'approve')} variant="green" />
                            <ActionButton label={p.actions.reject}  loading={isActing('reject')}  onClick={() => doAction(driver.id, 'reject')}  variant="red" />
                          </>
                        )}
                        {driver.status === 'APPROVED' && (
                          <>
                            <ActionButton label={p.actions.suspend}         loading={isActing('suspend')} onClick={() => doAction(driver.id, 'suspend')}          variant="orange" />
                            <ActionButton label={p.actions.setAvailability} loading={false}               onClick={() => openAvailabilityPanel(driver.id)} variant={panelOpen ? 'active' : 'outline'} />
                            <Link
                              href={`/drivers/${driver.id}`}
                              className="text-[12px] font-medium px-3.5 py-1.5 rounded-md border border-[#d8e8dc] text-[#5a6e60] hover:bg-[#f2faf5] hover:text-[#1a4a2a] transition-colors"
                            >
                              {p.actions.dashboard}
                            </Link>
                          </>
                        )}
                        {(driver.status === 'SUSPENDED' || driver.status === 'REJECTED') && (
                          <>
                            <ActionButton label={p.actions.approve} loading={isActing('approve')} onClick={() => doAction(driver.id, 'approve')} variant="green" />
                            {deleteConfirmId === driver.id ? (
                              <>
                                <ActionButton label={p.actions.confirmDelete} loading={isActing('delete')} onClick={() => deleteDriver(driver.id)} variant="red" />
                                <ActionButton label={p.actions.cancelDelete}  loading={false}              onClick={() => { setDeleteConfirmId(null); setDeleteError(null) }} variant="outline" />
                              </>
                            ) : (
                              <ActionButton label={p.actions.delete} loading={false} onClick={() => { setDeleteConfirmId(driver.id); setDeleteError(null) }} variant="red" />
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Availability panel */}
                    {panelOpen && (
                      <div className="border-t border-[#d8e8dc] bg-[#f9fdfb] px-5 py-4 flex flex-col gap-5">

                        {/* Current schedule */}
                        <div>
                          <p className="text-[13px] font-semibold text-[#1a4a2a] mb-2">{p.availability.currentTitle}</p>
                          {panel.scheduleLoading && (
                            <div className="flex gap-2">
                              {[1, 2].map(i => <div key={i} className="h-8 w-32 rounded bg-[#d8e8dc] animate-pulse" />)}
                            </div>
                          )}
                          {!panel.scheduleLoading && panel.schedule?.length === 0 && (
                            <p className="text-[12px] text-[#5a6e60]">{p.availability.noSchedule}</p>
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
                                              <th className="text-left pr-4 py-0.5 text-[#5a6e60] font-medium">{p.availability.areaLabel}</th>
                                              {SLOTS.map(slot => (
                                                <th key={slot} className="px-2 py-0.5 text-center text-[#5a6e60] font-medium">
                                                  {p.availability.slotLabels[slot]}
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
                                          onClick={() => saveEditedSlots(driver.id)}
                                          disabled={panel.editSaving || panel.editingEntries.size === 0}
                                          className="text-[11px] font-medium bg-[#2d6e42] hover:bg-[#1a4a2a] text-white px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                          {panel.editSaving ? p.availability.saving : p.availability.save}
                                        </button>
                                        <button
                                          onClick={cancelEditing}
                                          className="text-[11px] font-medium border border-[#d8e8dc] text-[#5a6e60] hover:bg-[#f2faf5] px-3 py-1 rounded transition-colors"
                                        >
                                          {p.availability.cancel}
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
                                          title={p.availability.editSlots}
                                          className="p-1 text-[#5a6e60] hover:text-[#2d6e42] disabled:opacity-40 transition-colors"
                                        >
                                          <Pencil size={13} />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => removeAvailability(driver.id, entry.date)}
                                        disabled={panel.deletingDate === entry.date || panel.editingDate === entry.date}
                                        title={p.availability.remove}
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
                          <p className="text-[13px] font-semibold text-[#1a4a2a] mb-3">{p.availability.title}</p>
                          <div className="flex flex-col gap-4">
                            <div>
                              <label className="block text-[12px] font-medium text-[#3a5a44] mb-1">
                                {p.availability.dateLabel}
                              </label>
                              <input
                                type="date"
                                min={today}
                                value={panel.date}
                                onChange={e => setPanel(prev => ({ ...prev, date: e.target.value, feedback: null }))}
                                className="border border-[#d8e8dc] rounded-md px-3 py-2 text-[13px] text-[#1a4a2a] focus:outline-none focus:ring-2 focus:ring-[#2d6e42]"
                              />
                            </div>
                            <div>
                              <p className="text-[12px] font-medium text-[#3a5a44] mb-2">{p.availability.slotsLabel}</p>
                              {activeAreas.length === 0 ? (
                                <p className="text-[12px] text-[#5a6e60]">{p.availability.noAreas}</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="text-[12px]">
                                    <thead>
                                      <tr>
                                        <th className="text-left pr-6 py-1 text-[#5a6e60] font-medium">{p.availability.areaLabel}</th>
                                        {SLOTS.map(slot => (
                                          <th key={slot} className="px-3 py-1 text-center text-[#5a6e60] font-medium whitespace-nowrap">
                                            {p.availability.slotLabels[slot]}
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
                                onClick={() => saveNewAvailability(driver.id)}
                                disabled={panel.saving || !panel.date || panel.entries.size === 0}
                                className="bg-[#2d6e42] hover:bg-[#1a4a2a] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-medium px-5 py-2 rounded-md transition-colors"
                              >
                                {panel.saving ? p.availability.saving : p.availability.save}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

function ActionButton({
  label, loading, onClick, variant,
}: {
  label: string
  loading: boolean
  onClick: () => void
  variant: 'green' | 'red' | 'orange' | 'outline' | 'active'
}) {
  const base = 'text-[12px] font-medium px-3.5 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const styles: Record<string, string> = {
    green:   'bg-[#2d6e42] hover:bg-[#1a4a2a] text-white',
    red:     'bg-red-600 hover:bg-red-700 text-white',
    orange:  'bg-orange-500 hover:bg-orange-600 text-white',
    outline: 'border border-[#d8e8dc] text-[#5a6e60] hover:bg-[#f2faf5] hover:text-[#1a4a2a]',
    active:  'border border-[#2d6e42] text-[#2d6e42] bg-[#f2faf5]',
  }
  return (
    <button disabled={loading} onClick={onClick} className={`${base} ${styles[variant]}`}>
      {label}
    </button>
  )
}
