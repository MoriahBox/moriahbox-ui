import type { DriverSlot } from '@/types/driver'

export const SLOTS: DriverSlot[] = ['MORNING', 'AFTERNOON', 'EVENING']

export interface SlotDefinition {
  slot: string
  startTime: string
  endTime: string
}

export async function fetchSlotDefinitions(): Promise<SlotDefinition[]> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
  const res = await fetch(`${base}/api/delivery/slots`)
  return res.ok ? (res.json() as Promise<SlotDefinition[]>) : []
}

export function buildSlotLabels(defs: SlotDefinition[]): Record<string, string> {
  return Object.fromEntries(defs.map(d => [d.slot, formatTimeRange(d.startTime, d.endTime)]))
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} – ${formatTime(endTime)}`
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h < 12 ? 'AM' : 'PM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}
