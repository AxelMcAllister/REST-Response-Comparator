import { ComparisonResult } from '@/shared/types'
import ReactDiffViewer from 'react-diff-viewer-continued'
import { formatResponseData } from '../../services/diffService'

const diffViewerStyles = {
  variables: {
    light: {
      diffViewerBackground: '#ffffff',
      diffViewerColor: '#212529',
      addedBackground: '#e6ffed',
      addedColor: '#24292e',
      removedBackground: '#ffeef0',
      removedColor: '#24292e',
      wordAddedBackground: '#acf2bd',
      wordRemovedBackground: '#fdb8c0',
      addedGutterBackground: '#cdffd8',
      removedGutterBackground: '#ffdce0',
      gutterBackground: '#f7f7f7',
      gutterBackgroundDark: '#f3f1f1',
      highlightBackground: '#fffbdd',
      highlightGutterBackground: '#fff5b1',
    }
  },
  line: {
    padding: '10px 2px',
    '&:hover': {
      background: '#f7f7f7',
    },
  }
};

export const MultiHostDiffViewer = ({ comparison }: { comparison: ComparisonResult }) => {
  const referenceHost = comparison.hostResponses.find(h => h.hostId === comparison.referenceHostId)
  const otherHosts = comparison.hostResponses.filter(h => h.hostId !== comparison.referenceHostId)

  if (!referenceHost) {
    return <div className="p-4 text-red-500">No reference host found</div>
  }

  if (otherHosts.length === 0) {
    return <div className="p-4 text-gray-500">No other hosts to compare against</div>
  }

  return (
    <div className="flex flex-row overflow-x-auto h-full">
      {otherHosts.map(host => (
        <div key={host.hostId} className="flex-none w-[800px] border-r border-gray-300 last:border-r-0">
          <div className="p-2 bg-gray-100 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
            <div className="flex-1 text-center font-semibold text-gray-700">
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded mr-2">REF</span>
              {referenceHost.hostValue}
            </div>
            <div className="w-8 text-center text-gray-400">vs</div>
            <div className="flex-1 text-center font-semibold text-gray-700">
              {host.hostValue}
            </div>
          </div>
          
          <div className="diff-viewer-container">
            <ReactDiffViewer
              oldValue={formatResponseData(referenceHost.response?.data)}
              newValue={formatResponseData(host.response?.data)}
              splitView={true}
              useDarkTheme={false}
              styles={diffViewerStyles}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
