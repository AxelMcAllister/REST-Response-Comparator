/**
 * Host parsing and normalization service
 * Supports versatile input: hostname, base URL, full URL
 */

export interface ParsedHost {
  original: string
  normalized: string // A base URL, like https://api.example.com/v1
  hostname: string // Just the hostname part, e.g., api.example.com
}

/**
 * Parse and normalize host input.
 * Preserves the path from the input URL to use as a base.
 */
export function parseHost(input: string): ParsedHost {
  const trimmed = input.trim()
  let urlString = trimmed

  // If no protocol, default to http:// (user expectation)
  if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
    urlString = `http://${urlString}`
  }

  try {
    const url = new URL(urlString)

    // Construct the base URL, including the path
    let normalizedUrl = `${url.protocol}//${url.host}${url.pathname}`

    // Remove trailing slash if it's not the root path
    if (normalizedUrl.length > 1 && normalizedUrl.endsWith('/')) {
      normalizedUrl = normalizedUrl.slice(0, -1)
    }

    return {
      original: trimmed,
      normalized: normalizedUrl,
      hostname: url.hostname,
    }
  } catch {
    // Fallback for simple hostnames that fail URL parsing
    return {
      original: trimmed,
      normalized: `http://${trimmed}`,
      hostname: trimmed,
    }
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
  if (!input?.trim()) {
    return { valid: false, error: 'Host cannot be empty' }
  }

  try {
    const parsed = parseHost(input)

    // Basic hostname validation
    if (!parsed.hostname) {
      return { valid: false, error: 'Invalid host format' }
    }

    // Check for valid hostname characters
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!hostnameRegex.test(parsed.hostname) && !ipv4Regex.test(parsed.hostname)) {
      return { valid: false, error: 'Invalid hostname format' }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid host format' }
  }
}
