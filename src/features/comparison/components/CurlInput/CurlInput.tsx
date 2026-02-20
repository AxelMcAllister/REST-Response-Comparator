import {useCallback, useRef, useState} from 'react'
import {autoDetectHostPlaceholder, hasHostPlaceholder, validateCurl} from '../../services/curlParser'
import './CurlInput.css'

export interface CurlInputProps {
    curlCommands: string[]
    onCurlCommandsChange: (commands: string[]) => void
    onMissingHostPlaceholder?: (command: string, autoDetected: string) => void
}

export default function CurlInput({
                                      curlCommands,
                                      onCurlCommandsChange,
                                      onMissingHostPlaceholder
                                  }: Readonly<CurlInputProps>) {
    const [textareaValue, setTextareaValue] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [inputMode, setInputMode] = useState<'textarea' | 'file'>('textarea')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleTextareaChange = useCallback((value: string) => {
        setTextareaValue(value)
        setError(null)
    }, [])

    const handleAddFromTextarea = useCallback(() => {
        if (!textareaValue.trim()) {
            setError('Please enter at least one cURL command')
            return
        }

        // Split by newlines and filter empty
        const lines = textareaValue
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)

        if (lines.length === 0) {
            setError('No valid cURL commands found')
            return
        }

        // Validate each cURL
        const validatedCommands: string[] = []
        const errors: string[] = []

        for (const line of lines) {
            const validation = validateCurl(line)
            if (!validation.valid) {
                errors.push(`Invalid cURL: ${validation.error}`)
                continue
            }

            // Check for {host} placeholder
            if (hasHostPlaceholder(line)) {
                validatedCommands.push(line)
            } else {
                // Auto-detect and warn user
                const autoDetected = autoDetectHostPlaceholder(line)
                if (onMissingHostPlaceholder) {
                    onMissingHostPlaceholder(line, autoDetected)
                    // User will decide, skip for now
                } else {
                    // Auto-apply if no handler
                    validatedCommands.push(autoDetected)
                }
            }
        }

        if (errors.length > 0) {
            setError(errors.join('; '))
        }

        if (validatedCommands.length > 0) {
            onCurlCommandsChange([...curlCommands, ...validatedCommands])
            setTextareaValue('')
            setError(null)
        }
    }, [textareaValue, curlCommands, onCurlCommandsChange, onMissingHostPlaceholder])

    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            const content = e.target?.result as string
            if (!content) {
                setError('Failed to read file')
                return
            }

            // Parse file content (one cURL per line)
            const lines = content
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && !line.startsWith('#'))

            if (lines.length === 0) {
                setError('No cURL commands found in file')
                return
            }

            // Validate and add
            const validatedCommands: string[] = []
            const errors: string[] = []

            for (const line of lines) {
                const validation = validateCurl(line)
                if (!validation.valid) {
                    errors.push(`Invalid cURL: ${validation.error}`)
                    continue
                }

                if (hasHostPlaceholder(line)) {
                    validatedCommands.push(line)
                } else {
                    const autoDetected = autoDetectHostPlaceholder(line)
                    if (onMissingHostPlaceholder) {
                        onMissingHostPlaceholder(line, autoDetected)
                    } else {
                        validatedCommands.push(autoDetected)
                    }
                }
            }

            if (errors.length > 0) {
                setError(`Some commands had errors: ${errors.join('; ')}`)
            }

            if (validatedCommands.length > 0) {
                onCurlCommandsChange([...curlCommands, ...validatedCommands])
                setError(null)
            }

            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }

        reader.onerror = () => {
            setError('Failed to read file')
        }

        reader.readAsText(file)
    }, [curlCommands, onCurlCommandsChange, onMissingHostPlaceholder])

    const handleRemoveCommand = useCallback((index: number) => {
        const newCommands = curlCommands.filter((_, i) => i !== index)
        onCurlCommandsChange(newCommands)
    }, [curlCommands, onCurlCommandsChange])

    return (
        <div className="curl-input">
            <div className="curl-input-header">
                <label htmlFor="curl-input-textarea">cURL Commands</label>
                <div className="curl-input-mode-toggle">
                    <button
                        type="button"
                        className={inputMode === 'textarea' ? 'active' : ''}
                        onClick={() => setInputMode('textarea')}
                    >
                        📝 Textarea
                    </button>
                    <button
                        type="button"
                        className={inputMode === 'file' ? 'active' : ''}
                        onClick={() => setInputMode('file')}
                    >
                        📁 Upload File
                    </button>
                </div>
            </div>

            {inputMode === 'textarea' ? (
                <div className="curl-input-textarea-container">
          <textarea
              id="curl-input-textarea"
              className="curl-input-textarea"
              placeholder={`curl https://{host}/api/users\ncurl -X POST https://{host}/api/login -H 'Content-Type: application/json' -d '{"user":"test"}'`}
              value={textareaValue}
              onChange={(e) => handleTextareaChange(e.target.value)}
              rows={6}
          />
                    <button
                        type="button"
                        className="curl-input-add-button"
                        onClick={handleAddFromTextarea}
                    >
                        Add cURL Commands
                    </button>
                </div>
            ) : (
                <div className="curl-input-file-container">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.curl"
                        onChange={handleFileUpload}
                        className="curl-input-file"
                    />
                    <p className="curl-input-file-hint">
                        Upload a text file with one cURL command per line
                    </p>
                </div>
            )}

            {error && <div className="curl-input-error">{error}</div>}

            {curlCommands.length > 0 && (
                <div className="curl-input-list">
                    <div className="curl-input-list-header">
                        <span>Added Commands ({curlCommands.length})</span>
                    </div>
                    {curlCommands.map((command, index) => (
                        <div key={index} className="curl-input-item">
                            <code className="curl-input-item-command">{command}</code>
                            <button
                                type="button"
                                className="curl-input-item-remove"
                                onClick={() => handleRemoveCommand(index)}
                                title="Remove command"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
