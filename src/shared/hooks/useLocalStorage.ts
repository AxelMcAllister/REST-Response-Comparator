import { useCallback, useState } from 'react'

/**
 * Custom hook for localStorage with versioning and error handling
 * Follows best practices: lazy initialization, try-catch, versioned keys
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  version = 'v1'
): [T, (value: T | ((val: T) => T)) => void] {
  const versionedKey = `${key}:${version}`

  // Lazy initialization - only runs on mount
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(versionedKey)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  // Stable callback using functional setState
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value
        try {
          window.localStorage.setItem(versionedKey, JSON.stringify(newValue))
        } catch {
          // Fails in incognito, quota exceeded, or disabled
        }
        return newValue
      })
    },
    [versionedKey]
  )

  return [storedValue, setValue] as const
}
