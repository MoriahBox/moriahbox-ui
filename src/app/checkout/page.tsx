'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShoppingCart, CheckCircle, Trash2 } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { DeliveryDatePicker, type AvailableSlot } from '@/components/checkout/DeliveryDatePicker'
import { fetchSlotDefinitions, buildSlotLabels } from '@/lib/slots'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/sections/Footer'
import { useLanguage } from '@/components/providers/LanguageProvider'
import { formatCurrency } from '@/lib/format'
import { useCart } from '@/features/cart/CartContext'
import type { Order, DeliveryAddress } from '@/types/order'
import type { DriverSlot } from '@/types/driver'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type Step = 'form' | 'payment' | 'success'

interface CustomerForm {
  email: string
  street: string
  city: string
  postalCode: string
  province: string
  country: string
}

function StripePaymentForm({
  onSuccess,
  errorMessage,
  onError,
  onCancel,
}: {
  onSuccess: () => void
  errorMessage: string | null
  onError: (msg: string) => void
  onCancel: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isPaying, setIsPaying] = useState(false)
  const { t } = useLanguage()
  const c = t.checkout

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setIsPaying(true)

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/checkout` },
      redirect: 'if_required',
    })

    if (error) {
      onError(error.message ?? c.errorPayment)
      setIsPaying(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handlePay} className="flex flex-col gap-5">
      <PaymentElement />
      {errorMessage && (
        <p className="text-red-600 text-[13px]">{errorMessage}</p>
      )}
      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={isPaying || !stripe}
          className="bg-[#2d6e42] hover:bg-[#1a4a2a] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[15px] font-medium px-8 py-3 rounded-md transition-colors"
        >
          {isPaying ? c.paying : c.payNow}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPaying}
          className="text-[13px] text-red-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {c.cancelOrder}
        </button>
      </div>
    </form>
  )
}

const inputClass =
  'w-full border border-[#d8e8dc] rounded-md px-3 py-2 text-[14px] text-[#1a4a2a] focus:outline-none focus:ring-2 focus:ring-[#2d6e42]'
const labelClass = 'block text-[12px] font-medium text-[#3a5a44] mb-1'

export default function CheckoutPage() {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const { items, total, clearCart, decrementItem } = useCart()
  const c = t.checkout
  const bs = t.boxSizes
  const cart = t.cart

  const [activeAreaCodes, setActiveAreaCodes] = useState<string[]>([])
  const [postalCodeError, setPostalCodeError] = useState<string | null>(null)
  const [orderType, setOrderType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY')
  const [deliveryDate, setDeliveryDate] = useState<string | null>(null)
  const [deliverySlot, setDeliverySlot] = useState<DriverSlot | null>(null)
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[] | null>(null)
  const [postalCodeValid, setPostalCodeValid] = useState(false)
  const [slotLabels, setSlotLabels] = useState<Record<string, string> | null>(null)
  const [feesBySlot, setFeesBySlot] = useState<Record<string, number>>({})
  const [deliveryFee, setDeliveryFee] = useState(0)
  const lastFetchedCodeRef = useRef('')

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
    fetch(`${base}/api/delivery/areas?active=true`)
      .then(r => r.json())
      .then((areas: { postalCode: string }[]) =>
        setActiveAreaCodes(areas.map(a => a.postalCode.toUpperCase().replace(/\s/g, '')))
      )
      .catch(() => {})
    fetchSlotDefinitions()
      .then(defs => setSlotLabels(buildSlotLabels(defs)))
      .catch(() => {})
  }, [])

  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const [step, setStep] = useState<Step>('form')
  const [form, setForm] = useState<CustomerForm>({
    email: '',
    street: '',
    city: '',
    postalCode: '',
    province: '',
    country: 'Canada',
  })
  const [order, setOrder] = useState<Order | null>(null)
  const [isPlacing, setIsPlacing] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function validatePostalCode(value: string) {
    if (!value || activeAreaCodes.length === 0) {
      setPostalCodeError(null)
      return
    }
    const normalized = value.toUpperCase().replace(/\s/g, '')
    if (normalized.length < 3) {
      setPostalCodeError(null)
      return
    }
    const served = activeAreaCodes.some(code => normalized.startsWith(code))
    if (!served) {
      setPostalCodeError(c.postalCodeNotServed)
      setPostalCodeValid(false)
      setAvailableSlots(null)
      setDeliveryDate(null)
      setDeliverySlot(null)
      lastFetchedCodeRef.current = ''
      return
    }
    setPostalCodeError(null)
    if (normalized === lastFetchedCodeRef.current) return
    lastFetchedCodeRef.current = normalized
    setPostalCodeValid(false)
    setAvailableSlots(null)
    setFeesBySlot({})
    setDeliveryFee(0)
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
    fetch(`${base}/api/delivery/available-slots?postalCode=${encodeURIComponent(normalized)}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: AvailableSlot[]) => {
        setAvailableSlots(data)
        setPostalCodeValid(true)
        const areaId = data[0]?.areaId
        if (areaId) {
          fetch(`${base}/api/delivery/areas/${areaId}/fees`)
            .then(r => r.ok ? r.json() : [])
            .then((fees: Array<{ slot: string; amount: number }>) => {
              const map: Record<string, number> = {}
              fees.forEach(f => { map[f.slot] = f.amount })
              setFeesBySlot(map)
            })
            .catch(() => {})
        }
      })
      .catch(() => { setAvailableSlots([]); setPostalCodeValid(true) })
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (name === 'postalCode') validatePostalCode(value)
  }

  function handlePostalCodeBlur() {
    validatePostalCode(form.postalCode)
  }

  async function pollForClientSecret(orderId: string): Promise<string | 'PAYMENT_INTENT_FAILED' | null> {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1000))
      try {
        const res = await fetch(`${base}/api/orders/${orderId}/payment-intent`)
        if (res.ok) {
          const data = await res.json() as { clientSecret: string | null, status: string }
          if (data.status === 'PAYMENT_INTENT_FAILED') return 'PAYMENT_INTENT_FAILED'
          if (data.clientSecret) return data.clientSecret
        }
      } catch {
        // continue retrying
      }
    }
    return null
  }

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault()
    setIsPlacing(true)
    setError(null)

    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
    const deliveryAddress: DeliveryAddress = {
      street: form.street,
      city: form.city,
      postalCode: form.postalCode,
      province: form.province,
      country: form.country,
    }

    try {
      const res = await fetch(`${base}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          customerEmail: form.email,
          orderType,
          ...(orderType === 'DELIVERY' && { deliveryAddress, deliveryDate, deliverySlot }),
          items: items.map(i => ({
            menuItemId: i.menuItemId,
            itemName: i.itemName,
            boxSize: i.boxSize,
            price: i.price,
            quantity: i.quantity,
          })),
        }),
      })

      if (res.status === 422) {
        const body = await res.json().catch(() => ({})) as { code?: string }
        if (body.code === 'POSTAL_CODE_NOT_SERVED') setPostalCodeError(c.postalCodeNotServed)
        else setError(c.slotNotAvailable)
        return
      }
      if (res.status === 400) {
        const body = await res.json().catch(() => ({})) as { errors?: Array<{ field: string; message: string }> }
        setError(body.errors?.length ? c.errorInvalidOrder : c.errorGeneric)
        return
      }
      if (!res.ok) throw new Error()
      const placed = (await res.json()) as Order
      setOrder(placed)

      setIsPolling(true)
      const clientSecret = await pollForClientSecret(placed.id)
      setIsPolling(false)

      if (clientSecret === 'PAYMENT_INTENT_FAILED') {
        setError(c.errorPaymentIntentFailed)
        return
      }
      if (!clientSecret) {
        setError(c.errorPaymentSetup)
        return
      }

      setOrder({ ...placed, clientSecret })
      setError(null)
      setStep('payment')
    } catch {
      setError(c.errorGeneric)
    } finally {
      setIsPlacing(false)
      setIsPolling(false)
    }
  }

  async function handleCancel() {
    if (order) {
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
      await fetch(`${base}/api/orders/${order.id}/cancel`, { method: 'POST' }).catch(() => {})
    }
    clearCart()
    router.push('/menu')
  }

  function handlePaymentSuccess() {
    clearCart()
    setStep('success')
  }

  const shell = (children: React.ReactNode) => (
    <div className="max-w-6xl mx-auto bg-white shadow-2xl min-h-screen">
      <Navbar />
      <main className="px-6 py-16 md:px-12">
        <div className="max-w-2xl mx-auto">{children}</div>
      </main>
      <Footer />
    </div>
  )

  if (step === 'success') {
    return shell(
      <div className="text-center py-12">
        <CheckCircle size={56} className="text-[#2d6e42] mx-auto mb-5" />
        <h1 className="font-serif text-2xl font-black text-[#1a4a2a] mb-2">
          {c.orderConfirmed}
        </h1>
        <p className="text-[14px] text-[#5a6e60] mb-8">
          {c.orderConfirmedSub}
        </p>
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 bg-[#2d6e42] hover:bg-[#1a4a2a] text-white text-[14px] font-medium px-6 py-3 rounded-md transition-colors"
        >
          <ShoppingCart size={16} /> {c.backToMenu}
        </Link>
      </div>,
    )
  }

  if (items.length === 0) {
    return shell(
      <>
        <Link
          href="/menu"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#5a6e60] hover:text-[#2d6e42] transition-colors mb-10"
        >
          <ArrowLeft size={14} /> {c.backToMenu}
        </Link>
        <p className="text-[14px] text-[#5a6e60]">{c.emptyCart}</p>
      </>,
    )
  }

  return shell(
    <>
      <div className="mb-10">
        <Link
          href="/menu"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#5a6e60] hover:text-[#2d6e42] transition-colors"
        >
          <ArrowLeft size={14} /> {c.backToMenu}
        </Link>
      </div>

      <h1 className="font-serif text-2xl md:text-3xl font-black text-[#1a4a2a] mb-8">
        {c.title}
      </h1>

      {/* Order summary */}
      <section className="mb-8">
        <h2 className="text-[11px] font-medium tracking-[1.5px] uppercase text-[#5a6e60] mb-4">
          {c.orderSummary}
        </h2>
        <div className="border border-[#d8e8dc] rounded-lg divide-y divide-[#d8e8dc]">
          {items.map(item => (
            <div
              key={`${item.menuItemId}-${item.boxSize}`}
              className="px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="text-[14px] font-medium text-[#1a4a2a]">{item.itemName}</p>
                <p className="text-[12px] text-[#5a6e60]">
                  {bs[item.boxSize as keyof typeof bs]}
                  <span className="mx-1 text-[#c8d8cc]">·</span>
                  {formatCurrency(item.price, lang)} &times; {item.quantity}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-[14px] font-semibold text-[#1a4a2a]">
                  {formatCurrency(item.price * item.quantity, lang)}
                </p>
                {step === 'form' && (
                  <button
                    onClick={() => decrementItem(item.menuItemId, item.boxSize)}
                    aria-label={cart.removeItem}
                    className="inline-flex items-center gap-0.5 text-[11px] font-bold text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 px-2 py-1 rounded-full transition-colors"
                  >
                    <Trash2 size={11} />1
                  </button>
                )}
              </div>
            </div>
          ))}
          {(() => {
            const displayFee = order ? (order.deliveryFee ?? 0) : (orderType === 'DELIVERY' ? deliveryFee : 0)
            const displayTotal = order ? order.totalAmount : total + (orderType === 'DELIVERY' ? deliveryFee : 0)
            return (
              <>
                {order?.taxAmount != null && order.taxAmount > 0 ? (
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[13px] text-[#5a6e60]">{c.tax}</p>
                      {order.taxDetail && (
                        <p className="text-[11px] text-[#8a9e90]">{order.taxDetail}</p>
                      )}
                    </div>
                    <p className="text-[13px] text-[#5a6e60]">{formatCurrency(Number(order.taxAmount), lang)}</p>
                  </div>
                ) : !order && (
                  <div className="px-4 py-3 flex items-center justify-between">
                    <p className="text-[13px] italic text-[#8a9e90]">{c.taxPlaceholder}</p>
                  </div>
                )}
                {displayFee > 0 && (
                  <div className="px-4 py-3 flex items-center justify-between">
                    <p className="text-[13px] text-[#5a6e60]">{c.deliveryFee}</p>
                    <p className="text-[13px] text-[#5a6e60]">{formatCurrency(Number(displayFee), lang)}</p>
                  </div>
                )}
                <div className="px-4 py-3 flex items-center justify-between bg-[#f2faf5] rounded-b-lg">
                  <p className="text-[14px] font-semibold text-[#1a4a2a]">{c.total}</p>
                  <p className="text-[16px] font-bold text-[#1a4a2a]">{formatCurrency(Number(displayTotal), lang)}</p>
                </div>
              </>
            )
          })()}
        </div>
      </section>

      {/* Customer info form */}
      {step === 'form' && (
        <form onSubmit={handlePlaceOrder} className="flex flex-col gap-6">
          <section>
            <h2 className="text-[11px] font-medium tracking-[1.5px] uppercase text-[#5a6e60] mb-4">
              {c.customerInfo}
            </h2>
            <label htmlFor="email" className={labelClass}>
              {c.email}
            </label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleFormChange}
              className={inputClass}
            />
          </section>

          <section>
            <h2 className="text-[11px] font-medium tracking-[1.5px] uppercase text-[#5a6e60] mb-4">
              {c.deliveryDetails}
            </h2>

            {/* Order type selector */}
            <p className="text-[12px] font-medium text-[#3a5a44] mb-2">{c.orderTypeLabel}</p>
            <div className="flex gap-2 mb-6">
              {(['DELIVERY', 'PICKUP'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setOrderType(type)
                    setDeliveryDate(null)
                    setDeliverySlot(null)
                    setDeliveryFee(0)
                  }}
                  className={[
                    'flex-1 py-2.5 rounded-md border text-[13px] font-medium transition-colors',
                    orderType === type
                      ? 'border-[#2d6e42] bg-[#2d6e42] text-white'
                      : 'border-[#d8e8dc] bg-white text-[#1a4a2a] hover:border-[#2d6e42]',
                  ].join(' ')}
                >
                  {type === 'DELIVERY' ? c.deliveryOption : c.pickupOption}
                </button>
              ))}
            </div>

            {orderType === 'PICKUP' && (
              <p className="text-[13px] text-[#5a6e60] bg-[#f2faf5] border border-[#d8e8dc] rounded-md px-4 py-3 mb-2">
                {c.pickupAddressNote}
              </p>
            )}

            {orderType === 'DELIVERY' && (
              <>
                <h3 className="text-[12px] font-semibold text-[#3a5a44] mb-3">{c.deliveryAddress}</h3>
                <div className="flex flex-col gap-3">
                  {[
                    { name: 'street', label: c.street, type: 'text', autoComplete: 'street-address' },
                    { name: 'city',   label: c.city,   type: 'text', autoComplete: 'address-level2' },
                  ].map(({ name, label, type, autoComplete }) => (
                    <div key={name}>
                      <label htmlFor={name} className={labelClass}>{label}</label>
                      <input
                        id={name}
                        type={type}
                        name={name}
                        autoComplete={autoComplete}
                        required
                        value={form[name as keyof CustomerForm]}
                        onChange={handleFormChange}
                        className={inputClass}
                      />
                    </div>
                  ))}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="postalCode" className={labelClass}>{c.postalCode}</label>
                      <input
                        id="postalCode"
                        type="text"
                        name="postalCode"
                        autoComplete="postal-code"
                        required
                        value={form.postalCode}
                        onChange={handleFormChange}
                        onBlur={handlePostalCodeBlur}
                        className={`${inputClass} ${postalCodeError ? 'border-red-400 focus:ring-red-400' : ''}`}
                      />
                      {postalCodeError && (
                        <p className="mt-1 text-[12px] text-red-600">{postalCodeError}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="province" className={labelClass}>{c.province}</label>
                      <input
                        id="province"
                        type="text"
                        name="province"
                        autoComplete="address-level1"
                        required
                        value={form.province}
                        onChange={handleFormChange}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="country" className={labelClass}>{c.country}</label>
                    <input
                      id="country"
                      type="text"
                      name="country"
                      autoComplete="country-name"
                      required
                      value={form.country}
                      onChange={handleFormChange}
                      className={inputClass}
                    />
                  </div>
                </div>

                {postalCodeValid && (
                  <div className="mt-6 pt-5 border-t border-[#e8f2ec]">
                    <h3 className="text-[12px] font-semibold text-[#3a5a44] mb-3">{c.deliveryDateTime}</h3>
                    <DeliveryDatePicker
                      availableSlots={availableSlots}
                      slotLabels={slotLabels}
                      selectedDate={deliveryDate}
                      selectedSlot={deliverySlot}
                      onSelectDate={date => { setDeliveryDate(date); setDeliverySlot(null); setDeliveryFee(0) }}
                      onSelectSlot={slot => { setDeliverySlot(slot); setDeliveryFee(feesBySlot[slot] ?? 0) }}
                      translations={{ chooseDate: c.chooseDate, chooseTime: c.chooseTime, noSlotsAvailable: c.noSlotsAvailable }}
                      lang={lang}
                    />
                  </div>
                )}
              </>
            )}
          </section>

          {error && <p className="text-red-600 text-[13px]">{error}</p>}

          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={isPlacing || isPolling || (orderType === 'DELIVERY' && (!!postalCodeError || !deliveryDate || !deliverySlot))}
              className="bg-[#2d6e42] hover:bg-[#1a4a2a] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[15px] font-medium px-8 py-3 rounded-md transition-colors"
            >
              {isPolling ? c.preparingPayment : isPlacing ? c.placing : c.placeOrder}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPlacing || isPolling}
              className="text-[13px] text-red-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {c.cancelOrder}
            </button>
          </div>
        </form>
      )}

      {/* Stripe payment */}
      {step === 'payment' && order?.clientSecret && (
        <section>
          <h2 className="text-[11px] font-medium tracking-[1.5px] uppercase text-[#5a6e60] mb-4">
            {c.payment}
          </h2>
          <Elements stripe={stripePromise} options={{ clientSecret: order.clientSecret }}>
            <StripePaymentForm
              onSuccess={handlePaymentSuccess}
              errorMessage={error}
              onError={setError}
              onCancel={handleCancel}
            />
          </Elements>
        </section>
      )}
    </>,
  )
}
