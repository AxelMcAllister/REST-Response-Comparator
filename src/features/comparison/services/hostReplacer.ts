/**
 * Host replacement service
 * Handles {host} placeholder replacement with smart protocol preservation
 */

import type { ParsedHost } from './hostParser'
import type { ParsedCurl } from '@/shared/types'

/**
 * Replace {host} placeholder in cURL command with actual host
 * Smart replacement: preserves protocol if present in cURL
 */
export function replaceHostInCurl(
  curlCommand: string,
  host: ParsedHost
): string {
  // Check if cURL has protocol
  const hasProtocol = /https?:\/\//.test(curlCommand)
  
  if (hasProtocol) {
    // Replace {host} with full normalized URL (includes protocol)
    return curlCommand.replace(/\{host\}/g, host.normalized)
  } else {
    // No protocol in cURL, use just hostname
    return curlCommand.replace(/\{host\}/g, host.hostname)
  }
}

/**
 * Replace {host} in parsed cURL URL
 */
export function replaceHostInParsedCurl(
  parsedCurl: ParsedCurl,
  host: ParsedHost
): ParsedCurl {
  const hasProtocol = /https?:\/\//.test(parsedCurl.url)
  
  let newUrl: string
  if (hasProtocol) {
    newUrl = parsedCurl.url.replace(/\{host\}/g, host.normalized)
  } else {
    newUrl = parsedCurl.url.replace(/\{host\}/g, host.hostname)
  }
  
  return {
    ...parsedCurl,
    url: newUrl
  }
}

/**
 * Generate cURL commands for all hosts
 */
export function generateCurlsForHosts(
  curlCommand: string,
  hosts: ParsedHost[]
): Array<{ host: ParsedHost; curl: string }> {
  return hosts.map(host => ({
    host,
    curl: replaceHostInCurl(curlCommand, host)
  }))
}
