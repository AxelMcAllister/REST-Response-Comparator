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

        // Update store
        setHosts(data.hosts)
        setCurlCommands(data.curlCommands)
        setSuccess('Configuration imported successfully!')
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000)
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
    </div>
  )
}
