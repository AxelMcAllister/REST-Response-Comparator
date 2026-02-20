import { useCallback, useRef, useState } from 'react'
import { autoDetectHostPlaceholder, hasHostPlaceholder, validateCurl } from '../../services/curlParser'
import type { CurlCommand } from '@/shared/types'
import './CurlInput.css'

export interface CurlInputProps {
    curlCommands: CurlCommand[]
    onCurlCommandsChange: (commands: CurlCommand[]) => void
}

function generateId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `curl-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

interface MissingHostState {
    id: string
    original: string
    autoDetected: string
}

export default function CurlInput({
    curlCommands,
    onCurlCommandsChange,
}: Readonly<CurlInputProps>) {
    const [missingHost, setMissingHost] = useState<MissingHostState | null>(null)
    const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
    const fileInputRef = useRef<HTMLInputElement>(null)

    // ── Row operations ──────────────────────────────────────────────────────────

    const handleAddRow = useCallback(() => {
        const newCmd: CurlCommand = { id: generateId(), value: '' }
        onCurlCommandsChange([...curlCommands, newCmd])
    }, [curlCommands, onCurlCommandsChange])

    const handleRowChange = useCallback((id: string, value: string) => {
        const updated = curlCommands.map(cmd => cmd.id === id ? { ...cmd, value } : cmd)
        onCurlCommandsChange(updated)
        // Clear row error as user types
        if (rowErrors[id]) {
            setRowErrors(prev => {
                const next = { ...prev }
                delete next[id]
                return next
            })
        }
    }, [curlCommands, onCurlCommandsChange, rowErrors])

    const handleRowBlur = useCallback((id: string, value: string) => {
        if (!value.trim()) return

        const validation = validateCurl(value)
        if (!validation.valid) {
            setRowErrors(prev => ({ ...prev, [id]: validation.error ?? 'Invalid cURL command' }))
            return
        }

        if (!hasHostPlaceholder(value)) {
            const autoDetected = autoDetectHostPlaceholder(value)
            setMissingHost({ id, original: value, autoDetected })
        }
    }, [])

    const handleRemoveRow = useCallback((id: string) => {
        onCurlCommandsChange(curlCommands.filter(cmd => cmd.id !== id))
        setRowErrors(prev => {
            const next = { ...prev }
            delete next[id]
            return next
        })
    }, [curlCommands, onCurlCommandsChange])

    // ── Auto-detect modal ────────────────────────────────────────────────────────

    const handleAcceptAutoDetect = useCallback(() => {
        if (!missingHost) return
        const updated = curlCommands.map(cmd =>
            cmd.id === missingHost.id ? { ...cmd, value: missingHost.autoDetected } : cmd
        )
        onCurlCommandsChange(updated)
        setMissingHost(null)
    }, [missingHost, curlCommands, onCurlCommandsChange])

    const handleRejectAutoDetect = useCallback(() => {
        setMissingHost(null)
    }, [])

    // ── File upload ──────────────────────────────────────────────────────────────

    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            const content = e.target?.result as string
            if (!content) return

            const lines = content
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && !line.startsWith('#'))

            const newCommands: CurlCommand[] = lines
                .filter(line => validateCurl(line).valid)
                .map(line => ({
                    id: generateId(),
                    // Auto-apply {host} detection silently for bulk uploads
                    value: hasHostPlaceholder(line) ? line : autoDetectHostPlaceholder(line),
                }))

            if (newCommands.length > 0) {
                onCurlCommandsChange([...curlCommands, ...newCommands])
            }

            // Reset file input
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
        reader.onerror = () => {
            console.error('Failed to read file')
        }
        reader.readAsText(file)
    }, [curlCommands, onCurlCommandsChange])

    // ── Render ───────────────────────────────────────────────────────────────────

    return (
        <div className="curl-input">
            <div className="curl-input-header">
                <label className="curl-input-label">cURL Commands</label>
                <span className="curl-input-hint">
                    Use <code>{'{host}'}</code> as placeholder for the host (e.g.{' '}
                    <code>curl https://&#123;host&#125;/api/users</code>)
                </span>
            </div>

            <div className="curl-input-rows">
                {curlCommands.length === 0 && (
                    <div className="curl-input-empty">
                        No commands yet — click <strong>+ Add cURL</strong> to add one, or upload a file.
                    </div>
                )}

                {curlCommands.map((cmd, index) => (
                    <div key={cmd.id} className={`curl-row${rowErrors[cmd.id] ? ' curl-row-has-error' : ''}`}>
                        <span className="curl-row-index">{index + 1}</span>
                        <textarea
                            className="curl-row-textarea"
                            value={cmd.value}
                            placeholder={`curl https://{host}/api/endpoint`}
                            onChange={(e) => handleRowChange(cmd.id, e.target.value)}
                            onBlur={(e) => handleRowBlur(cmd.id, e.target.value)}
                            rows={1}
                            spellCheck={false}
                            aria-label={`cURL command ${index + 1}`}
                        />
                        <button
                            type="button"
                            className="curl-row-remove"
                            onClick={() => handleRemoveRow(cmd.id)}
                            title="Remove this command"
                            aria-label={`Remove cURL command ${index + 1}`}
                        >
                            ×
                        </button>
                        {rowErrors[cmd.id] && (
                            <p className="curl-row-error-msg" role="alert">{rowErrors[cmd.id]}</p>
                        )}
                    </div>
                ))}
            </div>

            <div className="curl-input-actions">
                <button type="button" className="curl-add-btn" onClick={handleAddRow}>
                    + Add cURL
                </button>
                <label className="curl-upload-btn">
                    📁 Upload File
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.curl"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                    />
                </label>
            </div>

            {/* Missing {host} modal */}
            {missingHost && (
                <div className="curl-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="curl-modal-title">
                    <div className="curl-modal">
                        <h3 className="curl-modal-title" id="curl-modal-title">
                            Missing <code>{'{host}'}</code> Placeholder
                        </h3>
                        <p>This command doesn't contain a <code>{'{host}'}</code> placeholder:</p>
                        <pre className="curl-modal-code">{missingHost.original}</pre>
                        <p>Suggested replacement (hostname extracted automatically):</p>
                        <pre className="curl-modal-code curl-modal-code-detected">{missingHost.autoDetected}</pre>
                        <div className="curl-modal-actions">
                            <button type="button" className="curl-modal-cancel" onClick={handleRejectAutoDetect}>
                                Cancel
                            </button>
                            <button type="button" className="curl-modal-accept" onClick={handleAcceptAutoDetect}>
                                Accept &amp; Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
