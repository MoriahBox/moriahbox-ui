'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { CartItem } from '@/types/order'

interface CartContextValue {
  items: CartItem[]
  itemCount: number
  total: number
  addItem: (item: CartItem) => void
  decrementItem: (menuItemId: string, boxSize: string) => void
  removeItem: (menuItemId: string, boxSize: string) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue>({
  items: [],
  itemCount: 0,
  total: 0,
  addItem: () => {},
  decrementItem: () => {},
  removeItem: () => {},
  clearCart: () => {},
})

const STORAGE_KEY = 'moriahbox_cart'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setItems(JSON.parse(stored))
    } catch {}
  }, [])

  const addItem = useCallback((incoming: CartItem) => {
    setItems(prev => {
      const idx = prev.findIndex(
        i => i.menuItemId === incoming.menuItemId && i.boxSize === incoming.boxSize,
      )
      const next =
        idx >= 0
          ? prev.map((i, n) =>
              n === idx ? { ...i, price: incoming.price, quantity: i.quantity + incoming.quantity } : i,
            )
          : [...prev, incoming]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const decrementItem = useCallback((menuItemId: string, boxSize: string) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.menuItemId === menuItemId && i.boxSize === boxSize)
      if (idx < 0) return prev
      const next = prev[idx].quantity <= 1
        ? prev.filter((_, n) => n !== idx)
        : prev.map((i, n) => n === idx ? { ...i, quantity: i.quantity - 1 } : i)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const removeItem = useCallback((menuItemId: string, boxSize: string) => {
    setItems(prev => {
      const next = prev.filter(i => !(i.menuItemId === menuItemId && i.boxSize === boxSize))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, itemCount, total, addItem, decrementItem, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
