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
  const lastIsPartial = !/\.$|\[]$/.test(trimmed)
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
    const propMatch = /^([^.[\]]+)/.exec(rest)
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

/** Collect matching segments from a single value at the given path prefix. */
function collectSegmentsFromValue(
  v: unknown,
  pathPrefix: string,
  partialLower: string,
  partial: string,
  seen: Set<string>
): void {
  const toInspect: unknown[] = pathPrefix.endsWith('[*]') && Array.isArray(v) ? v : [v]
  for (const item of toInspect) {
    for (const seg of getNextSegmentsAtPath(item)) {
      if (!partial || seg.toLowerCase().startsWith(partialLower)) {
        seen.add(seg)
      }
    }
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
      collectSegmentsFromValue(v, pathPrefix, partialLower, partial, seen)
    }
  }

  return Array.from(seen).toSorted((a, b) => a.localeCompare(b))
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

/** Process a JSON key line (e.g. `"key": value`) and update path state. */
function processKeyLine(
  trimmed: string,
  currentPath: string,
  map: Map<number, string>,
  lineNumber: number,
  pathStack: string[]
): void {
  const keyMatch = /^"([^"]+)":\s*([{[])?/.exec(trimmed)
  if (!keyMatch) return
  const key = keyMatch[1]
  const keyPath = currentPath === '$' ? '$.' + key : currentPath + '.' + key
  map.set(lineNumber, keyPath)
  if (keyMatch[2] === '{' || keyMatch[2] === '[') {
    pathStack.push(keyMatch[2] === '[' ? keyPath + '[*]' : keyPath)
  }
}

/** Process a structural bracket line and update path stack. */
function processStructuralLine(
  trimmed: string,
  currentPath: string,
  pathStack: string[]
): void {
  if (trimmed === '{' || trimmed === '[') {
    pathStack.push(trimmed === '[' ? currentPath + '[*]' : currentPath)
  } else if (trimmed === '}' || trimmed === ']' || trimmed === '},' || trimmed === '],') {
    if (pathStack.length > 1) pathStack.pop()
  }
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
    const depth = Math.floor((line.length - trimmed.length) / 2)

    while (pathStack.length > depth + 1) pathStack.pop()
    const currentPath = pathStack[pathStack.length - 1] ?? basePath
    map.set(i + 1, currentPath)

    if (trimmed.startsWith('"') && trimmed.includes('":')) {
      processKeyLine(trimmed, currentPath, map, i + 1, pathStack)
    } else {
      processStructuralLine(trimmed, currentPath, pathStack)
    }
  }

  return map
}
