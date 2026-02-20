import { useComparisonStore } from '../store/comparisonStore'
import { executeCurlBatch } from '../services/requestExecutor'
import { parseHosts } from '../services/hostParser'
import { parseCurl } from '../services/curlParser'
import { ComparisonResult, HostResponse, HostDifference } from '@/shared/types'
import { computeDifferences } from '../services/diffService'

export const useComparisonExecution = () => {
  const {
    hosts,
    curlCommands,
    parallelMode,
    setIsExecuting,
    addComparison,
    clearComparisons
  } = useComparisonStore()

  const execute = async () => {
    if (hosts.length === 0 || curlCommands.length === 0) return

    setIsExecuting(true)
    clearComparisons()

    // Parse hosts for execution
    const parsedHosts = parseHosts(hosts.map(h => h.value))

    // Create a map for O(1) host lookup by normalized URL
    const hostMap = new Map(hosts.map(h => [h.normalizedUrl, h]));

    try {
      // Execute requests
      const results = await executeCurlBatch(curlCommands, parsedHosts, parallelMode)

      // Process results
      results.forEach(({ curlIndex, curlCommand, results: executionResults }) => {
        const referenceHost = hosts.find(h => h.isReference) || hosts[0]
        
        // Map execution results to HostResponse objects
        const hostResponses: HostResponse[] = executionResults.map(r => {
            // Find the matching host in the store to get the correct ID
            const storeHost = hostMap.get(r.hostValue)
            
            return {
                hostId: storeHost ? storeHost.id : r.hostId,
                hostValue: r.hostValue,
                response: r.response ? {
                    data: r.response.data,
                    status: r.response.status,
                    statusText: r.response.statusText,
                    headers: r.response.headers,
                    responseTime: r.responseTime
                } : null,
                error: r.error || null,
                isLoading: false,
                responseTime: r.responseTime
            }
        })

        // Find reference response
        const referenceResponse = hostResponses.find(hr => hr.hostId === referenceHost.id)

        // Compute differences
        const differences: HostDifference[] = hostResponses.map(hr => {
            if (!referenceResponse) return { hostId: hr.hostId, differences: [] }
            return computeDifferences(referenceResponse, hr)
        })

        const comparison: ComparisonResult = {
          id: `comp-${Date.now()}-${curlIndex}`,
          curlIndex,
          curlCommand,
          parsedCurl: parseCurl(curlCommand),
          timestamp: Date.now(),
          referenceHostId: referenceHost.id,
          hostResponses,
          differences,
          status: 'completed'
        }

        addComparison(comparison)
      })
    } catch (error) {
      console.error('Execution failed', error)
    } finally {
      setIsExecuting(false)
    }
  }

  return { execute }
}
