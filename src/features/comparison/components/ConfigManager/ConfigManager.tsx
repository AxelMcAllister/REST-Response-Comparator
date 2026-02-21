import { useRef, useState } from 'react'
import { useComparisonStore } from '../../store/comparisonStore'
import type { Host, CurlCommand } from '@/shared/types'
import './ConfigManager.css'

interface ConfigData {
  hosts: Host[]
  curlCommands: CurlCommand[]
  version: number
}

export const ConfigManager = () => {
  const { hosts, curlCommands, setHosts, setCurlCommands } = useComparisonStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null)

  const handleExport = () => {
    const data: ConfigData = {
      hosts,
      curlCommands,
      version: 1
    }

    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `config-${timestamp}.rrc.json`

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
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

    // Validate file extension
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
        const data = JSON.parse(content) as ConfigData

        // Basic validation
        if (!Array.isArray(data.hosts) || !Array.isArray(data.curlCommands)) {
          throw new Error('Invalid configuration file format. Missing hosts or curlCommands arrays.')
        }

        // --- Deduplicate hosts ---
        // Seed with what's already in the store; grow as we accept each import entry
        const seenHostValues = new Set(hosts.map(h => h.value))
        const newHosts: typeof data.hosts = []
        let skippedHosts = 0
        for (const h of data.hosts) {
          if (seenHostValues.has(h.value)) {
            skippedHosts++
          } else {
            seenHostValues.add(h.value)
            newHosts.push(h)
          }
        }

        // --- Deduplicate curl commands ---
        const seenCurlValues = new Set(curlCommands.map(c => c.value))
        const newCurls: typeof data.curlCommands = []
        let skippedCurls = 0
        for (const c of data.curlCommands) {
          if (seenCurlValues.has(c.value)) {
            skippedCurls++
          } else {
            seenCurlValues.add(c.value)
            newCurls.push(c)
          }
        }

        // Merge into existing state
        if (newHosts.length > 0) setHosts([...hosts, ...newHosts])
        if (newCurls.length > 0) setCurlCommands([...curlCommands, ...newCurls])

        // Build summary
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
