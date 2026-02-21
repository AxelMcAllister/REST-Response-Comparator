import { useRef, useState } from 'react'
import { useComparisonStore } from '../../store/comparisonStore'
import type { Host, CurlCommand } from '@/shared/types'
import { parseHosts } from '../../services/hostParser'
import './ConfigManager.css'

/** Simplified export format: reference host prefixed with *, no ids, no normalizedUrl */
export interface ExportConfig {
  hosts: string[]
  curlCommands: string[]
  version: number
}

const REF_PREFIX = '*'

export const ConfigManager = () => {
  const { hosts, curlCommands, setHosts, setCurlCommands } = useComparisonStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null)

  const handleExport = () => {
    const exportHosts: string[] = hosts.map(h =>
      h.isReference ? REF_PREFIX + h.value : h.value
    )
    const exportCurls: string[] = curlCommands.map(c => c.value)

    const data: ExportConfig = {
      hosts: exportHosts,
      curlCommands: exportCurls,
      version: 1
    }

    const jsonString = JSON.stringify(data, null, 2)
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `config-${timestamp}.rrc.json`
    const file = new File([jsonString], filename, { type: 'application/json' })
    const url = URL.createObjectURL(file)

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 500)
  }

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.rrc.json')) {
      setError('Invalid file type. Please select a .rrc.json file.')
      return
    }

    setError(null)
    setSuccess(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const raw = JSON.parse(content) as { hosts?: unknown[]; curlCommands?: unknown[]; version?: number }

        if (!Array.isArray(raw.hosts) || !Array.isArray(raw.curlCommands)) {
          throw new Error('Invalid configuration file format. Missing hosts or curlCommands arrays.')
        }

        // Normalize to simplified format: host strings (reference = *prefix), curl strings
        const importedHostStrings: string[] = raw.hosts.map((h: unknown) => {
          if (typeof h === 'string') return h
          if (h && typeof h === 'object' && 'value' in h && typeof (h as { value: string }).value === 'string') {
            const obj = h as { value: string; isReference?: boolean }
            return obj.isReference ? REF_PREFIX + obj.value : obj.value
          }
          throw new Error('Invalid host entry in configuration.')
        })
        const importedCurlStrings: string[] = raw.curlCommands.map((c: unknown) => {
          if (typeof c === 'string') return c
          if (c && typeof c === 'object' && 'value' in c && typeof (c as { value: string }).value === 'string') {
            return (c as { value: string }).value
          }
          throw new Error('Invalid curl command entry in configuration.')
        })

        // Build Host[] with ids and normalizedUrl (reference = *prefix in file)
        const newHosts: Host[] = []
        const seenHostValues = new Set(hosts.map(h => h.value))
        let skippedHosts = 0
        const refValueFromFile = (() => {
          const idx = importedHostStrings.findIndex(s => s.startsWith(REF_PREFIX))
          if (idx < 0) return null
          const s = importedHostStrings[idx]
          return s.slice(REF_PREFIX.length)
        })()

        for (let i = 0; i < importedHostStrings.length; i++) {
          const s = importedHostStrings[i]
          const value = s.startsWith(REF_PREFIX) ? s.slice(REF_PREFIX.length) : s
          if (seenHostValues.has(value)) {
            skippedHosts++
            continue
          }
          seenHostValues.add(value)
          const [parsed] = parseHosts([value])
          const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `host-${Date.now()}-${i}`
          newHosts.push({
            id,
            value,
            isReference: value === refValueFromFile,
            normalizedUrl: parsed.normalized
          })
        }

        const existingWithoutRef = hosts.map(h => ({ ...h, isReference: false }))
        const mergedHosts = refValueFromFile != null
          ? [...existingWithoutRef, ...newHosts]
          : [...hosts, ...newHosts]

        // Build CurlCommand[] with ids
        const seenCurlValues = new Set(curlCommands.map(c => c.value))
        const newCurls: CurlCommand[] = []
        let skippedCurls = 0
        for (let i = 0; i < importedCurlStrings.length; i++) {
          const value = importedCurlStrings[i]
          if (seenCurlValues.has(value)) {
            skippedCurls++
            continue
          }
          seenCurlValues.add(value)
          newCurls.push({
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `curl-${Date.now()}-${i}`,
            value
          })
        }

        if (newHosts.length > 0) setHosts(mergedHosts)
        if (newCurls.length > 0) setCurlCommands([...curlCommands, ...newCurls])

        const parts: string[] = []
        parts.push(`Added: ${newHosts.length} host(s), ${newCurls.length} command(s).`)
        if (skippedHosts > 0 || skippedCurls > 0) {
          parts.push(`Skipped as duplicates: ${skippedHosts} host(s), ${skippedCurls} command(s).`)
          setDuplicateNotice(parts[1])
        } else {
          setDuplicateNotice(null)
        }
        setSuccess(parts[0])
        setTimeout(() => setSuccess(null), 4000)
      } catch (err) {
        console.error('Import failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to parse configuration file')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="config-manager">
      <div className="config-actions">
        <button
          className="config-btn config-btn-export"
          onClick={handleExport}
          title="Export current configuration to .rrc.json file"
          disabled={hosts.length === 0 && curlCommands.length === 0}
        >
          ⬇ Export Config
        </button>

        <button
          className="config-btn config-btn-import"
          onClick={handleImportClick}
          title="Import configuration from .rrc.json file"
        >
          ⬆ Import Config
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".rrc.json"
          style={{ display: 'none' }}
        />
      </div>

      {error && <div className="config-message config-error">{error}</div>}
      {success && <div className="config-message config-success">{success}</div>}
      {duplicateNotice && <div className="config-message config-duplicate">{duplicateNotice}</div>}
    </div>
  )
}
