/**
 * Request executor service
 * Handles HTTP request execution with parallel execution support
 */

import axios, { AxiosRequestConfig } from 'axios'
import type { ParsedCurl } from '@/shared/types'
import type { ParsedHost } from './hostParser'
import { replaceHostInParsedCurl } from './hostReplacer'
import { parseCurl } from './curlParser'

export interface ExecutionRequest {
  curlCommand: string
  parsedCurl: ParsedCurl
  hosts: ParsedHost[]
}

export interface ExecutionResult {
  hostId: string
  hostValue: string
  success: boolean
  response?: {
    status: number
    statusText: string
    headers: Record<string, string>
    data: unknown
  }
  error?: string
  responseTime?: number
}

export type ParallelExecutionMode = 'all-at-once' | 'per-curl'

/**
 * Execute a single request for a host
 */
async function executeRequest(
  parsedCurl: ParsedCurl,
  host: ParsedHost
): Promise<ExecutionResult> {
  const startTime = Date.now()
  
  try {
    // Replace {host} placeholder
    const finalCurl = replaceHostInParsedCurl(parsedCurl, host)
    
    // Build axios config
    const config: AxiosRequestConfig = {
      method: finalCurl.method as any,
      url: finalCurl.url,
      headers: finalCurl.headers,
      data: finalCurl.body ? JSON.parse(finalCurl.body) : undefined,
      timeout: 30000, // 30 second timeout
      validateStatus: () => true // Don't throw on any status code
    }

    const response = await axios.request(config)
    const responseTime = Date.now() - startTime

    return {
      hostId: host.hostname,
      hostValue: host.normalized,
      success: true,
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
        data: response.data
      },
      responseTime
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    return {
      hostId: host.hostname,
      hostValue: host.normalized,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime
    }
  }
}

/**
 * Execute requests for all hosts in parallel
 */
export async function executeForAllHosts(
  curlCommand: string,
  hosts: ParsedHost[]
): Promise<ExecutionResult[]> {
  const parsedCurl = parseCurl(curlCommand)
  
  // Execute all requests in parallel
  const promises = hosts.map(host => executeRequest(parsedCurl, host))
  
  return Promise.all(promises)
}

/**
 * Execute multiple cURL commands with configurable parallel mode
 */
export async function executeCurlBatch(
  curlCommands: string[],
  hosts: ParsedHost[],
  mode: ParallelExecutionMode = 'all-at-once'
): Promise<Array<{
  curlIndex: number
  curlCommand: string
  results: ExecutionResult[]
}>> {
  if (mode === 'all-at-once') {
    // Execute all cURLs × all hosts simultaneously
    const allPromises: Array<Promise<ExecutionResult>> = []
    const curlIndices: number[] = []
    
    curlCommands.forEach((curlCommand, index) => {
      const parsedCurl = parseCurl(curlCommand)
      hosts.forEach(host => {
        allPromises.push(executeRequest(parsedCurl, host))
        curlIndices.push(index)
      })
    })
    
    const allResults = await Promise.all(allPromises)
    
    // Group results by cURL index
    const grouped: Map<number, ExecutionResult[]> = new Map()
    allResults.forEach((result, i) => {
      const curlIndex = curlIndices[i]
      if (!grouped.has(curlIndex)) {
        grouped.set(curlIndex, [])
      }
      grouped.get(curlIndex)!.push(result)
    })
    
    return curlCommands.map((curlCommand, index) => ({
      curlIndex: index,
      curlCommand,
      results: grouped.get(index) || []
    }))
  } else {
    // Per-cURL: Execute each cURL's hosts in parallel, but cURLs sequentially
    const results: Array<{
      curlIndex: number
      curlCommand: string
      results: ExecutionResult[]
    }> = []
    
    for (let i = 0; i < curlCommands.length; i++) {
      const curlCommand = curlCommands[i]
      const curlResults = await executeForAllHosts(curlCommand, hosts)
      results.push({
        curlIndex: i,
        curlCommand,
        results: curlResults
      })
    }
    
    return results
  }
}
