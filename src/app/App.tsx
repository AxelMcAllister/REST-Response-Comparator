import { useState } from 'react'
import HostInput from '@/features/comparison/components/HostInput/HostInput'
import CurlInput from '@/features/comparison/components/CurlInput/CurlInput'
import { ComparisonTabs } from '@/features/comparison/components/ComparisonTabs/ComparisonTabs'
import { useComparisonStore } from '@/features/comparison/store/comparisonStore'
import { parseHosts } from '@/features/comparison/services/hostParser'
import { useComparisonExecution } from '@/features/comparison/hooks/useComparisonExecution'
import '../index.css'
import './App.css'

/**
 * Main App component
 * Multi-host REST API response comparator
 */
function App() {
  const {
    hosts,
    curlCommands,
    setCurlCommands,
    isExecuting
  } = useComparisonStore()

  const { execute } = useComparisonExecution()

  const [showMissingHostWarning, setShowMissingHostWarning] = useState(false)
  const [pendingCommand, setPendingCommand] = useState<{ original: string; autoDetected: string } | null>(null)

  const handleHostsChange = (newHosts: Array<{ id: string; value: string; isReference: boolean }>) => {
    // Create a map of existing hosts for O(1) lookup
    const existingHostsMap = new Map(hosts.map(h => [h.id, h]));

    // Update store - need to preserve normalizedUrl
    const storeHosts = newHosts.map(h => {
      const existing = existingHostsMap.get(h.id);
      // If host exists, preserve normalizedUrl; otherwise parse it
      if (existing) {
        return {
          ...existing,
          value: h.value,
          isReference: h.isReference
        }
      } else {
        // New host - need to parse
        const parsed = parseHosts([h.value])[0]
        return {
          id: h.id,
          value: h.value,
          isReference: h.isReference,
          normalizedUrl: parsed.normalized
        }
      }
    })
    
    useComparisonStore.setState({ hosts: storeHosts })
  }

  const handleCurlCommandsChange = (commands: string[]) => {
    setCurlCommands(commands)
  }

  const handleMissingHostPlaceholder = (original: string, autoDetected: string) => {
    setPendingCommand({ original, autoDetected })
    setShowMissingHostWarning(true)
  }

  const handleAcceptAutoDetect = () => {
    if (pendingCommand) {
      setCurlCommands([...curlCommands, pendingCommand.autoDetected])
      setShowMissingHostWarning(false)
      setPendingCommand(null)
    }
  }

  const handleRejectAutoDetect = () => {
    setShowMissingHostWarning(false)
    setPendingCommand(null)
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>REST Response Comparator</h1>
        <p className="App-subtitle">
          Compare API responses across multiple hosts
        </p>
      </header>

      <main className="App-main">
        <div className="App-container">
          <HostInput
            hosts={hosts.map(h => ({ id: h.id, value: h.value, isReference: h.isReference }))}
            onHostsChange={handleHostsChange}
          />

          <CurlInput
            curlCommands={curlCommands}
            onCurlCommandsChange={handleCurlCommandsChange}
            onMissingHostPlaceholder={handleMissingHostPlaceholder}
          />

          {showMissingHostWarning && pendingCommand && (
            <div className="App-warning-modal">
              <div className="App-warning-content">
                <h3>Missing {'{host}'} placeholder</h3>
                <p>The cURL command doesn't contain a {'{host}'} placeholder:</p>
                <code>{pendingCommand.original}</code>
                <p>Auto-detected version:</p>
                <code>{pendingCommand.autoDetected}</code>
                <div className="App-warning-actions">
                  <button onClick={handleAcceptAutoDetect}>Accept & Add</button>
                  <button onClick={handleRejectAutoDetect}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {hosts.length > 0 && curlCommands.length > 0 && (
            <div className="App-actions mt-4 flex justify-end">
              <button
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                onClick={execute}
                disabled={isExecuting}
              >
                {isExecuting ? 'Comparing...' : 'Compare Responses'}
              </button>
            </div>
          )}

          <ComparisonTabs />
        </div>
      </main>
    </div>
  )
}

export default App
