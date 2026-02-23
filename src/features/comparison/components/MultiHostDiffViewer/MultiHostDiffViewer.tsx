import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import ReactDiffViewer from 'react-diff-viewer-continued'
import { useComparisonStore } from '../../store/comparisonStore'
import type { ComparisonResult } from '@/shared/types'
import { formatResponseData, sortJsonKeys, sortJsonKeysCommonFirst, applyJsonPath } from '../../services/diffService'
import { parseJsonPathInput, getJsonPathSuggestions, buildLineToPathMap } from '../../services/jsonPathSuggestions'
import { replaceHostInParsedCurl } from '../../services/hostReplacer'
import { parseHost } from '../../services/hostParser'
import { parseCurl, formatParsedCurlToCommand } from '../../services/curlParser'
import './MultiHostDiffViewer.css'

/** Copy to clipboard icon (outline, 20×20) */
const CopyIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

/** Checkmark for "Copied" state (20×20) */
const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

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
  const { hosts } = useComparisonStore()
  const [expandedHosts, setExpandedHosts] = useState<Record<string, boolean>>({})
  const [copyStatus, setCopyStatus] = useState<Record<string, string>>({})
  const [sortMode, setSortMode] = useState<'original' | 'alpha' | 'common-first'>('original')
  const [jsonPath, setJsonPath] = useState('')
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const jsonPathInputRef = useRef<HTMLInputElement>(null)
  const suggestionsListRef = useRef<HTMLUListElement>(null)

  /** Parse raw response data to a JS value (handles string JSON or object). */
  const parseResponseData = (data: unknown): unknown => {
    if (typeof data === 'string') {
      try { return JSON.parse(data) } catch { return data }
    }
    return data
  }

  // All response bodies in this tab (for JSONPath autocomplete)
  const responseDataList = useMemo(() => {
    return comparison.hostResponses
      .map(hr => hr.response?.data)
      .filter((d): d is unknown => d !== undefined && d !== null)
  }, [comparison.hostResponses])

  const { pathPrefix, partial } = parseJsonPathInput(jsonPath)
  const suggestions = useMemo(() => {
    if (responseDataList.length === 0) return []
    return getJsonPathSuggestions(responseDataList, pathPrefix, partial)
  }, [responseDataList, pathPrefix, partial])

  const showSuggestions = suggestionsOpen && suggestions.length > 0
  const effectiveHighlightIndex = Math.min(highlightIndex, Math.max(0, suggestions.length - 1))

  useEffect(() => {
    if (!showSuggestions) setHighlightIndex(0)
  }, [showSuggestions, suggestions.length])

  useEffect(() => {
    if (!showSuggestions || !suggestionsListRef.current) return
    const el = suggestionsListRef.current.children[effectiveHighlightIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [showSuggestions, effectiveHighlightIndex])

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

  const applySuggestion = (suggestion: string) => {
    const sep = pathPrefix === '$' || pathPrefix.endsWith('[*]') ? '' : '.'
    const newPath = pathPrefix + sep + suggestion + (suggestion === '[*]' ? '' : '.')
    setJsonPath(newPath)
    setSuggestionsOpen(false)
    jsonPathInputRef.current?.focus()
  }

  const handleJsonPathKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(i => Math.min(i + 1, suggestions.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(i => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter' && suggestions[effectiveHighlightIndex] != null) {
      e.preventDefault()
      applySuggestion(suggestions[effectiveHighlightIndex])
      return
    }
    if (e.key === 'Escape') {
      setSuggestionsOpen(false)
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

  // Line number (left pane) -> JSONPath map for clicking line numbers to set filter
  const lineToPathMap = useMemo(() => {
    let refVal: unknown = parseResponseData(referenceHost.response?.data)
    if (refVal === undefined || refVal === null) return new Map<number, string>()
    if (sortMode === 'common-first' && otherHosts[0]?.response?.data != null) {
      const [left] = sortJsonKeysCommonFirst(refVal, parseResponseData(otherHosts[0].response?.data))
      refVal = left
    } else if (sortMode === 'alpha') {
      refVal = sortJsonKeys(refVal)
    }
    if (jsonPath.trim()) {
      const res = applyJsonPath(refVal, jsonPath)
      if (!res.error) refVal = res.result
    }
    return buildLineToPathMap(refVal, jsonPath.trim() || '$')
  }, [referenceHost.response?.data, otherHosts, sortMode, jsonPath])

  const handleLineNumberClick = useCallback(
    (lineId: string, rightLineToPathMap?: Map<number, string>) => {
      const isLeft = lineId.startsWith('L-')
      const isRight = lineId.startsWith('R-')
      if (!isLeft && !isRight) return
      const lineNum = Number.parseInt(lineId.slice(2), 10)
      if (!Number.isFinite(lineNum)) return
      const path = isLeft
        ? lineToPathMap.get(lineNum)
        : rightLineToPathMap?.get(lineNum)
      if (path != null) setJsonPath(path)
    },
    [lineToPathMap]
  )

  const getHostTag = (hostId: string) => {
    const index = hosts.findIndex(h => h.id === hostId)
    if (index === -1) return null
    return <span className="diff-host-tag">{String.fromCodePoint(65 + index)}</span>
  }

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
          <div className="diff-jsonpath-autocomplete">
            <input
              ref={jsonPathInputRef}
              type="text"
              className={`diff-jsonpath-input${filterError ? ' diff-jsonpath-input--error' : ''}`}
              placeholder="$.items[*].id"
              value={jsonPath}
              onChange={e => {
                setJsonPath(e.target.value)
                setSuggestionsOpen(true)
              }}
              onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
              onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
              onKeyDown={handleJsonPathKeyDown}
              spellCheck={false}
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={showSuggestions}
              aria-controls="diff-jsonpath-suggestions"
              aria-activedescendant={showSuggestions && suggestions[effectiveHighlightIndex] != null ? `diff-jsonpath-suggestion-${effectiveHighlightIndex}` : undefined}
            />
            {showSuggestions && (
              <ul
                id="diff-jsonpath-suggestions"
                ref={suggestionsListRef}
                className="diff-jsonpath-suggestions"
                role="listbox"
              >
                {suggestions.map((s, i) => (
                  <li
                    key={s}
                    id={`diff-jsonpath-suggestion-${i}`}
                    role="option"
                    aria-selected={i === effectiveHighlightIndex}
                    className={i === effectiveHighlightIndex ? 'diff-jsonpath-suggestion--active' : ''}
                    onMouseDown={e => { e.preventDefault(); applySuggestion(s) }}
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {jsonPath && (
            <button
              className="diff-jsonpath-clear"
              onClick={() => { setJsonPath(''); setSuggestionsOpen(false); }}
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

        // Right pane line number -> JSONPath map (from this host's displayed value)
        let hostVal: unknown = parseResponseData(host.response?.data)
        if (hostVal !== undefined && hostVal !== null) {
          if (sortMode === 'common-first') {
            const [, right] = sortJsonKeysCommonFirst(
              parseResponseData(referenceHost.response?.data),
              hostVal
            )
            hostVal = right
          } else if (sortMode === 'alpha') {
            hostVal = sortJsonKeys(hostVal)
          }
          if (jsonPath.trim()) {
            const res = applyJsonPath(hostVal, jsonPath)
            if (!res.error) hostVal = res.result
          }
        }
        const rightLineToPathMap =
          hostVal !== undefined && hostVal !== null
            ? buildLineToPathMap(hostVal, jsonPath.trim() || '$')
            : new Map<number, string>()

        return (
          <div key={host.hostId} className="diff-pair">
            {/* Header */}
            <div className="diff-pair-header">
              <div className="diff-host-info diff-host-info--ref">
                <span className="diff-ref-badge">REF</span>
                {getHostTag(referenceHost.hostId)}
                <span className="diff-host-name">{referenceHost.hostValue}</span>
                {referenceHost.responseTime != null && !refHasError && (
                  <span className="diff-timing">{referenceHost.responseTime}ms</span>
                )}
                {refHasError && <span className="diff-badge diff-badge--error">FAILED</span>}
                {!refHasError && (
                  <button
                    type="button"
                    className="diff-copy-btn diff-copy-btn--curl"
                    onClick={() => handleCopy(getResolvedCurl(referenceHost.hostValue), `ref-curl-${host.hostId}`)}
                    title="Copy cURL command"
                  >
                    {copyStatus[`ref-curl-${host.hostId}`] ? (
                      <CheckIcon className="diff-copy-btn__icon diff-copy-btn__icon--success" />
                    ) : (
                      <CopyIcon className="diff-copy-btn__icon" />
                    )}
                    {copyStatus[`ref-curl-${host.hostId}`] && <span className="diff-copy-btn__label">Copied</span>}
                  </button>
                )}
              </div>

              <span className="diff-vs">vs</span>

              <div className="diff-host-info">
                {getHostTag(host.hostId)}
                <span className="diff-host-name">{host.hostValue}</span>
                {host.responseTime != null && !hostHasError && (
                  <span className="diff-timing">{host.responseTime}ms</span>
                )}
                {hostHasError && <span className="diff-badge diff-badge--error">FAILED</span>}
                {!hostHasError && (
                  <button
                    type="button"
                    className="diff-copy-btn diff-copy-btn--curl"
                    onClick={() => handleCopy(getResolvedCurl(host.hostValue), `host-curl-${host.hostId}`)}
                    title="Copy cURL command"
                  >
                    {copyStatus[`host-curl-${host.hostId}`] ? (
                      <CheckIcon className="diff-copy-btn__icon diff-copy-btn__icon--success" />
                    ) : (
                      <CopyIcon className="diff-copy-btn__icon" />
                    )}
                    {copyStatus[`host-curl-${host.hostId}`] && <span className="diff-copy-btn__label">Copied</span>}
                  </button>
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
              <div className="diff-viewer-container">
                <div className="diff-viewer-wrap" title="Click a line number (left or right) to filter by that JSON path">
                  <ReactDiffViewer
                    oldValue={refData}
                    newValue={hostData}
                    splitView={true}
                    useDarkTheme={false}
                    styles={DIFF_STYLES}
                    extraLinesSurroundingDiff={isExpanded ? 99999 : 3}
                    onLineNumberClick={(lineId, e) => {
                      e.preventDefault()
                      handleLineNumberClick(lineId, rightLineToPathMap)
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="diff-copy-json-btn diff-copy-json-btn--overlay diff-copy-json-btn--left"
                  onClick={() => handleCopy(refData, `ref-json-${host.hostId}`)}
                  title="Copy response JSON"
                >
                  {copyStatus[`ref-json-${host.hostId}`] ? (
                    <CheckIcon className="diff-copy-json-btn__icon diff-copy-json-btn__icon--success" />
                  ) : (
                    <CopyIcon className="diff-copy-json-btn__icon" />
                  )}
                  {copyStatus[`ref-json-${host.hostId}`] && <span className="diff-copy-json-btn__label">Copied</span>}
                </button>
                <button
                  type="button"
                  className="diff-copy-json-btn diff-copy-json-btn--overlay diff-copy-json-btn--right"
                  onClick={() => handleCopy(hostData, `host-json-${host.hostId}`)}
                  title="Copy response JSON"
                >
                  {copyStatus[`host-json-${host.hostId}`] ? (
                    <CheckIcon className="diff-copy-json-btn__icon diff-copy-json-btn__icon--success" />
                  ) : (
                    <CopyIcon className="diff-copy-json-btn__icon" />
                  )}
                  {copyStatus[`host-json-${host.hostId}`] && <span className="diff-copy-json-btn__label">Copied</span>}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
