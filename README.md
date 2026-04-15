# eslint-plugin-format-react-hook-dependencies

An ESLint plugin to format React hook dependencies properly.

## Installation

```bash
npm install --save-dev eslint-plugin-format-react-hook-dependencies
```

## Configuration

Add the plugin to your ESLint config (`eslint.config.js`):

```javascript
import formatReactHookDependencies from 'eslint-plugin-format-react-hook-dependencies'

export default [
  // ... other configs
  formatReactHookDependencies.configs.recommended,
]
```

## Rules

### `format-dependencies-array`

Enforces consistent formatting of dependency arrays in React hooks (`useMemo`, `useCallback`, `useEffect`, `useLayoutEffect`, `useImperativeHandle`).

- Dependencies must be sorted alphabetically
- If the hook call is multiline, the dependencies array must be multiline (except when empty)

**Bad:**

```javascript
// Unsorted dependencies
const memo = useMemo(() => compute(b, a), [b, a])

// Multiline hook with single-line dependencies
const memo = useMemo(() => {
  return compute(a, b)
}, [a, b])
```

**Good:**

```javascript
// Sorted dependencies
const memo = useMemo(() => compute(b, a), [a, b])

// Multiline hook with multiline dependencies
const memo = useMemo(() => {
  return compute(a, b)
}, [
  a,
  b,
])

// Multiline hook with empty dependencies is fine
useEffect(() => {
  init()
}, [])
```

## License

MIT
