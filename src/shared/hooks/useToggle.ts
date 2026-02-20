import { useCallback, useState } from 'react'

/**
 * Reusable toggle hook following best practices
 * Uses functional setState for stable callbacks
 */
export function useToggle(initialState = false) {
  const [isOn, setIsOn] = useState(initialState)

  const toggle = useCallback(() => {
    setIsOn((prev) => !prev)
  }, [])

  const setOn = useCallback(() => {
    setIsOn(true)
  }, [])

  const setOff = useCallback(() => {
    setIsOn(false)
  }, [])

  return { isOn, toggle, setOn, setOff } as const
}
