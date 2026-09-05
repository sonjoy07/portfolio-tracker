import { useCallback, useEffect, useState } from 'react'

interface UseThemeResult {
  dark: boolean
  toggleDark: () => void
}

export function useTheme(): UseThemeResult {
  const [dark, setDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') return true
    if (stored === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const toggleDark = useCallback(() => setDark((value) => !value), [])

  return { dark, toggleDark }
}