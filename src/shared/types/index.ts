// Shared types used across features

export interface ApiResponse<T = unknown> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
  responseTime?: number
  error?: string
}

export interface Host {
  id: string
  value: string
  isReference: boolean
  normalizedUrl: string // Normalized base URL
}

export interface CurlCommand {
  id: string
  value: string
}

export interface ParsedCurl {
  url: string
  method: string
  headers: Record<string, string>
  body?: string
  originalCurl: string
}

export interface HostResponse {
  hostId: string
  hostValue: string
  response: ApiResponse | null
  error: string | null
  isLoading: boolean
  responseTime?: number
}

export interface ComparisonResult {
  id: string
  curlIndex: number
  curlCommand: string
  parsedCurl: ParsedCurl
  timestamp: number
  referenceHostId: string
  hostResponses: HostResponse[]
  differences: HostDifference[]
  status: 'loading' | 'completed' | 'error'
}

export interface HostDifference {
  hostId: string
  differences: Difference[]
}

export interface Difference {
  path: string
  referenceValue: unknown
  hostValue: unknown
  type: 'added' | 'removed' | 'modified'
}

export type ParallelExecutionMode = 'all-at-once' | 'per-curl'

export interface ComparisonOptions {
  ignoreTimestamps: boolean
  ignoreIds: boolean
  ignoreWhitespace: boolean
  caseInsensitive: boolean
  ignoreArrayOrder: boolean
  customIgnorePaths: string[] // JSONPath patterns
}
