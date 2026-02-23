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
  // {host} in the template is now always protocol-free (e.g. {host}/path),
  // so we always substitute the full normalized URL (e.g. https://api.example.com).
  return curlCommand.replaceAll('{host}', host.normalized)
}


/**
 * Replace {host} in parsed cURL URL, ensuring the final URL is absolute and correctly formed.
 */
export function replaceHostInParsedCurl(
  parsedCurl: ParsedCurl,
  host: ParsedHost
): ParsedCurl {
  const urlToResolve = parsedCurl.url;

  // Case 1 & 2: URL contains {host} placeholder (template is now always protocol-free,
  // e.g. {host}/path). Substitute with the full normalized host URL which includes protocol.
  if (urlToResolve.includes('{host}')) {
    const parts = urlToResolve.split('{host}');
    const suffix = parts[1] || '';

    // Smart join: exactly one slash between base and suffix
    const base = host.normalized.replace(/\/+$/, '');
    const path = suffix.replace(/^\/+/, '');

    return {
      ...parsedCurl,
      url: path ? `${base}/${path}` : base
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
  } catch {
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
