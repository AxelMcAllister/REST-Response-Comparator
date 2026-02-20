/**
 * cURL command parser
 * Extracts URL, method, headers, and body from cURL commands
 */

import type { ParsedCurl } from '@/shared/types'

/**
 * Parse a cURL command string
 * Supports: method, URL, headers, body
 */
export function parseCurl(curlCommand: string): ParsedCurl {
  const trimmed = curlCommand.trim()
  
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
  const methodMatch = command.match(/-X\s+(\w+)/i)
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
      const value = header.substring(colonIndex + 1).trim()
      parsed.headers[key] = value
    }
    // Remove the header from command string to clean it up for URL extraction
    command = command.replace(match[0], '')
  })
  
  // Extract body (-d or --data flag)
  const bodyMatch = command.match(/(?:-d|--data)\s+['"]([^'"]+)['"]|(?:-d|--data)\s+([^\s]+)/)
  if (bodyMatch) {
    parsed.body = bodyMatch[1] || bodyMatch[2]
    command = command.replace(bodyMatch[0], '')
  }
  
  // Extract URL
  const cleanCommand = command.trim()
  
  // 1. Check for quoted URL (single or double quotes)
  // Matches 'url' or "url" and captures the content inside
  const quotedUrlMatch = cleanCommand.match(/^(['"])(.*?)\1/)
  if (quotedUrlMatch) {
    parsed.url = quotedUrlMatch[2].trim()
  } else {
    // 2. Fallback to finding http/https or path
    const urlMatch = cleanCommand.match(/(https?:\/\/[^\s]+|\/[^\s]*)/)
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
  // Try to find URL pattern and replace hostname
  const urlPattern = /(https?:\/\/)([^\/\s]+)(\/.*)?/
  const match = urlPattern.exec(curlCommand)
  
  if (match) {
    const protocol = match[1]
    const hostname = match[2]
    const path = match[3] || ''
    
    // Replace hostname with {host}
    // We construct the full URL to ensure we replace the correct part
    const fullUrl = `${protocol}${hostname}${path}`
    const newUrl = `${protocol}{host}${path}`
    
    return curlCommand.replace(fullUrl, newUrl)
  }
  
  // If no URL pattern found, try to find hostname-like pattern
  // This is a fallback and might be risky, but useful for partial cURLs
  const hostnamePattern = /([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+)/
  const hostnameMatch = hostnamePattern.exec(curlCommand)
  
  if (hostnameMatch) {
    // Only replace if it looks like a host and not part of a flag
    return curlCommand.replace(hostnameMatch[1], '{host}')
  }
  
  // If we can't detect, return original
  return curlCommand
}

/**
 * Validate cURL command format
 */
export function validateCurl(curlCommand: string): { valid: boolean; error?: string } {
  if (!curlCommand || !curlCommand.trim()) {
    return { valid: false, error: 'cURL command cannot be empty' }
  }
  
  try {
    const parsed = parseCurl(curlCommand)
    
    if (!parsed.url) {
      return { valid: false, error: 'cURL command must contain a URL' }
    }
    
    return { valid: true }
  } catch (error) {
    return { valid: false, error: `Invalid cURL format: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

/**
 * Formats a ParsedCurl object back into a cURL command string.
 */
export function formatParsedCurlToCommand(parsed: ParsedCurl): string {
  // Escape single quotes in URL to prevent breaking the command
  const safeUrl = parsed.url.replace(/'/g, "'\\''");
  let command = `curl '${safeUrl}'`; 

  if (parsed.method && parsed.method.toUpperCase() !== 'GET') {
    command += ` -X ${parsed.method.toUpperCase()}`;
  }

  for (const key in parsed.headers) {
    // Escape quotes in header values
    const value = parsed.headers[key].replace(/'/g, "'\\''");
    command += ` -H '${key}: ${value}'`;
  }

  if (parsed.body) {
    // Escape quotes in body
    const body = parsed.body.replace(/'/g, "'\\''");
    command += ` -d '${body}'`;
  }

  return command;
}
