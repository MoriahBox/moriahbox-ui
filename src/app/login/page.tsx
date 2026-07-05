'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useLanguage } from '@/components/providers/LanguageProvider'

export default function LoginPage() {
  const { t } = useLanguage()
  const p = t.loginPage
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (otpError) {
      setError(otpError.message)
    } else {
      setSent(true)
    }
  }

  async function handleGoogleLogin() {
    setError(null)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f9fdf9] px-4">
      <div className="w-full max-w-sm bg-white border border-[#d8e8dc] rounded-xl shadow-sm p-8">
        <div className="mb-6 text-center">
          <span className="font-serif text-[26px] font-black text-[#1a4a2a]">Moriah</span>
          <span className="font-serif text-[26px] font-black text-amber-500">Box</span>
          <p className="text-[13px] text-[#5a6e60] mt-1">{p.title}</p>
        </div>

        {sent ? (
          <div className="text-center">
            <p className="text-[14px] text-[#2d6e42] font-medium">{p.checkEmail}</p>
            <p className="text-[13px] text-[#5a6e60] mt-1">
              {p.magicLinkSent} <strong>{email}</strong>
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-[#d8e8dc] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2d6e42]/30"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2d6e42] hover:bg-[#1a4a2a] disabled:opacity-50 text-white text-[14px] font-medium py-2.5 rounded-md transition-colors"
              >
                {loading ? p.sending : p.sendMagicLink}
              </button>
            </form>

            <div className="flex items-center gap-3 my-4">
              <hr className="flex-1 border-[#d8e8dc]" />
              <span className="text-[12px] text-[#5a6e60]">{p.or}</span>
              <hr className="flex-1 border-[#d8e8dc]" />
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2 border border-[#d8e8dc] hover:bg-[#f2faf5] text-[#1a4a2a] text-[14px] font-medium py-2.5 rounded-md transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {p.signInWithGoogle}
            </button>

            {error && (
              <p className="text-[12px] text-red-600 mt-3 text-center">{error}</p>
            )}
          </>
        )}
      </div>
    </main>
  )
}
