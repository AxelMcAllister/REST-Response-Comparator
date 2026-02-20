import { useState } from 'react'
import './HostInput.css'

export interface HostInputFieldProps {
  host: { id: string; value: string; isReference: boolean }
  onRemove: () => void
  onToggleReference: () => void
  onUpdate: (value: string) => void
}

export default function HostInputField({
  host,
  onRemove,
  onToggleReference,
  onUpdate
}: HostInputFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(host.value)

  const handleSave = () => {
    if (editValue.trim() !== host.value) {
      onUpdate(editValue.trim())
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(host.value)
    setIsEditing(false)
  }

  return (
    <div className={`host-field ${host.isReference ? 'host-field-reference' : ''}`}>
      <button
        type="button"
        className="host-field-reference-button"
        onClick={onToggleReference}
        title={host.isReference ? 'Reference host (click to change)' : 'Click to set as reference'}
        aria-label={host.isReference ? 'Reference host' : 'Set as reference'}
      >
        {host.isReference ? '⭐' : '☆'}
      </button>

      {isEditing ? (
        <div className="host-field-edit">
          <input
            type="text"
            className="host-field-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') handleCancel()
            }}
            autoFocus
          />
          <button
            type="button"
            className="host-field-save"
            onClick={handleSave}
          >
            ✓
          </button>
          <button
            type="button"
            className="host-field-cancel"
            onClick={handleCancel}
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="host-field-display">
          <span
            className="host-field-value"
            onClick={() => setIsEditing(true)}
            title="Click to edit"
          >
            {host.value}
          </span>
          {host.isReference && (
            <span className="host-field-reference-label">Reference</span>
          )}
        </div>
      )}

      <button
        type="button"
        className="host-field-remove"
        onClick={onRemove}
        title="Remove host"
        aria-label="Remove host"
      >
        ×
      </button>
    </div>
  )
}
