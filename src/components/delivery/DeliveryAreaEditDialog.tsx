'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { DeliveryArea, DeliveryFee } from '@/types/delivery'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { apiFetch } from '@/lib/api'

const SLOTS = ['MORNING', 'AFTERNOON', 'EVENING'] as const
type Slot = typeof SLOTS[number]


type FormState = {
  name: string
  postalCode: string
  active: boolean
}

type FeeInputs = Record<Slot, string>

function emptyForm(): FormState {
  return { name: '', postalCode: '', active: true }
}

function emptyFees(): FeeInputs {
  return { MORNING: '', AFTERNOON: '', EVENING: '' }
}

function areaToForm(area: DeliveryArea): FormState {
  return { name: area.name, postalCode: area.postalCode, active: area.active }
}

interface Props {
  mode: DeliveryArea | 'new' | null
  onClose: () => void
  onSaved: (area: DeliveryArea) => void
}

export function DeliveryAreaEditDialog({ mode, onClose, onSaved }: Props) {
  const { t } = useLanguage()
  const p = t.deliveryPage
  const d = p.dialog
  const slotLabels = t.adminDriversPage.availability.slotLabels

  const [form, setForm] = useState<FormState>(emptyForm())
  const [feeInputs, setFeeInputs] = useState<FeeInputs>(emptyFees())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (mode === null) return
    if (mode === 'new') {
      setForm(emptyForm())
      setFeeInputs(emptyFees())
      setFormError(null)
      return
    }
    setForm(areaToForm(mode))
    setFormError(null)
    if (mode.active) {
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
      fetch(`${base}/api/delivery/areas/${mode.id}/fees`)
        .then(r => r.ok ? r.json() : [])
        .then((fees: DeliveryFee[]) => {
          const inputs = emptyFees()
          fees.forEach(f => { inputs[f.slot] = String(f.amount) })
          setFeeInputs(inputs)
        })
        .catch(() => setFeeInputs(emptyFees()))
    } else {
      setFeeInputs(emptyFees())
    }
  }, [mode])

  if (mode === null) return null

  async function saveFees(areaId: string) {
    await Promise.all(
      SLOTS.map(slot => {
        const raw = feeInputs[slot].trim()
        if (raw === '') {
          return apiFetch(`/api/delivery/areas/${areaId}/fees/${slot}`, { method: 'DELETE' })
        }
        return apiFetch(`/api/delivery/areas/${areaId}/fees/${slot}`, {
          method: 'PUT',
          body: JSON.stringify({ amount: parseFloat(raw) }),
        })
      })
    )
  }

  async function handleSave() {
    const currentMode = mode
    if (!currentMode) return

    const trimmedName = form.name.trim()
    const trimmedPostalCode = form.postalCode.trim()
    if (!trimmedName) { setFormError(d.errorName); return }
    if (!trimmedPostalCode) { setFormError(d.errorPostalCode); return }

    setSaving(true)
    setFormError(null)
    try {
      let savedArea: DeliveryArea
      if (currentMode === 'new') {
        const res = await apiFetch('/api/delivery/areas', {
          method: 'POST',
          body: JSON.stringify({ name: trimmedName, postalCode: trimmedPostalCode, active: form.active }),
        })
        if (!res.ok) throw new Error()
        savedArea = await res.json() as DeliveryArea
      } else {
        const res = await apiFetch(`/api/delivery/areas/${currentMode.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: trimmedName, postalCode: trimmedPostalCode, active: form.active }),
        })
        if (!res.ok) throw new Error()
        savedArea = await res.json() as DeliveryArea
      }

      if (form.active) {
        await saveFees(savedArea.id)
      }

      onSaved(savedArea)
      onClose()
    } catch {
      setFormError(d.errorGeneric)
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full border border-[#d8e8dc] rounded-md px-3 py-2 text-[14px] text-[#1a4a2a] focus:outline-none focus:border-[#2d6e42]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">

        <div className="flex items-center justify-between px-6 py-4 border-b border-[#d8e8dc]">
          <h2 className="text-[16px] font-semibold text-[#1a4a2a]">
            {mode === 'new' ? d.titleNew : d.titleEdit}
          </h2>
          <button onClick={onClose} className="text-[#5a6e60] hover:text-[#1a4a2a] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-[12px] font-medium text-[#5a6e60] mb-1">{p.fields.name} *</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={d.namePlaceholder}
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#5a6e60] mb-1">{p.fields.postalCode} *</label>
            <input
              className={inputClass}
              value={form.postalCode}
              onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))}
              placeholder={d.postalCodePlaceholder}
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              className="w-4 h-4 accent-[#2d6e42]"
            />
            <span className="text-[13px] font-medium text-[#1a4a2a]">{d.activeLabel}</span>
          </label>

          {form.active && (
            <div className="pt-2 border-t border-[#e8f2ec]">
              <p className="text-[12px] font-medium text-[#5a6e60] mb-3">{p.feesTitle}</p>
              <div className="flex flex-col gap-2">
                {SLOTS.map(slot => (
                  <div key={slot} className="flex items-center gap-3">
                    <span className="text-[13px] text-[#3a5a44] w-24">{slotLabels[slot]}</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#5a6e60]">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={p.noFee}
                        value={feeInputs[slot]}
                        onChange={e => setFeeInputs(prev => ({ ...prev, [slot]: e.target.value }))}
                        className="w-full border border-[#d8e8dc] rounded-md pl-7 pr-3 py-2 text-[14px] text-[#1a4a2a] focus:outline-none focus:border-[#2d6e42]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formError && <p className="text-red-600 text-[13px]">{formError}</p>}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#d8e8dc]">
          <button
            onClick={onClose}
            className="text-[13px] font-medium px-4 py-2 rounded border border-[#d8e8dc] text-[#5a6e60] hover:border-[#2d6e42] hover:text-[#2d6e42] transition-colors"
          >
            {d.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-[13px] font-medium px-5 py-2 rounded bg-[#2d6e42] text-white hover:bg-[#1a4a2a] disabled:opacity-50 transition-colors"
          >
            {saving ? d.saving : d.save}
          </button>
        </div>

      </div>
    </div>
  )
}
