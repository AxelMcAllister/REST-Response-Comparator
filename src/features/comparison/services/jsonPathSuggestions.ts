/**
 * JSONPath autocomplete: suggest next path segments from response JSONs.
 * Uses all host response bodies in the current tab to build hints.
 */

import { JSONPath } from 'jsonpath-plus'

/** Parse current input into path prefix (valid JSONPath) and partial segment being typed. */
export function parseJsonPathInput(input: string): { pathPrefix: string; partial: string } {
  const trimmed = input.trim()
  if (!trimmed || trimmed === '$') {
    return { pathPrefix: '$', partial: '' }
  }
  if (!trimmed.startsWith('$')) {
    return { pathPrefix: '$', partial: trimmed }
  }

  // If input doesn't end with . or ], last segment is partial (user still typing).
  const lastIsPartial = !/\.$|\[\]$/.test(trimmed)
  const segments: string[] = []
  let rest = trimmed.slice(1).replace(/^\./, '')
  while (rest.length > 0) {
    if (rest.startsWith('[*]')) {
      if (lastIsPartial && rest.length === 3) {
        return { pathPrefix: '$' + segments.map(s => '.' + s).join(''), partial: '[*]' }
      }
      segments.push('[*]')
      rest = rest.slice(3).replace(/^\./, '')
      continue
    }
    const propMatch = new RegExp(/^([^.[\]]+)/).exec(rest)
    if (propMatch) {
      const seg = propMatch[1]
      rest = rest.slice(seg.length).replace(/^\./, '')
      if (lastIsPartial && rest.length === 0) {
        return {
          pathPrefix: '$' + segments.map(s => (s === '[*]' ? '[*]' : '.' + s)).join(''),
          partial: seg
        }
      }
      segments.push(seg)
      continue
    }
    break
  }
  const pathPrefix = '$' + segments.map(s => (s === '[*]' ? '[*]' : '.' + s)).join('')
  return { pathPrefix, partial: '' }
}

/** Get keys (and [*] for arrays) at the given path from one value. */
function getNextSegmentsAtPath(value: unknown): string[] {
  if (value === null || value === undefined) return []
  if (Array.isArray(value)) return ['[*]']
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>)
  return []
}

/** Safely evaluate a JSONPath prefix and return the value(s) at that path. */
function getValuesAtPath(json: unknown, pathPrefix: string): unknown[] {
  if (!pathPrefix || pathPrefix === '$') return [json]
  try {
    const matches = JSONPath({ path: pathPrefix, json: json as object, wrap: true })
    if (!Array.isArray(matches)) return []
    return matches
  } catch {
    return []
  }
}

/**
 * Collect all possible next path segments from multiple JSONs at the given path.
 * If path ends with [*], we collect keys from each array element; otherwise from the value(s) at path.
 */
export function getJsonPathSuggestions(
  responseDataList: unknown[],
  pathPrefix: string,
  partial: string
): string[] {
  const partialLower = partial.toLowerCase()
  const seen = new Set<string>()

  for (const data of responseDataList) {
    const parsed = parseResponseData(data)
    const values = getValuesAtPath(parsed, pathPrefix)

    for (const v of values) {
      let toInspect: unknown[] = [v]
      // If path ends with [*], we're already at array elements
      if (pathPrefix.endsWith('[*]')) {
        toInspect = Array.isArray(v) ? v : [v]
      }
      for (const item of toInspect) {
        const segments = getNextSegmentsAtPath(item)
        for (const seg of segments) {
          if (partial && !seg.toLowerCase().startsWith(partialLower)) continue
          seen.add(seg)
        }
      }
    }
  }

  return Array.from(seen).sort()
}

export function parseResponseData(data: unknown): unknown {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {
      return data
    }
  }
  return data
}

/**
 * Build a 1-based line number -> JSONPath map by parsing the stringified JSON line by line.
 * Matches the exact string we show in the diff. basePath is the current filter (e.g. $.data.items[*]).
 */
export function buildLineToPathMap(
  value: unknown,
  basePath: string = '$'
): Map<number, string> {
  const map = new Map<number, string>()
  const text = JSON.stringify(value, null, 2)
  const lines = text.split('\n')
  const pathStack: string[] = [basePath]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trimStart()
    const indent = line.length - trimmed.length
    const depth = Math.floor(indent / 2)

    while (pathStack.length > depth + 1) pathStack.pop()
    const currentPath = pathStack[pathStack.length - 1] ?? basePath
    map.set(i + 1, currentPath)

    if (trimmed.startsWith('"') && trimmed.includes('":')) {
      const keyMatch = new RegExp(/^"([^"]+)":\s*([{[])?/).exec(trimmed)
      if (keyMatch) {
        const key = keyMatch[1]
        const keyPath = currentPath === '$' ? '$.' + key : currentPath + '.' + key
        map.set(i + 1, keyPath)
        if (keyMatch[2] === '{' || keyMatch[2] === '[') {
          const nextPath = keyMatch[2] === '[' ? keyPath + '[*]' : keyPath
          pathStack.push(nextPath)
        }
      }
    } else if (trimmed === '{' || trimmed === '[') {
      const nextPath = trimmed === '[' ? currentPath + '[*]' : currentPath
      pathStack.push(nextPath)
    } else if (trimmed === '}' || trimmed === ']' || trimmed === '},' || trimmed === '],') {
      if (pathStack.length > 1) pathStack.pop()
    }
  }

  return map
}
