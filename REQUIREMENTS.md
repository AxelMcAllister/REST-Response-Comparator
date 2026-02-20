# Requirements Analysis: Multi-Host Response Comparator

## Key Differences from API Diff Online

### Comparison Model

**API Diff Online:**
- Compares: Request A vs Request B (different requests)
- Single comparison: 2 responses side-by-side
- Use case: Compare different endpoints, versions, or environments

**Our Application:**
- Compares: Same Request → Multiple Hosts → Compare all responses
- Multi-host comparison: 2+ hosts for the same request
- Use case: Ensure consistency across hosts/environments

---

## Requirement 1: Multi-Host Comparison

### Description
Compare responses of the **same endpoint/cURL** across **2 or more hosts**, expecting exact responses.

### Use Cases
1. **Environment Consistency**
   - Same API endpoint across dev, staging, prod
   - Ensure all environments return identical responses

2. **Load Balancer Validation**
   - Multiple servers behind load balancer
   - Verify all servers return same data

3. **Migration Testing**
   - Old host vs new host
   - Ensure no data loss or changes

4. **Multi-Region Validation**
   - Same endpoint across different regions
   - Verify consistency

### Questions for Clarification

#### Q1: Number of Hosts
- **Question**: Is there a maximum number of hosts? (2, 3, 5, unlimited?)
- **Impact**: UI design, performance, comparison algorithm
- **Suggestion**: Support 2-10 hosts initially

#### Q2: Host Input Method
- **Question**: How should users specify hosts?
  - Option A: List of hostnames/IPs (e.g., `host1.com, host2.com, host3.com`)
  - Option B: Base URLs (e.g., `https://api1.com, https://api2.com`)
  - Option C: Full URLs with same path (e.g., `https://host1.com/api/users, https://host2.com/api/users`)
- **Impact**: Input UI, URL construction logic

#### Q3: Comparison Display
- **Question**: How to display 3+ host comparisons?
  - Option A: All hosts side-by-side (columns)
  - Option B: Compare each host against a "baseline" host
  - Option C: Matrix view showing differences between all pairs
  - Option D: Unified diff showing all hosts together
- **Impact**: UI complexity, diff algorithm

#### Q4: Baseline Host
- **Question**: Should there be a "baseline" or "reference" host?
  - Option A: First host is baseline, others compared to it
  - Option B: All hosts equal, compare all pairs
  - Option C: User selects baseline
- **Impact**: Comparison logic, UI

#### Q5: "Exact Responses" Definition
- **Question**: What does "expecting exact responses" mean?
  - Option A: Any difference is highlighted (even whitespace)
  - Option B: Structural differences only (ignore timestamps, IDs)
  - Option C: Configurable ignore rules (headers, specific fields)
- **Impact**: Diff algorithm, filtering options

#### Q6: Failure Handling
- **Question**: What if one host fails/timeouts?
  - Option A: Still compare successful hosts
  - Option B: Mark entire comparison as failed
  - Option C: Show error for failed host, continue with others
- **Impact**: Error handling, UI states

---

## Requirement 2: Sequential cURL List Comparison

### Description
Allow a **list of cURL commands** to be compared sequentially. Each cURL request is executed against **each host**, and responses from the same cURL across different hosts are compared.

**Key Points:**
- List of cURLs (e.g., 5 different cURL commands)
- Each cURL executed against ALL hosts
- Compare responses: cURL1 responses across hosts, cURL2 responses across hosts, etc.
- **NO comparison between different cURLs**

### Example Flow

```
cURL List:
  1. curl https://api.example.com/users
  2. curl https://api.example.com/posts
  3. curl -X POST https://api.example.com/login -d '{"user":"test"}'

Hosts:
  - host1.com
  - host2.com
  - host3.com

Execution:
  cURL1 → host1.com/users → Response1A
  cURL1 → host2.com/users → Response1B
  cURL1 → host3.com/users → Response1C
  Compare: Response1A vs Response1B vs Response1C

  cURL2 → host1.com/posts → Response2A
  cURL2 → host2.com/posts → Response2B
  cURL2 → host3.com/posts → Response2C
  Compare: Response2A vs Response2B vs Response2C

  cURL3 → host1.com/login (POST) → Response3A
  cURL3 → host2.com/login (POST) → Response3B
  cURL3 → host3.com/login (POST) → Response3C
  Compare: Response3A vs Response3B vs Response3C
```

### Questions for Clarification

#### Q7: cURL List Input
- **Question**: How should users provide the cURL list?
  - Option A: Textarea with one cURL per line
  - Option B: File upload (text file)
  - Option C: Individual input fields (add/remove)
  - Option D: Import from file/URL
- **Impact**: Input UI, parsing logic

#### Q8: Host Replacement in cURL
- **Question**: How to handle hostnames in cURL commands?
  - Option A: Replace hostname in cURL with each target host
    - Example: `curl https://api.example.com/users` → Replace `api.example.com` with `host1.com`
  - Option B: Extract path/method/headers/body, apply to each host
    - Example: Extract `/users`, apply to `https://host1.com/users`
  - Option C: User specifies replacement pattern
- **Impact**: cURL parsing, URL construction

#### Q9: Sequential vs Parallel Execution
- **Question**: Should cURLs execute sequentially or in parallel?
  - Option A: Sequential (cURL1 → all hosts, then cURL2 → all hosts)
  - Option B: Parallel (all cURLs against all hosts simultaneously)
  - Option C: Configurable (user choice)
- **Impact**: Performance, UI updates, rate limiting

#### Q10: Results Display
- **Question**: How to display results for multiple cURL comparisons?
  - Option A: Tabbed interface (one tab per cURL)
  - Option B: Accordion/collapsible sections
  - Option C: List view with expandable items
  - Option D: Side-by-side comparison cards
- **Impact**: UI complexity, navigation

#### Q11: Batch Summary
- **Question**: Should there be a summary view?
  - Option A: Dashboard showing all comparisons at once
  - Option B: Pass/fail indicators for each cURL
  - Option C: Statistics (how many differences found)
  - Option D: Export combined report
- **Impact**: Summary UI, reporting features

#### Q12: Error Handling in Batch
- **Question**: What if one cURL fails on one host?
  - Option A: Continue with other hosts for that cURL
  - Option B: Mark entire cURL as failed
  - Option C: Show partial results
- **Impact**: Error handling, result display

---

## Additional Questions

#### Q13: Authentication
- **Question**: How to handle authentication across hosts?
  - Option A: Same credentials for all hosts
  - Option B: Per-host credentials
  - Option C: Extract from cURL (if present)
- **Impact**: Auth UI, request execution

#### Q14: Headers Comparison
- **Question**: Should HTTP headers be compared?
  - Option A: Yes, full comparison including headers
  - Option B: No, body only
  - Option C: Configurable (ignore certain headers)
- **Impact**: Comparison scope, diff display

#### Q15: Response Time Comparison
- **Question**: Should response times be displayed/compared?
  - Option A: Yes, show timing for each host
  - Option B: No, only compare content
  - Option C: Optional/metrics view
- **Impact**: Performance metrics, UI

#### Q16: Export/Report Format
- **Question**: What export formats are needed?
  - Option A: JSON report
  - Option B: HTML report
  - Option C: Markdown
  - Option D: CSV/Excel
- **Impact**: Export functionality

#### Q17: History/Saving
- **Question**: Should comparisons be saved?
  - Option A: Local storage only
  - Option B: Export to file
  - Option C: Server-side storage (optional)
- **Impact**: Persistence, sharing

---

## Proposed Architecture

### Feature Structure

```
features/
├── multi-host-comparison/
│   ├── components/
│   │   ├── HostInput/
│   │   ├── MultiHostDiffViewer/
│   │   ├── ComparisonMatrix/
│   │   └── HostResponseCard/
│   ├── hooks/
│   │   ├── useMultiHostRequest.ts
│   │   └── useMultiHostComparison.ts
│   └── services/
│       └── multiHostService.ts
│
├── curl-batch/
│   ├── components/
│   │   ├── CurlListInput/
│   │   ├── BatchComparisonView/
│   │   └── CurlComparisonCard/
│   ├── hooks/
│   │   ├── useCurlBatch.ts
│   │   └── useBatchExecution.ts
│   └── services/
│       ├── curlBatchService.ts
│       └── curlParser.ts
```

### UI Flow Options

#### Option A: Tabbed Interface
```
[Multi-Host Comparison] [cURL Batch]

Tab 1: Multi-Host Comparison
  - Host input (comma-separated)
  - Single URL/cURL input
  - Compare button
  - Multi-column diff view

Tab 2: cURL Batch
  - Host list input
  - cURL list input (textarea)
  - Execute button
  - Results: Accordion with each cURL comparison
```

#### Option B: Unified Interface
```
Hosts: [host1.com, host2.com, host3.com]

Mode: [Single Request] [Batch cURLs]

Single Request Mode:
  - URL/cURL input
  - Compare → Multi-column diff

Batch Mode:
  - cURL list input
  - Execute → List of comparisons
```

---

## Summary of Clarifications Needed

### Critical (Must Know)
1. **Q2**: Host input method (URLs vs hostnames)
2. **Q3**: Comparison display for 3+ hosts
3. **Q8**: Host replacement strategy in cURL commands
4. **Q9**: Sequential vs parallel execution

### Important (Should Know)
5. **Q1**: Maximum number of hosts
6. **Q4**: Baseline host concept
7. **Q5**: "Exact responses" definition
8. **Q7**: cURL list input method
9. **Q10**: Results display format

### Nice to Have
10. **Q6**: Failure handling
11. **Q11**: Batch summary view
12. **Q13**: Authentication approach
13. **Q14**: Headers comparison
14. **Q15**: Response time display

---

**Document Status**: Awaiting Clarification  
**Next Steps**: Review questions with stakeholders, update requirements
