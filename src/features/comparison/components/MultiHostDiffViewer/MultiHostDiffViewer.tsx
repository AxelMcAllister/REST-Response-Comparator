import { useState } from 'react'
import ReactDiffViewer from 'react-diff-viewer-continued'
import type { ComparisonResult } from '@/shared/types'
import { formatResponseData } from '../../services/diffService'
import { replaceHostInParsedCurl } from '../../services/hostReplacer'
import { parseHost } from '../../services/hostParser'
import { parseCurl, formatParsedCurlToCommand } from '../../services/curlParser'
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
  const [copyStatus, setCopyStatus] = useState<Record<string, string>>({})

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

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus(prev => ({ ...prev, [id]: 'Copied!' }))
      setTimeout(() => {
        setCopyStatus(prev => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      }, 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      setCopyStatus(prev => ({ ...prev, [id]: 'Failed' }))
    }
  }

  const getResolvedCurl = (hostValue: string) => {
    try {
      const parsedHost = parseHost(hostValue)
      const parsedCurl = parseCurl(comparison.curlCommand)
      const resolvedParsedCurl = replaceHostInParsedCurl(parsedCurl, parsedHost)
      return formatParsedCurlToCommand(resolvedParsedCurl)
    } catch (e) {
      console.error('Failed to generate resolved cURL:', e)
      // Fallback to simple replacement if complex parsing fails
      return comparison.curlCommand.replace('{host}', hostValue)
    }
  }

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
                {!refHasError && (
                  <>
                    <button
                      className="diff-copy-btn"
                      onClick={() => handleCopy(getResolvedCurl(referenceHost.hostValue), `ref-curl-${host.hostId}`)}
                      title="Copy cURL command"
                    >
                      {copyStatus[`ref-curl-${host.hostId}`] || '💻'}
                    </button>
                    <button
                      className="diff-copy-btn"
                      onClick={() => handleCopy(refData, `ref-json-${host.hostId}`)}
                      title="Copy response JSON"
                    >
                      {copyStatus[`ref-json-${host.hostId}`] || '📋'}
                    </button>
                  </>
                )}
              </div>

              <span className="diff-vs">vs</span>

              <div className="diff-host-info">
                <span className="diff-host-name">{host.hostValue}</span>
                {host.responseTime != null && !hostHasError && (
                  <span className="diff-timing">{host.responseTime}ms</span>
                )}
                {hostHasError && <span className="diff-badge diff-badge--error">FAILED</span>}
                {!hostHasError && (
                  <>
                    <button
                      className="diff-copy-btn"
                      onClick={() => handleCopy(getResolvedCurl(host.hostValue), `host-curl-${host.hostId}`)}
                      title="Copy cURL command"
                    >
                      {copyStatus[`host-curl-${host.hostId}`] || '💻'}
                    </button>
                    <button
                      className="diff-copy-btn"
                      onClick={() => handleCopy(hostData, `host-json-${host.hostId}`)}
                      title="Copy response JSON"
                    >
                      {copyStatus[`host-json-${host.hostId}`] || '📋'}
                    </button>
                  </>
                )}
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
