import { useState, useCallback, useRef, useEffect } from 'react'
import type { CurlCommand } from '@/shared/types'
import { validateCurl, hasHostPlaceholder, autoDetectHostPlaceholder, normalizeCurlCommand } from '../../services/curlParser'
import LineNumberedTextarea from './LineNumberedTextarea'
import { CurlCommandRow } from './CurlCommandRow'
import './CurlInput.css'

interface ParsedCommand {
  command: string
  /** 1-based line number in the original text where this command started */
  startLine: number
}

interface CommandWarning {
  id?: string; // ID of the command being updated, if applicable
  original: string;
  detected: string;
}

function splitCurlCommands(text: string): ParsedCommand[] {
  const lines = text.split('\n')
  const commands: ParsedCommand[] = []
  let current = ''
  let currentStartLine = 0

  lines.forEach((line, idx) => {
    const trimmedLine = line.trimEnd()
    if (!trimmedLine && !current) return

    if (current) {
      current += '\n' + trimmedLine
    } else {
      current = trimmedLine
      currentStartLine = idx + 1
    }

    if (!trimmedLine.endsWith('\\')) {
      const normalized = normalizeCurlCommand(current)
      if (normalized) commands.push({ command: normalized, startLine: currentStartLine })
      current = ''
    }
  })

  if (current) {
    const normalized = normalizeCurlCommand(current)
    if (normalized) commands.push({ command: normalized, startLine: currentStartLine })
  }

  return commands
}

interface CurlInputProps {
  curlCommands: CurlCommand[]
  onCurlCommandsChange: (commands: CurlCommand[]) => void
}

export default function CurlInput({ curlCommands, onCurlCommandsChange }: CurlInputProps) {
  const [textareaValue, setTextareaValue] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null)
  const [warning, setWarning] = useState<CommandWarning[]>([])
  const isAddingLocally = useRef(false)

  useEffect(() => {
    if (isAddingLocally.current) {
      isAddingLocally.current = false
      return
    }
    setErrors([])
  }, [curlCommands])

  const addCommands = useCallback((parsedCommands: ParsedCommand[]) => {
    const newCommands: CurlCommand[] = []
    const validationErrors: string[] = []
    const missingHostQueue: CommandWarning[] = []
    const duplicateSkipped: string[] = []

    const location = (startLine: number) => `Input line ${startLine}`

    parsedCommands.forEach(({ command, startLine }, index) => {
      const trimmed = command.trim()
      if (!trimmed) return

      const validation = validateCurl(trimmed)
      if (!validation.valid) {
        validationErrors.push(`${location(startLine)}: ${validation.error}`)
        return
      }

      if (!hasHostPlaceholder(trimmed)) {
        const detected = autoDetectHostPlaceholder(trimmed)
        missingHostQueue.push({ original: trimmed, detected })
        return
      }

      const existingCurls = new Set(curlCommands.map(c => c.value))
      if (existingCurls.has(trimmed)) {
        duplicateSkipped.push(trimmed)
        return
      }

      newCommands.push({
        id: `curl-${Date.now()}-${index}`,
        value: trimmed
      })
    })

    if (missingHostQueue.length > 0) {
      setWarning(prev => [...prev, ...missingHostQueue])
    }

    if (newCommands.length > 0) {
      isAddingLocally.current = true
      onCurlCommandsChange([...curlCommands, ...newCommands])
      setTextareaValue('')
    }

    if (duplicateSkipped.length > 0) {
      setDuplicateNotice(`${duplicateSkipped.length} duplicate ${duplicateSkipped.length === 1 ? 'command' : 'commands'} skipped (already in list)`)
    } else {
      setDuplicateNotice(null)
    }

    setErrors(validationErrors)
  }, [curlCommands, onCurlCommandsChange])

  const handleAddFromTextarea = () => {
    const commands = splitCurlCommands(textareaValue)
    addCommands(commands)
  }

  const handleUpdateCommand = (id: string, value: string) => {
    // 1. Validate syntax
    const validation = validateCurl(value)
    if (!validation.valid) {
      setErrors([`Update failed: ${validation.error}`])
      return
    }

    // 2. Check for {host} placeholder
    if (!hasHostPlaceholder(value)) {
      const detected = autoDetectHostPlaceholder(value);
      setWarning(prev => [...prev, { id, original: value, detected }]);
      return;
    }

    // 3. Update if valid
    const updatedCommands = curlCommands.map(cmd => cmd.id === id ? { ...cmd, value } : cmd)
    onCurlCommandsChange(updatedCommands)
    setErrors([]) // Clear errors on successful update
  }

  const handleRemoveCommand = (id: string) => {
    onCurlCommandsChange(curlCommands.filter(c => c.id !== id))
  }

  const handleRemoveError = (index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index))
  }

  const handleWarningAccept = () => {
    const [current, ...rest] = warning
    if (current) {
      const alreadyExists = curlCommands.some(c => c.value === current.detected)
      if (alreadyExists) {
        setDuplicateNotice('Duplicate command skipped (already in list)')
      } else {
        if (current.id) {
          // This was an update
          const updatedCommands = curlCommands.map(cmd => cmd.id === current.id ? { ...cmd, value: current.detected } : cmd)
          onCurlCommandsChange(updatedCommands)
          setErrors([])
        } else {
          // This was a new command
          onCurlCommandsChange([...curlCommands, {
            id: `curl-${Date.now()}`,
            value: current.detected
          }])
        }
        setDuplicateNotice(null)
      }
    }
    setWarning(rest)
  }

  const handleWarningSkip = () => {
    setWarning(prev => prev.slice(1))
  }

  return (
    <div className="curl-input">
      <div className="curl-input-header">
        <label>cURL Commands</label>
      </div>

      <div className="curl-textarea-section">
        <LineNumberedTextarea
          placeholder="Paste cURL commands here, one per line. Use {host} as a placeholder for hosts."
          value={textareaValue}
          onChange={setTextareaValue}
        />
        <button
          className="curl-add-button"
          onClick={handleAddFromTextarea}
        >
          Add cURL Commands
        </button>
      </div>

      {errors.length > 0 && (
        <div className="curl-error-container">
          {errors.map((error, index) => (
            <div key={index} className="curl-error">
              {error}
              <button
                className="curl-error-remove-button"
                onClick={() => handleRemoveError(index)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {duplicateNotice && <div className="duplicate-notice">{duplicateNotice}</div>}

      {curlCommands.length > 0 && (
        <div className="curl-list">
          <div className="curl-list-header">
            <h4>Added Commands</h4>
            <button
              type="button"
              className="list-clear-button"
              onClick={() => onCurlCommandsChange([])}
              title="Remove all commands"
            >
              Clear
            </button>
          </div>
          <ul>
            {curlCommands.map((cmd, index) => (
              <CurlCommandRow
                key={cmd.id}
                command={cmd}
                index={index}
                onUpdate={handleUpdateCommand}
                onRemove={handleRemoveCommand}
              />
            ))}
          </ul>
        </div>
      )}

      {warning.length > 0 && (() => {
        const current = warning[0]
        const remaining = warning.length
        return (
          <div className="App-warning-modal">
            <div className="App-warning-content">
              <h3>Missing {`{host}`} Placeholder{remaining > 1 ? ` (${remaining} remaining)` : ''}</h3>
              <p>The cURL command does not contain the {`{host}`} placeholder.</p>
              <p><strong>Original command:</strong></p>
              <code>{current.original}</code>
              <p>We can attempt to automatically detect and replace the hostname for you:</p>
              <p><strong>Suggested command:</strong></p>
              <code>{current.detected}</code>
              <div className="App-warning-actions">
                <button onClick={handleWarningAccept}>Accept &amp; Add</button>
                <button onClick={handleWarningSkip}>Skip</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
