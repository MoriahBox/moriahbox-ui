import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          },
        },
      },
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      const meta = (data.session.user.app_metadata ?? {}) as Record<string, string>
      const role = meta['role']
      const driverStatus = meta['driverStatus']

      if (role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin/orders', request.url))
      }
      if (role === 'DRIVER' && driverStatus === 'APPROVED') {
        const driverId = meta['driverId']
        return NextResponse.redirect(new URL(`/drivers/${driverId}`, request.url))
      }
      if (role === 'DRIVER') {
        return NextResponse.redirect(new URL('/drivers', request.url))
      }
    }
  }

  return NextResponse.redirect(new URL('/', request.url))
}
