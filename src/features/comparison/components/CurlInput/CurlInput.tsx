import { useState, useCallback, useRef } from 'react'
import type { CurlCommand } from '@/shared/types'
import { validateCurl, hasHostPlaceholder, autoDetectHostPlaceholder } from '../../services/curlParser'
import './CurlInput.css'

interface CurlInputProps {
  curlCommands: CurlCommand[]
  onCurlCommandsChange: (commands: CurlCommand[]) => void
}

export default function CurlInput({ curlCommands, onCurlCommandsChange }: CurlInputProps) {
  const [mode, setMode] = useState<'textarea' | 'file'>('textarea')
  const [textareaValue, setTextareaValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<{ original: string; detected: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addCommands = useCallback((commands: string[]) => {
    const newCommands: CurlCommand[] = []
    const validationErrors: string[] = []

    commands.forEach((cmd, index) => {
      const trimmed = cmd.trim()
      if (!trimmed) return

      const validation = validateCurl(trimmed)
      if (!validation.valid) {
        validationErrors.push(`Command ${index + 1}: ${validation.error}`)
        return
      }

      if (!hasHostPlaceholder(trimmed)) {
        const detected = autoDetectHostPlaceholder(trimmed)
        setWarning({ original: trimmed, detected })
        return // Stop processing to show warning
      }

      newCommands.push({
        id: `curl-${Date.now()}-${index}`,
        value: trimmed
      })
    })

    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'))
      return
    }

    if (newCommands.length > 0) {
      onCurlCommandsChange([...curlCommands, ...newCommands])
      setTextareaValue('')
      setError(null)
    }
  }, [curlCommands, onCurlCommandsChange])

  const handleAddFromTextarea = () => {
    const commands = textareaValue.split('\n').filter(cmd => cmd.trim())
    addCommands(commands)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const commands = content.split('\n').filter(cmd => cmd.trim())
      addCommands(commands)
    }
    reader.readAsText(file)
  }

  const handleRemoveCommand = (id: string) => {
    onCurlCommandsChange(curlCommands.filter(c => c.id !== id))
  }

  const handleWarningAccept = () => {
    if (warning) {
      const newCommand: CurlCommand = {
        id: `curl-${Date.now()}`,
        value: warning.detected
      }
      onCurlCommandsChange([...curlCommands, newCommand])
      setWarning(null)
    }
  }

  return (
    <div className="curl-input">
      <div className="curl-input-header">
        <label>cURL Commands</label>
        <div className="curl-mode-toggle">
          <button
            className={mode === 'textarea' ? 'active' : ''}
            onClick={() => setMode('textarea')}
          >
            Text
          </button>
          <button
            className={mode === 'file' ? 'active' : ''}
            onClick={() => setMode('file')}
          >
            File
          </button>
        </div>
      </div>

      {mode === 'textarea' ? (
        <div className="curl-textarea-section">
          <textarea
            className="curl-textarea"
            placeholder="Paste cURL commands here, one per line. Use {host} as a placeholder for hosts."
            value={textareaValue}
            onChange={(e) => setTextareaValue(e.target.value)}
          />
          <button
            className="curl-add-button"
            onClick={handleAddFromTextarea}
          >
            Add cURL Commands
          </button>
        </div>
      ) : (
        <div className="curl-file-section">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".txt,.sh"
            style={{ display: 'none' }}
          />
          <button
            className="curl-file-button"
            onClick={() => fileInputRef.current?.click()}
          >
            Select File
          </button>
          <p>Upload a text file with one cURL command per line.</p>
        </div>
      )}

      {error && <div className="curl-error">{error}</div>}

      {curlCommands.length > 0 && (
        <div className="curl-list">
          <h4>Added Commands</h4>
          <ul>
            {curlCommands.map((cmd, index) => (
              <li key={cmd.id}>
                <span className="curl-line-number">{index + 1}</span>
                <code className="curl-command-value">{cmd.value}</code>
                <button
                  className="curl-remove-button"
                  onClick={() => handleRemoveCommand(cmd.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {warning && (
        <div className="App-warning-modal">
          <div className="App-warning-content">
            <h3>Missing {`{host}`} Placeholder</h3>
            <p>The cURL command you entered does not contain the {`{host}`} placeholder.</p>
            <p><strong>Original command:</strong></p>
            <code>{warning.original}</code>
            <p>We can attempt to automatically detect and replace the hostname for you:</p>
            <p><strong>Suggested command:</strong></p>
            <code>{warning.detected}</code>
            <div className="App-warning-actions">
              <button onClick={handleWarningAccept}>Accept & Add</button>
              <button onClick={() => setWarning(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
