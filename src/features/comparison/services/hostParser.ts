/**
 * Host parsing and normalization service
 * Supports versatile input: hostname, base URL, full URL
 */

export interface ParsedHost {
  original: string
  normalized: string // Always a base URL like https://api.example.com
  hostname: string // Just the hostname part
}

/**
 * Parse and normalize host input
 * Supports: hostname, base URL, full URL
 */
export function parseHost(input: string): ParsedHost {
  const trimmed = input.trim()
  
  // If it's already a full URL, extract base URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed)
      return {
        original: trimmed,
        normalized: `${url.protocol}//${url.host}`,
        hostname: url.hostname
      }
    } catch {
      // Invalid URL, treat as hostname
    }
  }
  
  // Treat as hostname, default to https
  const hostname = trimmed.replace(/^https?:\/\//, '')
  return {
    original: trimmed,
    normalized: `https://${hostname}`,
    hostname
  }
}

/**
 * Parse multiple hosts (comma-separated or array)
 */
export function parseHosts(input: string | string[]): ParsedHost[] {
  if (Array.isArray(input)) {
    return input.map(parseHost)
  }
  
  // Split by comma and filter empty strings
  return input
    .split(',')
    .map(h => h.trim())
    .filter(h => h.length > 0)
    .map(parseHost)
}

/**
 * Validate host format
 */
export function validateHost(input: string): { valid: boolean; error?: string } {
  if (!input || !input.trim()) {
    return { valid: false, error: 'Host cannot be empty' }
  }
  
  const parsed = parseHost(input)
  
  // Basic hostname validation
  if (!parsed.hostname || parsed.hostname.length === 0) {
    return { valid: false, error: 'Invalid host format' }
  }
  
  // Check for valid hostname characters
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  if (!hostnameRegex.test(parsed.hostname) && !parsed.hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
    return { valid: false, error: 'Invalid hostname format' }
  }
  
  return { valid: true }
}
