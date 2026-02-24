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
    comparisons,
    parallelMode,
    globalOptions,
    setIsExecuting,
    addComparison,
    updateComparison,
    clearComparisons
  } = useComparisonStore()

  const execute = async () => {
    if (hosts.length === 0 || curlCommands.length === 0) return

    setIsExecuting(true)
    clearComparisons()

    // Extract values for execution (the service expects plain strings)
    const curlValues = curlCommands.map(c => c.value).filter(v => v.trim().length > 0)
    if (curlValues.length === 0) {
      setIsExecuting(false)
      return
    }

    // Parse hosts for execution
    const parsedHosts = parseHosts(hosts.map(h => h.value))

    try {
      // Execute requests
      const results = await executeCurlBatch(curlValues, parsedHosts, parallelMode)

      // Process results
      results.forEach(({ curlIndex, curlCommand, results: executionResults }) => {
        const referenceHost = hosts.find(h => h.isReference) || hosts[0]

        // Map execution results to HostResponse objects.
        // executionResults preserves the same index order as `hosts` (Promise.all
        // keeps insertion order, and the executor iterates hosts in order), so we
        // can safely match by index to get the correct store UUID.
        const hostResponses: HostResponse[] = executionResults.map((r, index) => {
          const storeHost = hosts[index]

          return {
            hostId: storeHost?.id ?? r.hostId,
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
          status: 'completed',
          options: { ...globalOptions }
        }

        addComparison(comparison)
      })
    } catch {
      // Error already surfaced - execution state is reset via finally
    } finally {
      setIsExecuting(false)
    }
  }

  const executeSingle = async (comparisonId: string) => {
    const comparison = comparisons.find(c => c.id === comparisonId)
    if (!comparison || hosts.length === 0) return

    updateComparison(comparisonId, { status: 'loading' })

    const curlValue = comparison.curlCommand
    const parsedHosts = parseHosts(hosts.map(h => h.value))

    try {
      const results = await executeCurlBatch([curlValue], parsedHosts, 'all-at-once')
      const executionResult = results[0]
      if (!executionResult) throw new Error('No result returned')

      const referenceHost = hosts.find(h => h.isReference) || hosts[0]

      const hostResponses: HostResponse[] = executionResult.results.map((r, index) => {
        const storeHost = hosts[index]

        return {
          hostId: storeHost?.id ?? r.hostId,
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

      const referenceResponse = hostResponses.find(hr => hr.hostId === referenceHost.id)

      const differences: HostDifference[] = hostResponses.map(hr => {
        if (!referenceResponse) return { hostId: hr.hostId, differences: [] }
        return computeDifferences(referenceResponse, hr)
      })

      updateComparison(comparisonId, {
        timestamp: Date.now(),
        referenceHostId: referenceHost.id,
        hostResponses,
        differences,
        status: 'completed',
        options: comparison.options || { ...globalOptions }
      })
    } catch {
      updateComparison(comparisonId, { status: 'error' })
    }
  }

  return { execute, executeSingle }
}
