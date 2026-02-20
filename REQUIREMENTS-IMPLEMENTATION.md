# Implementation Requirements: Multi-Host Response Comparator

## ✅ Final Decisions

### Core Features
1. **Reference Host Selection**: Visual indicator (star/checkmark), first host default
2. **{host} Placeholder**: Smart replacement (preserve protocol)
3. **Missing {host}**: Warn user, auto-detect if accepted
4. **Tab Structure**: All tabs created upfront (empty/loading state)
5. **Parallel Execution**: Configurable (all-at-once vs per-cURL)
6. **Comparison Layout**: Side-by-side (all hosts in one view)
7. **Comparison Options**: Global settings panel + per-tab override

### Assumptions Made
- **Q11**: All hosts shown side-by-side in one tab (Reference | Host2 | Host3)
- **Tabs**: Closable, reorderable (nice-to-have for later)
- **Error Handling**: Show errors per host, continue with successful hosts
- **Loading States**: Per-host status indicators + incremental updates
- **Tab Naming**: Auto-generate from cURL endpoint, allow rename

---

## Implementation Plan

### Phase 1: Foundation (Current)
- [x] Project setup with React + TypeScript + Vite
- [x] Best practices structure
- [ ] Core component structure
- [ ] Host input component with reference selection
- [ ] cURL input component (textarea + file upload)
- [ ] {host} placeholder replacement logic
- [ ] cURL parser service

### Phase 2: Execution Engine
- [ ] Parallel execution service (configurable)
- [ ] Request execution with AbortController
- [ ] Error handling
- [ ] Loading states

### Phase 3: Comparison View
- [ ] Tab component structure
- [ ] Multi-host diff viewer
- [ ] Side-by-side comparison layout
- [ ] Reference host highlighting

### Phase 4: Advanced Features
- [ ] Comparison options (global + per-tab)
- [ ] Auto-detection for missing {host}
- [ ] Export functionality
- [ ] Results persistence

---

## Component Structure

```
src/
├── app/
│   └── App.tsx
├── features/
│   ├── comparison/
│   │   ├── components/
│   │   │   ├── HostInput/
│   │   │   │   ├── HostInput.tsx
│   │   │   │   ├── HostInputField.tsx
│   │   │   │   └── ReferenceIndicator.tsx
│   │   │   ├── CurlInput/
│   │   │   │   ├── CurlInput.tsx
│   │   │   │   ├── CurlTextarea.tsx
│   │   │   │   └── FileUpload.tsx
│   │   │   ├── ComparisonTabs/
│   │   │   │   ├── ComparisonTabs.tsx
│   │   │   │   └── ComparisonTab.tsx
│   │   │   ├── MultiHostDiffViewer/
│   │   │   │   ├── MultiHostDiffViewer.tsx
│   │   │   │   ├── HostColumn.tsx
│   │   │   │   └── DiffRenderer.tsx
│   │   │   └── ComparisonControls/
│   │   │       ├── ComparisonControls.tsx
│   │   │       ├── ExecuteButton.tsx
│   │   │       └── ParallelModeSelector.tsx
│   │   ├── hooks/
│   │   │   ├── useHosts.ts
│   │   │   ├── useCurlList.ts
│   │   │   ├── useComparison.ts
│   │   │   └── useParallelExecution.ts
│   │   ├── services/
│   │   │   ├── curlParser.ts
│   │   │   ├── hostReplacer.ts
│   │   │   ├── requestExecutor.ts
│   │   │   └── diffService.ts
│   │   └── types.ts
│   └── settings/
│       ├── components/
│       │   └── ComparisonOptions.tsx
│       └── store/
│           └── settingsStore.ts
└── shared/
    ├── components/
    ├── hooks/
    └── utils/
```

---

## Key Implementation Details

### Host Input
- Support: hostname, base URL, full URL
- Reference selection: Star icon (⭐) - click to toggle
- Default: First host is reference
- Validation: Smart parsing and normalization

### cURL Input
- Textarea: One cURL per line
- File upload: Text file support
- Placeholder: {host} replacement
- Auto-detection: Warn if {host} missing, offer auto-detect

### Parallel Execution
- Configurable mode:
  - "All at once": All cURLs × all hosts simultaneously
  - "Per cURL": Each cURL's hosts in parallel, cURLs sequential
- Default: "All at once"
- UI: Dropdown/radio in settings

### Tab Structure
- Created upfront when execution starts
- One tab per cURL
- Loading state until results arrive
- Closable (future: reorderable)

### Comparison View
- Side-by-side columns: Reference | Host2 | Host3 | ...
- Reference host highlighted/labeled
- Diff highlighting: Differences from reference
- Error display: Per-host error badges

---

**Status**: Ready for Implementation  
**Next**: Start building components
