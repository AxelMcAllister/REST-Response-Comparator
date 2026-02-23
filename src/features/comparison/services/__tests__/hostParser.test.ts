import { describe, it, expect } from 'vitest'
import { parseHost, parseHosts, validateHost } from '../hostParser'

// ── parseHost ───────────────────────────────────────────────────────────────

describe('parseHost', () => {
    it('parses a bare hostname, defaults to http://', () => {
        const result = parseHost('example.com')
        expect(result.hostname).toBe('example.com')
        expect(result.normalized).toBe('http://example.com')
        expect(result.original).toBe('example.com')
    })

    it('preserves https:// protocol', () => {
        const result = parseHost('https://api.example.com')
        expect(result.normalized).toBe('https://api.example.com')
        expect(result.hostname).toBe('api.example.com')
    })

    it('preserves http:// protocol', () => {
        const result = parseHost('http://api.example.com')
        expect(result.normalized).toBe('http://api.example.com')
    })

    it('preserves path from URL', () => {
        const result = parseHost('https://api.example.com/v1')
        expect(result.normalized).toBe('https://api.example.com/v1')
    })

    it('removes trailing slash', () => {
        const result = parseHost('https://api.example.com/')
        expect(result.normalized).toBe('https://api.example.com')
    })

    it('preserves trailing slash for deeper paths', () => {
        // /v1/ → /v1 (trailing slash removed)
        const result = parseHost('https://api.example.com/v1/')
        expect(result.normalized).toBe('https://api.example.com/v1')
    })

    it('handles IP address', () => {
        const result = parseHost('192.168.1.1')
        expect(result.hostname).toBe('192.168.1.1')
        expect(result.normalized).toBe('http://192.168.1.1')
    })

    it('handles IP address with port', () => {
        const result = parseHost('192.168.1.1:8080')
        expect(result.hostname).toBe('192.168.1.1')
        expect(result.normalized).toBe('http://192.168.1.1:8080')
    })

    it('handles hostname with port', () => {
        const result = parseHost('example.com:3000')
        expect(result.hostname).toBe('example.com')
        expect(result.normalized).toBe('http://example.com:3000')
    })

    it('trims whitespace', () => {
        const result = parseHost('  example.com  ')
        expect(result.original).toBe('example.com')
        expect(result.hostname).toBe('example.com')
    })

    it('handles localhost', () => {
        const result = parseHost('localhost:3000')
        expect(result.hostname).toBe('localhost')
        expect(result.normalized).toBe('http://localhost:3000')
    })
})

// ── parseHosts ──────────────────────────────────────────────────────────────

describe('parseHosts', () => {
    it('parses an array of hosts', () => {
        const result = parseHosts(['example.com', 'api.example.com'])
        expect(result).toHaveLength(2)
        expect(result[0].hostname).toBe('example.com')
        expect(result[1].hostname).toBe('api.example.com')
    })

    it('parses comma-separated string', () => {
        const result = parseHosts('example.com, api.example.com')
        expect(result).toHaveLength(2)
        expect(result[0].hostname).toBe('example.com')
        expect(result[1].hostname).toBe('api.example.com')
    })

    it('filters empty entries', () => {
        const result = parseHosts('example.com,,, api.example.com,')
        expect(result).toHaveLength(2)
    })

    it('handles single host string', () => {
        const result = parseHosts('example.com')
        expect(result).toHaveLength(1)
        expect(result[0].hostname).toBe('example.com')
    })

    it('handles empty string', () => {
        const result = parseHosts('')
        expect(result).toHaveLength(0)
    })

    it('handles empty array', () => {
        const result = parseHosts([])
        expect(result).toHaveLength(0)
    })
})

// ── validateHost ────────────────────────────────────────────────────────────

describe('validateHost', () => {
    it('rejects empty string', () => {
        expect(validateHost('').valid).toBe(false)
    })

    it('rejects whitespace only', () => {
        expect(validateHost('   ').valid).toBe(false)
    })

    it('accepts valid hostname', () => {
        expect(validateHost('example.com').valid).toBe(true)
    })

    it('accepts valid IPv4', () => {
        expect(validateHost('192.168.1.1').valid).toBe(true)
    })

    it('accepts hostname with port', () => {
        expect(validateHost('example.com:8080').valid).toBe(true)
    })

    it('accepts full URL with protocol', () => {
        expect(validateHost('https://api.example.com').valid).toBe(true)
    })

    it('accepts localhost', () => {
        expect(validateHost('localhost').valid).toBe(true)
    })

    it('rejects hostname with invalid characters', () => {
        expect(validateHost('example .com').valid).toBe(false)
    })

    it('accepts subdomain', () => {
        expect(validateHost('api.v1.example.com').valid).toBe(true)
    })
})
