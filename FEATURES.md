# Feature Specification: REST Response Comparator

Based on analysis of https://www.apidiffonline.com/

## Feature List

### 🎯 MVP Features (Phase 1)

#### 1. Basic URL Comparison
- **Description**: Compare two API endpoints by URL
- **Input**: Two URL fields
- **Output**: Side-by-side diff view
- **Requirements**:
  - HTTP GET requests
  - Response body comparison
  - Basic diff visualization
  - Error handling

#### 2. Split View Diff Renderer
- **Description**: GitHub-style side-by-side comparison
- **Features**:
  - Green for additions
  - Red for deletions
  - Line numbers
  - Syntax highlighting
  - Scroll synchronization

#### 3. Request Execution
- **Description**: Make HTTP requests and compare responses
- **Features**:
  - GET requests
  - Error handling
  - Loading states
  - Timeout handling

---

### 🚀 Core Features (Phase 2)

#### 4. cURL Command Support
- **Description**: Parse and execute cURL commands
- **Input**: Raw cURL command string
- **Parsing**:
  - Extract URL
  - Extract HTTP method
  - Extract headers
  - Extract request body
  - Extract query parameters
- **Output**: Execute parsed request

#### 5. Multiple HTTP Methods
- **Description**: Support POST, PUT, DELETE, PATCH
- **Features**:
  - Method selector
  - Request body editor
  - Headers editor
  - Query parameters editor

#### 6. Headers Comparison
- **Description**: Compare HTTP response headers
- **Features**:
  - Header diff view
  - Status code comparison
  - Response time display

#### 7. Unified View Mode
- **Description**: Inline diff view (alternative to split view)
- **Features**:
  - Inline additions/deletions
  - Context lines
  - Collapsible sections

---

### ⚡ Advanced Features (Phase 3)

#### 8. JSONPath Filtering
- **Description**: Filter JSON responses before comparison
- **Features**:
  - JSONPath input field
  - Apply filter to both responses
  - Filter validation
  - Example queries

#### 9. Export/Import
- **Description**: Save and load comparison configurations
- **Export Formats**:
  - JSON configuration
  - Shareable URL
  - Markdown report
- **Import**:
  - Load from file
  - Load from URL
  - Paste configuration

#### 10. Comparison History
- **Description**: Store recent comparisons
- **Features**:
  - Local storage (versioned)
  - History list
  - Quick reload
  - Clear history

#### 11. Advanced Diff Options
- **Description**: Customize diff behavior
- **Options**:
  - Ignore whitespace
  - Case-insensitive comparison
  - Ignore array order
  - Custom ignore patterns

---

### 🎨 Polish Features (Phase 4)

#### 12. Response Metadata Display
- **Description**: Show request/response details
- **Information**:
  - Status codes
  - Response times
  - Response sizes
  - Content types
  - Headers summary

#### 13. Error Handling & Validation
- **Description**: Comprehensive error messages
- **Features**:
  - URL validation
  - cURL parsing errors
  - Network error handling
  - JSON validation
  - Helpful error messages

#### 14. Responsive Design
- **Description**: Mobile-friendly interface
- **Features**:
  - Mobile layout
  - Touch-friendly controls
  - Responsive diff viewer
  - Adaptive UI

#### 15. Keyboard Shortcuts
- **Description**: Power user features
- **Shortcuts**:
  - `Ctrl/Cmd + Enter`: Compare
  - `Ctrl/Cmd + S`: Export
  - `Ctrl/Cmd + H`: History
  - `Esc`: Clear/Close

---

## Technical Requirements

### Libraries Needed

```json
{
  "dependencies": {
    "react-diff-viewer": "^3.1.1",
    "react-syntax-highlighter": "^15.5.0",
    "jsonpath-plus": "^7.2.0",
    "axios": "^1.6.2",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/react-syntax-highlighter": "^15.5.11"
  }
}
```

### Component Structure

```
features/comparison/
├── components/
│   ├── RequestInput/
│   │   ├── RequestInput.tsx
│   │   ├── UrlInput.tsx
│   │   ├── CurlInput.tsx
│   │   └── RequestInput.styles.ts
│   ├── DiffViewer/
│   │   ├── DiffViewer.tsx
│   │   ├── SplitView.tsx
│   │   ├── UnifiedView.tsx
│   │   └── DiffViewer.styles.ts
│   ├── ComparisonControls/
│   │   ├── ComparisonControls.tsx
│   │   ├── ViewModeToggle.tsx
│   │   └── JsonPathFilter.tsx
│   └── ResponseMetadata/
│       ├── ResponseMetadata.tsx
│       └── MetadataCard.tsx
├── hooks/
│   ├── useApiRequest.ts
│   ├── useComparison.ts
│   ├── useCurlParser.ts
│   └── useJsonPath.ts
├── services/
│   ├── apiService.ts
│   ├── diffService.ts
│   ├── curlParser.ts
│   └── jsonPathService.ts
└── types.ts
```

---

## User Flow

### Basic Comparison Flow

```
1. User opens application
2. User enters URL 1 in left panel
3. User enters URL 2 in right panel
4. User clicks "Compare"
5. System shows loading state
6. System fetches both responses
7. System computes diff
8. System displays diff in split view
9. User can switch to unified view
10. User can export/share results
```

### cURL Comparison Flow

```
1. User selects "cURL" input mode
2. User pastes cURL command in left panel
3. System parses cURL command
4. User pastes second cURL command in right panel
5. System parses second command
6. User clicks "Compare"
7. System executes both requests
8. System displays diff
```

### JSONPath Filtering Flow

```
1. User performs comparison
2. User enters JSONPath query (e.g., $.data.items[*].name)
3. System applies filter to both responses
4. System re-computes diff with filtered data
5. System updates diff view
```

---

## Acceptance Criteria

### URL Comparison
- ✅ Can enter two URLs
- ✅ Can execute GET requests
- ✅ Shows loading state during requests
- ✅ Displays diff correctly
- ✅ Handles errors gracefully
- ✅ Shows error messages clearly

### cURL Support
- ✅ Can paste cURL commands
- ✅ Parses URL correctly
- ✅ Parses method correctly
- ✅ Parses headers correctly
- ✅ Parses body correctly
- ✅ Handles parsing errors

### Diff Viewer
- ✅ Shows additions in green
- ✅ Shows deletions in red
- ✅ Shows line numbers
- ✅ Syntax highlights JSON
- ✅ Scrolls synchronously
- ✅ Responsive layout

### JSONPath Filtering
- ✅ Accepts JSONPath queries
- ✅ Validates queries
- ✅ Applies filter to responses
- ✅ Shows filtered diff
- ✅ Handles invalid paths

---

## Performance Targets

- **Page Load**: < 2 seconds
- **Diff Rendering**: < 500ms for responses < 100KB
- **API Request**: < 3 seconds per request
- **Large Response Handling**: Virtual scrolling for > 1000 lines
- **Bundle Size**: < 500KB gzipped

---

## Accessibility Requirements

- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ ARIA labels
- ✅ Color contrast (WCAG AA)
- ✅ Focus indicators
- ✅ Error announcements

---

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

**Document Version**: 1.0  
**Status**: Planning Phase
