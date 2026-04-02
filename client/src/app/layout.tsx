import type { Metadata } from 'next'
import './globals.css'
import { SiteHeader } from '@/components/site-header'
import { AppFooter } from '@/components/app-footer'

export const metadata: Metadata = {
  title: 'Zeማa',
  description: 'A social music platform for discovery, discussion, listening history, and community charts.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0d0f14] text-white antialiased">
        <div className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,123,84,0.18),_transparent_24%),radial-gradient(circle_at_82%_8%,_rgba(244,211,94,0.12),_transparent_18%),radial-gradient(circle_at_top_right,_rgba(42,157,143,0.16),_transparent_20%),linear-gradient(180deg,_#151922_0%,_#0d0f14_38%,_#090b10_100%)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] opacity-[0.18]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,_rgba(255,123,84,0.22),_transparent_58%)] blur-3xl" />
          <div className="relative z-10">
            <SiteHeader />
            {children}
            <AppFooter />
          </div>
        </div>
      </body>
    </html>
  )
}
