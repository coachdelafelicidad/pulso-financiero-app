import type { Metadata, Viewport } from 'next'
import { Inter, Poppins } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

const SITE_URL = 'https://app.pulsofinanciero.okomosfinanzas.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Pulso Financiero — Okomos Finanzas',
  description:
    'Conoce la salud financiera real de tu empresa en 5 minutos. Sin conectar banco, sin jerga contable.',
  icons: {
    icon: '/icon-pwa-192.png',
    shortcut: '/icon-pwa-192.png',
    apple: '/icon-pwa-512.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pulso',
  },
  openGraph: {
    title: 'Pulso Financiero — Okomos Finanzas',
    description:
      'Conoce la salud financiera real de tu empresa en 5 minutos. Sin conectar banco, sin jerga contable.',
    url: SITE_URL,
    siteName: 'Pulso Financiero',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Okomos Finanzas — Pulso Financiero',
      },
    ],
    locale: 'es_MX',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pulso Financiero — Okomos Finanzas',
    description:
      'Conoce la salud financiera real de tu empresa en 5 minutos. Sin conectar banco, sin jerga contable.',
    images: ['/logo.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#06403C',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${poppins.variable}`}>
      <body className="bg-cream font-sans text-teal-deep antialiased">
        {children}
      </body>
    </html>
  )
}
