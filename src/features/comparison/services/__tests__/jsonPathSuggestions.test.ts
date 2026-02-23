import { describe, it, expect } from 'vitest'
import {
    parseJsonPathInput,
    getJsonPathSuggestions,
    parseResponseData,
    buildLineToPathMap,
} from '../jsonPathSuggestions'

// ── parseJsonPathInput ──────────────────────────────────────────────────────

describe('parseJsonPathInput', () => {
    it('returns $ prefix and empty partial for empty input', () => {
        expect(parseJsonPathInput('')).toEqual({ pathPrefix: '$', partial: '' })
    })

    it('returns $ prefix and empty partial for "$"', () => {
        expect(parseJsonPathInput('$')).toEqual({ pathPrefix: '$', partial: '' })
    })

    it('treats non-$ input as partial', () => {
        expect(parseJsonPathInput('foo')).toEqual({ pathPrefix: '$', partial: 'foo' })
    })

    it('handles "$.foo" — partial "foo" at root', () => {
        const result = parseJsonPathInput('$.foo')
        expect(result.pathPrefix).toBe('$')
        expect(result.partial).toBe('foo')
    })

    it('handles "$.foo." — complete segment, no partial', () => {
        const result = parseJsonPathInput('$.foo.')
        expect(result.pathPrefix).toBe('$.foo')
        expect(result.partial).toBe('')
    })

    it('handles "$.foo.bar" — bar is partial', () => {
        const result = parseJsonPathInput('$.foo.bar')
        expect(result.pathPrefix).toBe('$.foo')
        expect(result.partial).toBe('bar')
    })

    it('handles "$.data[*]" — [*] is partial', () => {
        const result = parseJsonPathInput('$.data[*]')
        expect(result.partial).toBe('[*]')
    })

    it('handles "$.data[*].name" — name is partial', () => {
        const result = parseJsonPathInput('$.data[*].name')
        expect(result.pathPrefix).toBe('$.data[*]')
        expect(result.partial).toBe('name')
    })

    it('handles "$.data[*]." — complete path, empty partial', () => {
        const result = parseJsonPathInput('$.data[*].')
        expect(result.pathPrefix).toBe('$.data[*]')
        expect(result.partial).toBe('')
    })

    it('handles whitespace via trim', () => {
        const result = parseJsonPathInput('  $  ')
        expect(result.pathPrefix).toBe('$')
        expect(result.partial).toBe('')
    })
})

// ── parseResponseData ───────────────────────────────────────────────────────

describe('parseResponseData', () => {
    it('parses JSON string to object', () => {
        const result = parseResponseData('{"a":1}')
        expect(result).toEqual({ a: 1 })
    })

    it('returns non-JSON string as-is', () => {
        expect(parseResponseData('hello')).toBe('hello')
    })

    it('returns object passthrough', () => {
        const obj = { foo: 'bar' }
        expect(parseResponseData(obj)).toBe(obj)
    })

    it('returns null as null', () => {
        expect(parseResponseData(null)).toBeNull()
    })

    it('returns undefined as undefined', () => {
        expect(parseResponseData(undefined)).toBeUndefined()
    })

    it('returns number as number', () => {
        expect(parseResponseData(42)).toBe(42)
    })
})

// ── getJsonPathSuggestions ──────────────────────────────────────────────────

describe('getJsonPathSuggestions', () => {
    const data = { users: [{ id: 1, name: 'Alice' }], count: 2 }

    it('returns root-level object keys', () => {
        const suggestions = getJsonPathSuggestions([data], '$', '')
        expect(suggestions).toContain('count')
        expect(suggestions).toContain('users')
    })

    it('returns [*] for arrays', () => {
        const suggestions = getJsonPathSuggestions([data], '$.users', '')
        expect(suggestions).toContain('[*]')
    })

    it('returns keys of array elements', () => {
        const suggestions = getJsonPathSuggestions([data], '$.users[*]', '')
        expect(suggestions).toContain('id')
        expect(suggestions).toContain('name')
    })

    it('filters by partial prefix', () => {
        const suggestions = getJsonPathSuggestions([data], '$', 'co')
        expect(suggestions).toContain('count')
        expect(suggestions).not.toContain('users')
    })

    it('returns empty array for empty data list', () => {
        expect(getJsonPathSuggestions([], '$', '')).toEqual([])
    })

    it('merges keys from multiple response objects', () => {
        const data1 = { a: 1, b: 2 }
        const data2 = { b: 3, c: 4 }
        const suggestions = getJsonPathSuggestions([data1, data2], '$', '')
        expect(suggestions).toContain('a')
        expect(suggestions).toContain('b')
        expect(suggestions).toContain('c')
    })

    it('deduplicates keys', () => {
        const data1 = { a: 1 }
        const data2 = { a: 2 }
        const suggestions = getJsonPathSuggestions([data1, data2], '$', '')
        expect(suggestions.filter(s => s === 'a')).toHaveLength(1)
    })

    it('returns sorted suggestions', () => {
        const data = { z: 1, a: 2, m: 3 }
        const suggestions = getJsonPathSuggestions([data], '$', '')
        expect(suggestions).toEqual(['a', 'm', 'z'])
    })

    it('handles JSON string data', () => {
        const suggestions = getJsonPathSuggestions(['{"foo":1}'], '$', '')
        expect(suggestions).toContain('foo')
    })

    it('returns empty for primitive values', () => {
        expect(getJsonPathSuggestions([42], '$', '')).toEqual([])
    })

    it('returns empty for null', () => {
        expect(getJsonPathSuggestions([null], '$', '')).toEqual([])
    })
})

// ── buildLineToPathMap ──────────────────────────────────────────────────────

describe('buildLineToPathMap', () => {
    it('maps simple object lines', () => {
        const value = { name: 'Alice', age: 30 }
        const map = buildLineToPathMap(value)
        // Line 1: {
        expect(map.get(1)).toBe('$')
        // Line 2: "name": "Alice",  → $.name
        expect(map.get(2)).toBe('$.name')
        // Line 3: "age": 30  → $.age
        expect(map.get(3)).toBe('$.age')
    })

    it('maps nested object lines', () => {
        const value = { data: { id: 1 } }
        const map = buildLineToPathMap(value)
        // Structure: { "data": { "id": 1 } }
        // Line 2 should be $.data
        expect(map.get(2)).toBe('$.data')
    })

    it('maps array lines with [*]', () => {
        const value = { items: [1, 2] }
        const map = buildLineToPathMap(value)
        // Line 2 should be $.items
        expect(map.get(2)).toBe('$.items')
    })

    it('uses custom basePath', () => {
        const value = { a: 1 }
        const map = buildLineToPathMap(value, '$.data')
        expect(map.get(1)).toBe('$.data')
        expect(map.get(2)).toBe('$.data.a')
    })

    it('handles empty object', () => {
        const map = buildLineToPathMap({})
        expect(map.size).toBeGreaterThan(0) // At least the {} lines
        expect(map.get(1)).toBe('$')
    })

    it('handles deeply nested structure', () => {
        const value = { a: { b: { c: 'deep' } } }
        const map = buildLineToPathMap(value)
        // Should contain $.a.b.c somewhere
        const values = Array.from(map.values())
        expect(values).toContain('$.a')
        expect(values).toContain('$.a.b')
        expect(values).toContain('$.a.b.c')
    })
})
