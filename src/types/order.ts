export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'CONFIRMED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_INTENT_FAILED'
  | 'CANCELLED'
  | 'REFUNDED'

export interface CartItem {
  menuItemId: string
  itemName: string
  boxSize: string
  price: number
  quantity: number
}

export interface DeliveryAddress {
  street: string
  city: string
  postalCode: string
  province: string
  country: string
}

export interface Order {
  id: string
  displayId: string
  status: OrderStatus
  clientSecret: string | null
  totalAmount: number
  taxAmount?: number
  taxDetail?: string
  deliveryFee?: number
}
