# Command execution

All commands must be run inside Nix for this repository.

If already running inside a Nix environment, run commands directly and do not start a nested `nix develop`.

Otherwise:

- Interactive shell pattern: `nix develop` (preferred)
- One-shot command pattern: `nix develop --command <cmd ...>` (adds delay for each invocation)

# Comm Project Development Guide

## Build & Test Commands

- Run tests: `yarn workspace [lib|web|keyserver|native] test`
- Test all packages: `yarn jest:all`
- Run lint: `yarn eslint:all`
- Fix lint issues: `yarn eslint:fix`
- Check Flow types: `yarn flow:all` or `yarn workspace [workspace] flow`
- Run dev server: `yarn workspace [workspace] dev`
- Clean install: `yarn cleaninstall`

## Code Style

### Types

- Use Flow for static typing with strict mode enabled
- Always include `// @flow` annotation at the top of JS files
- Export types with explicit naming: `export type MyType = {...}`

### Formatting

- Prettier with 80-char line limit
- Single quotes, trailing commas
- Arrow function parentheses avoided when possible
- React component files named \*.react.js

### Naming

- kebab-case for filenames (enforced by unicorn/filename-case)
- Descriptive variable names

### Imports

- Group imports with newlines between builtin/external and internal
- Alphabetize imports within groups
- No relative imports between workspaces - use workspace references

### React

- Use functional components with hooks
- Follow exhaustive deps rule for useEffect/useCallback
- Component props should use explicit Flow types

### Error Handling

- Use consistent returns in functions
- Handle all promise rejections
- Prefer async IIFEs with `try`/`catch`/`finally` over `.then()` / `.catch()` / `.finally()` chains

### Diff Review

- Before reporting back after code changes, review your diff and remove low-signal churn such as opinionated renames, unnecessary variable reshuffles, comment-only deletions, or other non-pertinent edits

## Git

- Match the existing repo commit message style by checking recent `git log` before committing when the pattern is not obvious
- Use the repo's bracketed scope format when applicable, such as `[terraform] Short imperative sentence case`
