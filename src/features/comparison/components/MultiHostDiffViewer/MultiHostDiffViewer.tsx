import { useState } from 'react'
import ReactDiffViewer from 'react-diff-viewer-continued'
import type { ComparisonResult } from '@/shared/types'
import { formatResponseData, sortJsonKeys, sortJsonKeysCommonFirst, applyJsonPath } from '../../services/diffService'
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
  const [sortMode, setSortMode] = useState<'original' | 'alpha' | 'common-first'>('original')
  const [jsonPath, setJsonPath] = useState('')

  /** Parse raw response data to a JS value (handles string JSON or object). */
  const parseResponseData = (data: unknown): unknown => {
    if (typeof data === 'string') {
      try { return JSON.parse(data) } catch { return data }
    }
    return data
  }

  /**
   * Apply sort + JSONPath filter to a pair of parsed values.
   * Returns { refText, hostText, filterError? }
   */
  const buildDiffTexts = (
    refRaw: unknown,
    hostRaw: unknown
  ): { refText: string; hostText: string; filterError?: string } => {
    let refVal = parseResponseData(refRaw)
    let hostVal = parseResponseData(hostRaw)

    // 1. Sort
    if (sortMode === 'alpha') {
      // handled by formatResponseData below
    } else if (sortMode === 'common-first') {
      const [sl, sh] = sortJsonKeysCommonFirst(refVal, hostVal)
      refVal = sl
      hostVal = sh
    }

    // 2. JSONPath filter (applied to each side independently)
    if (jsonPath.trim()) {
      const refResult = applyJsonPath(refVal, jsonPath)
      const hostResult = applyJsonPath(hostVal, jsonPath)
      const error = refResult.error || hostResult.error
      if (error) return { refText: '', hostText: '', filterError: error }
      refVal = refResult.result
      hostVal = hostResult.result
    }

    // 3. Stringify
    const stringify = (v: unknown) =>
      v === undefined || v === null ? '' : JSON.stringify(v, null, 2)

    if (sortMode === 'alpha' && !jsonPath.trim()) {
      // Use formatResponseData which handles alpha sort including string inputs
      return {
        refText: formatResponseData(refRaw, true),
        hostText: formatResponseData(hostRaw, true)
      }
    }

    // For alpha + jsonPath: parse was already done above, just sort the filtered result
    if (sortMode === 'alpha' && jsonPath.trim()) {
      return {
        refText: stringify(sortJsonKeys(refVal)),
        hostText: stringify(sortJsonKeys(hostVal))
      }
    }

    return { refText: stringify(refVal), hostText: stringify(hostVal) }
  }

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

  // Compute filter error from the first host pair (all pairs share the same expression)
  const filterError: string | null = (() => {
    if (!jsonPath.trim() || otherHosts.length === 0) return null
    const firstHost = otherHosts[0]
    const { filterError: fe } = buildDiffTexts(
      referenceHost.response?.data,
      firstHost.response?.data
    )
    return fe ?? null
  })()

  return (
    <div className="diff-pairs">
      {/* Sort + JSONPath toolbar */}
      <div className="diff-toolbar">
        <span className="diff-toolbar-label">Key order:</span>
        <div className="diff-sort-toggle">
          <button
            className={sortMode === 'original' ? 'active' : ''}
            onClick={() => setSortMode('original')}
          >
            Original
          </button>
          <button
            className={sortMode === 'alpha' ? 'active' : ''}
            onClick={() => setSortMode('alpha')}
          >
            Alphabetical
          </button>
          <button
            className={sortMode === 'common-first' ? 'active' : ''}
            onClick={() => setSortMode('common-first')}
          >
            Common first
          </button>
        </div>
        <span className="diff-toolbar-separator">|</span>
        <span className="diff-toolbar-label">JSONPath:</span>
        <div className="diff-jsonpath-wrap">
          <input
            type="text"
            className={`diff-jsonpath-input${filterError ? ' diff-jsonpath-input--error' : ''}`}
            placeholder="$.items[*].id"
            value={jsonPath}
            onChange={e => {
              setJsonPath(e.target.value)
              setJsonPathError(null)
            }}
            spellCheck={false}
          />
          {jsonPath && (
            <button
              className="diff-jsonpath-clear"
              onClick={() => { setJsonPath(''); }}
              title="Clear filter"
            >✕</button>
          )}
        </div>
        {filterError && <span className="diff-jsonpath-error">{filterError}</span>}
      </div>
      {otherHosts.map(host => {
        const isExpanded = expandedHosts[host.hostId] ?? false
        const refHasError = !!referenceHost.error
        const hostHasError = !!host.error

        const { refText, hostText } = buildDiffTexts(
          referenceHost.response?.data,
          host.response?.data
        )

        const refData = refText
        const hostData = hostText

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
