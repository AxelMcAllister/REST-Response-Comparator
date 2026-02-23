import { EditableLabel } from '@/shared/components/EditableLabel/EditableLabel'
import './HostInput.css'

interface HostInputFieldProps {
  host: { id: string; value: string; isReference: boolean }
  index: number
  onRemove: () => void
  onToggleReference: () => void
  onUpdate: (value: string) => void
}

export default function HostInputField({ host, index, onRemove, onToggleReference, onUpdate }: Readonly<HostInputFieldProps>) {
  const tag = String.fromCodePoint(65 + index)

  return (
    <div className={`host-input-field-item ${host.isReference ? 'is-reference' : ''}`}>
      <span className="host-tag">{tag}</span>
      <div className="host-input-editable-wrapper">
        <EditableLabel
          initialValue={host.value}
          placeholder="Enter host URL"
          onSave={onUpdate}
        />
      </div>
      <button
        type="button"
        className={`host-ref-badge ${host.isReference ? 'active' : ''}`}
        onClick={onToggleReference}
        title={host.isReference ? 'This is the reference host' : 'Set as reference host'}
      >
        REF
      </button>
      <button
        type="button"
        className="host-input-field-item-remove-button"
        onClick={onRemove}
        title="Remove host"
      >
        ×
      </button>
    </div>
  )
}
