export interface DriverFaqItem {
  question: string
  answer: string
}

export type DriverStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED'
export type DriverSlot = 'MORNING' | 'AFTERNOON' | 'EVENING'

export interface Driver {
  id: string
  name: string
  email: string
  phone: string
  licenseNumber: string
  status: DriverStatus
  approvedAt: string | null
}

export interface DriverAvailabilityEntry {
  areaId: string
  slot: DriverSlot
}

export interface DriverAvailability {
  id: string
  driverId: string
  date: string
  entries: DriverAvailabilityEntry[]
}

export interface EarningsPeriod {
  amount: number
  deliveries: number
  periodStart: string
  periodEnd: string
}

export interface EarningsSummary {
  pastWeek: EarningsPeriod
  pastMonth: EarningsPeriod
  currentWeek: EarningsPeriod
  nextWeek: EarningsPeriod
}
