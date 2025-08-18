import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { DarkModeProvider } from '@/lib/darkMode'
import Header from '@/components/Header'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Platform - Christian Video Discovery',
  description: 'Discover and watch Christian videos with scripture-aware chapters and local church discovery.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={inter.className} suppressHydrationWarning={true}>
        <DarkModeProvider>
          <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <Header />
            {children}
          </div>
        </DarkModeProvider>
      </body>
    </html>
  )
}
