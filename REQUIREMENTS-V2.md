# Requirements Analysis: Multi-Host Response Comparator (Version 2)

## ✅ Confirmed Requirements

### 1. Input Methods (Versatile)
- **Host Input**: Support multiple formats
  - Comma-separated hostnames: `host1.com, host2.com`
  - Base URLs: `https://api1.com, https://api2.com`
  - Full URLs: `https://host1.com/api, https://host2.com/api`
- **cURL Input**: Support multiple formats
  - Textarea (one per line)
  - File upload (text file)
  - Individual input fields (add/remove)

### 2. Reference Host Selection
- **One host is reference**: User must specify which host is the reference
- **Others compare to reference**: All other hosts compared against reference host
- **UI Requirement**: Radio buttons, dropdown, or visual selector to choose reference host

### 3. cURL Placeholder Support
- **{host} placeholder**: Replace `{host}` in cURL commands with actual host values
- **Example**:
  ```
  cURL: curl https://{host}/api/users
  Hosts: api1.com, api2.com
  Results:
    curl https://api1.com/api/users
    curl https://api2.com/api/users
  ```
- **Use cURLs instead of URLs**: To support headers and body payloads

### 4. Results Display
- **Tabbed Interface**: Each cURL comparison in a separate tab
- **Parallel Execution**: Run requests in parallel when possible for speed
- **Tab Structure**: One tab per cURL command

### 5. Host Count
- **Typical**: 2-3 hosts
- **No hard limit**: Support more if needed
- **UI**: Should scale gracefully

### 6. Comparison Options
- **User Configurable**: Let user choose what to ignore
- **Options**:
  - Ignore timestamps
  - Ignore IDs
  - Ignore whitespace
  - Custom ignore patterns
- **UI**: Checkboxes or settings panel

### 7. cURL List Input
- **Versatile**: Support multiple input methods
  - Textarea (one cURL per line)
  - File upload
  - Individual fields with add/remove

---

## 🔍 Second Round Clarifications

### Q1: Reference Host Selection UI
**Question**: How should users select the reference host?
- **Option A**: Radio buttons next to each host input
- **Option B**: Dropdown/select after entering hosts
- **Option C**: Visual indicator (star/checkmark) - click to set reference
- **Option D**: First host is default reference, but can be changed
- **Recommendation**: Option C (visual indicator) - most intuitive

**Follow-up**: Should the reference host be visually distinct in the comparison view?
- Highlighted column?
- Different background color?
- Labeled as "Reference"?

---

### Q2: {host} Placeholder Details
**Question**: How should the {host} placeholder work?
- **Option A**: Replace {host} with full hostname as entered
  - Input: `api1.com` → Replaces to `api1.com`
  - Input: `https://api1.com` → Replaces to `https://api1.com`
- **Option B**: Always replace with just hostname (strip protocol)
  - Input: `https://api1.com` → Replaces to `api1.com`
- **Option C**: Smart replacement (preserve protocol if in cURL)
  - cURL: `curl https://{host}/api` → `https://api1.com/api`
  - cURL: `curl {host}/api` → `api1.com/api` (no protocol)

**Recommendation**: Option C (smart replacement) - most flexible

**Follow-up**: Should we support other placeholders?
- `{host1}`, `{host2}` for specific host selection?
- `{index}` for host index?
- Custom placeholder patterns?

---

### Q3: cURL Parsing with Placeholders
**Question**: How to handle cURL parsing when {host} is present?
- **Option A**: Parse cURL first, then replace {host} before execution
- **Option B**: Replace {host} first, then parse modified cURL
- **Recommendation**: Option A - validate cURL structure first

**Follow-up**: What if {host} placeholder is missing but hosts are provided?
- Error: "cURL must contain {host} placeholder"
- Warning: "No {host} placeholder found, using first host"
- Auto-detect: Try to insert {host} intelligently?

---

### Q4: Parallel Execution Details
**Question**: How should parallel execution work?
- **Option A**: All requests for all cURLs against all hosts simultaneously
  - Fastest but may overwhelm servers
- **Option B**: Per-cURL parallelization
  - cURL1: All hosts in parallel
  - cURL2: All hosts in parallel
  - Sequential between cURLs
- **Option C**: Configurable concurrency limit
  - User sets max parallel requests (e.g., 5)
  - Queue remaining requests

**Recommendation**: Option B with Option C (configurable limit)

**Follow-up**: Should there be rate limiting per host?
- Prevent overwhelming a single host
- Configurable delay between requests?

---

### Q5: Tab Management
**Question**: How should tabs be organized?
- **Option A**: One tab per cURL (always)
  - Tab 1: cURL1 comparison
  - Tab 2: cURL2 comparison
  - Tab 3: cURL3 comparison
- **Option B**: Tabs only appear after execution
  - Before: Input form
  - After: Tabs with results
- **Option C**: Tabs for input + results
  - Input tab: Configure hosts and cURLs
  - Result tabs: One per cURL

**Recommendation**: Option B - cleaner UX

**Follow-up**: Should tabs be closable/reorderable?
- Close individual result tabs?
- Reorder tabs?
- Pin important comparisons?

---

### Q6: Comparison View Layout
**Question**: How to display comparison when reference host is selected?
- **Option A**: Reference host on left, others on right (side-by-side)
  ```
  [Reference Host] | [Host 2] | [Host 3]
  ```
- **Option B**: Reference host highlighted, others below
  ```
  [Reference Host] ← Reference
  [Host 2] ← Differences highlighted
  [Host 3] ← Differences highlighted
  ```
- **Option C**: Unified diff view
  - Reference as baseline
  - Show additions/deletions for each host

**Recommendation**: Option A (side-by-side) - familiar pattern

**Follow-up**: For 3+ hosts, should we:
- Show all hosts side-by-side (may be wide)?
- Use horizontal scrolling?
- Collapsible columns?

---

### Q7: Comparison Options UI
**Question**: Where should comparison options be placed?
- **Option A**: Settings panel/sidebar (always visible)
- **Option B**: Dropdown menu in comparison view
- **Option C**: Modal dialog before comparison
- **Option D**: Per-tab settings (each cURL can have different options)

**Recommendation**: Option A + Option D (global defaults + per-tab override)

**Follow-up**: What comparison options are needed?
- [ ] Ignore timestamps (date/time fields)
- [ ] Ignore IDs (uuid, id fields)
- [ ] Ignore whitespace
- [ ] Case-insensitive comparison
- [ ] Ignore array order
- [ ] Custom JSONPath ignore patterns
- [ ] Ignore specific headers

---

### Q8: Error Handling
**Question**: How to handle errors in multi-host comparison?
- **Option A**: Show error for failed host, continue with others
  - Reference host fails → Error, no comparison
  - Other host fails → Show error, compare successful hosts
- **Option B**: Mark entire comparison as failed if any host fails
- **Option C**: Retry failed requests automatically
  - Configurable retry count
  - Exponential backoff

**Recommendation**: Option A - most useful

**Follow-up**: How to display errors?
- Error badge in tab?
- Red highlight in comparison view?
- Error details in expandable section?

---

### Q9: Results Persistence
**Question**: Should comparison results be saved?
- **Option A**: In-memory only (lost on refresh)
- **Option B**: Local storage (persist in browser)
- **Option C**: Export to file (JSON/HTML)
- **Option D**: All of the above

**Recommendation**: Option D - maximum flexibility

**Follow-up**: Should there be a "history" feature?
- List of recent comparisons?
- Saved comparison sets?
- Shareable links?

---

### Q10: File Upload Format
**Question**: What format should file upload support?
- **Option A**: Plain text (one cURL per line)
- **Option B**: JSON array of cURLs
  ```json
  [
    "curl https://{host}/api/users",
    "curl https://{host}/api/posts"
  ]
  ```
- **Option C**: Both formats (auto-detect)
- **Option D**: Additional formats (YAML, CSV)

**Recommendation**: Option C (both, auto-detect)

**Follow-up**: Should file upload support comments?
- `# This is a comment`
- `// Comment`
- Ignore empty lines?

---

### Q11: Host Input Parsing
**Question**: How to parse versatile host input?
- **Option A**: Smart parsing (detect format automatically)
  - `host1.com` → Treat as hostname
  - `https://api1.com` → Treat as base URL
  - `https://api1.com/path` → Extract base URL
- **Option B**: User selects format (radio buttons)
- **Option C**: Always require full URLs

**Recommendation**: Option A (smart parsing) - most user-friendly

**Follow-up**: Should we validate host formats?
- Check if hostname is valid?
- Check if URL is reachable?
- Warn about potential issues?

---

### Q12: Loading States
**Question**: How to show progress during parallel execution?
- **Option A**: Overall progress bar (X of Y requests complete)
- **Option B**: Per-tab loading indicators
- **Option C**: Per-host status indicators
- **Option D**: All of the above

**Recommendation**: Option D - comprehensive feedback

**Follow-up**: Should we show:
- Request timing per host?
- Success/failure counts?
- Estimated time remaining?

---

### Q13: Diff Algorithm
**Question**: How should diff be computed?
- **Option A**: Reference vs Host2, Reference vs Host3 (separate diffs)
- **Option B**: Unified diff (all hosts together)
- **Option C**: Both options available

**Recommendation**: Option A (separate diffs) - clearer for users

**Follow-up**: Should we highlight:
- Only differences from reference?
- Differences between any hosts?
- Configurable highlight mode?

---

### Q14: Export/Report Format
**Question**: What export formats are needed?
- **Option A**: JSON (machine-readable)
- **Option B**: HTML (human-readable report)
- **Option C**: Markdown
- **Option D**: PDF
- **Option E**: All formats

**Recommendation**: Option E (all formats) - versatile

**Follow-up**: Should export include:
- All cURL comparisons in one file?
- Separate files per cURL?
- Summary report + detailed diffs?

---

### Q15: Authentication
**Question**: How to handle authentication in cURLs?
- **Option A**: Extract from cURL (if present)
  - `-H "Authorization: Bearer token"`
- **Option B**: Global auth settings (apply to all requests)
- **Option C**: Per-host auth settings
- **Option D**: All of the above

**Recommendation**: Option D - maximum flexibility

**Follow-up**: Should we support:
- Token refresh?
- Multiple auth methods (Basic, Bearer, API Key)?
- Secure token storage?

---

## 🎯 Proposed UI Mockup

### Main Interface

```
┌─────────────────────────────────────────────────────────┐
│ REST Response Comparator                    [⚙️ Settings]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Hosts Configuration                                     │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Host 1: [https://api1.com        ] [⭐ Reference]   │ │
│ │ Host 2: [https://api2.com        ] [  ]            │ │
│ │ Host 3: [https://api3.com        ] [  ]            │ │
│ │ [+ Add Host]                                       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ cURL Commands                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [📝 Textarea] [📁 Upload File]                      │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ curl https://{host}/api/users                   │ │ │
│ │ │ curl https://{host}/api/posts                  │ │ │
│ │ │ curl -X POST https://{host}/api/login \         │ │ │
│ │ │   -H "Content-Type: application/json" \         │ │ │
│ │ │   -d '{"user":"test"}'                          │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Comparison Options                                       │
│ ☑ Ignore timestamps  ☑ Ignore IDs  ☐ Ignore whitespace │
│                                                         │
│ [▶ Execute Comparison]                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Results View (After Execution)

```
┌─────────────────────────────────────────────────────────┐
│ [Tab 1: cURL1] [Tab 2: cURL2] [Tab 3: cURL3] [×]       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Comparison: curl https://{host}/api/users              │
│                                                         │
│ ┌──────────────┬──────────────┬──────────────┐        │
│ │ Reference    │ Host 2       │ Host 3        │        │
│ │ api1.com     │ api2.com     │ api3.com      │        │
│ ├──────────────┼──────────────┼──────────────┤        │
│ │ {             │ {             │ {             │        │
│ │   "id": 1,    │   "id": 1,    │   "id": 1,    │        │
│ │   "name": "A" │   "name": "A" │   "name": "B" │ ← Diff │
│ │ }             │ }             │ }             │        │
│ └──────────────┴──────────────┴──────────────┘        │
│                                                         │
│ [📊 Summary] [📥 Export] [🔄 Re-run]                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Summary of Clarifications Needed

### High Priority (Blocking Implementation)
1. **Q1**: Reference host selection UI method
2. **Q2**: {host} placeholder replacement logic
3. **Q3**: cURL parsing with placeholders
4. **Q4**: Parallel execution strategy
5. **Q6**: Comparison view layout

### Medium Priority (Affects UX)
6. **Q5**: Tab management details
7. **Q7**: Comparison options UI placement
8. **Q11**: Host input parsing strategy
9. **Q13**: Diff algorithm approach

### Low Priority (Can Be Iterated)
10. **Q8**: Error handling details
11. **Q9**: Results persistence
12. **Q10**: File upload format
13. **Q12**: Loading states
14. **Q14**: Export formats
15. **Q15**: Authentication handling

---

**Document Status**: Awaiting Second Round Clarifications  
**Next Steps**: Get answers to high-priority questions, then proceed with implementation
