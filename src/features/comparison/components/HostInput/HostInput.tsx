import { useCallback, useState } from 'react'
import { parseHosts, validateHost } from '../../services/hostParser'
import HostInputField from './HostInputField'
import './HostInput.css'

export interface HostInputProps {
  hosts: Array<{ id: string; value: string; isReference: boolean }>
  onHostsChange: (hosts: Array<{ id: string; value: string; isReference: boolean }>) => void
}

export default function HostInput({ hosts, onHostsChange }: Readonly<HostInputProps>) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null)

  const handleAddHosts = useCallback(() => {
    if (!inputValue.trim()) {
      setError('Please enter at least one host')
      return
    }

    // Parse comma-separated hosts
    const parsed = parseHosts(inputValue)

    // Validate each host
    const errors: string[] = []
    parsed.forEach((host, index) => {
      const validation = validateHost(host.original)
      if (!validation.valid) {
        errors.push(`Host ${index + 1}: ${validation.error}`)
      }
    })

    if (errors.length > 0) {
      setError(errors.join(', '))
      return
    }

    // Skip duplicates by normalized URL
    const existingNormalized = new Set(hosts.map(h => {
      const p = parseHosts([h.value])[0]
      return p.normalized
    }))
    const unique = parsed.filter(h => !existingNormalized.has(h.normalized))
    const skipped = parsed.filter(h => existingNormalized.has(h.normalized))

    if (skipped.length > 0) {
      setDuplicateNotice(`Already in list (skipped): ${skipped.map(h => h.normalized).join(', ')}`)
    } else {
      setDuplicateNotice(null)
    }

    if (unique.length === 0) {
      setInputValue('')
      setError(null)
      return
    }

    // Add new hosts (first one becomes reference if no reference exists)
    const hasReference = hosts.some(h => h.isReference)
    const newHosts = unique.map((host, index) => ({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `host-${Date.now()}-${index}`,
      value: host.normalized,
      isReference: !hasReference && index === 0
    }))

    onHostsChange([...hosts, ...newHosts])
    setInputValue('')
    setError(null)
  }, [inputValue, hosts, onHostsChange])

  const handleRemoveHost = useCallback((id: string) => {
    const newHosts = hosts.filter(h => h.id !== id)

    // If we removed the reference host, make first remaining host the reference
    const removedWasReference = hosts.find(h => h.id === id)?.isReference
    if (removedWasReference && newHosts.length > 0) {
      newHosts[0].isReference = true
    }

    onHostsChange(newHosts)
  }, [hosts, onHostsChange])

  const handleToggleReference = useCallback((id: string) => {
    const newHosts = hosts.map(host => ({
      ...host,
      isReference: host.id === id
    }))
    onHostsChange(newHosts)
  }, [hosts, onHostsChange])

  const handleUpdateHost = useCallback((id: string, value: string) => {
    const validation = validateHost(value)
    if (!validation.valid) {
      setError(validation.error || 'Invalid host')
      return
    }

    const newHosts = hosts.map(host =>
      host.id === id ? { ...host, value } : host
    )
    onHostsChange(newHosts)
    setError(null)
  }, [hosts, onHostsChange])

  return (
    <div className="host-input">
      <div className="host-input-header">
        <label htmlFor="host-input-field">Hosts</label>
        <div className="host-input-header-right">
          <span className="host-input-hint">
            Enter hostnames or URLs (comma-separated)
          </span>
          {hosts.length > 0 && (
            <button
              type="button"
              className="list-clear-button"
              onClick={() => onHostsChange([])}
              title="Remove all hosts"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="host-input-add">
        <input
          id="host-input-field"
          type="text"
          className="host-input-field"
          placeholder="api1.com, https://api2.com, https://api3.com/api"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAddHosts()
            }
          }}
        />
        <button
          type="button"
          className="host-input-add-button"
          onClick={handleAddHosts}
        >
          Add Hosts
        </button>
      </div>

      {error && <div className="host-input-error">{error}</div>}
      {duplicateNotice && <div className="duplicate-notice">{duplicateNotice}</div>}

      <div className="host-input-list">
        {hosts.map((host, index) => (
          <HostInputField
            key={host.id}
            host={host}
            index={index}
            onRemove={() => handleRemoveHost(host.id)}
            onToggleReference={() => handleToggleReference(host.id)}
            onUpdate={(value) => handleUpdateHost(host.id, value)}
          />
        ))}
      </div>

      {hosts.length === 0 && (
        <div className="host-input-empty">
          No hosts added. Add at least one host to compare.
        </div>
      )}
    </div>
  )
}
