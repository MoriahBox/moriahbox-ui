export interface DeliveryArea {
  id: string
  name: string
  postalCode: string
  active: boolean
}

export interface DeliveryFee {
  id: string
  areaId: string
  slot: 'MORNING' | 'AFTERNOON' | 'EVENING'
  amount: number
}
