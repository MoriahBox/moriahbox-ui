'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/sections/Footer'
import { useLanguage } from '@/components/providers/LanguageProvider'

const API_BASE = () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

const inputClass =
  'w-full border border-[#d8e8dc] rounded-md px-3 py-2 text-[14px] text-[#1a4a2a] focus:outline-none focus:ring-2 focus:ring-[#2d6e42]'
const labelClass = 'block text-[12px] font-medium text-[#3a5a44] mb-1'

interface ApplicationForm {
  name: string
  email: string
  phone: string
  licenseNumber: string
}

type Step = 'form' | 'success'

export default function DriverApplyPage() {
  const { t } = useLanguage()
  const p = t.applyPage

  const [step, setStep] = useState<Step>('form')
  const [form, setForm] = useState<ApplicationForm>({
    name: '',
    email: '',
    phone: '',
    licenseNumber: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE()}/api/drivers/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.status === 409) {
        const body = await res.json().catch(() => null)
        const code = body?.code
        if (code === 'SUSPENDED_DRIVER') setError(p.errorSuspendedReapply)
        else if (code === 'DUPLICATE_LICENSE') setError(p.errorDuplicateLicense)
        else setError(p.errorDuplicate)
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.errors?.[0]?.message ?? p.errorGeneric)
        return
      }

      setStep('success')
    } catch {
      setError(p.errorGeneric)
    } finally {
      setIsSubmitting(false)
    }
  }

  const shell = (children: React.ReactNode) => (
    <div className="max-w-6xl mx-auto bg-white shadow-2xl min-h-screen">
      <Navbar />
      <main className="px-6 py-16 md:px-12">
        <div className="max-w-lg mx-auto">{children}</div>
      </main>
      <Footer />
    </div>
  )

  if (step === 'success') {
    return shell(
      <div className="text-center py-12">
        <CheckCircle size={56} className="text-[#2d6e42] mx-auto mb-5" />
        <h1 className="font-serif text-2xl font-black text-[#1a4a2a] mb-3">
          {p.successTitle}
        </h1>
        <p className="text-[14px] text-[#5a6e60] mb-8 max-w-sm mx-auto leading-relaxed">
          {p.successSub}
        </p>
        <Link
          href="/"
          className="inline-block bg-[#2d6e42] hover:bg-[#1a4a2a] text-white text-[14px] font-medium px-6 py-3 rounded-md transition-colors"
        >
          {p.backToHome}
        </Link>
      </div>,
    )
  }

  return shell(
    <>
      <Link
        href="/drivers"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#5a6e60] hover:text-[#2d6e42] transition-colors mb-10"
      >
        <ArrowLeft size={14} /> {p.backToDrivers}
      </Link>

      <h1 className="font-serif text-2xl md:text-3xl font-black text-[#1a4a2a] mb-3">
        {p.title}
      </h1>
      <p className="text-[14px] text-[#5a6e60] leading-relaxed mb-10">
        {p.sub}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="name" className={labelClass}>{p.fields.name}</label>
          <input
            id="name"
            type="text"
            name="name"
            required
            autoComplete="name"
            value={form.name}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>{p.fields.email}</label>
          <input
            id="email"
            type="email"
            name="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>{p.fields.phone}</label>
          <input
            id="phone"
            type="tel"
            name="phone"
            required
            autoComplete="tel"
            value={form.phone}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="licenseNumber" className={labelClass}>{p.fields.licenseNumber}</label>
          <input
            id="licenseNumber"
            type="text"
            name="licenseNumber"
            required
            value={form.licenseNumber}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {error && (
          <p className="text-[13px] text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[15px] font-medium px-8 py-3 rounded-md transition-colors mt-2"
        >
          {isSubmitting ? p.submitting : p.submit}
        </button>
      </form>
    </>,
  )
}
