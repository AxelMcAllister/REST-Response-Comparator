# Installing React 19 - Fix for Peer Dependency Warnings

## Issue
npm is installing React 18.3.1 instead of React 19.2.0 due to peer dependency conflicts.

## Solution

You have two options:

### Option 1: Clean Install (Recommended)
Delete the lock file and node_modules, then reinstall:

```bash
# Delete lock file and node_modules
rm package-lock.json
rm -r node_modules  # or on Windows: rmdir /s node_modules

# Reinstall with React 19
npm install
```

### Option 2: Force Install
If Option 1 doesn't work, use legacy peer deps:

```bash
npm install --legacy-peer-deps
```

This will install React 19 even if some packages have React 18 peer dependencies.

### Option 3: Override Peer Dependencies
Add to package.json to force React 19:

```json
"overrides": {
  "react": "^19.2.0",
  "react-dom": "^19.2.0"
}
```

## Verify Installation

After installing, verify React 19 is installed:

```bash
npm list react react-dom
```

Should show:
```
react@19.2.0
react-dom@19.2.0
```

## Why This Happens

Some packages (like `react-diff-viewer-continued`) may have peer dependencies that allow React 18, causing npm to resolve to React 18 instead of 19. Using `--legacy-peer-deps` tells npm to ignore these conflicts.

---

**Recommended**: Try Option 1 first (clean install), then Option 2 if needed.
