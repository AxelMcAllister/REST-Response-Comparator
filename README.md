# REST Response Comparator

A React application for comparing REST API responses **across multiple hosts**. Paste cURL commands, define two or more hosts (e.g. staging vs production), and run comparisons to see side-by-side diffs. Built with Vite and TypeScript.

## Features

- **Multi-host comparison** – Add multiple hosts (URLs or hostnames), mark one as reference, and compare responses from all hosts for each request.
- **cURL input** – Paste one or more cURL commands. Use a `{host}` placeholder in the URL; it is replaced with each host’s base URL when executing.
- **Tabbed comparisons** – Each cURL command gets its own tab with a side-by-side diff of responses per host.
- **Reference host** – One host can be marked as reference (★); the diff viewer highlights differences from that host.
- **Config export/import** – Save and load configuration (hosts + cURL commands) as `.rrc.json` files.
- **Comparison options** – Options such as ignore timestamps, ignore IDs, ignore whitespace, case-insensitive, ignore array order, and custom JSONPath ignore paths (stored in state; UI for per-tab overrides may be in progress).
- **Execution** – Parallel execution (all hosts at once or per cURL), with loading states and error handling.

## Project Structure

Feature-based layout under `src/`:

```
src/
├── app/                    # Entry point and layout
│   ├── App.tsx
│   └── App.css
├── features/
│   └── comparison/         # Comparison feature
│       ├── components/
│       │   ├── HostInput/           # Host list with reference toggle
│       │   ├── CurlInput/           # cURL textarea + file upload
│       │   ├── ComparisonTabs/     # Tabs per cURL + diff
│       │   ├── ConfigManager/      # Export/import config
│       │   └── MultiHostDiffViewer/ # Side-by-side diff per host
│       ├── hooks/
│       │   └── useComparisonExecution.ts
│       ├── services/
│       │   ├── hostParser.ts        # Normalize host/URL input
│       │   ├── curlParser.ts       # Parse cURL commands
│       │   ├── hostReplacer.ts     # {host} placeholder replacement
│       │   ├── requestExecutor.ts  # HTTP execution
│       │   └── diffService.ts      # Diff computation
│       ├── store/
│       │   └── comparisonStore.ts   # Zustand store
│       └── types.ts
├── shared/
│   ├── hooks/              # useLocalStorage, useToggle
│   ├── utils/
│   └── types/              # Host, CurlCommand, ComparisonResult, etc.
├── lib/
│   └── api.ts              # Axios client (optional VITE_API_URL)
└── index.css               # Global styles
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
   - Copy `env.example` to `.env` if present, or create a `.env` with:
   - `VITE_API_URL` – optional; API base URL (defaults to `/api`). Omit to call same origin or use the proxy.

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open the URL shown in the terminal (e.g. `http://localhost:5173`).

### Available Scripts

| Script       | Description                |
| ------------ | -------------------------- |
| `npm run dev`    | Start Vite dev server      |
| `npm run build`  | TypeScript check + production build |
| `npm run preview`| Preview production build   |
| `npm run lint`   | Run ESLint                 |
| `npm run proxy`  | Run standalone proxy server (`node proxy-server.js`) |

## Technologies

| Category     | Stack |
| ------------ | ----- |
| UI           | **React 19** |
| Language     | **TypeScript** (strict) |
| Build        | **Vite 5** |
| State        | **Zustand** |
| HTTP         | **Axios** |
| Diff UI      | **react-diff-viewer-continued**, **react-syntax-highlighter** |
| Filtering    | **jsonpath-plus** |
| Lint         | ESLint |

## Path Aliases

Use the `@/` prefix for imports from `src/`:

```tsx
import { useLocalStorage } from '@/shared/hooks'
import { api } from '@/lib/api'
import type { Host, ComparisonResult } from '@/shared/types'
```

## Best Practices in Use

- **Performance** – Functional setState, `useCallback` where appropriate, lazy state init, memoization.
- **Structure** – Feature-based folders, path aliases, TypeScript strict mode, barrel exports.
- **Reuse** – Shared hooks (`useLocalStorage`, `useToggle`), shared types, centralized API client.
- **Safety** – Versioned localStorage keys, try/catch around storage, env-based config, AbortController for request cleanup.

## Contributing

When adding features:

1. Prefer a new or existing feature under `src/features/[feature-name]/`.
2. Keep structure: `components/`, `hooks/`, `services/`, `store/`, `types.ts`, `index.ts` as needed.
3. Use path aliases (`@/`) for imports.
4. Use functional setState and proper TypeScript types.
5. Use AbortController (or equivalent) for cancelable async work.

## License

MIT
