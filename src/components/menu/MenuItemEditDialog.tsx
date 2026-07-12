'use client'

import { useRef, useState, useEffect } from 'react'
import { X, Trash2, Plus, Star, Upload } from 'lucide-react'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { MenuItem, MenuImage } from '@/types/menu'
import { apiFetch, uploadMenuImage, setPrimaryMenuImage, deleteMenuImage } from '@/lib/api'

const IMAGE_SLOTS = [1, 2, 3] as const

type PriceRow = { size: string; price: string }

type TranslationForm = {
  name: string
  description: string
  tag: string
  steps: string
}

type FormState = {
  type: 'MEAL' | 'RECIPE'
  prices: PriceRow[]
  fr: TranslationForm
  en: TranslationForm
}

const SIZE_ORDER = ['SINGLE', 'COUPLE', 'FAMILY']

function emptyTranslation(): TranslationForm {
  return { name: '', description: '', tag: '', steps: '' }
}

function emptyForm(): FormState {
  return { type: 'MEAL', prices: [], fr: emptyTranslation(), en: emptyTranslation() }
}

function itemToTranslation(item: MenuItem): TranslationForm {
  return {
    name: item.name,
    description: item.description ?? '',
    tag: item.tag ?? '',
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

function splitLines(text: string): string[] {
  return text.split('\n').map(s => s.trim()).filter(Boolean)
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
  const [savingFr, setSavingFr] = useState(false)
  const [savingEn, setSavingEn] = useState(false)
  const [errorFr, setErrorFr] = useState<string | null>(null)
  const [errorEn, setErrorEn] = useState<string | null>(null)
  const [allSizes, setAllSizes] = useState<string[]>(SIZE_ORDER)

  const [itemId, setItemId] = useState<string | null>(null)
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
    setErrorFr(null)
    setErrorEn(null)
    setImageError(null)
    setUploadingSlot(null)

    if (mode === 'new') {
      setForm(emptyForm())
      setItemId(null)
      setImages([])
      return
    }

    const id = mode.id
    setItemId(id)
    setForm(f => ({
      ...f,
      type: mode.type,
      prices: Object.entries(mode.prices)
        .sort(([a], [b]) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b))
        .map(([size, price]) => ({ size, price: price.toString() })),
    }))

    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
    Promise.all([
      fetch(`${base}/api/menu/${id}?language=fr`).then(r => r.ok ? r.json() as Promise<MenuItem> : null).catch(() => null),
      fetch(`${base}/api/menu/${id}?language=en`).then(r => r.ok ? r.json() as Promise<MenuItem> : null).catch(() => null),
    ]).then(([frItem, enItem]) => {
      setForm(f => ({
        ...f,
        fr: frItem ? itemToTranslation(frItem) : emptyTranslation(),
        en: enItem ? itemToTranslation(enItem) : emptyTranslation(),
      }))
      const anyItem = frItem ?? enItem
      if (anyItem) {
        const sorted = [
          ...(anyItem.primaryImage ? [anyItem.primaryImage] : []),
          ...(anyItem.additionalImages ?? []),
        ].sort((a, b) => a.displayOrder - b.displayOrder)
        setImages(sorted)
      }
    })
  }, [mode])

  if (mode === null) return null

  const isCreate = mode === 'new'
  const editingType = form.type
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

  async function saveSide(lang: 'fr' | 'en') {
    const setSaving = lang === 'fr' ? setSavingFr : setSavingEn
    const setError = lang === 'fr' ? setErrorFr : setErrorEn
    const side = form[lang]
    const trimmedName = side.name.trim()

    if (!trimmedName) { setError(d.errorNameRequired); return }
    if (editingType === 'RECIPE' && !side.steps.trim()) { setError(d.errorStepsRequired); return }
    if (form.prices.some(r => r.size && !r.price)) { setError(d.errorPriceRequired); return }

    setSaving(true)
    setError(null)

    const steps = editingType === 'RECIPE' ? splitLines(side.steps) : undefined
    const prices = buildPrices(form.prices)
    const currentItemId = itemId

    try {
      let savedItem: MenuItem

      if (!currentItemId) {
        const res = await apiFetch('/api/menu', {
          method: 'POST',
          body: JSON.stringify({
            type: editingType,
            language: lang,
            name: trimmedName,
            description: side.description.trim() || null,
            tag: side.tag.trim() || null,
            ...(steps !== undefined && { steps }),
            ...(Object.keys(prices).length > 0 && { prices }),
          }),
        })
        if (!res.ok) throw new Error()
        savedItem = await res.json() as MenuItem
        setItemId(savedItem.id)
      } else {
        const patchRes = await apiFetch(`/api/menu/${currentItemId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            type: editingType,
            language: lang,
            name: trimmedName,
            description: side.description.trim() || null,
            tag: side.tag.trim() || null,
            ...(steps !== undefined && { steps }),
          }),
        })
        if (!patchRes.ok) throw new Error()
        savedItem = await patchRes.json() as MenuItem

        if (Object.keys(prices).length > 0) {
          const sizesRes = await apiFetch(`/api/menu/${currentItemId}/sizes`, {
            method: 'PUT',
            body: JSON.stringify({ prices }),
          })
          if (!sizesRes.ok) throw new Error()
          savedItem = await sizesRes.json() as MenuItem
        }
      }

      onSaved(savedItem)
    } catch {
      setError(d.errorGeneric)
    } finally {
      setSaving(false)
    }
  }

  async function handleUploadImage(slot: number, file: File) {
    if (!itemId) return
    setUploadingSlot(slot)
    setImageError(null)
    try {
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
    if (!itemId) return
    setImageError(null)
    try {
      await setPrimaryMenuImage(itemId, imageId)
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
    if (!itemId) return
    setImageError(null)
    try {
      await deleteMenuImage(itemId, imageId)
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

  const inputClass =
    'w-full border border-[#d8e8dc] rounded-md px-3 py-2 text-[14px] text-[#1a4a2a] focus:outline-none focus:border-[#2d6e42]'

  function renderTranslationColumn(lang: 'fr' | 'en') {
    const side = form[lang]
    const isError = lang === 'fr' ? errorFr : errorEn
    const isSaving = lang === 'fr' ? savingFr : savingEn
    const setTranslation = (patch: Partial<TranslationForm>) =>
      setForm(f => ({ ...f, [lang]: { ...f[lang], ...patch } }))
    const columnLabel = lang === 'fr' ? d.frColumn : d.enColumn
    const saveLabel = lang === 'fr' ? d.saveFr : d.saveEn

    return (
      <div className="flex flex-col gap-3">
        <div className="text-[12px] font-semibold text-[#5a6e60] uppercase tracking-wider pb-1 border-b border-[#d8e8dc]">
          {columnLabel}
        </div>

        <div>
          <label className="block text-[12px] font-medium text-[#5a6e60] mb-1">{d.nameLabel}</label>
          <input
            className={inputClass}
            value={side.name}
            onChange={e => setTranslation({ name: e.target.value })}
            placeholder={d.namePlaceholder}
          />
        </div>

        <div>
          <label className="block text-[12px] font-medium text-[#5a6e60] mb-1">{d.descriptionLabel}</label>
          <textarea
            className={`${inputClass} resize-none`}
            rows={2}
            value={side.description}
            onChange={e => setTranslation({ description: e.target.value })}
            placeholder={d.descriptionPlaceholder}
          />
        </div>

        <div>
          <label className="block text-[12px] font-medium text-[#5a6e60] mb-1">{d.tagLabel}</label>
          <input
            className={inputClass}
            value={side.tag}
            onChange={e => setTranslation({ tag: e.target.value })}
            placeholder={d.tagPlaceholder}
          />
        </div>

        {editingType === 'RECIPE' && (
          <div>
            <label className="block text-[12px] font-medium text-[#5a6e60] mb-1">{d.stepsLabel}</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={4}
              value={side.steps}
              onChange={e => setTranslation({ steps: e.target.value })}
              placeholder={d.stepsLabel}
            />
          </div>
        )}

        {isError && <p className="text-red-600 text-[12px]">{isError}</p>}

        <button
          onClick={() => saveSide(lang)}
          disabled={isSaving}
          className="self-start text-[13px] font-medium px-4 py-2 rounded bg-[#2d6e42] text-white hover:bg-[#1a4a2a] disabled:opacity-50 transition-colors"
        >
          {isSaving ? d.saving : saveLabel}
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 py-4 border-b border-[#d8e8dc]">
          <h2 className="text-[16px] font-semibold text-[#1a4a2a]">
            {isCreate ? d.titleNew : d.titleEdit}
          </h2>
          <button onClick={onClose} className="text-[#5a6e60] hover:text-[#1a4a2a] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">

          {/* Shared: Type selector (create only, locked after first save) */}
          {isCreate && (
            <div className="max-w-xs">
              <label className="block text-[12px] font-medium text-[#5a6e60] mb-1">{d.typeLabel}</label>
              <select
                className={inputClass}
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as 'MEAL' | 'RECIPE' }))}
                disabled={itemId !== null}
              >
                <option value="MEAL">{menuItemTypes.MEAL}</option>
                <option value="RECIPE">{menuItemTypes.RECIPE}</option>
              </select>
            </div>
          )}

          {/* Shared: Prices */}
          <div>
            <label className="block text-[12px] font-medium text-[#5a6e60] mb-2">{d.pricesLabel}</label>
            <div className="flex flex-col gap-2">
              {form.prices.map((row, i) => {
                const sizesForThisRow = allSizes.filter(s => s === row.size || !usedSizes.has(s))
                return (
                  <div key={i} className="flex gap-2 items-center max-w-xs">
                    <select
                      className="flex-1 border border-[#d8e8dc] rounded-md px-3 py-2 text-[14px] text-[#1a4a2a] focus:outline-none focus:border-[#2d6e42]"
                      value={row.size}
                      onChange={e => updatePriceRow(i, { size: e.target.value })}
                    >
                      {sizesForThisRow.map(s => (
                        <option key={s} value={s}>{boxSizes[s as keyof typeof boxSizes] ?? s}</option>
                      ))}
                    </select>
                    <input
                      type="number" min="0" step="0.01"
                      className="w-28 border border-[#d8e8dc] rounded-md px-3 py-2 text-[14px] text-[#1a4a2a] focus:outline-none focus:border-[#2d6e42]"
                      value={row.price}
                      onChange={e => updatePriceRow(i, { price: e.target.value })}
                      placeholder="0.00"
                    />
                    <button
                      type="button" onClick={() => removePriceRow(i)} aria-label="Remove price"
                      className="p-1.5 rounded text-[#5a6e60] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })}
              {availableSizes.length > 0 && (
                <button
                  type="button" onClick={addPriceRow}
                  className="self-start inline-flex items-center gap-1.5 text-[12px] font-medium text-[#2d6e42] hover:text-[#1a4a2a] border border-dashed border-[#2d6e42] hover:border-[#1a4a2a] px-3 py-1.5 rounded transition-colors mt-1"
                >
                  <Plus size={13} /> {d.newPrice}
                </button>
              )}
            </div>
          </div>

          {/* Translation columns — FR left, EN right */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-[#d8e8dc] pt-5">
            {renderTranslationColumn('fr')}
            {renderTranslationColumn('en')}
          </div>

          {/* Images */}
          <div className="border-t border-[#d8e8dc] pt-5">
            <label className="block text-[12px] font-medium text-[#5a6e60] mb-1">{d.imagesLabel}</label>
            {isCreate && !itemId ? (
              <p className="text-[12px] text-[#8a9e90]">{d.imagesDisabledCreate}</p>
            ) : (
              <>
                <p className="text-[11px] text-[#8a9e90] mb-2">{d.imagesHint}</p>
                <div className="border border-[#d8e8dc] rounded-md overflow-hidden">
                  {IMAGE_SLOTS.map(slot => {
                    const img = images.find(i => i.displayOrder === slot)
                    const isNextSlot = slot === images.length + 1
                    const isUploading = uploadingSlot === slot
                    return (
                      <div key={slot} className="flex items-center gap-3 px-3 py-2 border-b border-[#d8e8dc] last:border-b-0">
                        <div className="w-10 h-10 rounded bg-[#f0f7f3] shrink-0 overflow-hidden flex items-center justify-center">
                          {img?.cdnThumbnailUrl && (
                            <img src={img.cdnThumbnailUrl} alt={img.description ?? ''} className="w-full h-full object-cover" />
                          )}
                        </div>
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
                        <div className="flex items-center gap-1 shrink-0">
                          {isNextSlot && (
                            <>
                              <input
                                ref={fileInputRefs[slot - 1]} type="file" accept=".png,.jpg,.jpeg"
                                className="hidden"
                                onChange={e => { const file = e.target.files?.[0]; if (file) handleUploadImage(slot, file) }}
                              />
                              <button
                                type="button" disabled={isUploading}
                                onClick={() => fileInputRefs[slot - 1].current?.click()}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2d6e42] border border-[#2d6e42] hover:bg-[#e8f5ee] disabled:opacity-50 px-2 py-1 rounded transition-colors"
                              >
                                <Upload size={11} />
                                {isUploading ? d.imagesUploading : d.imagesUpload}
                              </button>
                            </>
                          )}
                          {img && !img.isPrimary && (
                            <button type="button" onClick={() => handleSetPrimary(img.id)} title={d.imagesMakePrimary}
                              className="p-1.5 rounded text-[#5a6e60] hover:text-[#2d6e42] hover:bg-[#e8f5ee] transition-colors">
                              <Star size={14} />
                            </button>
                          )}
                          {img && (
                            <button type="button" onClick={() => handleDeleteImage(img.id)} title={d.imagesDelete}
                              className="p-1.5 rounded text-[#5a6e60] hover:text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {imageError && <p className="text-red-600 text-[12px] mt-1">{imageError}</p>}
              </>
            )}
          </div>

        </div>

        <div className="flex justify-end px-6 py-4 border-t border-[#d8e8dc]">
          <button
            onClick={onClose}
            className="text-[13px] font-medium px-4 py-2 rounded border border-[#d8e8dc] text-[#5a6e60] hover:border-[#2d6e42] hover:text-[#2d6e42] transition-colors"
          >
            {d.cancel}
          </button>
        </div>

      </div>
    </div>
  )
}
