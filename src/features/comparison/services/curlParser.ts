/**
 * cURL command parser
 * Extracts URL, method, headers, and body from cURL commands
 */

import type {ParsedCurl} from '@/shared/types'

/**
 * Recognized curl flags (long and short forms).
 * Unknown flags will cause validation to fail.
 */
const KNOWN_CURL_FLAGS = new Set([
  '-X', '--request',
  '-H', '--header',
  '-d', '--data', '--data-raw', '--data-binary', '--data-urlencode',
  '-u', '--user',
  '-A', '--user-agent',
  '-e', '--referer',
  '-L', '--location',
  '-k', '--insecure',
  '-m', '--max-time',
  '--connect-timeout',
  '-o', '--output',
  '-s', '--silent',
  '-v', '--verbose',
  '-b', '--cookie',
  '-c', '--cookie-jar',
  '--compressed',
  '--http1.0', '--http1.1', '--http2',
  '-G', '--get',
  '--url',
  '-F', '--form',
  '--json',
  '-I', '--head',
  '-T', '--upload-file',
])

const FLAGS_WITH_ARGS = new Set([
  '-X', '--request',
  '-H', '--header',
  '-d', '--data', '--data-raw', '--data-binary', '--data-urlencode',
  '-u', '--user',
  '-A', '--user-agent',
  '-e', '--referer',
  '-m', '--max-time',
  '--connect-timeout',
  '-o', '--output',
  '-b', '--cookie',
  '-c', '--cookie-jar',
  '--url',
  '-F', '--form',
  '--json',
  '-T', '--upload-file',
])

/**
 * Normalize a (possibly multiline) curl command into a single line.
 * Lines ending with " \\" (backslash continuation) are joined.
 */
export function normalizeCurlCommand(raw: string): string {
  return raw
    .split('\n')
    .map(line => line.trimEnd())
    .reduce<string[]>((acc, line) => {
      if (line.endsWith('\\')) {
        acc.push(line.slice(0, -1).trimEnd())
      } else {
        acc.push(line)
      }
      return acc
    }, [])
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parse a cURL command string
 * Supports: method, URL, headers, body
 */
export function parseCurl(curlCommand: string): ParsedCurl {
  const trimmed = normalizeCurlCommand(curlCommand)

  // Remove 'curl' prefix if present
  let command = trimmed.replace(/^curl\s+/, '')

  const parsed: ParsedCurl = {
    url: '',
    method: 'GET',
    headers: {},
    body: undefined,
    originalCurl: trimmed
  }

  // Extract method (-X flag)
  const methodMatch = /-X\s+(\w+)/i.exec(command)
  if (methodMatch) {
    parsed.method = methodMatch[1].toUpperCase()
    command = command.replace(methodMatch[0], '')
  }

  // Extract headers (-H flags)
  // Use matchAll to find all headers without modifying the string in the loop
  const headerRegex = /-H\s+['"]([^'"]+)['"]/g
  const headerMatches = [...command.matchAll(headerRegex)]

  headerMatches.forEach(match => {
    const header = match[1]
    const colonIndex = header.indexOf(':')
    if (colonIndex > 0) {
      const key = header.substring(0, colonIndex).trim()
      parsed.headers[key] = header.substring(colonIndex + 1).trim()
    }
    // Remove the header from command string to clean it up for URL extraction
    command = command.replace(match[0], '')
  })

  // Extract body (-d or --data flag)
  const bodyMatch = /(?:-d|--data)\s+['"]([^'"]+)['"]|(?:-d|--data)\s+(\S+)/.exec(command)
  if (bodyMatch) {
    parsed.body = bodyMatch[1] || bodyMatch[2]
    command = command.replace(bodyMatch[0], '')
  }

  // Strip standalone flags (flags without arguments) so they don't interfere with URL extraction.
  // These are known flags that do NOT consume a following token.
  const STANDALONE_FLAGS = new Set([
    '-L', '--location',
    '-k', '--insecure',
    '-s', '--silent',
    '-v', '--verbose',
    '--compressed',
    '--http1.0', '--http1.1', '--http2',
    '-G', '--get',
    '-I', '--head',
  ])
  command = command
    .split(/\s+/)
    .filter(token => !STANDALONE_FLAGS.has(token))
    .join(' ')

  // Extract URL
  const cleanCommand = command.trim()

  // 1. Check for quoted URL (single or double quotes)
  // Matches 'url' or "url" and captures the content inside
  const quotedUrlMatch = /^(['"])(.*?)\1/.exec(cleanCommand)
  if (quotedUrlMatch) {
    parsed.url = quotedUrlMatch[2].trim()
  } else {
    // 2. Fallback to finding http/https or path
    const urlMatch = /(https?:\/\/\S+|\/\S*)/.exec(cleanCommand)
    if (urlMatch) {
      parsed.url = urlMatch[1].trim()
    } else {
      // 3. Fallback: take the first non-empty token
      const firstToken = cleanCommand.split(/\s+/)[0]
      if (firstToken && !firstToken.startsWith('-')) {
        parsed.url = firstToken
      }
    }
  }

  return parsed
}

/**
 * Check if cURL contains {host} placeholder
 */
export function hasHostPlaceholder(curlCommand: string): boolean {
  return curlCommand.includes('{host}')
}

/**
 * Auto-detect and insert {host} placeholder
 * Attempts to find hostname in URL and replace with {host}
 */
export function autoDetectHostPlaceholder(curlCommand: string): string {
  const original = curlCommand

  // Pattern for full URLs (e.g., https://example.com/path)
  const urlPattern = /(https?:\/\/)([^/\s'"]+)/
  const urlMatch = urlPattern.exec(original)
  if (urlMatch) {
    return original.replace(urlMatch[0], '{host}')
  }

  // Pattern for bare hostnames (e.g., api.example.com)
  const hostnamePattern = /([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/
  const hostnameMatch = hostnamePattern.exec(original)
  if (hostnameMatch) {
    // Ensure it's not part of a path
    const charBefore = original.charAt(hostnameMatch.index - 1)
    if (charBefore === '' || charBefore === ' ' || charBefore === "'" || charBefore === '"' || charBefore === '/') {
      return original.replace(hostnameMatch[0], '{host}')
    }
  }

  // If no hostname found, assume a path-only URL and prepend {host}
  // This is a fallback and might not cover all edge cases.
  // It looks for the first path-like argument.
  const tokens = original.split(/\s+/)
  const urlTokenIndex = tokens.findIndex(t => t.startsWith('/') || t.startsWith('\'/') || t.startsWith('"/'))
  if (urlTokenIndex > -1) {
    const token = tokens[urlTokenIndex]
    tokens[urlTokenIndex] = token.startsWith('/') ? `{host}${token}` : token.charAt(0) + `{host}` + token.slice(1)
    return tokens.join(' ')
  }

  return original
}


/**
 * Validate cURL command format.
 * Checks:
 *  1. Non-empty
 *  2. Starts with "curl"
 *  3. No unrecognized flags
 *  4. Contains a URL
 */
export function validateCurl(curlCommand: string): { valid: boolean; error?: string } {
  if (!curlCommand?.trim()) {
    return { valid: false, error: 'cURL command cannot be empty' }
  }

  const normalized = normalizeCurlCommand(curlCommand)

  // 1. Must start with 'curl'
  if (!/^curl(\s|$)/i.test(normalized)) {
    return { valid: false, error: "cURL command must start with 'curl'" }
  }

  // Check for incomplete 'curl' command
  if (/^curl\s*$/i.test(normalized)) {
    return { valid: false, error: 'cURL command is incomplete' }
  }

  // 2. Check for unknown flags and flags with missing arguments
  //    Strip curl keyword, all quoted strings (flag values/URLs), and bare URLs
  //    so only flag tokens remain for inspection.
  let stripped = normalized.replace(/^curl\s*/i, '')
  stripped = stripped.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '')
  stripped = stripped.replace(/https?:\/\/\S+/g, '')

  const tokens = stripped.trim().split(/\s+/).filter(Boolean)
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.startsWith('-')) {
      if (!KNOWN_CURL_FLAGS.has(token)) {
        return { valid: false, error: `Unrecognized curl option: '${token}'` }
      }
      if (FLAGS_WITH_ARGS.has(token)) {
        const nextToken = tokens[i + 1];
        if (!nextToken || nextToken.startsWith('-')) {
          return { valid: false, error: `Flag '${token}' is missing an argument` };
        }
      }
    }
  }

  // 3. Must contain a parseable and valid-looking URL
  try {
    const parsed = parseCurl(normalized)
    if (!parsed.url) {
      return { valid: false, error: 'cURL command must contain a URL' }
    }
    // Stricter URL check: must be a valid path, a {host} placeholder, or a valid URL format
    const isValidUrl = /^(\/|https?:\/\/|\{host}|localhost)/.test(parsed.url);
    if (!isValidUrl) {
      return { valid: false, error: `Invalid URL format: '${parsed.url}'` };
    }
  } catch (error) {
    return { valid: false, error: `Invalid cURL format: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }

  return { valid: true }
}

/**
 * Formats a ParsedCurl object back into a cURL command string.
 */
export function formatParsedCurlToCommand(parsed: ParsedCurl): string {
  // Escape single quotes in URL to prevent breaking the command
  const safeUrl = parsed.url.replace(/'/g, String.raw`'\''`);
  let command = `curl '${safeUrl}'`;

  if (parsed.method && parsed.method.toUpperCase() !== 'GET') {
    command += ` -X ${parsed.method.toUpperCase()}`;
  }

  for (const [key, headerValue] of Object.entries(parsed.headers)) {
    // Escape quotes in header values
    const value = headerValue.replace(/'/g, String.raw`'\''`);
    command += ` -H '${key}: ${value}'`;
  }

  if (parsed.body) {
    // Escape quotes in body
    const body = parsed.body.replace(/'/g, String.raw`'\''`);
    command += ` -d '${body}'`;
  }

  return command;
}
