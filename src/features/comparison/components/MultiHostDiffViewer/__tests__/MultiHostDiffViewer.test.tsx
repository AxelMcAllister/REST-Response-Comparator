import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MultiHostDiffViewer } from '../MultiHostDiffViewer'
import { useComparisonStore } from '../../../store/comparisonStore'
import type { ComparisonResult, ComparisonOptions } from '@/shared/types'

// Mock dependencies
vi.mock('react-diff-viewer-continued', () => ({
  default: () => <div data-testid="diff-viewer">Diff Viewer</div>
}))

vi.mock('../../../store/comparisonStore', () => ({
  useComparisonStore: vi.fn()
}))

describe('MultiHostDiffViewer', () => {
  const mockUpdateComparison = vi.fn()
  const mockHosts = [
    { id: 'host-1', value: 'http://host1.com', isReference: true },
    { id: 'host-2', value: 'http://host2.com', isReference: false }
  ]

  const defaultOptions: ComparisonOptions = {
    ignoreTimestamps: false,
    ignoreIds: false,
    ignoreWhitespace: false,
    caseInsensitive: false,
    ignoreArrayOrder: false,
    customIgnorePaths: []
  }

  const mockComparison: ComparisonResult = {
    id: 'comp-1',
    curlIndex: 0,
    curlCommand: 'curl http://example.com',
    parsedCurl: { url: 'http://example.com', method: 'GET', headers: {}, originalCurl: '' },
    timestamp: Date.now(),
    referenceHostId: 'host-1',
    hostResponses: [
      {
        hostId: 'host-1',
        hostValue: 'http://host1.com',
        response: { data: { id: 1, name: 'Test' }, status: 200, statusText: 'OK', headers: {} },
        error: null,
        isLoading: false
      },
      {
        hostId: 'host-2',
        hostValue: 'http://host2.com',
        response: { data: { id: 2, name: 'Test' }, status: 200, statusText: 'OK', headers: {} },
        error: null,
        isLoading: false
      }
    ],
    differences: [],
    status: 'completed',
    options: defaultOptions
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useComparisonStore as any).mockReturnValue({
      hosts: mockHosts,
      updateComparison: mockUpdateComparison
    })
  })

  it('renders comparison options toolbar', () => {
    render(<MultiHostDiffViewer comparison={mockComparison} />)
    
    expect(screen.getByText('Comparison Options:')).toBeInTheDocument()
    expect(screen.getByLabelText('Ignore Timestamps')).toBeInTheDocument()
    expect(screen.getByLabelText('Ignore IDs')).toBeInTheDocument()
    expect(screen.getByLabelText('Ignore Whitespace')).toBeInTheDocument()
    expect(screen.getByLabelText('Case Insensitive')).toBeInTheDocument()
    expect(screen.getByLabelText('Ignore Array Order')).toBeInTheDocument()
    expect(screen.getByLabelText('Custom Ignore Paths')).toBeInTheDocument()
  })

  it('updates options when checkboxes are clicked', () => {
    render(<MultiHostDiffViewer comparison={mockComparison} />)
    
    const timestampCheckbox = screen.getByLabelText('Ignore Timestamps')
    fireEvent.click(timestampCheckbox)
    
    expect(mockUpdateComparison).toHaveBeenCalledWith('comp-1', {
      options: expect.objectContaining({ ignoreTimestamps: true })
    })
  })

  it('updates custom ignore paths', () => {
    render(<MultiHostDiffViewer comparison={mockComparison} />)
    
    const input = screen.getByLabelText('Custom Ignore Paths')
    fireEvent.change(input, { target: { value: '$.id, $.date' } })
    
    expect(mockUpdateComparison).toHaveBeenCalledWith('comp-1', {
      options: expect.objectContaining({ customIgnorePaths: ['$.id', '$.date'] })
    })
  })

  it('renders diff viewer for each host pair', () => {
    render(<MultiHostDiffViewer comparison={mockComparison} />)
    expect(screen.getAllByTestId('diff-viewer')).toHaveLength(1)
  })
})
