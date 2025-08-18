'use client'

import Link from 'next/link'
import SearchBar from './SearchBar'
import DarkModeToggle from './DarkModeToggle'
import AuthButton from './AuthButton'

export default function Header() {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Platform
            </span>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8">
            <SearchBar />
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4" style={{ border: '2px solid orange' }}>
            <div style={{ border: '1px solid blue' }}>
              <AuthButton />
            </div>
            <Link
              href="/channels/create"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Channel
            </Link>
            <DarkModeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}

