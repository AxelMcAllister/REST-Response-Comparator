---
name: react-best-practices
description: Best practices for React development including performance optimization, memoization, re-render prevention, async patterns, bundle optimization, JavaScript performance, security, and scalability. Use when writing React components, optimizing performance, creating reusable patterns, or implementing security.
user-invocable: true
---

# React Best Practices

This skill provides production-grade best practices for React development. Covers performance optimization, component patterns, security, and scalability.

## When to use this skill

- Writing new React components
- Optimizing component performance
- Preventing unnecessary re-renders
- Implementing async data fetching patterns
- Reducing bundle size
- Writing secure frontend code
- Scaling React applications

## Reference documentation

Load these files for detailed implementation guidance:

| Topic | File | Use when |
|-------|------|----------|
| Performance | [01-performance.md](01-performance.md) | Memoization, lazy loading, virtualization, preload |
| Re-renders | [02-rerenders.md](02-rerenders.md) | Preventing unnecessary re-renders, setState patterns |
| Async | [03-async.md](03-async.md) | Promise.all, avoiding waterfalls, deferred reads |
| Bundle | [04-bundle.md](04-bundle.md) | Barrel imports, tree-shaking optimization |
| JavaScript | [05-javascript.md](05-javascript.md) | Map/Set, toSorted, loops, DOM performance |
| Events & Storage | [06-events-storage.md](06-events-storage.md) | Event listeners, localStorage patterns |
| Reusability | [07-reusability.md](07-reusability.md) | Composition, custom hooks, render props |
| Scalability | [08-scalability.md](08-scalability.md) | Folder structure, Zustand, data fetching |
| Security | [09-security.md](09-security.md) | XSS prevention, tokens, validation |
| Common Mistakes | [10-common-mistakes.md](10-common-mistakes.md) | Quick reference, anti-patterns |

## Quick reference: Hooks

| Hook | Use when |
|------|----------|
| `useState` | Local simple state |
| `useReducer` | Complex state with multiple actions |
| `useContext` | Share data without prop drilling |
| `useMemo` | Expensive calculations (filters, sorts) |
| `useCallback` | Functions passed to memoized components |
| `useRef` | DOM refs, mutable values without re-render |
| `useEffect` | Side effects (fetch, subscriptions) |
| `useLayoutEffect` | DOM measurements before paint |
| `startTransition` | Non-urgent updates (scroll, heavy input) |

## Quick reference: Golden rules

1. **Small components** - Split if > 200 lines
2. **Single abstraction level** - Don't mix business logic with UI
3. **Explicit props** - Avoid spread `{...props}` except in wrappers
4. **Stable keys** - Never use index as key if order changes
5. **No useEffect for derived state** - Use `useMemo` or compute during render
6. **Colocate state** - Keep state close to where it's used
7. **Functional setState** - Always use `setState(curr => ...)` when depending on previous state
8. **Immutability** - Use `toSorted()`, `toReversed()`, spread operator

## Quick reference: Project structure

```
src/
├── app/                    # Entry point, router, providers
│   ├── App.tsx
│   ├── providers.tsx
│   └── router.tsx
├── features/               # Feature modules (self-contained)
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   └── index.ts
│   └── users/
├── shared/                 # Shared code across features
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── types/
├── lib/                    # External library configuration
│   ├── axios.ts
│   └── queryClient.ts
└── index.css               # Global styles (Tailwind)
```
