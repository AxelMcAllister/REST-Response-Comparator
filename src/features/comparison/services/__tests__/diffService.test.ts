import { describe, it, expect } from 'vitest'
import {
    applyJsonPath,
    sortJsonKeys,
    sortJsonKeysCommonFirst,
    formatResponseData,
    computeDifferences,
} from '../diffService'
import type { HostResponse } from '@/shared/types'

// ── applyJsonPath ───────────────────────────────────────────────────────────

describe('applyJsonPath', () => {
    const data = { users: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }], count: 2 }

    it('returns data unchanged for empty expression', () => {
        const result = applyJsonPath(data, '')
        expect(result.result).toBe(data)
        expect(result.error).toBeUndefined()
    })

    it('returns data unchanged for whitespace expression', () => {
        const result = applyJsonPath(data, '   ')
        expect(result.result).toBe(data)
    })

    it('returns single match unwrapped', () => {
        const result = applyJsonPath(data, '$.count')
        expect(result.result).toBe(2)
    })

    it('returns multiple matches as array', () => {
        const result = applyJsonPath(data, '$.users[*].name')
        expect(result.result).toEqual(['Alice', 'Bob'])
    })

    it('returns error for no matches', () => {
        const result = applyJsonPath(data, '$.nonExistent')
        expect(result.error).toBe('No matches found')
    })

    it('returns error for invalid expression', () => {
        const result = applyJsonPath(data, '$[[[invalid')
        expect(result.error).toBeDefined()
    })

    it('handles nested path', () => {
        const result = applyJsonPath(data, '$.users[0].name')
        expect(result.result).toBe('Alice')
    })
})

// ── sortJsonKeys ────────────────────────────────────────────────────────────

describe('sortJsonKeys', () => {
    it('sorts flat object keys alphabetically', () => {
        const result = sortJsonKeys({ z: 1, a: 2, m: 3 })
        expect(Object.keys(result as Record<string, unknown>)).toEqual(['a', 'm', 'z'])
    })

    it('sorts nested object keys', () => {
        const result = sortJsonKeys({ b: { z: 1, a: 2 }, a: 1 }) as Record<string, unknown>
        expect(Object.keys(result)).toEqual(['a', 'b'])
        expect(Object.keys(result.b as Record<string, unknown>)).toEqual(['a', 'z'])
    })

    it('preserves array order', () => {
        const result = sortJsonKeys([3, 1, 2])
        expect(result).toEqual([3, 1, 2])
    })

    it('sorts objects inside arrays', () => {
        const result = sortJsonKeys([{ b: 1, a: 2 }])
        const first = (result as unknown[])[0] as Record<string, unknown>
        expect(Object.keys(first)).toEqual(['a', 'b'])
    })

    it('returns primitives unchanged', () => {
        expect(sortJsonKeys(42)).toBe(42)
        expect(sortJsonKeys('hello')).toBe('hello')
        expect(sortJsonKeys(true)).toBe(true)
    })

    it('returns null unchanged', () => {
        expect(sortJsonKeys(null)).toBeNull()
    })
})

// ── sortJsonKeysCommonFirst ─────────────────────────────────────────────────

describe('sortJsonKeysCommonFirst', () => {
    it('puts common keys first', () => {
        const left = { c: 1, a: 2, b: 3 }
        const right = { b: 10, d: 20, a: 30 }
        const [sortedL, sortedR] = sortJsonKeysCommonFirst(left, right)
        const lKeys = Object.keys(sortedL as Record<string, unknown>)
        const rKeys = Object.keys(sortedR as Record<string, unknown>)
        // Common keys (a, b) first, then unique
        expect(lKeys).toEqual(['a', 'b', 'c'])
        expect(rKeys).toEqual(['a', 'b', 'd'])
    })

    it('handles no common keys', () => {
        const [sortedL, sortedR] = sortJsonKeysCommonFirst({ a: 1 }, { b: 2 })
        expect(Object.keys(sortedL as Record<string, unknown>)).toEqual(['a'])
        expect(Object.keys(sortedR as Record<string, unknown>)).toEqual(['b'])
    })

    it('handles identical keys', () => {
        const [sortedL, sortedR] = sortJsonKeysCommonFirst({ b: 1, a: 2 }, { b: 3, a: 4 })
        expect(Object.keys(sortedL as Record<string, unknown>)).toEqual(['a', 'b'])
        expect(Object.keys(sortedR as Record<string, unknown>)).toEqual(['a', 'b'])
    })

    it('passes through non-objects unchanged', () => {
        expect(sortJsonKeysCommonFirst(42, 'hello')).toEqual([42, 'hello'])
        expect(sortJsonKeysCommonFirst(null, null)).toEqual([null, null])
    })

    it('passes through arrays unchanged', () => {
        expect(sortJsonKeysCommonFirst([1, 2], [3, 4])).toEqual([[1, 2], [3, 4]])
    })

    it('recurses into nested objects', () => {
        const left = { shared: { z: 1, a: 2 } }
        const right = { shared: { a: 10, z: 20 } }
        const [sortedL] = sortJsonKeysCommonFirst(left, right)
        const nested = (sortedL as Record<string, unknown>).shared as Record<string, unknown>
        expect(Object.keys(nested)).toEqual(['a', 'z'])
    })
})

// ── formatResponseData ──────────────────────────────────────────────────────

describe('formatResponseData', () => {
    it('returns empty string for null', () => {
        expect(formatResponseData(null)).toBe('')
    })

    it('returns empty string for undefined', () => {
        expect(formatResponseData(undefined)).toBe('')
    })

    it('pretty-prints a JSON string', () => {
        const result = formatResponseData('{"a":1}')
        expect(result).toBe('{\n  "a": 1\n}')
    })

    it('pretty-prints an object', () => {
        const result = formatResponseData({ a: 1 })
        expect(result).toBe('{\n  "a": 1\n}')
    })

    it('returns non-JSON string as-is', () => {
        expect(formatResponseData('hello world')).toBe('hello world')
    })

    it('sorts keys when sortKeys is true', () => {
        const result = formatResponseData({ b: 1, a: 2 }, true)
        const parsed = JSON.parse(result)
        expect(Object.keys(parsed)).toEqual(['a', 'b'])
    })

    it('does not sort keys when sortKeys is false', () => {
        const result = formatResponseData({ b: 1, a: 2 }, false)
        // JSON.stringify preserves insertion order
        expect(result).toBe('{\n  "b": 1,\n  "a": 2\n}')
    })

    it('sorts keys in JSON string input when sortKeys is true', () => {
        const result = formatResponseData('{"z":1,"a":2}', true)
        const parsed = JSON.parse(result)
        expect(Object.keys(parsed)).toEqual(['a', 'z'])
    })
})

// ── computeDifferences ──────────────────────────────────────────────────────

describe('computeDifferences', () => {
    const makeResponse = (overrides: Partial<HostResponse> = {}): HostResponse => ({
        hostId: 'host-1',
        hostValue: 'http://example.com',
        response: { data: {}, status: 200, statusText: 'OK', headers: {} },
        error: null,
        isLoading: false,
        responseTime: 100,
        ...overrides,
    })

    it('returns no differences for identical responses', () => {
        const ref = makeResponse()
        const host = makeResponse({ hostId: 'host-2' })
        const result = computeDifferences(ref, host)
        expect(result.differences).toHaveLength(0)
    })

    it('detects status code difference', () => {
        const ref = makeResponse()
        const host = makeResponse({
            hostId: 'host-2',
            response: { data: {}, status: 500, statusText: 'Error', headers: {} },
        })
        const result = computeDifferences(ref, host)
        expect(result.differences).toContainEqual(
            expect.objectContaining({ path: 'status', type: 'modified' })
        )
    })

    it('detects large response time difference', () => {
        const ref = makeResponse({ responseTime: 100 })
        const host = makeResponse({ hostId: 'host-2', responseTime: 700 })
        const result = computeDifferences(ref, host)
        expect(result.differences).toContainEqual(
            expect.objectContaining({ path: 'responseTime', type: 'modified' })
        )
    })

    it('ignores small response time difference (below threshold)', () => {
        const ref = makeResponse({ responseTime: 100 })
        const host = makeResponse({ hostId: 'host-2', responseTime: 300 })
        const result = computeDifferences(ref, host)
        const timeDiff = result.differences.find(d => d.path === 'responseTime')
        expect(timeDiff).toBeUndefined()
    })

    it('returns correct hostId', () => {
        const ref = makeResponse()
        const host = makeResponse({ hostId: 'host-2' })
        const result = computeDifferences(ref, host)
        expect(result.hostId).toBe('host-2')
    })
})
