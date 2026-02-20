# Final Requirements: Multi-Host Response Comparator

## ✅ Confirmed Decisions

### 1. Reference Host Selection
- **Method**: Visual indicator (star/checkmark) - click to set reference
- **Default**: First host is default reference if none selected
- **UI**: Clickable icon next to each host to toggle reference status

### 2. {host} Placeholder Replacement
- **Method**: Smart replacement (preserve protocol if in cURL)
- **Logic**:
  - `curl https://{host}/api` → `https://api1.com/api`
  - `curl {host}/api` → `api1.com/api` (no protocol)
  - Preserve existing protocol in cURL

### 3. Missing {host} Placeholder Handling
- **Action**: Ask and warn user
- **If accepted**: Use auto-detection to insert {host}
- **Auto-detection**: Try to find hostname in cURL and replace with {host}

### 4. Parallel Execution & Tab Structure
- **Execution**: All requests simultaneously (Option A)
- **Tab Structure**: Each `curl × n-hosts` comparison runs in a separate **app tab** (not browser tabs)
- **Example**: 
  - cURL1 against 3 hosts → Tab 1
  - cURL2 against 3 hosts → Tab 2
  - cURL3 against 3 hosts → Tab 3
- **Note**: All requests for a cURL execute in parallel, but results appear in separate app tabs

### 5. Comparison View Layout
- **Method**: Side-by-side (Option A)
- **Layout**: Reference host on left, other hosts on right
- **For 3+ hosts**: All hosts side-by-side (may need horizontal scrolling)

### 6. Comparison Options UI
- **Global Settings**: Settings panel (always visible or toggleable)
- **Per-Tab Override**: Each tab can override global settings
- **Options**: Ignore timestamps, IDs, whitespace, etc.

---

## 🔍 Final Clarification Questions

### Q1: Tab Structure Details
**Question**: How should the app tabs work?
- **Option A**: Tabs appear dynamically as each cURL completes
  - Tab appears when first cURL starts executing
  - New tabs appear as subsequent cURLs start
- **Option B**: All tabs created upfront (empty/loading state)
  - Create all tabs immediately when execution starts
  - Show loading state until results arrive
- **Option C**: Single "Results" area that switches between cURL comparisons
  - Dropdown/selector to switch between cURLs
  - Not true tabs, but tab-like navigation

**Recommendation**: Option B (all tabs upfront) - better UX, shows progress

**Follow-up**: Should tabs be:
- Closable? (X button)
- Reorderable? (drag to reorder)
- Pinnable? (pin important comparisons)

---

### Q2: Auto-Detection Logic for {host}
**Question**: How should auto-detection work when {host} is missing?
- **Option A**: Find first URL-like pattern, replace hostname with {host}
  - `curl https://api.example.com/users` → `curl https://{host}/users`
- **Option B**: Find hostname after `-X` or in URL, replace with {host}
  - More intelligent parsing
- **Option C**: Ask user to select which part to replace
  - Show cURL with clickable parts
  - User clicks hostname → replaces with {host}

**Recommendation**: Option A (simple, automatic)

**Follow-up**: What if multiple URLs/hostnames found?
- Replace first occurrence?
- Replace all occurrences?
- Ask user which one?

---

### Q3: Parallel Execution Details
**Question**: When you say "all requests simultaneously", do you mean:
- **Option A**: All cURLs × all hosts at once (e.g., 3 cURLs × 3 hosts = 9 simultaneous requests)
- **Option B**: Per cURL - all hosts in parallel, but cURLs execute sequentially
  - cURL1: 3 hosts in parallel → wait → cURL2: 3 hosts in parallel
- **Option C**: Per cURL - all hosts in parallel, cURLs also in parallel
  - All 9 requests start simultaneously

**Your answer was Option A, but want to confirm**: Is this Option C (all requests at once)?

**Follow-up**: Should there be a concurrency limit?
- Unlimited parallel requests?
- Configurable limit (e.g., max 10 simultaneous)?
- Automatic throttling?

---

### Q4: Tab Content While Loading
**Question**: What should tabs show while requests are executing?
- **Option A**: Loading spinner + progress (X of Y requests complete)
- **Option B**: Per-host status indicators
  - Host 1: ⏳ Loading
  - Host 2: ✅ Complete
  - Host 3: ⏳ Loading
- **Option C**: Real-time updates as responses arrive
  - Show responses as they complete
  - Update diff view incrementally

**Recommendation**: Option B + C (status indicators + incremental updates)

---

### Q5: Error Handling in Parallel Execution
**Question**: If one host fails in a cURL comparison:
- **Option A**: Show error for that host, continue comparing successful hosts
  - Reference host fails → Show error, can't compare
  - Other host fails → Show error badge, compare remaining hosts
- **Option B**: Wait for all requests, then show errors + successful comparisons
- **Option C**: Retry failed requests automatically
  - Configurable retry count
  - Exponential backoff

**Recommendation**: Option A (show errors, continue with successes)

**Follow-up**: How to display errors in the comparison view?
- Red error badge in host column?
- Error message in diff area?
- Separate error panel?

---

### Q6: Comparison Options - Per-Tab Override UI
**Question**: How should per-tab override work?
- **Option A**: Settings icon in each tab header
  - Click → Modal/dropdown with options
  - Visual indicator if tab has custom settings
- **Option B**: Settings panel in each tab's comparison view
  - Always visible or collapsible
- **Option C**: Right-click context menu on tab
  - "Override settings" option

**Recommendation**: Option A (settings icon in tab header)

**Follow-up**: Should we show which tabs have custom settings?
- Visual indicator (icon/badge)?
- List in global settings panel?

---

### Q7: Smart Replacement Edge Cases
**Question**: How to handle edge cases in smart replacement?
- **Case 1**: `curl https://api.example.com/{host}/users`
  - Should we replace `api.example.com` or leave as-is?
  - Answer: Replace `api.example.com` with `{host}` → `https://{host}/users`
- **Case 2**: `curl -X POST {host}/api/login -H "Host: api.example.com"`
  - Replace URL hostname, ignore Host header?
  - Answer: Replace URL hostname only
- **Case 3**: Multiple URLs in one cURL
  - `curl https://api1.com/users https://api2.com/posts`
  - Replace both? Replace first? Error?
  - Answer: Replace first occurrence, warn if multiple URLs

**Need confirmation**: Are these assumptions correct?

---

### Q8: Host Input Parsing Details
**Question**: For versatile host input, how should we parse?
- **Input**: `api1.com, https://api2.com, https://api3.com/api`
- **Option A**: Smart parsing
  - `api1.com` → Treat as hostname, add `https://` if needed
  - `https://api2.com` → Use as-is
  - `https://api3.com/api` → Extract base URL `https://api3.com`
- **Option B**: Normalize all to base URLs
  - All become `https://api1.com`, `https://api2.com`, `https://api3.com`
- **Option C**: Preserve exactly as entered
  - Use exactly what user types

**Recommendation**: Option A (smart parsing with normalization)

**Follow-up**: Should we validate host formats?
- Check if hostname is valid?
- Check if URL is reachable (ping/test)?
- Warn about potential issues?

---

### Q9: Tab Naming
**Question**: How should tabs be named?
- **Option A**: Auto-generate from cURL
  - Extract endpoint: `GET /api/users` → Tab: "GET /api/users"
  - Truncate if too long
- **Option B**: Use cURL index
  - Tab 1, Tab 2, Tab 3
- **Option C**: User-provided names
  - Input field for each cURL
- **Option D**: Combination
  - Auto-generate, but allow user to rename

**Recommendation**: Option D (auto-generate, allow rename)

---

### Q10: Results Persistence
**Question**: Should comparison results persist?
- **Option A**: In-memory only (lost on refresh)
- **Option B**: Local storage (persist in browser)
  - Save all tabs/results
  - Restore on page reload
- **Option C**: Export only (user manually saves)
- **Option D**: All of the above

**Recommendation**: Option B + C (local storage + export)

**Follow-up**: Should there be a "Save Session" feature?
- Save current host config + cURL list + results?
- Load saved sessions?
- Share sessions with team?

---

### Q11: Comparison Algorithm Details
**Question**: For side-by-side comparison with reference host:
- **Option A**: Compare each host individually against reference
  - Reference vs Host2 (separate diff)
  - Reference vs Host3 (separate diff)
  - Show both diffs side-by-side
- **Option B**: Unified comparison (all hosts in one view)
  - Reference column + all other hosts
  - Highlight differences from reference
- **Option C**: Matrix view
  - Show differences between all pairs

**Your answer was Option A (side-by-side), but need clarification**: 
- Should we show Reference vs Host2 AND Reference vs Host3 in the same tab?
- Or separate sub-tabs/views for each comparison?

---

### Q12: Export Format Details
**Question**: What should export include?
- **Option A**: Current tab only
- **Option B**: All tabs (all cURL comparisons)
- **Option C**: User selects which tabs to export
- **Option D**: Summary report + detailed diffs

**Recommendation**: Option C (user selects)

**Follow-up**: Export formats needed?
- JSON (machine-readable)
- HTML (human-readable report)
- Markdown
- PDF
- All of the above?

---

## 🎯 Proposed Implementation Plan

### Phase 1: Core Structure
1. Host input with reference selection (visual indicator)
2. cURL input (textarea + file upload)
3. {host} placeholder replacement logic
4. Basic parallel execution
5. Tab structure (app tabs, not browser tabs)

### Phase 2: Comparison View
1. Side-by-side diff viewer
2. Reference host highlighting
3. Error handling and display
4. Loading states

### Phase 3: Advanced Features
1. Comparison options (global + per-tab)
2. Auto-detection for missing {host}
3. Export functionality
4. Results persistence

### Phase 4: Polish
1. Tab management (close, reorder, rename)
2. Performance optimizations
3. Better error messages
4. Documentation

---

## 📋 Summary of Questions

### High Priority (Blocking Implementation)
1. **Q1**: Tab structure details (when tabs appear, closable/reorderable)
2. **Q3**: Parallel execution confirmation (all at once vs per-cURL)
3. **Q11**: Comparison algorithm (how to show multiple hosts)

### Medium Priority (Affects UX)
4. **Q2**: Auto-detection logic details
5. **Q4**: Tab content while loading
6. **Q5**: Error handling display
7. **Q7**: Smart replacement edge cases
8. **Q8**: Host input parsing

### Low Priority (Can Iterate)
9. **Q6**: Per-tab override UI
10. **Q9**: Tab naming
11. **Q10**: Results persistence
12. **Q12**: Export format details

---

**Document Status**: Awaiting Final Clarifications  
**Next Steps**: Get answers to Q1, Q3, Q11 (high priority), then proceed with implementation
