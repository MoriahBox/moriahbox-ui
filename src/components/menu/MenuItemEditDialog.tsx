'use client'

import { useRef, useState, useEffect } from 'react'
import { X, Trash2, Plus, Star, Upload } from 'lucide-react'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { MenuItem, MenuImage } from '@/types/menu'
import { apiFetch, uploadMenuImage, setPrimaryMenuImage, deleteMenuImage } from '@/lib/api'

const IMAGE_SLOTS = [1, 2, 3] as const

type PriceRow = { size: string; price: string }

type FormState = {
  name: string
  type: 'MEAL' | 'RECIPE'
  description: string
  tag: string
  prices: PriceRow[]
  steps: string
}

const SIZE_ORDER = ['SINGLE', 'COUPLE', 'FAMILY']

function emptyForm(): FormState {
  return { name: '', type: 'MEAL', description: '', tag: '', prices: [], steps: '' }
}

function itemToForm(item: MenuItem): FormState {
  return {
    name: item.name === 'Untitled' ? '' : item.name,
    type: item.type,
    description: item.description ?? '',
    tag: item.tag ?? '',
    prices: Object.entries(item.prices)
      .sort(([a], [b]) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b))
      .map(([size, price]) => ({ size, price: price.toString() })),
    steps: item.steps?.join('\n') ?? '',
  }
}

function buildPrices(rows: PriceRow[]): Record<string, number> {
  const prices: Record<string, number> = {}
  for (const row of rows) {
    if (row.size && row.price) prices[row.size] = parseFloat(row.price)
  }
  return prices
}

interface Props {
  mode: MenuItem | 'new' | null
  onClose: () => void
  onSaved: (item: MenuItem) => void
}

export function MenuItemEditDialog({ mode, onClose, onSaved }: Props) {
  const { t } = useLanguage()
  const { boxSizes, menuItemTypes, menuItemDialog: d } = t

  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [allSizes, setAllSizes] = useState<string[]>(SIZE_ORDER)

  // draft item created lazily on first image upload in create mode
  const [dummyId, setDummyId] = useState<string | null>(null)

  // image state
  const [images, setImages] = useState<MenuImage[]>([])
  const [imageError, setImageError] = useState<string | null>(null)
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null)
  const fileInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
    fetch(`${base}/api/menu/sizes`)
      .then(r => r.json())
      .then((data: string[]) => setAllSizes(data.sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (mode === null) return
    setForm(mode === 'new' ? emptyForm() : itemToForm(mode))
    setFormError(null)
    setImageError(null)
    setUploadingSlot(null)
    setDummyId(null)
    if (mode !== 'new') {
      const sorted = [
        ...(mode.primaryImage ? [mode.primaryImage] : []),
        ...(mode.additionalImages ?? []),
      ].sort((a, b) => a.displayOrder - b.displayOrder)
      setImages(sorted)
    } else {
      setImages([])
    }
  }, [mode])

  if (mode === null) return null

  const isCreate = mode === 'new'
  const currentItemId = isCreate ? dummyId : mode.id
  const editingType = isCreate ? form.type : mode.type
  const usedSizes = new Set(form.prices.map(r => r.size))
  const availableSizes = allSizes.filter(s => !usedSizes.has(s))

  function addPriceRow() {
    const nextSize = availableSizes[0]
    if (!nextSize) return
    setForm(f => ({ ...f, prices: [...f.prices, { size: nextSize, price: '' }] }))
  }

  function updatePriceRow(index: number, patch: Partial<PriceRow>) {
    setForm(f => ({
      ...f,
      prices: f.prices.map((row, i) => i === index ? { ...row, ...patch } : row),
    }))
  }

  function removePriceRow(index: number) {
    setForm(f => ({ ...f, prices: f.prices.filter((_, i) => i !== index) }))
  }

  // Creates the draft item the first time the user uploads an image in create mode.
  // Returns the item ID to use for the upload.
  async function ensureDraftItem(): Promise<string> {
    if (dummyId) return dummyId
    const res = await apiFetch('/api/menu', {
      method: 'POST',
      body: JSON.stringify({ type: form.type }),
    })
    if (!res.ok) throw new Error('Failed to create draft item')
    const item = await res.json() as MenuItem
    setDummyId(item.id)
    return item.id
  }

  async function handleUploadImage(slot: number, file: File) {
    setUploadingSlot(slot)
    setImageError(null)
    try {
      const itemId = isCreate ? await ensureDraftItem() : (mode as MenuItem).id
      const uploaded = await uploadMenuImage(itemId, file)
      setImages(prev => [...prev, uploaded].sort((a, b) => a.displayOrder - b.displayOrder))
    } catch (e) {
      setImageError(e instanceof Error ? e.message : d.imagesErrorUpload)
    } finally {
      setUploadingSlot(null)
      const ref = fileInputRefs[slot - 1]
      if (ref.current) ref.current.value = ''
    }
  }

  async function handleSetPrimary(imageId: string) {
    if (!currentItemId) return
    setImageError(null)
    try {
      await setPrimaryMenuImage(currentItemId, imageId)
      setImages(prev => {
        const promotedOldOrder = prev.find(i => i.id === imageId)?.displayOrder ?? 0
        return prev.map(img => {
          if (img.id === imageId) return { ...img, isPrimary: true, displayOrder: 1 }
          if (img.displayOrder < promotedOldOrder) return { ...img, isPrimary: false, displayOrder: img.displayOrder + 1 }
          return { ...img, isPrimary: false }
        }).sort((a, b) => a.displayOrder - b.displayOrder)
      })
    } catch (e) {
      setImageError(e instanceof Error ? e.message : d.imagesErrorSetPrimary)
    }
  }

  async function handleDeleteImage(imageId: string) {
    if (!currentItemId) return
    setImageError(null)
    try {
      await deleteMenuImage(currentItemId, imageId)
      setImages(prev => {
        const remaining = prev
          .filter(img => img.id !== imageId)
          .sort((a, b) => a.displayOrder - b.displayOrder)
        return remaining.map((img, i) => ({ ...img, displayOrder: i + 1 }))
      })
    } catch (e) {
      setImageError(e instanceof Error ? e.message : d.imagesErrorDelete)
    }
  }

  function handleClose() {
    if (isCreate && dummyId) {
      apiFetch(`/api/menu/${dummyId}`, { method: 'DELETE' }).catch(() => {})
    }
    setDummyId(null)
    onClose()
  }

  async function handleSave() {
    const currentMode = mode
    if (!currentMode) return

    const trimmedName = form.name.trim()
    if (!trimmedName) { setFormError(d.errorNameRequired); return }
    if (editingType === 'RECIPE' && !form.steps.trim()) {
      setFormError(d.errorStepsRequired)
      return
    }
    const hasIncompleteRow = form.prices.some(r => r.size && !r.price)
    if (hasIncompleteRow) { setFormError(d.errorPriceRequired); return }

    setSaving(true)
    setFormError(null)
    const stepsValue = editingType === 'RECIPE'
      ? form.steps.split('\n').map(s => s.trim()).filter(Boolean)
      : null

    try {
      if (currentMode === 'new') {
        const itemId = dummyId

        if (!itemId) {
          // No images uploaded — create the item directly via POST
          const res = await apiFetch('/api/menu', {
            method: 'POST',
            body: JSON.stringify({
              name: trimmedName,
              type: form.type,
              description: form.description.trim() || null,
              tag: form.tag.trim() || null,
              prices: buildPrices(form.prices),
              steps: stepsValue,
            }),
          })
          if (!res.ok) throw new Error()
          onSaved(await res.json() as MenuItem)
          onClose()
        } else {
          // Images were uploaded to the draft — finalise via PATCH then PUT sizes
          const patchRes = await apiFetch(`/api/menu/${itemId}`, {
            method: 'PATCH',
            body: JSON.stringify({
              name: trimmedName,
              type: form.type,
              description: form.description.trim() || null,
              tag: form.tag.trim() || null,
              steps: stepsValue,
            }),
          })
          if (!patchRes.ok) throw new Error()
          let updated = await patchRes.json() as MenuItem

          const prices = buildPrices(form.prices)
          if (Object.keys(prices).length > 0) {
            const sizesRes = await apiFetch(`/api/menu/${itemId}/sizes`, {
              method: 'PUT',
              body: JSON.stringify({ prices }),
            })
            if (!sizesRes.ok) throw new Error()
            updated = await sizesRes.json() as MenuItem
          }

          setDummyId(null)
          onSaved(updated)
          onClose()
        }
      } else {
        const id = currentMode.id
        const patchRes = await apiFetch(`/api/menu/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: trimmedName,
            type: currentMode.type,
            description: form.description.trim() || null,
            tag: form.tag.trim() || null,
            steps: currentMode.type === 'RECIPE'
              ? form.steps.split('\n').map(s => s.trim()).filter(Boolean)
              : null,
          }),
        })
        if (!patchRes.ok) throw new Error()
        let updated = await patchRes.json() as MenuItem

        const prices = buildPrices(form.prices)
        if (Object.keys(prices).length > 0) {
          const sizesRes = await apiFetch(`/api/menu/${id}/sizes`, {
            method: 'PUT',
            body: JSON.stringify({ prices }),
          })
          if (!sizesRes.ok) throw new Error()
          updated = await sizesRes.json() as MenuItem
        }

        onSaved(updated)
        onClose()
      }
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 py-4 border-b border-[#d8e8dc]">
          <h2 className="text-[16px] font-semibold text-[#1a4a2a]">
            {isCreate ? d.titleNew : d.titleEdit}
          </h2>
          <button onClick={handleClose} className="text-[#5a6e60] hover:text-[#1a4a2a] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">

          <div>
            <label className="block text-[12px] font-medium text-[#5a6e60] mb-1">{d.nameLabel}</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={d.namePlaceholder}
            />
          </div>

          {isCreate && (
            <div>
              <label className="block text-[12px] font-medium text-[#5a6e60] mb-1">{d.typeLabel}</label>
              <select
                className={inputClass}
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as 'MEAL' | 'RECIPE' }))}
                disabled={images.length > 0}
              >
                <option value="MEAL">{menuItemTypes.MEAL}</option>
                <option value="RECIPE">{menuItemTypes.RECIPE}</option>
              </select>
              {images.length > 0 && (
                <p className="text-[11px] text-[#8a9e90] mt-1">{d.imagesTypeLocked}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium text-[#5a6e60] mb-1">{d.descriptionLabel}</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder={d.descriptionPlaceholder}
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#5a6e60] mb-1">{d.tagLabel}</label>
            <input
              className={inputClass}
              value={form.tag}
              onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
              placeholder={d.tagPlaceholder}
            />
          </div>

          {/* Prices — dynamic rows */}
          <div>
            <label className="block text-[12px] font-medium text-[#5a6e60] mb-2">{d.pricesLabel}</label>
            <div className="flex flex-col gap-2">
              {form.prices.map((row, i) => {
                const sizesForThisRow = allSizes.filter(
                  s => s === row.size || !usedSizes.has(s)
                )
                return (
                  <div key={i} className="flex gap-2 items-center">
                    <select
                      className="flex-1 border border-[#d8e8dc] rounded-md px-3 py-2 text-[14px] text-[#1a4a2a] focus:outline-none focus:border-[#2d6e42]"
                      value={row.size}
                      onChange={e => updatePriceRow(i, { size: e.target.value })}
                    >
                      {sizesForThisRow.map(s => (
                        <option key={s} value={s}>
                          {boxSizes[s as keyof typeof boxSizes] ?? s}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-28 border border-[#d8e8dc] rounded-md px-3 py-2 text-[14px] text-[#1a4a2a] focus:outline-none focus:border-[#2d6e42]"
                      value={row.price}
                      onChange={e => updatePriceRow(i, { price: e.target.value })}
                      placeholder="0.00"
                    />
                    <button
                      type="button"
                      onClick={() => removePriceRow(i)}
                      aria-label="Remove price"
                      className="p-1.5 rounded text-[#5a6e60] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })}

              {availableSizes.length > 0 && (
                <button
                  type="button"
                  onClick={addPriceRow}
                  className="self-start inline-flex items-center gap-1.5 text-[12px] font-medium text-[#2d6e42] hover:text-[#1a4a2a] border border-dashed border-[#2d6e42] hover:border-[#1a4a2a] px-3 py-1.5 rounded transition-colors mt-1"
                >
                  <Plus size={13} /> {d.newPrice}
                </button>
              )}
            </div>
          </div>

          {editingType === 'RECIPE' && (
            <div>
              <label className="block text-[12px] font-medium text-[#5a6e60] mb-1">
                {d.stepsLabel}
              </label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={4}
                value={form.steps}
                onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
                placeholder={'Soak egusi for 30 minutes\nFry in palm oil until golden\nAdd leafy greens and simmer'}
              />
            </div>
          )}

          {/* Images */}
          <div>
            <label className="block text-[12px] font-medium text-[#5a6e60] mb-1">{d.imagesLabel}</label>
            <p className="text-[11px] text-[#8a9e90] mb-2">{d.imagesHint}</p>

            <div className="border border-[#d8e8dc] rounded-md overflow-hidden">
              {IMAGE_SLOTS.map(slot => {
                const img = images.find(i => i.displayOrder === slot)
                const isNextSlot = slot === images.length + 1
                const isUploading = uploadingSlot === slot
                return (
                  <div
                    key={slot}
                    className="flex items-center gap-3 px-3 py-2 border-b border-[#d8e8dc] last:border-b-0"
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded bg-[#f0f7f3] shrink-0 overflow-hidden flex items-center justify-center">
                      {img?.cdnThumbnailUrl && (
                        <img
                          src={img.cdnThumbnailUrl}
                          alt={img.description ?? ''}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    {/* Filename + primary badge */}
                    <div className="flex-1 min-w-0">
                      {img ? (
                        <>
                          <p className="text-[12px] text-[#1a4a2a] truncate">{img.originalFileName}</p>
                          {img.isPrimary && (
                            <span className="inline-block text-[10px] font-medium bg-[#e8f5ee] text-[#2d6e42] px-1.5 py-0.5 rounded mt-0.5">
                              {d.imagesPrimaryBadge}
                            </span>
                          )}
                        </>
                      ) : (
                        <p className="text-[12px] text-[#b0c4b8]">—</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Upload — only for the next available slot */}
                      {isNextSlot && (
                        <>
                          <input
                            ref={fileInputRefs[slot - 1]}
                            type="file"
                            accept=".png,.jpg,.jpeg"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) handleUploadImage(slot, file)
                            }}
                          />
                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => fileInputRefs[slot - 1].current?.click()}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2d6e42] border border-[#2d6e42] hover:bg-[#e8f5ee] disabled:opacity-50 px-2 py-1 rounded transition-colors"
                          >
                            <Upload size={11} />
                            {isUploading ? d.imagesUploading : d.imagesUpload}
                          </button>
                        </>
                      )}

                      {/* Make primary */}
                      {img && !img.isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(img.id)}
                          title={d.imagesMakePrimary}
                          className="p-1.5 rounded text-[#5a6e60] hover:text-[#2d6e42] hover:bg-[#e8f5ee] transition-colors"
                        >
                          <Star size={14} />
                        </button>
                      )}

                      {/* Delete */}
                      {img && (
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(img.id)}
                          title={d.imagesDelete}
                          className="p-1.5 rounded text-[#5a6e60] hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {imageError && (
              <p className="text-red-600 text-[12px] mt-1">{imageError}</p>
            )}
          </div>

          {formError && (
            <p className="text-red-600 text-[13px]">{formError}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#d8e8dc]">
          <button
            onClick={handleClose}
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
