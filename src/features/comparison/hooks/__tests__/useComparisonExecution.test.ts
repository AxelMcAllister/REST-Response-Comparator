import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useComparisonExecution } from '../useComparisonExecution'
import { useComparisonStore } from '../../store/comparisonStore'
import type { ComparisonResult, ComparisonOptions } from '@/shared/types'
import * as requestExecutor from '../../services/requestExecutor'

// Mock dependencies
vi.mock('../../store/comparisonStore', () => ({
  useComparisonStore: vi.fn()
}))

vi.mock('../../services/requestExecutor', () => ({
  executeCurlBatch: vi.fn()
}))

describe('useComparisonExecution', () => {
  const mockAddComparison = vi.fn()
  const mockUpdateComparison = vi.fn()
  const mockClearComparisons = vi.fn()
  const mockSetIsExecuting = vi.fn()

  const defaultGlobalOptions: ComparisonOptions = {
    ignoreTimestamps: false,
    ignoreIds: false,
    ignoreWhitespace: false,
    caseInsensitive: false,
    ignoreArrayOrder: false,
    customIgnorePaths: []
  }

  const mockHosts = [
    { id: 'host-1', value: 'http://host1.com', isReference: true, normalizedUrl: 'http://host1.com' },
    { id: 'host-2', value: 'http://host2.com', isReference: false, normalizedUrl: 'http://host2.com' }
  ]
  const mockCurlCommands = [
    { id: 'curl-1', value: 'curl http://example.com/api' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useComparisonStore as any).mockReturnValue({
      hosts: mockHosts,
      curlCommands: mockCurlCommands,
      comparisons: [],
      parallelMode: 'all-at-once',
      globalOptions: defaultGlobalOptions,
      addComparison: mockAddComparison,
      updateComparison: mockUpdateComparison,
      clearComparisons: mockClearComparisons,
      setIsExecuting: mockSetIsExecuting
    })
    ;(requestExecutor.executeCurlBatch as any).mockResolvedValue([
      {
        curlIndex: 0,
        curlCommand: 'curl http://example.com/api',
        results: [
          { hostId: 'host-1', hostValue: 'http://host1.com', response: { data: {}, status: 200, headers: {} } },
          { hostId: 'host-2', hostValue: 'http://host2.com', response: { data: {}, status: 200, headers: {} } }
        ]
      }
    ])
  })

  describe('execute', () => {
    it('sets isExecuting to true then false', async () => {
      const { result } = renderHook(() => useComparisonExecution())
      await act(async () => {
        await result.current.execute()
      })
      expect(mockSetIsExecuting).toHaveBeenCalledWith(true)
      expect(mockSetIsExecuting).toHaveBeenCalledWith(false)
    })

    it('clears comparisons before execution', async () => {
      const { result } = renderHook(() => useComparisonExecution())
      await act(async () => {
        await result.current.execute()
      })
      expect(mockClearComparisons).toHaveBeenCalledTimes(1)
    })

    it('adds a new comparison with global options', async () => {
      const { result } = renderHook(() => useComparisonExecution())
      await act(async () => {
        await result.current.execute()
      })

      expect(mockAddComparison).toHaveBeenCalledTimes(1)
      const addedComparison: ComparisonResult = mockAddComparison.mock.calls[0][0]
      expect(addedComparison.options).toEqual(defaultGlobalOptions)
    })

    it('does not execute if no hosts or curl commands', async () => {
      ;(useComparisonStore as any).mockReturnValue({
        ...useComparisonStore(),
        hosts: [],
        curlCommands: []
      })
      const { result } = renderHook(() => useComparisonExecution())
      await act(async () => {
        await result.current.execute()
      })
      expect(requestExecutor.executeCurlBatch).not.toHaveBeenCalled()
      expect(mockSetIsExecuting).not.toHaveBeenCalled()
    })
  })

  describe('executeSingle', () => {
    const existingComparison: ComparisonResult = {
      id: 'comp-existing',
      curlIndex: 0,
      curlCommand: 'curl http://existing.com',
      parsedCurl: { url: 'http://existing.com', method: 'GET', headers: {}, originalCurl: '' },
      timestamp: Date.now(),
      referenceHostId: 'host-1',
      hostResponses: [],
      differences: [],
      status: 'completed',
      options: { ...defaultGlobalOptions, ignoreIds: true } // Specific options for this comparison
    }

    beforeEach(() => {
      ;(useComparisonStore as any).mockReturnValue({
        ...useComparisonStore(),
        comparisons: [existingComparison],
        globalOptions: { ...defaultGlobalOptions, ignoreIds: false } // Different global options
      })
    })

    it('updates comparison status to loading then completed', async () => {
      const { result } = renderHook(() => useComparisonExecution())
      await act(async () => {
        await result.current.executeSingle('comp-existing')
      })
      expect(mockUpdateComparison).toHaveBeenCalledWith('comp-existing', { status: 'loading' })
      expect(mockUpdateComparison).toHaveBeenCalledWith('comp-existing', expect.objectContaining({ status: 'completed' }))
    })

    it('preserves existing comparison options on re-run', async () => {
      const { result } = renderHook(() => useComparisonExecution())
      await act(async () => {
        await result.current.executeSingle('comp-existing')
      })

      expect(mockUpdateComparison).toHaveBeenCalledWith('comp-existing', expect.objectContaining({
        options: { ...defaultGlobalOptions, ignoreIds: true }
      }))
    })

    it('falls back to global options if existing comparison has no options (legacy)', async () => {
      const legacyComparison = { ...existingComparison, id: 'comp-legacy', options: undefined } as ComparisonResult
      ;(useComparisonStore as any).mockReturnValue({
        ...useComparisonStore(),
        comparisons: [legacyComparison],
        globalOptions: { ...defaultGlobalOptions, ignoreIds: false, ignoreTimestamps: true }
      })

      const { result } = renderHook(() => useComparisonExecution())
      await act(async () => {
        await result.current.executeSingle('comp-legacy')
      })

      expect(mockUpdateComparison).toHaveBeenCalledWith('comp-legacy', expect.objectContaining({
        options: { ...defaultGlobalOptions, ignoreIds: false, ignoreTimestamps: true }
      }))
    })
  })
})
