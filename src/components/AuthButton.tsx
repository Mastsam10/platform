'use client'

import { useState } from 'react'

export default function AuthButton() {
  const [isSignUp, setIsSignUp] = useState(false)

  // Debug log to see if component is rendering
  console.log('🔥 AuthButton component is rendering!')

  const handleAuthClick = () => {
    // For now, just toggle between Sign In and Sign Up text
    // Later this can open a modal or navigate to auth page
    setIsSignUp(!isSignUp)
    alert(`${isSignUp ? 'Sign In' : 'Sign Up'} functionality coming soon!`)
  }

  return (
    <button
      onClick={handleAuthClick}
      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 border-4 border-yellow-400"
      style={{ 
        minWidth: '120px', 
        zIndex: 9999,
        backgroundColor: 'red',
        border: '4px solid yellow',
        fontSize: '16px',
        fontWeight: 'bold',
        position: 'relative'
      }}
    >
      🔥 {isSignUp ? 'Sign Up' : 'Sign In'} 🔥
    </button>
  )
}
