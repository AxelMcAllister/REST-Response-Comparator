// Feature-specific types for comparison feature

import type { Host, ParsedCurl, ComparisonResult, ComparisonOptions, ParallelExecutionMode } from '@/shared/types'

export interface ComparisonState {
  hosts: Host[]
  curlCommands: string[]
  comparisons: ComparisonResult[]
  parallelMode: ParallelExecutionMode
  globalOptions: ComparisonOptions
  isExecuting: boolean
}

export interface CurlInputMode {
  type: 'textarea' | 'file' | 'individual'
  value: string | File | string[]
}
