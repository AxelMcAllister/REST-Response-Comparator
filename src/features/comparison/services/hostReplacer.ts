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
    // cURL already has protocol, so just replace {host} with hostname
    return curlCommand.replace(/\{host\}/g, host.hostname)
  } else {
    // No protocol in cURL, replace {host} with full normalized URL (includes protocol)
    return curlCommand.replace(/\{host\}/g, host.normalized)
  }
}

/**
 * Replace {host} in parsed cURL URL, ensuring the final URL is absolute and correctly formed.
 */
export function replaceHostInParsedCurl(
  parsedCurl: ParsedCurl,
  host: ParsedHost
): ParsedCurl {
  const urlToResolve = parsedCurl.url;

  // Case 1: URL has protocol (e.g. https://{host}/foo)
  // We only replace {host} with the hostname.
  if (/^https?:\/\//i.test(urlToResolve)) {
    return {
      ...parsedCurl,
      url: urlToResolve.replace('{host}', host.hostname)
    };
  }

  // Case 2: URL has {host} placeholder
  // We perform a smart join of the host base URL and the path suffix.
  if (urlToResolve.includes('{host}')) {
    const parts = urlToResolve.split('{host}');
    const suffix = parts[1] || '';
    
    // Smart join: Ensure exactly one slash between base and suffix
    // 1. Remove trailing slashes from base
    const base = host.normalized.replace(/\/+$/, '');
    // 2. Remove leading slashes from suffix
    const path = suffix.replace(/^\/+/, '');
    
    return {
      ...parsedCurl,
      url: `${base}/${path}`
    };
  }

  // Case 3: No {host}, treat as relative to host
  // We use URL constructor here. 
  try {
    const finalUrl = new URL(urlToResolve, host.normalized).toString();
    return {
      ...parsedCurl,
      url: finalUrl
    };
  } catch (e) {
    // Fallback if URL resolution fails
    return parsedCurl;
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
