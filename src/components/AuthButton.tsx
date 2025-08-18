'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AuthModal from './AuthModal'

export default function AuthButton() {
  const { user, signOut, isAuthenticated } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  const handleAuthClick = () => {
    if (isAuthenticated) {
      // Show user menu or sign out
      if (confirm('Do you want to sign out?')) {
        signOut()
      }
    } else {
      // Open auth modal
      setShowAuthModal(true)
    }
  }

  const handleAuthSuccess = () => {
    setShowAuthModal(false)
    // Auth state will update automatically via useAuth hook
  }

  return (
    <>
      <button
        onClick={handleAuthClick}
        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 border-4 border-yellow-400"
        style={{ 
          minWidth: '120px', 
          zIndex: 9999,
          backgroundColor: isAuthenticated ? '#059669' : 'red', // Green if signed in, red if not
          border: '4px solid yellow',
          fontSize: '16px',
          fontWeight: 'bold',
          position: 'relative'
        }}
      >
        {isAuthenticated ? (
          `👤 ${user?.email?.split('@')[0] || 'User'}`
        ) : (
          '🔥 Sign In 🔥'
        )}
      </button>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  )
}
