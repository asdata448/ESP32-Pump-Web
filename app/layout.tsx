import type { Metadata, Viewport } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Máy bơm tiêm điện ESP32',
  description: 'Hệ thống giám sát và điều khiển máy bơm tiêm điện qua WiFi',
  generator: 'v0.app',
  icons: {
    icon: '/ute-logo.png',
    apple: '/ute-logo.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a2a4a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi">
      <body className={`${beVietnamPro.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
