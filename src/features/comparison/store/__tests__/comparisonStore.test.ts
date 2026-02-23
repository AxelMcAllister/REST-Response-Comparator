import { describe, it, expect, beforeEach } from 'vitest'
import { useComparisonStore } from '../comparisonStore'
import type { ComparisonResult } from '@/shared/types'

// Reset store before each test
beforeEach(() => {
    useComparisonStore.setState({
        hosts: [],
        curlCommands: [],
        comparisons: [],
        isExecuting: false,
        parallelMode: 'all-at-once',
        globalOptions: {
            ignoreTimestamps: false,
            ignoreIds: false,
            ignoreWhitespace: false,
            caseInsensitive: false,
            ignoreArrayOrder: false,
            customIgnorePaths: [],
        },
    })
})

// ── Hosts ───────────────────────────────────────────────────────────────────

describe('addHosts', () => {
    it('adds hosts from string array', () => {
        useComparisonStore.getState().addHosts(['example.com', 'api.example.com'])
        const hosts = useComparisonStore.getState().hosts
        expect(hosts).toHaveLength(2)
        expect(hosts[0].value).toBe('example.com')
        expect(hosts[1].value).toBe('api.example.com')
    })

    it('makes the first host the reference when store is empty', () => {
        useComparisonStore.getState().addHosts(['a.com', 'b.com'])
        const hosts = useComparisonStore.getState().hosts
        expect(hosts[0].isReference).toBe(true)
        expect(hosts[1].isReference).toBe(false)
    })

    it('does not reassign reference when adding more hosts', () => {
        useComparisonStore.getState().addHosts(['a.com'])
        useComparisonStore.getState().addHosts(['b.com'])
        const hosts = useComparisonStore.getState().hosts
        expect(hosts[0].isReference).toBe(true)
        expect(hosts[1].isReference).toBe(false)
    })

    it('assigns normalizedUrl', () => {
        useComparisonStore.getState().addHosts(['example.com'])
        expect(useComparisonStore.getState().hosts[0].normalizedUrl).toBe('http://example.com')
    })

    it('assigns unique ids', () => {
        useComparisonStore.getState().addHosts(['a.com', 'b.com'])
        const ids = useComparisonStore.getState().hosts.map(h => h.id)
        expect(new Set(ids).size).toBe(2)
    })
})

describe('removeHost', () => {
    it('removes a host by id', () => {
        useComparisonStore.getState().addHosts(['a.com', 'b.com'])
        const id = useComparisonStore.getState().hosts[1].id
        useComparisonStore.getState().removeHost(id)
        expect(useComparisonStore.getState().hosts).toHaveLength(1)
    })

    it('reassigns reference to first host when reference is removed', () => {
        useComparisonStore.getState().addHosts(['a.com', 'b.com'])
        const refId = useComparisonStore.getState().hosts[0].id
        useComparisonStore.getState().removeHost(refId)
        const hosts = useComparisonStore.getState().hosts
        expect(hosts[0].isReference).toBe(true)
    })

    it('no-op for unknown id', () => {
        useComparisonStore.getState().addHosts(['a.com'])
        useComparisonStore.getState().removeHost('unknown-id')
        expect(useComparisonStore.getState().hosts).toHaveLength(1)
    })
})

describe('updateHost', () => {
    it('updates value and normalizedUrl', () => {
        useComparisonStore.getState().addHosts(['old.com'])
        const id = useComparisonStore.getState().hosts[0].id
        useComparisonStore.getState().updateHost(id, 'new.com')
        const host = useComparisonStore.getState().hosts[0]
        expect(host.value).toBe('new.com')
        expect(host.normalizedUrl).toBe('http://new.com')
    })
})

describe('setReferenceHost', () => {
    it('sets the specified host as reference and unsets others', () => {
        useComparisonStore.getState().addHosts(['a.com', 'b.com'])
        const secondId = useComparisonStore.getState().hosts[1].id
        useComparisonStore.getState().setReferenceHost(secondId)
        const hosts = useComparisonStore.getState().hosts
        expect(hosts[0].isReference).toBe(false)
        expect(hosts[1].isReference).toBe(true)
    })
})

describe('setHosts', () => {
    it('replaces all hosts', () => {
        useComparisonStore.getState().addHosts(['a.com'])
        useComparisonStore.getState().setHosts([
            { id: '1', value: 'x.com', isReference: true, normalizedUrl: 'http://x.com' },
        ])
        expect(useComparisonStore.getState().hosts).toHaveLength(1)
        expect(useComparisonStore.getState().hosts[0].value).toBe('x.com')
    })
})

// ── cURL Commands ───────────────────────────────────────────────────────────

describe('addCurlCommands / removeCurlCommand', () => {
    it('adds curl commands', () => {
        useComparisonStore.getState().addCurlCommands([
            { id: 'c1', value: 'curl {host}/api' },
        ])
        expect(useComparisonStore.getState().curlCommands).toHaveLength(1)
    })

    it('appends to existing commands', () => {
        useComparisonStore.getState().addCurlCommands([{ id: 'c1', value: 'curl /a' }])
        useComparisonStore.getState().addCurlCommands([{ id: 'c2', value: 'curl /b' }])
        expect(useComparisonStore.getState().curlCommands).toHaveLength(2)
    })

    it('removes a command by id', () => {
        useComparisonStore.getState().addCurlCommands([
            { id: 'c1', value: 'curl /a' },
            { id: 'c2', value: 'curl /b' },
        ])
        useComparisonStore.getState().removeCurlCommand('c1')
        expect(useComparisonStore.getState().curlCommands).toHaveLength(1)
        expect(useComparisonStore.getState().curlCommands[0].id).toBe('c2')
    })
})

describe('setCurlCommands', () => {
    it('replaces all commands', () => {
        useComparisonStore.getState().addCurlCommands([{ id: 'c1', value: 'curl /a' }])
        useComparisonStore.getState().setCurlCommands([{ id: 'c2', value: 'curl /b' }])
        expect(useComparisonStore.getState().curlCommands).toHaveLength(1)
        expect(useComparisonStore.getState().curlCommands[0].id).toBe('c2')
    })
})

// ── Comparisons ─────────────────────────────────────────────────────────────

const makeComparison = (id: string): ComparisonResult => ({
    id,
    curlIndex: 0,
    curlCommand: 'curl {host}/api',
    parsedCurl: { url: '{host}/api', method: 'GET', headers: {}, originalCurl: 'curl {host}/api' },
    timestamp: Date.now(),
    referenceHostId: 'ref',
    hostResponses: [],
    differences: [],
    status: 'completed',
})

describe('addComparison / updateComparison / clearComparisons', () => {
    it('adds a comparison', () => {
        useComparisonStore.getState().addComparison(makeComparison('comp-1'))
        expect(useComparisonStore.getState().comparisons).toHaveLength(1)
    })

    it('appends comparisons', () => {
        useComparisonStore.getState().addComparison(makeComparison('comp-1'))
        useComparisonStore.getState().addComparison(makeComparison('comp-2'))
        expect(useComparisonStore.getState().comparisons).toHaveLength(2)
    })

    it('updates a comparison by id', () => {
        useComparisonStore.getState().addComparison(makeComparison('comp-1'))
        useComparisonStore.getState().updateComparison('comp-1', { status: 'error' })
        expect(useComparisonStore.getState().comparisons[0].status).toBe('error')
    })

    it('update is no-op for unknown id', () => {
        useComparisonStore.getState().addComparison(makeComparison('comp-1'))
        useComparisonStore.getState().updateComparison('unknown', { status: 'error' })
        expect(useComparisonStore.getState().comparisons[0].status).toBe('completed')
    })

    it('clears all comparisons', () => {
        useComparisonStore.getState().addComparison(makeComparison('comp-1'))
        useComparisonStore.getState().addComparison(makeComparison('comp-2'))
        useComparisonStore.getState().clearComparisons()
        expect(useComparisonStore.getState().comparisons).toHaveLength(0)
    })
})

// ── Execution ───────────────────────────────────────────────────────────────

describe('setIsExecuting / setParallelMode', () => {
    it('toggles executing state', () => {
        useComparisonStore.getState().setIsExecuting(true)
        expect(useComparisonStore.getState().isExecuting).toBe(true)
        useComparisonStore.getState().setIsExecuting(false)
        expect(useComparisonStore.getState().isExecuting).toBe(false)
    })

    it('sets parallel mode', () => {
        useComparisonStore.getState().setParallelMode('per-curl')
        expect(useComparisonStore.getState().parallelMode).toBe('per-curl')
    })
})

// ── Global Options ──────────────────────────────────────────────────────────

describe('updateGlobalOptions', () => {
    it('partially merges options', () => {
        useComparisonStore.getState().updateGlobalOptions({ ignoreTimestamps: true })
        const opts = useComparisonStore.getState().globalOptions
        expect(opts.ignoreTimestamps).toBe(true)
        // Other options unchanged
        expect(opts.ignoreIds).toBe(false)
        expect(opts.ignoreWhitespace).toBe(false)
    })

    it('merges multiple partial updates', () => {
        useComparisonStore.getState().updateGlobalOptions({ ignoreIds: true })
        useComparisonStore.getState().updateGlobalOptions({ caseInsensitive: true })
        const opts = useComparisonStore.getState().globalOptions
        expect(opts.ignoreIds).toBe(true)
        expect(opts.caseInsensitive).toBe(true)
    })

    it('updates customIgnorePaths', () => {
        useComparisonStore.getState().updateGlobalOptions({ customIgnorePaths: ['$.a', '$.b'] })
        expect(useComparisonStore.getState().globalOptions.customIgnorePaths).toEqual(['$.a', '$.b'])
    })
})
