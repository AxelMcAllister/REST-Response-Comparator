import { describe, it, expect } from 'vitest'
import { replaceHostInCurl, replaceHostInParsedCurl, generateCurlsForHosts } from '../hostReplacer'
import type { ParsedHost } from '../hostParser'
import type { ParsedCurl } from '@/shared/types'

const makeHost = (normalized: string, hostname = 'example.com'): ParsedHost => ({
    original: hostname,
    normalized,
    hostname,
})

// ── replaceHostInCurl ───────────────────────────────────────────────────────

describe('replaceHostInCurl', () => {
    it('replaces single {host} placeholder', () => {
        const result = replaceHostInCurl('curl {host}/api/users', makeHost('https://api.example.com'))
        expect(result).toBe('curl https://api.example.com/api/users')
    })

    it('replaces multiple {host} placeholders', () => {
        const result = replaceHostInCurl(
            'curl {host}/api -H "Origin: {host}"',
            makeHost('https://api.example.com')
        )
        expect(result).toBe('curl https://api.example.com/api -H "Origin: https://api.example.com"')
    })

    it('returns unchanged string when no {host}', () => {
        const result = replaceHostInCurl('curl http://fixed.com/api', makeHost('https://api.example.com'))
        expect(result).toBe('curl http://fixed.com/api')
    })
})

// ── replaceHostInParsedCurl ─────────────────────────────────────────────────

describe('replaceHostInParsedCurl', () => {
    const baseParsed: ParsedCurl = {
        url: '{host}/api/v1',
        method: 'GET',
        headers: {},
        originalCurl: 'curl {host}/api/v1',
    }

    it('replaces {host} in URL with host normalized + path', () => {
        const result = replaceHostInParsedCurl(baseParsed, makeHost('https://api.example.com'))
        expect(result.url).toBe('https://api.example.com/api/v1')
    })

    it('handles {host} without suffix path', () => {
        const parsed = { ...baseParsed, url: '{host}' }
        const result = replaceHostInParsedCurl(parsed, makeHost('https://api.example.com'))
        expect(result.url).toBe('https://api.example.com')
    })

    it('avoids double slashes between base and suffix', () => {
        const parsed = { ...baseParsed, url: '{host}/path' }
        const host = makeHost('https://api.example.com/')
        const result = replaceHostInParsedCurl(parsed, host)
        // Protocol // is fine, but path should not have double slashes
        const pathPortion = result.url.replace('https://', '')
        expect(pathPortion).not.toContain('//')
        expect(result.url).toBe('https://api.example.com/path')
    })

    it('resolves relative URL against host when no {host} placeholder', () => {
        const parsed = { ...baseParsed, url: '/api/v1/users' }
        const result = replaceHostInParsedCurl(parsed, makeHost('https://api.example.com'))
        expect(result.url).toContain('https://api.example.com')
        expect(result.url).toContain('/api/v1/users')
    })

    it('resolves non-placeholder URL relative to host', () => {
        // URL constructor treats :::bad-url as a relative path
        const parsed = { ...baseParsed, url: '/fallback' }
        const result = replaceHostInParsedCurl(parsed, makeHost('https://api.example.com'))
        expect(result.url).toContain('https://api.example.com')
        expect(result.url).toContain('/fallback')
    })

    it('preserves non-URL fields (method, headers, body)', () => {
        const parsed: ParsedCurl = {
            url: '{host}/api',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{"a":1}',
            originalCurl: 'curl -X POST {host}/api',
        }
        const result = replaceHostInParsedCurl(parsed, makeHost('https://api.example.com'))
        expect(result.method).toBe('POST')
        expect(result.headers).toEqual({ 'Content-Type': 'application/json' })
        expect(result.body).toBe('{"a":1}')
    })
})

// ── generateCurlsForHosts ───────────────────────────────────────────────────

describe('generateCurlsForHosts', () => {
    it('generates curls for multiple hosts', () => {
        const hosts = [
            makeHost('https://host-a.com', 'host-a.com'),
            makeHost('https://host-b.com', 'host-b.com'),
        ]
        const results = generateCurlsForHosts('curl {host}/api', hosts)
        expect(results).toHaveLength(2)
        expect(results[0].curl).toBe('curl https://host-a.com/api')
        expect(results[1].curl).toBe('curl https://host-b.com/api')
    })

    it('returns the host objects alongside curls', () => {
        const host = makeHost('https://example.com')
        const results = generateCurlsForHosts('curl {host}/api', [host])
        expect(results[0].host).toBe(host)
    })

    it('returns empty array for empty hosts', () => {
        expect(generateCurlsForHosts('curl {host}/api', [])).toEqual([])
    })
})
