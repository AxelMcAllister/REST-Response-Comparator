import { EditableLabel } from '@/shared/components/EditableLabel/EditableLabel';
import type { CurlCommand } from '@/shared/types';
import './CurlInput.css';

interface CurlCommandRowProps {
  command: CurlCommand;
  index: number;
  onUpdate: (id: string, value: string) => void;
  onRemove: (id: string) => void;
}

export const CurlCommandRow = ({ command, index, onUpdate, onRemove }: CurlCommandRowProps) => {
  return (
    <li className="curl-list-item">
      <span className="curl-line-number">{index + 1}</span>
      <div className="curl-command-input-wrapper">
        <EditableLabel
          initialValue={command.value}
          placeholder="Enter cURL command"
          onSave={(newValue) => onUpdate(command.id, newValue)}
        />
      </div>
      <button
        className="curl-remove-button"
        onClick={() => onRemove(command.id)}
        title="Remove command"
      >
        ×
      </button>
    </li>
  );
};
