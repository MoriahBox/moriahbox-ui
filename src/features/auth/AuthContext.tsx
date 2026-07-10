'use client'

import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import type { Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'

const IDLE_TIMEOUT_MS = (Number(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES) || 30) * 60 * 1000
const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'click', 'scroll'] as const

interface AuthContextValue {
  isReady: boolean
  isLoggedIn: boolean
  isAdmin: boolean
  isDriver: boolean
  driverId: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  isReady: false,
  isLoggedIn: false,
  isAdmin: false,
  isDriver: false,
  driverId: null,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [isReady, setIsReady] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDriver, setIsDriver] = useState(false)
  const [driverId, setDriverId] = useState<string | null>(null)

  useEffect(() => {
    function applySession(session: Session | null) {
      const meta = (session?.user?.app_metadata ?? {}) as Record<string, string>
      if (session && (meta['driverStatus'] === 'SUSPENDED' || meta['driverStatus'] === 'REJECTED')) {
        setIsLoggedIn(false)
        setIsAdmin(false)
        setIsDriver(false)
        setDriverId(null)
        supabase.auth.signOut()
        return
      }
      setIsLoggedIn(!!session)
      setIsAdmin(meta['role'] === 'ADMIN')
      setIsDriver(meta['role'] === 'DRIVER' && meta['driverStatus'] === 'APPROVED')
      setDriverId(meta['driverId'] ?? null)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      applySession(session)
      if (event === 'INITIAL_SESSION') setIsReady(true)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    if (!isLoggedIn) return

    let timer: ReturnType<typeof setTimeout>

    function resetTimer() {
      clearTimeout(timer)
      timer = setTimeout(async () => {
        setIsLoggedIn(false)
        setIsAdmin(false)
        setIsDriver(false)
        setDriverId(null)
        await supabase.auth.signOut()
        window.location.href = '/login'
      }, IDLE_TIMEOUT_MS)
    }

    IDLE_EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      clearTimeout(timer)
      IDLE_EVENTS.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [isLoggedIn, supabase])

  async function signOut() {
    setIsLoggedIn(false)
    setIsAdmin(false)
    setIsDriver(false)
    setDriverId(null)
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ isReady, isLoggedIn, isAdmin, isDriver, driverId, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
