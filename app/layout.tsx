import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Finple — Tu asistente de regulación financiera chilena',
  description:
    'Finple traduce la normativa CMF, SII y SERNAC a lenguaje claro. Sube contratos, cartolas o circulares y entiende tus derechos.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-cream text-ink antialiased">{children}</body>
    </html>
  )
}
