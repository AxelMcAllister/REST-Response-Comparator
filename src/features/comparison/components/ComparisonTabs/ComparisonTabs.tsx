import { useState, useEffect, useRef, useCallback } from 'react'
import { useComparisonStore } from '../../store/comparisonStore'
import { ComparisonTab } from './ComparisonTab'
import type { ComparisonResult } from '@/shared/types'
import './ComparisonTabs.css'

/**
 * Generate a tab label from a comparison result.
 * Returns just the cURL number (1-based).
 */
function getTabLabel(comparison: ComparisonResult): string {
  return `${comparison.curlIndex + 1}`
}

export const ComparisonTabs = () => {
  const { comparisons, isExecuting } = useComparisonStore()

  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [tabOrder, setTabOrder] = useState<string[]>([])
  const [labelOverrides, setLabelOverrides] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const editInputRef = useRef<HTMLInputElement>(null)
  const draggedIdRef = useRef<string | null>(null)

  // Sync tab order: keep existing order, append new tabs at the end
  useEffect(() => {
    setTabOrder(prev => {
      const currentIds = new Set(comparisons.map(c => c.id))
      const kept = prev.filter(id => currentIds.has(id))
      const added = comparisons.map(c => c.id).filter(id => !prev.includes(id))
      return [...kept, ...added]
    })

    // Auto-select: keep current if still valid, else select first
    if (comparisons.length > 0) {
      setActiveTabId(prev =>
        prev && comparisons.some(c => c.id === prev) ? prev : comparisons[0].id
      )
    } else {
      setActiveTabId(null)
    }
  }, [comparisons])

  // Focus the rename input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  // Derived: comparisons in user-determined order
  const orderedComparisons = tabOrder
    .map(id => comparisons.find(c => c.id === id))
    .filter((c): c is ComparisonResult => c !== undefined)

  // ── Rename ────────────────────────────────────────────────────────────────

  const startRename = useCallback((id: string, currentLabel: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(id)
    setEditingLabel(currentLabel)
  }, [])

  const confirmRename = useCallback(() => {
    if (editingId && editingLabel.trim()) {
      setLabelOverrides(prev => ({ ...prev, [editingId]: editingLabel.trim() }))
    }
    setEditingId(null)
    setEditingLabel('')
  }, [editingId, editingLabel])

  // ── Drag & Drop ───────────────────────────────────────────────────────────

  const handleDragStart = useCallback((id: string, e: React.DragEvent) => {
    draggedIdRef.current = id
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((id: string, e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(id)
  }, [])

  const handleDrop = useCallback((droppedOnId: string) => {
    const dragged = draggedIdRef.current
    if (!dragged || dragged === droppedOnId) {
      setDragOverId(null)
      draggedIdRef.current = null
      return
    }
    setTabOrder(prev => {
      const result = [...prev]
      const fromIdx = result.indexOf(dragged)
      const toIdx = result.indexOf(droppedOnId)
      if (fromIdx < 0 || toIdx < 0) return prev
      result.splice(fromIdx, 1)
      result.splice(toIdx, 0, dragged)
      return result
    })
    setDragOverId(null)
    draggedIdRef.current = null
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  if (comparisons.length === 0 && !isExecuting) return null

  const activeComparison = comparisons.find(c => c.id === activeTabId)

  return (
    <div className="ctabs">
      {/* Tab Bar */}
      <div className="ctabs-bar" role="tablist" aria-label="Comparison results">
        {orderedComparisons.map((comparison) => {
          const generatedLabel = getTabLabel(comparison)
          const label = labelOverrides[comparison.id] ?? generatedLabel
          const isActive = activeTabId === comparison.id
          const isDragOver = dragOverId === comparison.id
          const hasError = comparison.hostResponses.some(hr => !!hr.error)

          return (
            <div
              key={comparison.id}
              role="tab"
              aria-selected={isActive}
              className={[
                'ctabs-tab',
                isActive ? 'ctabs-tab--active' : '',
                isDragOver ? 'ctabs-tab--drag-over' : '',
                hasError ? 'ctabs-tab--error' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => { if (!editingId) setActiveTabId(comparison.id) }}
              draggable
              onDragStart={(e) => handleDragStart(comparison.id, e)}
              onDragOver={(e) => handleDragOver(comparison.id, e)}
              onDrop={() => handleDrop(comparison.id)}
              onDragLeave={() => setDragOverId(null)}
              onDragEnd={() => { setDragOverId(null); draggedIdRef.current = null }}
              title={`${comparison.parsedCurl.method} ${comparison.parsedCurl.url}\nDouble-click to rename`}
            >
              {editingId === comparison.id ? (
                <input
                  ref={editInputRef}
                  className="ctabs-rename-input"
                  value={editingLabel}
                  onChange={(e) => setEditingLabel(e.target.value)}
                  onBlur={confirmRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmRename()
                    if (e.key === 'Escape') { setEditingId(null); setEditingLabel('') }
                    e.stopPropagation()
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="ctabs-tab-label"
                  onDoubleClick={(e) => {
                    setActiveTabId(comparison.id)
                    startRename(comparison.id, label, e)
                  }}
                >
                  {label}
                </span>
              )}

              {comparison.status === 'loading' && (
                <span className="ctabs-spinner" aria-label="Loading">⏳</span>
              )}
            </div>
          )
        })}

        {isExecuting && comparisons.length === 0 && (
          <div className="ctabs-loading-placeholder">
            <span className="ctabs-spinner">⏳</span> Running comparisons…
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="ctabs-content" role="tabpanel">
        {activeComparison ? (
          <ComparisonTab comparison={activeComparison} />
        ) : (
          <div className="ctabs-empty">Select a tab to view results</div>
        )}
      </div>
    </div>
  )
}
