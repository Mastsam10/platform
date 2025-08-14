'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type DarkModeContextType = {
  isDarkMode: boolean
  toggleDarkMode: () => void
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined)

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Check for saved preference or system preference
    const savedPreference = localStorage.getItem('darkMode')
    const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (savedPreference !== null) {
      setIsDarkMode(savedPreference === 'true')
    } else {
      setIsDarkMode(systemPreference)
    }
  }, [])

  useEffect(() => {
    // Update document class when dark mode changes
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    // Save preference to localStorage
    localStorage.setItem('darkMode', isDarkMode.toString())
  }, [isDarkMode])

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export function useDarkMode() {
  const context = useContext(DarkModeContext)
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider')
  }
  return context
}
