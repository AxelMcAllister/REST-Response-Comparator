/**
 * Diff service
 * Handles formatting and diff computation for responses
 */

import type { HostResponse, HostDifference, Difference } from '@/shared/types'

/**
 * Format response data for diffing
 * Handles JSON formatting with indentation
 */
export function formatResponseData(data: unknown): string {
  if (data === null || data === undefined) {
    return ''
  }

  if (typeof data === 'string') {
    try {
      // Try to parse as JSON to format it nicely
      const parsed = JSON.parse(data)
      return JSON.stringify(parsed, null, 2)
    } catch {
      // Not JSON, return as is
      return data
    }
  }
  
  // Already an object/array
  return JSON.stringify(data, null, 2)
}

/**
 * Compute differences between reference and host response
 * This is a simplified version, mainly for summary stats
 * The actual visual diff is handled by react-diff-viewer
 */
export function computeDifferences(
  referenceResponse: HostResponse,
  hostResponse: HostResponse
): HostDifference {
  const diffs: Difference[] = []
  
  // Basic check for status code difference
  if (referenceResponse.response?.status !== hostResponse.response?.status) {
    diffs.push({
      path: 'status',
      referenceValue: referenceResponse.response?.status,
      hostValue: hostResponse.response?.status,
      type: 'modified'
    })
  }
  
  // Basic check for response time difference (threshold e.g. > 500ms)
  const refTime = referenceResponse.responseTime || 0
  const hostTime = hostResponse.responseTime || 0
  if (Math.abs(refTime - hostTime) > 500) {
    diffs.push({
      path: 'responseTime',
      referenceValue: refTime,
      hostValue: hostTime,
      type: 'modified'
    })
  }
  
  return {
    hostId: hostResponse.hostId,
    differences: diffs
  }
}
