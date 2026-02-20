import { ComparisonResult } from '@/shared/types'
import { MultiHostDiffViewer } from '../MultiHostDiffViewer/MultiHostDiffViewer'

export const ComparisonTab = ({ comparison }: { comparison: ComparisonResult }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold flex items-center">
          <span className={`px-2 py-1 rounded text-xs font-bold mr-2 ${
            comparison.parsedCurl.method === 'GET' ? 'bg-blue-100 text-blue-800' :
            comparison.parsedCurl.method === 'POST' ? 'bg-green-100 text-green-800' :
            comparison.parsedCurl.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
            comparison.parsedCurl.method === 'DELETE' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {comparison.parsedCurl.method}
          </span>
          <span className="truncate">{comparison.parsedCurl.url}</span>
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {comparison.hostResponses.length} hosts compared • {new Date(comparison.timestamp).toLocaleTimeString()}
        </p>
      </div>
      <div className="flex-1 overflow-auto">
        <MultiHostDiffViewer comparison={comparison} />
      </div>
    </div>
  )
}
