import { useState, useEffect } from 'react'
import { useComparisonStore } from '../../store/comparisonStore'
import { ComparisonTab } from './ComparisonTab'

export const ComparisonTabs = () => {
  const { comparisons, isExecuting } = useComparisonStore()
  const [activeTabId, setActiveTabId] = useState<string | null>(null)

  // Set first tab as active when comparisons are added
  useEffect(() => {
    if (!activeTabId && comparisons.length > 0) {
      setActiveTabId(comparisons[0].id)
    }
  }, [comparisons, activeTabId])

  if (comparisons.length === 0 && !isExecuting) {
    return null
  }

  const activeComparison = comparisons.find(c => c.id === activeTabId)

  return (
    <div className="flex flex-col h-full border rounded-lg shadow-sm bg-white mt-4">
      <div className="flex border-b border-gray-200 overflow-x-auto bg-gray-50 rounded-t-lg">
        {comparisons.map((comparison) => (
          <button
            key={comparison.id}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTabId === comparison.id
                ? 'bg-white border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTabId(comparison.id)}
          >
            <span className="font-bold mr-2">{comparison.parsedCurl.method}</span>
            <span className="truncate max-w-[200px] inline-block align-bottom">
              {comparison.parsedCurl.url}
            </span>
            {comparison.status === 'loading' && (
              <span className="ml-2 animate-spin inline-block">⏳</span>
            )}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {activeComparison ? (
          <ComparisonTab comparison={activeComparison} />
        ) : (
          <div className="p-4 text-gray-500 text-center">Select a comparison to view details</div>
        )}
      </div>
    </div>
  )
}
