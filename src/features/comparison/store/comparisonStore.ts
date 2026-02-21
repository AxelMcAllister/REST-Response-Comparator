/**
 * Comparison store using Zustand
 * Manages comparison state: hosts, cURLs, results
 */

import { create } from 'zustand'
import type { Host, CurlCommand, ComparisonResult, ParallelExecutionMode, ComparisonOptions } from '@/shared/types'
import { parseHosts } from '../services/hostParser'

interface ComparisonStore {
  // Hosts
  hosts: Host[]
  setHosts: (hosts: Host[]) => void
  addHosts: (hostInputs: string[]) => void
  removeHost: (id: string) => void
  updateHost: (id: string, value: string) => void
  setReferenceHost: (id: string) => void

  // cURL Commands (each has a stable id for row-level editing)
  curlCommands: CurlCommand[]
  setCurlCommands: (commands: CurlCommand[]) => void
  addCurlCommands: (commands: CurlCommand[]) => void
  removeCurlCommand: (id: string) => void

  // Execution
  parallelMode: ParallelExecutionMode
  setParallelMode: (mode: ParallelExecutionMode) => void
  isExecuting: boolean
  setIsExecuting: (executing: boolean) => void

  // Results
  comparisons: ComparisonResult[]
  addComparison: (comparison: ComparisonResult) => void
  updateComparison: (id: string, updates: Partial<ComparisonResult>) => void
  clearComparisons: () => void

  // Options
  globalOptions: ComparisonOptions
  updateGlobalOptions: (options: Partial<ComparisonOptions>) => void
}

const defaultOptions: ComparisonOptions = {
  ignoreTimestamps: false,
  ignoreIds: false,
  ignoreWhitespace: false,
  caseInsensitive: false,
  ignoreArrayOrder: false,
  customIgnorePaths: []
}

export const useComparisonStore = create<ComparisonStore>((set, get) => ({
  // Hosts
  hosts: [],
  setHosts: (hosts) => set({ hosts }),
  addHosts: (hostInputs) => {
    const parsed = parseHosts(hostInputs)
    const hasReference = get().hosts.some(h => h.isReference)

    const newHosts: Host[] = parsed.map((host, index) => ({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `host-${Date.now()}-${index}`,
      value: host.original,
      isReference: !hasReference && get().hosts.length === 0 && index === 0,
      normalizedUrl: host.normalized
    }))

    set(state => ({
      hosts: [...state.hosts, ...newHosts]
    }))
  },
  removeHost: (id) => {
    const host = get().hosts.find(h => h.id === id)
    const newHosts = get().hosts.filter(h => h.id !== id)

    // If removed reference, make first remaining host reference
    if (host?.isReference && newHosts.length > 0) {
      newHosts[0].isReference = true
    }

    set({ hosts: newHosts })
  },
  updateHost: (id, value) => {
    const parsed = parseHosts([value])[0]
    set(state => ({
      hosts: state.hosts.map(h =>
        h.id === id
          ? { ...h, value, normalizedUrl: parsed.normalized }
          : h
      )
    }))
  },
  setReferenceHost: (id) => {
    set(state => ({
      hosts: state.hosts.map(h => ({
        ...h,
        isReference: h.id === id
      }))
    }))
  },

  // cURL Commands
  curlCommands: [],
  setCurlCommands: (commands) => {
    set({ curlCommands: commands })
  },
  addCurlCommands: (commands) => {
    set(state => ({
      curlCommands: [...state.curlCommands, ...commands]
    }))
  },
  removeCurlCommand: (id) => {
    set(state => ({
      curlCommands: state.curlCommands.filter(c => c.id !== id)
    }))
  },

  // Execution
  parallelMode: 'all-at-once',
  setParallelMode: (mode) => set({ parallelMode: mode }),
  isExecuting: false,
  setIsExecuting: (executing) => set({ isExecuting: executing }),

  // Results
  comparisons: [],
  addComparison: (comparison) => {
    set(state => ({
      comparisons: [...state.comparisons, comparison]
    }))
  },
  updateComparison: (id, updates) => {
    set(state => ({
      comparisons: state.comparisons.map(c =>
        c.id === id ? { ...c, ...updates } : c
      )
    }))
  },
  clearComparisons: () => set({ comparisons: [] }),

  // Options
  globalOptions: defaultOptions,
  updateGlobalOptions: (options) => {
    set(state => ({
      globalOptions: { ...state.globalOptions, ...options }
    }))
  }
}))
