import { createClient } from '@/lib/supabase'
import type { MenuImage } from '@/types/menu'

const API_BASE = () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const isFormData = options?.body instanceof FormData
  return fetch(`${API_BASE()}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options?.headers ?? {}),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  })
}

async function throwWithBackendMessage(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => null)
  throw new Error((body as { message?: string } | null)?.message ?? fallback)
}

export async function uploadMenuImage(
  menuItemId: string,
  file: File,
  description?: string,
): Promise<MenuImage> {
  const form = new FormData()
  form.append('file', file)
  if (description) form.append('description', description)

  const res = await apiFetch(`/api/menu/${menuItemId}/images`, { method: 'POST', body: form })
  if (!res.ok) await throwWithBackendMessage(res, `Upload failed (${res.status})`)
  return res.json() as Promise<MenuImage>
}

export async function setPrimaryMenuImage(menuItemId: string, imageId: string): Promise<void> {
  const res = await apiFetch(`/api/menu/${menuItemId}/images/${imageId}`, { method: 'PATCH' })
  if (!res.ok) await throwWithBackendMessage(res, `Set primary failed (${res.status})`)
}

export async function deleteMenuImage(menuItemId: string, imageId: string): Promise<void> {
  const res = await apiFetch(`/api/menu/${menuItemId}/images/${imageId}`, { method: 'DELETE' })
  if (!res.ok) await throwWithBackendMessage(res, `Delete failed (${res.status})`)
}
