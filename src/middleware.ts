import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const meta = (user?.app_metadata ?? {}) as Record<string, string>
  const role = meta['role']
  const driverStatus = meta['driverStatus']

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const pathParts = pathname.split('/').filter(Boolean)
  const isDriverDetailPage = pathParts.length === 2 && pathParts[0] === 'drivers' && UUID_RE.test(pathParts[1])

  const requiresAuth = pathname.startsWith('/admin') ||
    pathname.startsWith('/drivers/availability') ||
    isDriverDetailPage

  if (!user && requiresAuth) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  if (!user) return supabaseResponse

  if (pathname.startsWith('/admin') && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (
    pathname.startsWith('/drivers/availability') &&
    !(role === 'DRIVER' && driverStatus === 'APPROVED')
  ) {
    return NextResponse.redirect(new URL('/drivers', request.url))
  }

  if (isDriverDetailPage && role !== 'ADMIN' && !(role === 'DRIVER' && driverStatus === 'APPROVED')) {
    return NextResponse.redirect(new URL('/drivers', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/drivers/availability/:path*', '/drivers/:id'],
}
