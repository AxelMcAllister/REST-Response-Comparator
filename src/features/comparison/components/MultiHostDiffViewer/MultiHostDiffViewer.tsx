import { useState } from 'react'
import ReactDiffViewer from 'react-diff-viewer-continued'
import type { ComparisonResult } from '@/shared/types'
import { formatResponseData } from '../../services/diffService'
import './MultiHostDiffViewer.css'

const DIFF_STYLES = {
  variables: {
    light: {
      diffViewerBackground: '#ffffff',
      diffViewerColor: '#1e293b',
      addedBackground: '#f0fdf4',
      addedColor: '#1e293b',
      removedBackground: '#fef2f2',
      removedColor: '#1e293b',
      wordAddedBackground: '#bbf7d0',
      wordRemovedBackground: '#fecaca',
      addedGutterBackground: '#dcfce7',
      removedGutterBackground: '#fee2e2',
      gutterBackground: '#f8fafc',
      gutterBackgroundDark: '#f1f5f9',
      highlightBackground: '#fffbeb',
      highlightGutterBackground: '#fef3c7',
    },
  },
  line: {
    padding: '4px 4px',
    fontSize: '0.8rem',
    fontFamily: "'Courier New', Courier, monospace",
  },
}

export const MultiHostDiffViewer = ({ comparison }: { comparison: ComparisonResult }) => {
  const [expandedHosts, setExpandedHosts] = useState<Record<string, boolean>>({})

  const referenceHost = comparison.hostResponses.find(
    h => h.hostId === comparison.referenceHostId
  )
  const otherHosts = comparison.hostResponses.filter(
    h => h.hostId !== comparison.referenceHostId
  )

  if (!referenceHost) {
    return <div className="diff-state diff-state--info">No reference host found.</div>
  }
  if (otherHosts.length === 0) {
    return <div className="diff-state diff-state--info">No other hosts to compare against.</div>
  }

  const toggleExpand = (hostId: string) =>
    setExpandedHosts(prev => ({ ...prev, [hostId]: !prev[hostId] }))

  return (
    <div className="diff-pairs">
      {otherHosts.map(host => {
        const isExpanded = expandedHosts[host.hostId] ?? false
        const refHasError = !!referenceHost.error
        const hostHasError = !!host.error
        const refData = formatResponseData(referenceHost.response?.data)
        const hostData = formatResponseData(host.response?.data)

        return (
          <div key={host.hostId} className="diff-pair">
            {/* Header */}
            <div className="diff-pair-header">
              <div className="diff-host-info diff-host-info--ref">
                <span className="diff-ref-badge">REF</span>
                <span className="diff-host-name">{referenceHost.hostValue}</span>
                {referenceHost.responseTime != null && !refHasError && (
                  <span className="diff-timing">{referenceHost.responseTime}ms</span>
                )}
                {refHasError && <span className="diff-badge diff-badge--error">FAILED</span>}
              </div>

              <span className="diff-vs">vs</span>

              <div className="diff-host-info">
                <span className="diff-host-name">{host.hostValue}</span>
                {host.responseTime != null && !hostHasError && (
                  <span className="diff-timing">{host.responseTime}ms</span>
                )}
                {hostHasError && <span className="diff-badge diff-badge--error">FAILED</span>}
              </div>

              <button
                type="button"
                className="diff-expand-btn"
                onClick={() => toggleExpand(host.hostId)}
                title={isExpanded ? 'Show differences only' : 'Expand to see full response'}
              >
                {isExpanded ? '⊟ Collapse' : '⊞ Expand'}
              </button>
            </div>

            {/* Body */}
            {refHasError ? (
              <div className="diff-state diff-state--error">
                <strong>Reference host failed:</strong> {referenceHost.error}
              </div>
            ) : hostHasError ? (
              <div className="diff-state diff-state--error">
                <strong>{host.hostValue} failed:</strong> {host.error}
              </div>
            ) : (
              <div className="diff-viewer-wrap">
                <ReactDiffViewer
                  oldValue={refData}
                  newValue={hostData}
                  splitView={true}
                  useDarkTheme={false}
                  styles={DIFF_STYLES}
                  // When not expanded: show only 3 context lines around each diff
                  extraLinesSurroundingDiff={isExpanded ? 99999 : 3}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
