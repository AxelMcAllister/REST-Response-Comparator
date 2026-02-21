import { useState, useCallback, useRef } from 'react'
import type { CurlCommand } from '@/shared/types'
import { validateCurl, hasHostPlaceholder, autoDetectHostPlaceholder, normalizeCurlCommand } from '../../services/curlParser'
import LineNumberedTextarea from './LineNumberedTextarea'
import './CurlInput.css'

interface ParsedCommand {
  command: string
  /** 1-based line number in the original text where this command started */
  startLine: number
}

/**
 * Split raw text (textarea or file) into individual curl command objects.
 * Handles multiline continuations (lines ending with \) by grouping them
 * together into one logical command per curl invocation.
 * Each result carries the 1-based line number where the command started.
 */
function splitCurlCommands(text: string): ParsedCommand[] {
  const lines = text.split('\n')
  const commands: ParsedCommand[] = []
  let current = ''
  let currentStartLine = 0

  lines.forEach((line, idx) => {
    const trimmedLine = line.trimEnd()
    if (!trimmedLine && !current) return // skip blank lines between commands

    if (current) {
      current += '\n' + trimmedLine
    } else {
      current = trimmedLine
      currentStartLine = idx + 1 // 1-based
    }

    // If the line does NOT end with \, the command is complete
    if (!trimmedLine.endsWith('\\')) {
      const normalized = normalizeCurlCommand(current)
      if (normalized) commands.push({ command: normalized, startLine: currentStartLine })
      current = ''
    }
  })

  // Flush any remaining accumulated lines
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
  const [mode, setMode] = useState<'textarea' | 'file'>('textarea')
  const [textareaValue, setTextareaValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null)
  const [warning, setWarning] = useState<Array<{ original: string; detected: string }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addCommands = useCallback((parsedCommands: ParsedCommand[], fileName?: string) => {
    const newCommands: CurlCommand[] = []
    const validationErrors: string[] = []
    const missingHostQueue: Array<{ original: string; detected: string }> = []
    const duplicateSkipped: string[] = []

    // Build a location label for error messages
    const location = (startLine: number) =>
      fileName ? `${fileName}:${startLine}` : `Input line ${startLine}`

    parsedCommands.forEach(({ command, startLine }, index) => {
      const trimmed = command.trim()
      if (!trimmed) return

      const validation = validateCurl(trimmed)
      if (!validation.valid) {
        validationErrors.push(`${location(startLine)}: ${validation.error}`)
        return // skip this command but continue processing the rest
      }

      if (!hasHostPlaceholder(trimmed)) {
        // Always queue for the suggestion modal — same UX for single and bulk
        const detected = autoDetectHostPlaceholder(trimmed)
        // Collect into a local array; we'll enqueue after the loop
        missingHostQueue.push({ original: trimmed, detected })
        return
      }

      // Deduplicate against already-accepted commands (compare normalized strings)
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

    // Enqueue commands missing {host} — modal will show them one by one
    if (missingHostQueue.length > 0) {
      setWarning(prev => [...prev, ...missingHostQueue])
    }

    // Always add the valid commands first
    if (newCommands.length > 0) {
      onCurlCommandsChange([...curlCommands, ...newCommands])
      setTextareaValue('')
    }

    // Show duplicate notice
    if (duplicateSkipped.length > 0) {
      setDuplicateNotice(`${duplicateSkipped.length} duplicate ${duplicateSkipped.length === 1 ? 'command' : 'commands'} skipped (already in list)`)
    } else {
      setDuplicateNotice(null)
    }

    // Then surface validation errors (non-blocking)
    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'))
    } else {
      setError(null)
    }
  }, [curlCommands, onCurlCommandsChange])

  const handleAddFromTextarea = () => {
    const commands = splitCurlCommands(textareaValue)
    addCommands(commands) // no fileName → errors say "Command N"
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const commands = splitCurlCommands(content)
      addCommands(commands, file.name) // pass filename → errors say "filename:lineN"
    }
    reader.readAsText(file)
  }

  const handleRemoveCommand = (id: string) => {
    onCurlCommandsChange(curlCommands.filter(c => c.id !== id))
  }

  const handleWarningAccept = () => {
    const [current, ...rest] = warning
    if (current) {
      const alreadyExists = curlCommands.some(c => c.value === current.detected)
      if (alreadyExists) {
        setDuplicateNotice('Duplicate command skipped (already in list)')
      } else {
        onCurlCommandsChange([...curlCommands, {
          id: `curl-${Date.now()}`,
          value: current.detected
        }])
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
