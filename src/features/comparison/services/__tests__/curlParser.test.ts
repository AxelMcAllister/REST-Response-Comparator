import { describe, it, expect } from 'vitest'
import {
    normalizeCurlCommand,
    parseCurl,
    hasHostPlaceholder,
    autoDetectHostPlaceholder,
    validateCurl,
    formatParsedCurlToCommand,
} from '../curlParser'

// ── normalizeCurlCommand ────────────────────────────────────────────────────

describe('normalizeCurlCommand', () => {
    it('joins backslash-continued lines', () => {
        const input = 'curl \\\n  -X POST \\\n  http://example.com'
        expect(normalizeCurlCommand(input)).toBe('curl -X POST http://example.com')
    })

    it('normalises Windows CRLF line endings', () => {
        const input = 'curl \\\r\n  -X GET \\\r\n  http://example.com'
        expect(normalizeCurlCommand(input)).toBe('curl -X GET http://example.com')
    })

    it('collapses excessive whitespace', () => {
        const input = 'curl    -X   GET    http://example.com'
        expect(normalizeCurlCommand(input)).toBe('curl -X GET http://example.com')
    })

    it('returns single-line commands unchanged (aside from trim)', () => {
        expect(normalizeCurlCommand('curl http://example.com')).toBe('curl http://example.com')
    })

    it('strips leading/trailing whitespace', () => {
        expect(normalizeCurlCommand('  curl http://example.com  ')).toBe('curl http://example.com')
    })
})

// ── parseCurl ───────────────────────────────────────────────────────────────

describe('parseCurl', () => {
    it('parses a simple GET request', () => {
        const result = parseCurl('curl http://example.com/api')
        expect(result.url).toBe('http://example.com/api')
        expect(result.method).toBe('GET')
        expect(result.headers).toEqual({})
        expect(result.body).toBeUndefined()
    })

    it('parses explicit -X POST method', () => {
        const result = parseCurl('curl -X POST http://example.com')
        expect(result.method).toBe('POST')
    })

    it('parses -X put (case insensitive)', () => {
        const result = parseCurl('curl -X put http://example.com')
        expect(result.method).toBe('PUT')
    })

    it('extracts multiple -H headers', () => {
        const cmd = `curl -H 'Content-Type: application/json' -H 'Authorization: Bearer token' http://example.com`
        const result = parseCurl(cmd)
        expect(result.headers['Content-Type']).toBe('application/json')
        expect(result.headers['Authorization']).toBe('Bearer token')
    })

    it('extracts body from -d flag (double-quoted)', () => {
        const cmd = `curl -X POST -d "simple-body" http://example.com`
        const result = parseCurl(cmd)
        expect(result.body).toBe('simple-body')
    })

    it('extracts body from --data flag (double-quoted)', () => {
        const cmd = `curl -X POST --data "body-content" http://example.com`
        const result = parseCurl(cmd)
        expect(result.body).toBe('body-content')
    })

    it('parses URL in single quotes', () => {
        const result = parseCurl(`curl 'http://example.com/path'`)
        expect(result.url).toBe('http://example.com/path')
    })

    it('parses URL in double quotes', () => {
        const result = parseCurl(`curl "http://example.com/path"`)
        expect(result.url).toBe('http://example.com/path')
    })

    it('parses {host} placeholder URL when quoted', () => {
        const result = parseCurl(`curl '{host}/api/v1/users'`)
        expect(result.url).toContain('{host}')
    })

    it('defaults method to GET when no -X flag', () => {
        const result = parseCurl('curl http://example.com')
        expect(result.method).toBe('GET')
    })

    it('preserves originalCurl', () => {
        const cmd = 'curl http://example.com'
        const result = parseCurl(cmd)
        expect(result.originalCurl).toBe(cmd)
    })

    it('handles multiline curl commands', () => {
        const cmd = 'curl \\\n  -X POST \\\n  -H "Content-Type: application/json" \\\n  http://example.com'
        const result = parseCurl(cmd)
        expect(result.method).toBe('POST')
        expect(result.url).toBe('http://example.com')
        expect(result.headers['Content-Type']).toBe('application/json')
    })
})

// ── hasHostPlaceholder ──────────────────────────────────────────────────────

describe('hasHostPlaceholder', () => {
    it('returns true when {host} is present', () => {
        expect(hasHostPlaceholder('curl {host}/api')).toBe(true)
    })

    it('returns false when no {host}', () => {
        expect(hasHostPlaceholder('curl http://example.com')).toBe(false)
    })

    it('returns true with multiple {host} occurrences', () => {
        expect(hasHostPlaceholder('curl {host}/api -H "Origin: {host}"')).toBe(true)
    })
})

// ── autoDetectHostPlaceholder ───────────────────────────────────────────────

describe('autoDetectHostPlaceholder', () => {
    it('replaces hostname with {host} in http URL', () => {
        const result = autoDetectHostPlaceholder('curl http://api.example.com/users')
        expect(result).toContain('{host}')
        expect(result).toContain('/users')
        expect(result).not.toContain('api.example.com')
    })

    it('replaces hostname with {host} in https URL', () => {
        const result = autoDetectHostPlaceholder('curl https://api.example.com/users')
        expect(result).toContain('{host}')
    })

    it('returns unchanged if {host} is already present', () => {
        const cmd = 'curl {host}/api'
        expect(autoDetectHostPlaceholder(cmd)).toBe(cmd)
    })

    it('handles URL without path', () => {
        const result = autoDetectHostPlaceholder('curl http://example.com')
        expect(result).toContain('{host}')
    })
})

// ── validateCurl ────────────────────────────────────────────────────────────

describe('validateCurl', () => {
    it('returns error for empty string', () => {
        const result = validateCurl('')
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
    })

    it('returns error for whitespace-only string', () => {
        const result = validateCurl('   ')
        expect(result.valid).toBe(false)
    })

    it('returns error for non-curl command', () => {
        const result = validateCurl('wget http://example.com')
        expect(result.valid).toBe(false)
    })

    it('validates a simple curl command', () => {
        const result = validateCurl('curl http://example.com')
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
    })

    it('validates curl with {host} placeholder', () => {
        const result = validateCurl('curl {host}/api')
        expect(result.valid).toBe(true)
    })

    it('validates curl with known standalone flags', () => {
        const result = validateCurl(`curl -L -k http://example.com`)
        expect(result.valid).toBe(true)
    })

    it('returns error for unknown flags', () => {
        const result = validateCurl('curl --unknown-flag http://example.com')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Unrecognized')
    })

    it('validates curl with relative URL', () => {
        const result = validateCurl('curl /api/v1/users')
        expect(result.valid).toBe(true)
    })
})

// ── formatParsedCurlToCommand ───────────────────────────────────────────────

describe('formatParsedCurlToCommand', () => {
    it('formats a simple GET', () => {
        const result = formatParsedCurlToCommand({
            url: 'http://example.com',
            method: 'GET',
            headers: {},
            originalCurl: ''
        })
        expect(result).toContain('curl')
        expect(result).toContain('http://example.com')
    })

    it('includes -X for non-GET methods', () => {
        const result = formatParsedCurlToCommand({
            url: 'http://example.com',
            method: 'POST',
            headers: {},
            originalCurl: ''
        })
        expect(result).toContain('-X POST')
    })

    it('includes headers', () => {
        const result = formatParsedCurlToCommand({
            url: 'http://example.com',
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            originalCurl: ''
        })
        expect(result).toContain("-H 'Content-Type: application/json'")
    })

    it('includes body with -d flag', () => {
        const result = formatParsedCurlToCommand({
            url: 'http://example.com',
            method: 'POST',
            headers: {},
            body: '{"key":"value"}',
            originalCurl: ''
        })
        expect(result).toContain("-d '")
        expect(result).toContain('{"key":"value"}')
    })

    it('roundtrips a parsed command', () => {
        const original = `curl -X POST -H 'Content-Type: application/json' -d '{"a":1}' http://example.com/api`
        const parsed = parseCurl(original)
        const formatted = formatParsedCurlToCommand(parsed)
        expect(formatted).toContain('-X POST')
        expect(formatted).toContain('Content-Type')
        expect(formatted).toContain('http://example.com/api')
    })
})
