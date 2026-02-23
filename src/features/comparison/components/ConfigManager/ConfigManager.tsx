import { useRef, useState } from 'react'
import { useComparisonStore } from '../../store/comparisonStore'
import type { Host, CurlCommand } from '@/shared/types'
import { parseHosts } from '../../services/hostParser'
import { EditableLabel } from '@/shared/components/EditableLabel/EditableLabel'
import './ConfigManager.css'

/** Simplified export format: reference host prefixed with *, no ids, no normalizedUrl */
export interface ExportConfig {
  hosts: string[]
  curlCommands: string[]
  createdAt: string
  description?: string
}

const REF_PREFIX = '*'

export const ConfigManager = () => {
  const { hosts, curlCommands, setHosts, setCurlCommands } = useComparisonStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null)
  const [description, setDescription] = useState<string>('')

  const handleExport = async () => {
    const exportHosts: string[] = hosts.map(h =>
      h.isReference ? REF_PREFIX + h.value : h.value
    )
    const exportCurls: string[] = curlCommands.map(c => c.value)

    const data: ExportConfig = {
      hosts: exportHosts,
      curlCommands: exportCurls,
      createdAt: new Date().toISOString(),
      description: description.trim() || undefined
    }

    const jsonString = JSON.stringify(data, null, 2)
    const timestamp = new Date().toISOString().split('T')[0]
    const defaultFilename = `config-${timestamp}.rrc.json`

    try {
      // @ts-expect-error - showSaveFilePicker is not yet in all TS definitions
      if (window.showSaveFilePicker) {
        // @ts-expect-error - showSaveFilePicker is not yet in all TS definitions
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultFilename,
          types: [{
            description: 'RRC Configuration File',
            accept: { 'application/json': ['.rrc.json'] },
          }],
        })
        const writable = await handle.createWritable()
        await writable.write(jsonString)
        await writable.close()
      } else {
        // Fallback for browsers that don't support the File System Access API
        const file = new File([jsonString], defaultFilename, { type: 'application/json' })
        const url = URL.createObjectURL(file)
        const link = document.createElement('a')
        link.href = url
        link.download = defaultFilename
        link.rel = 'noopener'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => URL.revokeObjectURL(url), 500)
      }
    } catch (err) {
      // User cancelled or other error
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Export failed:', err)
        setError('Failed to save file.')
      }
    }
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
    setDuplicateNotice(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const raw = JSON.parse(content)

        // Validate basic structure
        if (typeof raw !== 'object' || raw === null || !Array.isArray(raw.hosts) || !Array.isArray(raw.curlCommands)) {
          throw new Error('Invalid configuration file format. Missing or invalid hosts/curlCommands arrays.')
        }

        const importedHostStrings: string[] = raw.hosts.filter((h: unknown) => typeof h === 'string')
        const importedCurlStrings: string[] = raw.curlCommands.filter((c: unknown) => typeof c === 'string')
        const importedDescription = typeof raw.description === 'string' ? raw.description : ''

        // --- Merge Hosts ---
        const seenHostValues = new Set(hosts.map(h => h.value))
        let skippedHosts = 0
        const refValueFromFile = importedHostStrings.find(s => s.startsWith(REF_PREFIX))?.slice(REF_PREFIX.length)

        const newHosts: Host[] = []
        for (const hostStr of importedHostStrings) {
          const value = hostStr.startsWith(REF_PREFIX) ? hostStr.slice(REF_PREFIX.length) : hostStr
          if (seenHostValues.has(value)) {
            skippedHosts++
            continue
          }
          seenHostValues.add(value)
          const [parsed] = parseHosts([value])
          newHosts.push({
            id: crypto.randomUUID(),
            value,
            isReference: value === refValueFromFile,
            normalizedUrl: parsed.normalized
          })
        }

        // If a reference host was imported, no existing hosts can be reference
        const existingHosts = refValueFromFile ? hosts.map(h => ({ ...h, isReference: false })) : hosts
        const mergedHosts = [...existingHosts, ...newHosts]

        // --- Merge cURL Commands ---
        const seenCurlValues = new Set(curlCommands.map(c => c.value))
        let skippedCurls = 0
        const newCurls: CurlCommand[] = []
        for (const curlStr of importedCurlStrings) {
          if (seenCurlValues.has(curlStr)) {
            skippedCurls++
            continue
          }
          seenCurlValues.add(curlStr)
          newCurls.push({
            id: crypto.randomUUID(),
            value: curlStr
          })
        }

        // --- Update State ---
        if (newHosts.length > 0) setHosts(mergedHosts)
        if (newCurls.length > 0) setCurlCommands([...curlCommands, ...newCurls])
        if (importedDescription) setDescription(importedDescription)

        // --- Report to User ---
        const parts: string[] = []
        if (newHosts.length > 0 || newCurls.length > 0) {
          parts.push(`Added: ${newHosts.length} host(s), ${newCurls.length} command(s).`)
          setSuccess(parts[0])
          setTimeout(() => setSuccess(null), 4000)
        }
        if (skippedHosts > 0 || skippedCurls > 0) {
          const notice = `Skipped as duplicates: ${skippedHosts} host(s), ${skippedCurls} command(s).`
          setDuplicateNotice(notice)
        }

      } catch (err) {
        console.error('Import failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to parse configuration file')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="config-manager">
      <div className="config-main-actions">
        <div className="config-description-wrapper">
            <EditableLabel
              initialValue={description}
              placeholder="Project description (optional)"
              onSave={setDescription}
            />
        </div>
        <div className="config-buttons">
            <button
              className="config-btn config-btn-export-new"
              onClick={handleExport}
              title="Export current configuration to .rrc.json file"
              disabled={hosts.length === 0 && curlCommands.length === 0}
            >
              <span className="config-btn-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-4.75a.75.75 0 001.5 0V9.56l1.22 1.22a.75.75 0 101.06-1.06l-2.5-2.5a.75.75 0 00-1.06 0l-2.5 2.5a.75.75 0 001.06 1.06l1.22-1.22v3.69z" clipRule="evenodd" />
                </svg>
              </span>
              Export Config
            </button>

            <button
              className="config-btn config-btn-import-new"
              onClick={handleImportClick}
              title="Import configuration from .rrc.json file"
            >
              <span className="config-btn-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm.75 4.75a.75.75 0 00-1.5 0v4.69L8.03 9.72a.75.75 0 00-1.06 1.06l2.5 2.5a.75.75 0 001.06 0l2.5-2.5a.75.75 0 00-1.06-1.06L10.75 11.44V6.75z" clipRule="evenodd" />
                </svg>
              </span>
              Import Config
            </button>
        </div>
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
