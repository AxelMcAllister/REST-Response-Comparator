# REST Response Comparator

A React application built with Vite and TypeScript for comparing REST API responses. This project follows React best practices for performance, scalability, and maintainability.

## Project Structure

Following feature-based architecture for scalability:

```
src/
├── app/                    # Entry point, router, providers
│   ├── App.tsx
│   └── App.css
├── features/               # Feature modules (self-contained)
│   └── [feature]/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── store/
│       └── index.ts
├── shared/                 # Shared code across features
│   ├── components/         # Generic UI components
│   ├── hooks/              # Utility hooks (useLocalStorage, useToggle)
│   ├── utils/              # Pure functions
│   └── types/              # Global types
├── lib/                    # External library configuration
│   └── api.ts              # Axios client with interceptors
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

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API URL
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`)

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Best Practices Implemented

This project follows React best practices including:

### Performance
- ✅ Functional setState for stable callbacks
- ✅ useCallback for memoized handlers
- ✅ Lazy state initialization
- ✅ Proper memoization patterns

### Code Quality
- ✅ Path aliases (`@/` imports)
- ✅ Feature-based folder structure
- ✅ TypeScript strict mode
- ✅ ESLint configuration

### Reusability
- ✅ Custom hooks (useLocalStorage, useToggle)
- ✅ Shared utilities and types
- ✅ Centralized API client

### Security
- ✅ Versioned localStorage keys
- ✅ Try-catch around localStorage operations
- ✅ Environment variable best practices
- ✅ Proper error handling

### Scalability
- ✅ Feature-based architecture
- ✅ Barrel exports for clean APIs
- ✅ Centralized HTTP client with interceptors
- ✅ AbortController support for cleanup

## Technologies

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Axios** - HTTP client
- **ESLint** - Code linting

## Path Aliases

Use `@/` prefix for imports from `src/`:

```tsx
import { useLocalStorage } from '@/shared/hooks'
import { api } from '@/lib/api'
import type { ApiResponse } from '@/shared/types'
```

## Contributing

When adding new features:

1. Create a new folder in `src/features/[feature-name]/`
2. Follow the structure: `components/`, `hooks/`, `services/`, `store/`, `types.ts`, `index.ts`
3. Use path aliases (`@/`) for imports
4. Follow functional setState patterns
5. Add proper TypeScript types
6. Use AbortController for async operations

## License

MIT
