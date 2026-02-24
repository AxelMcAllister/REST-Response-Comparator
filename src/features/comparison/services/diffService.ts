/**
 * Diff service
 * Handles formatting and diff computation for responses
 */

import type { HostResponse, HostDifference, Difference, ComparisonOptions } from '@/shared/types'
import { JSONPath } from 'jsonpath-plus'

/** Response time difference threshold (in ms) above which a difference is reported. */
const RESPONSE_TIME_THRESHOLD_MS = 500

/**
 * Apply a JSONPath expression to a parsed JSON value.
 * Returns { result } on success or { error } on invalid expression.
 * A single-match array is unwrapped to the element itself for cleaner display.
 */
export function applyJsonPath(
  data: unknown,
  expression: string
): { result: unknown; error?: string } | { result?: unknown; error: string } {
  if (!expression.trim()) return { result: data }
  try {
    const matches = JSONPath({ path: expression, json: data as object, wrap: true })
    if (!Array.isArray(matches) || matches.length === 0) {
      return { error: 'No matches found' }
    }
    // Unwrap single-element result for cleaner output
    return { result: matches.length === 1 ? matches[0] : matches }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Invalid JSONPath expression' }
  }
}


/**
 * Recursively sort object keys alphabetically (arrays preserve order).
 */
export function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonKeys)
  }
  if (value !== null && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .toSorted((a, b) => a.localeCompare(b))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortJsonKeys((value as Record<string, unknown>)[key])
        return acc
      }, {})
  }
  return value
}

/**
 * Recursively sort both objects so that keys present in BOTH appear first
 * (sorted alphabetically), followed by each side's unique keys (also sorted).
 * Arrays are left in their original order.
 * Returns [sortedLeft, sortedRight] as a tuple.
 */
export function sortJsonKeysCommonFirst(
  left: unknown,
  right: unknown
): [unknown, unknown] {
  // For non-objects (or arrays), no reordering possible
  if (
    left === null || right === null ||
    typeof left !== 'object' || typeof right !== 'object' ||
    Array.isArray(left) || Array.isArray(right)
  ) {
    return [left, right]
  }

  const l = left as Record<string, unknown>
  const r = right as Record<string, unknown>
  const leftKeys = Object.keys(l)
  const rightKeys = Object.keys(r)
  const rightKeySet = new Set(rightKeys)
  const leftKeySet = new Set(leftKeys)

  const commonKeys = leftKeys.filter(k => rightKeySet.has(k)).toSorted((a, b) => a.localeCompare(b))
  const leftOnlyKeys = leftKeys.filter(k => !rightKeySet.has(k)).toSorted((a, b) => a.localeCompare(b))
  const rightOnlyKeys = rightKeys.filter(k => !leftKeySet.has(k)).toSorted((a, b) => a.localeCompare(b))

  const sortedL: Record<string, unknown> = {}
  const sortedR: Record<string, unknown> = {}

  // Common keys — recurse into nested objects
  for (const key of commonKeys) {
    const [sl, sr] = sortJsonKeysCommonFirst(l[key], r[key])
    sortedL[key] = sl
    sortedR[key] = sr
  }
  // Left-only keys (right side won't show them)
  for (const key of leftOnlyKeys) {
    sortedL[key] = l[key]
  }
  // Right-only keys (left side won't show them)
  for (const key of rightOnlyKeys) {
    sortedR[key] = r[key]
  }

  return [sortedL, sortedR]
}


/**
 * Format response data for diffing.
 * Handles JSON formatting with indentation.
 * @param data
 * @param sortKeys - if true, sorts object keys alphabetically before formatting
 */
export function formatResponseData(data: unknown, sortKeys = false): string {
  if (data === null || data === undefined) {
    return ''
  }

  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data)
      return JSON.stringify(sortKeys ? sortJsonKeys(parsed) : parsed, null, 2)
    } catch {
      return data
    }
  }

  // Already an object/array
  return JSON.stringify(sortKeys ? sortJsonKeys(data) : data, null, 2)
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
  if (Math.abs(refTime - hostTime) > RESPONSE_TIME_THRESHOLD_MS) {
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

/**
 * Preprocess data based on comparison options.
 */
export function preprocessData(data: unknown, options: ComparisonOptions): unknown {
  if (data === null || data === undefined) return data

  // Deep clone to avoid mutating original data
  let processed = JSON.parse(JSON.stringify(data))

  if (options.ignoreTimestamps) {
    processed = removeTimestamps(processed)
  }
  if (options.ignoreIds) {
    processed = removeIds(processed)
  }
  if (options.ignoreWhitespace) {
    processed = normalizeWhitespace(processed)
  }
  if (options.caseInsensitive) {
    processed = toLowerCaseRecursive(processed)
  }
  if (options.ignoreArrayOrder) {
    processed = sortArraysRecursive(processed)
  }
  if (options.customIgnorePaths && options.customIgnorePaths.length > 0) {
    processed = removeCustomPaths(processed, options.customIgnorePaths)
  }

  return processed
}

function removeTimestamps(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(removeTimestamps)
  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (isTimestampKey(key)) continue
      result[key] = removeTimestamps(value)
    }
    return result
  }
  return data
}

function isTimestampKey(key: string): boolean {
  const lower = key.toLowerCase()
  return lower.includes('time') || lower.includes('date') || lower === 'createdat' || lower === 'updatedat'
}

function removeIds(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(removeIds)
  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (isIdKey(key)) continue
      result[key] = removeIds(value)
    }
    return result
  }
  return data
}

function isIdKey(key: string): boolean {
  const lower = key.toLowerCase()
  return lower === 'id' || lower === '_id' || lower === 'uuid' || lower === 'guid'
}

function normalizeWhitespace(data: unknown): unknown {
  if (typeof data === 'string') return data.trim().replace(/\s+/g, ' ')
  if (Array.isArray(data)) return data.map(normalizeWhitespace)
  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = normalizeWhitespace(value)
    }
    return result
  }
  return data
}

function toLowerCaseRecursive(data: unknown): unknown {
  if (typeof data === 'string') return data.toLowerCase()
  if (Array.isArray(data)) return data.map(toLowerCaseRecursive)
  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key.toLowerCase()] = toLowerCaseRecursive(value)
    }
    return result
  }
  return data
}

function sortArraysRecursive(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(sortArraysRecursive).sort((a, b) => {
      const sa = JSON.stringify(a)
      const sb = JSON.stringify(b)
      return sa.localeCompare(sb)
    })
  }
  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      result[key] = sortArraysRecursive(value)
    }
    return result
  }
  return data
}

function removeCustomPaths(data: unknown, paths: string[]): unknown {
  if (!paths || paths.length === 0) return data
  const clone = JSON.parse(JSON.stringify(data))

  paths.forEach(path => {
    try {
      const nodes = JSONPath({ path, json: clone, resultType: 'all' })
      nodes.forEach((node: any) => {
        if (node.parent && node.parentProperty !== undefined) {
          if (!Array.isArray(node.parent)) {
            delete node.parent[node.parentProperty]
          }
        }
      })
    } catch (e) {
      // Ignore invalid paths
    }
  })
  return clone
}
