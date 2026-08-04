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

const SITE_URL = 'https://app.okomosfinanzas.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Tu Pulso | Okomos Finanzas',
  description:
    'Mide la salud financiera de tu empresa semana a semana. Sin conectar banco. Sin jerga contable.',
  icons: {
    icon: '/icon-pwa-192.png',
    shortcut: '/icon-pwa-192.png',
    apple: '/icon-pwa-512.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tu Pulso',
  },
  openGraph: {
    title: 'Tu Pulso | Okomos Finanzas',
    description:
      'Mide la salud financiera de tu empresa semana a semana. Sin conectar banco. Sin jerga contable.',
    url: SITE_URL,
    siteName: 'Tu Pulso por Okomos',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Tu Pulso por Okomos Finanzas',
      },
    ],
    locale: 'es_MX',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tu Pulso | Okomos Finanzas',
    description:
      'Mide la salud financiera de tu empresa semana a semana. Sin conectar banco. Sin jerga contable.',
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
