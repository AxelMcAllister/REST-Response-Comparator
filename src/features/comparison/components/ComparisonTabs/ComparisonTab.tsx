import type { ComparisonResult } from '@/shared/types'
import { MultiHostDiffViewer } from '../MultiHostDiffViewer/MultiHostDiffViewer'
import { useComparisonExecution } from '../../hooks/useComparisonExecution'
import './ComparisonTabs.css'

const METHOD_CLASS: Record<string, string> = {
  GET: 'method-get',
  POST: 'method-post',
  PUT: 'method-put',
  DELETE: 'method-delete',
  PATCH: 'method-patch',
}

export const ComparisonTab = ({ comparison }: { comparison: ComparisonResult }) => {
  const { executeSingle } = useComparisonExecution()

  return (
    <div className="ctab-content">
      <div className="ctab-info">
        <div>
          <h3 className="ctab-heading">
            <span className={`method-badge ${METHOD_CLASS[comparison.parsedCurl.method] ?? 'method-other'}`}>
              {comparison.parsedCurl.method}
            </span>
            <span className="ctab-url">{comparison.parsedCurl.url}</span>
          </h3>
          <p className="ctab-meta">
            {comparison.hostResponses.length} host{comparison.hostResponses.length === 1 ? '' : 's'} compared
            &nbsp;·&nbsp;
            {new Date(comparison.timestamp).toLocaleTimeString()}
          </p>
        </div>

        <button
          className="ctab-rerun-btn"
          onClick={() => executeSingle(comparison.id)}
          disabled={comparison.status === 'loading'}
          title="Re-run this comparison only"
        >
          {comparison.status === 'loading' ? 'Running...' : '↻ Rerun'}
        </button>
      </div>

      <div className="ctab-viewer">
        <MultiHostDiffViewer comparison={comparison} />
      </div>
    </div>
  )
}
