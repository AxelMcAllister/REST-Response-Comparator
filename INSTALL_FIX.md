# Dependency Fix

## Issue
`react-diff-viewer` v3.1.1 only supports React 15/16, not React 18.

## Solution
Replaced with `react-diff-viewer-continued` v4.1.2, which is:
- ✅ Compatible with React 18
- ✅ Maintained fork of the original
- ✅ Same API as react-diff-viewer
- ✅ 558K+ weekly downloads

## Updated Package
Changed in `package.json`:
- ❌ `react-diff-viewer@^3.1.1`
- ✅ `react-diff-viewer-continued@^4.1.2`

## Installation
Run:
```bash
npm install
```

The package should install without conflicts now.

## Usage
Import remains the same:
```typescript
import ReactDiffViewer from 'react-diff-viewer-continued'
```

No code changes needed - it's a drop-in replacement!
