# REST Response Comparator

A React application for comparing REST API responses **across multiple hosts**. Paste cURL commands, define two or more hosts (e.g. staging vs production), and run comparisons to see side-by-side diffs. Built with Vite and TypeScript.

## Features

- **Multi-host comparison** – Add multiple hosts (URLs or hostnames), mark one as reference, and compare responses from all hosts for each request.
- **cURL input** – Paste one or more cURL commands. Use a `{host}` placeholder in the URL; it is replaced with each host's base URL when executing. Auto-detection offers to insert `{host}` if missing.
- **Tabbed comparisons** – Each cURL command gets its own tab with a side-by-side diff of responses per host. Tabs are renamable and reorderable via drag & drop.
- **Reference host** – One host can be marked as reference (★); the diff viewer highlights differences from that host.
- **JSONPath filtering** – Scope the diff to a specific subtree of large JSON payloads by entering a JSONPath expression. Includes autocomplete suggestions based on response data.
- **Key sorting** – Sort JSON keys by **Original** order, **Alphabetical**, or **Common first** (keys shared by both responses appear first).
- **Copy support** – Copy resolved cURL commands or response JSON bodies to clipboard with a single click.
- **Config export/import** – Save and load configuration (hosts + cURL commands) as `.rrc.json` files, with duplicate detection and merge on import.
- **Comparison options** – Settings such as ignore timestamps, ignore IDs, ignore whitespace, case-insensitive, ignore array order, and custom JSONPath ignore paths.
- **Execution** – Parallel execution (all hosts at once or per cURL), with loading states and error handling. Automatic fallback to CORS proxy in development.

## Project Structure

Feature-based layout under `src/`:

```
src/
├── app/                        # Entry point and layout
│   ├── App.tsx
│   └── App.css
├── features/
│   └── comparison/             # Comparison feature
│       ├── components/
│       │   ├── HostInput/              # Host list with reference toggle
│       │   │   ├── HostInput.tsx
│       │   │   ├── HostInputField.tsx
│       │   │   └── HostInput.css
│       │   ├── CurlInput/              # cURL textarea + parsed command list
│       │   │   ├── CurlInput.tsx
│       │   │   ├── CurlCommandRow.tsx
│       │   │   ├── LineNumberedTextarea.tsx
│       │   │   └── CurlInput.css
│       │   ├── ComparisonTabs/         # Tabs per cURL + diff
│       │   │   ├── ComparisonTabs.tsx
│       │   │   ├── ComparisonTab.tsx
│       │   │   └── ComparisonTabs.css
│       │   ├── ConfigManager/          # Export/import config
│       │   │   ├── ConfigManager.tsx
│       │   │   └── ConfigManager.css
│       │   ├── GlobalOptionsPanel/     # Comparison settings modal
│       │   │   ├── GlobalOptionsPanel.tsx
│       │   │   └── GlobalOptionsPanel.css
│       │   └── MultiHostDiffViewer/    # Side-by-side diff per host
│       │       ├── MultiHostDiffViewer.tsx
│       │       └── MultiHostDiffViewer.css
│       ├── hooks/
│       │   └── useComparisonExecution.ts
│       ├── services/
│       │   ├── hostParser.ts           # Normalize host/URL input
│       │   ├── curlParser.ts           # Parse & validate cURL commands
│       │   ├── hostReplacer.ts         # {host} placeholder replacement
│       │   ├── requestExecutor.ts      # HTTP execution via Axios
│       │   ├── diffService.ts          # Diff computation & formatting
│       │   └── jsonPathSuggestions.ts   # JSONPath autocomplete & line mapping
│       └── store/
│           └── comparisonStore.ts      # Zustand store
├── shared/
│   ├── components/
│   │   └── EditableLabel/      # Inline-editable text label
│   ├── hooks/                  # Shared hooks barrel
│   ├── utils/                  # Shared utilities barrel
│   └── types/                  # Host, CurlCommand, ComparisonResult, etc.
└── index.css                   # Global styles
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. (Optional) Environment variables:
   - Copy `.env.example` to `.env` if present, or create a `.env` with:
   - `VITE_API_URL` – optional; API base URL (defaults to `/api`). Omit to call same origin or use the proxy.

3. Start the application (starts both dev server and CORS proxy):

   ```bash
   npm run start
   ```

4. Open the URL shown in the terminal (e.g. `http://localhost:5173`).

### CORS Proxy

In development, direct cross-origin requests may fail. A lightweight CORS proxy is included.

If you started the app with `npm run start`, the proxy is already running alongside your dev server!

Alternatively, you can run the proxy individually:

```bash
npm run proxy
```

This starts `proxy-server.js` on `http://localhost:3001`. The app automatically falls back to this proxy when direct requests fail in dev mode.

### Available Scripts

| Script            | Description                                               |
|-------------------|-----------------------------------------------------------|
| `npm run start`   | Start Vite dev server and CORS proxy concurrently         |
| `npm run dev`     | Start Vite dev server                                     |
| `npm run build`   | TypeScript check + production build                       |
| `npm run preview` | Preview production build                                  |
| `npm run lint`    | Run ESLint                                                |
| `npm run proxy`   | Run standalone CORS proxy server (`node proxy-server.js`) |

## Technologies

| Category  | Stack                           |
|-----------|---------------------------------|
| UI        | **React 19**                    |
| Language  | **TypeScript** (strict)         |
| Build     | **Vite 5**                      |
| State     | **Zustand**                     |
| HTTP      | **Axios**                       |
| Diff UI   | **react-diff-viewer-continued** |
| Filtering | **jsonpath-plus**               |
| Lint      | ESLint                          |

## Path Aliases

Use the `@/` prefix for imports from `src/`:

```tsx
import type { Host, ComparisonResult } from '@/shared/types'
```

## Best Practices in Use

- **Performance** – Functional setState, `useCallback` where appropriate, lazy state init, memoization.
- **Immutability** – Using `toSorted()` instead of mutating `sort()` for arrays.
- **Rendering Stability** – Using stable unique IDs for mapped list items (avoiding index-as-key patterns).
- **Structure** – Feature-based folders, path aliases, TypeScript strict mode, barrel exports.
- **Reuse** – Shared components (`EditableLabel`), shared types, centralized store.
- **Safety** – Try/catch around storage, env-based config, proxy fallback for CORS.

## Contributing

When adding features:

1. Prefer a new or existing feature under `src/features/[feature-name]/`.
2. Keep structure: `components/`, `hooks/`, `services/`, `store/` as needed.
3. Use path aliases (`@/`) for imports.
4. Use functional setState and proper TypeScript types.

## License

MIT
