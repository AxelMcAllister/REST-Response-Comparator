import { useCallback } from 'react'
import HostInput from '@/features/comparison/components/HostInput/HostInput'
import CurlInput from '@/features/comparison/components/CurlInput/CurlInput'
import { ComparisonTabs } from '@/features/comparison/components/ComparisonTabs/ComparisonTabs'
import { ConfigManager } from '@/features/comparison/components/ConfigManager/ConfigManager'
import { useComparisonStore } from '@/features/comparison/store/comparisonStore'
import { parseHosts } from '@/features/comparison/services/hostParser'
import { useComparisonExecution } from '@/features/comparison/hooks/useComparisonExecution'
import type { CurlCommand } from '@/shared/types'
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

  const handleHostsChange = useCallback((newHosts: Array<{ id: string; value: string; isReference: boolean }>) => {
    // Create a map of existing hosts for O(1) lookup
    const existingHostsMap = new Map(hosts.map(h => [h.id, h]))

    // Update store - preserve normalizedUrl for existing hosts
    const storeHosts = newHosts.map(h => {
      const existing = existingHostsMap.get(h.id)
      if (existing) {
        return {
          ...existing,
          value: h.value,
          isReference: h.isReference
        }
      } else {
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
  }, [hosts])

  const handleCurlCommandsChange = useCallback((commands: CurlCommand[]) => {
    setCurlCommands(commands)
  }, [setCurlCommands])

  const canExecute = hosts.length >= 2 && curlCommands.some(c => c.value.trim().length > 0)

  return (
    <div className="App">
      <header className="App-header">
        <h1>REST Response Comparator</h1>
        <p className="App-subtitle">
          Compare API responses across multiple hosts
        </p>
        <ConfigManager />
      </header>

      <main className="App-main">
        <div className="App-container">
          <HostInput
            hosts={hosts.map(h => ({ id: h.id, value: h.value, isReference: h.isReference }))}
            onHostsChange={handleHostsChange}
          />
          {hosts.length === 1 && (
            <p className="App-hosts-hint">Add at least one more host to enable comparison.</p>
          )}

          <CurlInput
            curlCommands={curlCommands}
            onCurlCommandsChange={handleCurlCommandsChange}
          />

          {canExecute && (
            <div className="App-actions">
              <button
                className="App-execute-button"
                onClick={execute}
                disabled={isExecuting}
              >
                {isExecuting ? '⏳ Comparing…' : '▶ Compare Responses'}
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
