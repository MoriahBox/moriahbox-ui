import type { Metadata } from 'next'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import { LanguageProvider } from '@/components/providers/LanguageProvider'
import { CartProvider } from '@/features/cart/CartContext'
import { AuthProvider } from '@/features/auth/AuthContext'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: 'Moriah Box — African Home Cooking, Delivered',
  description:
    'Pre-cooked meals and ingredient boxes with recipes, made for African families and singles who want the taste of home.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased">
        <LanguageProvider>
          <AuthProvider>
            <CartProvider>{children}</CartProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
