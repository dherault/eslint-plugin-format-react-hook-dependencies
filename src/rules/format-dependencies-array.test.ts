import { RuleTester } from 'eslint'
import * as parser from '@typescript-eslint/parser'

import { formatDependenciesArray } from './format-dependencies-array'

const ruleTester = new RuleTester({
  languageOptions: {
    parser
  },
})

describe('format-dependencies-array', () => {
  ruleTester.run(`Enforce consistent usage of TypeScript type keyword in imports`, formatDependenciesArray, {
    valid: [
      // --- useMemo ---
      {
        code: `const memo = useMemo(() => computeExpensiveValue(), [])`,
      },
      {
        code: `const memo = useMemo(() => computeExpensiveValue(a), [a])`,
      },
      {
        code: `const memo = useMemo(() => computeExpensiveValue(a, b), [a, b])`,
      },
      {
        code: `const memo = useMemo(() => computeExpensiveValue(a, b), [a, b, c])`,
      },
      {
        code: `
        const memo = useMemo(() => {
          return computeExpensiveValue()
        }, [])
        `,
      },
      {
        code: `
        const memo = useMemo(() => {
          return computeExpensiveValue(a)
        }, [
          a,
        ])
        `,
      },
      {
        code: `
        const memo = useMemo(() => {
          return computeExpensiveValue(a, b)
        }, [
          a,
          b,
        ])
        `,
      },
      {
        code: `
        const memo = useMemo(() => {
          return computeExpensiveValue(a, b, c)
        }, [
          a,
          b,
          c,
        ])
        `,
      },
      // --- useCallback ---
      {
        code: `const callback = useCallback(() => 0, [])`,
      },
      {
        code: `const callback = useCallback(() => a, [a])`,
      },
      {
        code: `const callback = useCallback(() => a + b, [a, b])`,
      },
      {
        code: `const callback = useCallback(() => a + b + c, [a, b, c])`,
      },
      {
        code: `
        const callback = useCallback(() => {
          return 0
        }, [])
        `,
      },
      {
        code: `
        const callback = useCallback(() => {
          return a
        }, [
          a,
        ])
        `,
      },
      {
        code: `
        const callback = useCallback(() => {
          return a + b
        }, [
          a,
          b,
        ])
        `,
      },
      {
        code: `
        const callback = useCallback(() => {
          return a + b + c
        }, [
          a,
          b,
          c,
        ])
        `,
      },
      // --- useEffect ---
      {
        code: `useEffect(() => {}, [])`,
      },
      // Single function dep
      {
        code: `useEffect(() => fetch(), [fetch])`,
      },
      // Non-functions first (alphabetically), then functions (alphabetically)
      // url is a non-function, fetch is a function (called in the body)
      {
        code: `useEffect(() => fetch(url), [url, fetch])`,
      },
      {
        code: `useEffect(() => fetch(method, url), [method, url, fetch])`,
      },
      {
        code: `
        useEffect(() => {
          fetch()
        }, [])
        `,
      },
      {
        code: `
        useEffect(() => {
          fetch()
        }, [
          fetch,
        ])
        `,
      },
      // url non-func first, fetch func last
      {
        code: `
        useEffect(() => {
          fetch(url)
        }, [
          url,
          fetch,
        ])
        `,
      },
      // method, url non-funcs first (alphabetical), fetch func last
      {
        code: `
        useEffect(() => {
          fetch(method, url)
        }, [
          method,
          url,
          fetch,
        ])
        `,
      },
      // Custom function type (type alias ref, ArrowFunctionExpression init)
      {
        code: `
        type Method = () => void
        const method: Method = () => {}
        useEffect(() => {
          fetch(method, url)
        }, [
          url,
          fetch,
          method,
        ])
        `,
      },
      // function declaration as dependency (not called in callback)
      {
        code: `
        function handleSubmit() {}
        useEffect(() => {
          fetch(url)
        }, [
          url,
          fetch,
          handleSubmit,
        ])
        `,
      },
      // FunctionExpression init
      {
        code: `
        const handleSubmit = function() {}
        useEffect(() => {
          fetch(url)
        }, [
          url,
          fetch,
          handleSubmit,
        ])
        `,
      },
      // TSFunctionType annotation without initializer
      {
        code: `
        let handler: () => void
        useEffect(() => {
          fetch(url)
        }, [
          url,
          fetch,
          handler,
        ])
        `,
      },
      // TSFunctionType with parameters, no initializer
      {
        code: `
        let onClick: (event: MouseEvent) => void
        useEffect(() => {
          fetch(url)
        }, [
          url,
          fetch,
          onClick,
        ])
        `,
      },
      // TSTypeReference to function type alias, no initializer
      {
        code: `
        type EventHandler = (event: Event) => void
        let onClick: EventHandler
        useEffect(() => {
          fetch(url)
        }, [
          url,
          fetch,
          onClick,
        ])
        `,
      },
      // Multiple typed functions — alphabetical within function group
      {
        code: `
        type Method = () => void
        const method: Method = () => {}
        function handleSubmit() {}
        useEffect(() => {
          fetch(url)
        }, [
          url,
          fetch,
          handleSubmit,
          method,
        ])
        `,
      },
    ],
    invalid: [
      // --- Unsorted deps, single-line hook ---
      // useMemo, 2 deps unsorted
      {
        code: `const memo = useMemo(() => computeExpensiveValue(b, a), [b, a])`,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `const memo = useMemo(() => computeExpensiveValue(b, a), [a, b])`,
      },
      // useMemo, 3 deps unsorted
      {
        code: `const memo = useMemo(() => computeExpensiveValue(c, a, b), [c, a, b])`,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `const memo = useMemo(() => computeExpensiveValue(c, a, b), [a, b, c])`,
      },
      // useCallback, 2 deps unsorted
      {
        code: `const callback = useCallback(() => b + a, [b, a])`,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `const callback = useCallback(() => b + a, [a, b])`,
      },
      // useCallback, 3 deps unsorted
      {
        code: `const callback = useCallback(() => c + a + b, [c, a, b])`,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `const callback = useCallback(() => c + a + b, [a, b, c])`,
      },
      // useEffect: function dep (fetch) must come after non-function deps
      // fetch is a function (called in body), url is not → correct order: [url, fetch]
      {
        code: `useEffect(() => fetch(url), [fetch, url])`,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `useEffect(() => fetch(url), [url, fetch])`,
      },
      // fetch is function, method & url are not → correct order: [method, url, fetch]
      {
        code: `useEffect(() => fetch(method, url), [fetch, method, url])`,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `useEffect(() => fetch(method, url), [method, url, fetch])`,
      },
      // wrong order for both grouping and alphabetical sort
      {
        code: `useEffect(() => fetch(method, url), [url, fetch, method])`,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `useEffect(() => fetch(method, url), [method, url, fetch])`,
      },
      // --- Multiline hook with single-line non-empty deps (should be multiline) ---
      // useMemo, 1 dep
      {
        code: `
        const memo = useMemo(() => {
          return computeExpensiveValue(a)
        }, [a])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        const memo = useMemo(() => {
          return computeExpensiveValue(a)
        }, [
          a,
        ])
        `,
      },
      // useMemo, 2 deps
      {
        code: `
        const memo = useMemo(() => {
          return computeExpensiveValue(a, b)
        }, [a, b])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        const memo = useMemo(() => {
          return computeExpensiveValue(a, b)
        }, [
          a,
          b,
        ])
        `,
      },
      // useMemo, 3 deps
      {
        code: `
        const memo = useMemo(() => {
          return computeExpensiveValue(a, b, c)
        }, [a, b, c])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        const memo = useMemo(() => {
          return computeExpensiveValue(a, b, c)
        }, [
          a,
          b,
          c,
        ])
        `,
      },
      // useCallback, 1 dep
      {
        code: `
        const callback = useCallback(() => {
          return a
        }, [a])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        const callback = useCallback(() => {
          return a
        }, [
          a,
        ])
        `,
      },
      // useCallback, 2 deps
      {
        code: `
        const callback = useCallback(() => {
          return a + b
        }, [a, b])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        const callback = useCallback(() => {
          return a + b
        }, [
          a,
          b,
        ])
        `,
      },
      // useCallback, 3 deps
      {
        code: `
        const callback = useCallback(() => {
          return a + b + c
        }, [a, b, c])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        const callback = useCallback(() => {
          return a + b + c
        }, [
          a,
          b,
          c,
        ])
        `,
      },
      // useEffect, 1 dep (should be multiline)
      {
        code: `
        useEffect(() => {
          fetch()
        }, [fetch])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        useEffect(() => {
          fetch()
        }, [
          fetch,
        ])
        `,
      },
      // useEffect, 2 deps: should be multiline AND reordered (url non-func first, fetch func last)
      {
        code: `
        useEffect(() => {
          fetch(url)
        }, [fetch, url])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        useEffect(() => {
          fetch(url)
        }, [
          url,
          fetch,
        ])
        `,
      },
      // useEffect, 2 deps: correct order but should be multiline
      {
        code: `
        useEffect(() => {
          fetch(url)
        }, [url, fetch])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        useEffect(() => {
          fetch(url)
        }, [
          url,
          fetch,
        ])
        `,
      },
      // useEffect, 3 deps: should be multiline AND reordered
      {
        code: `
        useEffect(() => {
          fetch(method, url)
        }, [fetch, method, url])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        useEffect(() => {
          fetch(method, url)
        }, [
          method,
          url,
          fetch,
        ])
        `,
      },
      // useEffect, 3 deps: correct order but should be multiline
      {
        code: `
        useEffect(() => {
          fetch(method, url)
        }, [method, url, fetch])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        useEffect(() => {
          fetch(method, url)
        }, [
          method,
          url,
          fetch,
        ])
        `,
      },
      // --- Multiline hook with single-line unsorted deps (both fixes needed) ---
      // useMemo, 2 deps unsorted
      {
        code: `
        const memo = useMemo(() => {
          return computeExpensiveValue(b, a)
        }, [b, a])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        const memo = useMemo(() => {
          return computeExpensiveValue(b, a)
        }, [
          a,
          b,
        ])
        `,
      },
      // useMemo, 3 deps unsorted
      {
        code: `
        const memo = useMemo(() => {
          return computeExpensiveValue(c, a, b)
        }, [c, a, b])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        const memo = useMemo(() => {
          return computeExpensiveValue(c, a, b)
        }, [
          a,
          b,
          c,
        ])
        `,
      },
      // useCallback, 2 deps unsorted
      {
        code: `
        const callback = useCallback(() => {
          return b + a
        }, [b, a])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        const callback = useCallback(() => {
          return b + a
        }, [
          a,
          b,
        ])
        `,
      },
      // useCallback, 3 deps unsorted
      {
        code: `
        const callback = useCallback(() => {
          return c + a + b
        }, [c, a, b])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        const callback = useCallback(() => {
          return c + a + b
        }, [
          a,
          b,
          c,
        ])
        `,
      },
      // useEffect, 3 deps: multiline hook, single-line deps, wrong order
      {
        code: `
        useEffect(() => {
          fetch(method, url)
        }, [url, fetch, method])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        useEffect(() => {
          fetch(method, url)
        }, [
          method,
          url,
          fetch,
        ])
        `,
      },
      // --- Multiline hook with multiline but unsorted deps ---
      // useMemo, 2 deps
      {
        code: `
        const memo = useMemo(() => {
          return computeExpensiveValue(b, a)
        }, [
          b,
          a,
        ])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        const memo = useMemo(() => {
          return computeExpensiveValue(b, a)
        }, [
          a,
          b,
        ])
        `,
      },
      // useMemo, 3 deps
      {
        code: `
        const memo = useMemo(() => {
          return computeExpensiveValue(c, a, b)
        }, [
          c,
          a,
          b,
        ])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        const memo = useMemo(() => {
          return computeExpensiveValue(c, a, b)
        }, [
          a,
          b,
          c,
        ])
        `,
      },
      // useCallback, 2 deps
      {
        code: `
        const callback = useCallback(() => {
          return b + a
        }, [
          b,
          a,
        ])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        const callback = useCallback(() => {
          return b + a
        }, [
          a,
          b,
        ])
        `,
      },
      // useCallback, 3 deps
      {
        code: `
        const callback = useCallback(() => {
          return c + a + b
        }, [
          c,
          a,
          b,
        ])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        const callback = useCallback(() => {
          return c + a + b
        }, [
          a,
          b,
          c,
        ])
        `,
      },
      // useEffect, 2 deps: multiline, wrong order (fetch func should be after url non-func)
      {
        code: `
        useEffect(() => {
          fetch(url)
        }, [
          fetch,
          url,
        ])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        useEffect(() => {
          fetch(url)
        }, [
          url,
          fetch,
        ])
        `,
      },
      // useEffect, 3 deps: multiline, wrong order (method, url non-funcs first, fetch func last)
      {
        code: `
        useEffect(() => {
          fetch(method, url)
        }, [
          fetch,
          method,
          url,
        ])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        useEffect(() => {
          fetch(method, url)
        }, [
          method,
          url,
          fetch,
        ])
        `,
      },
      {
        code: `
        useEffect(() => {
          fetch(method, url)
        }, [
          url,
          fetch,
          method,
        ])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        useEffect(() => {
          fetch(method, url)
        }, [
          method,
          url,
          fetch,
        ])
        `,
      },
      // Custom function type (type alias ref, ArrowFunctionExpression init)
      {
        code: `
        type Method = () => void
        const method: Method = () => {}
        useEffect(() => {
          fetch(method, url)
        }, [
          url,
          method,
          fetch,
        ])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        type Method = () => void
        const method: Method = () => {}
        useEffect(() => {
          fetch(method, url)
        }, [
          url,
          fetch,
          method,
        ])
        `,
      },
      // function declaration in wrong position
      {
        code: `
        function handleSubmit() {}
        useEffect(() => {
          fetch(url)
        }, [
          url,
          handleSubmit,
          fetch,
        ])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        function handleSubmit() {}
        useEffect(() => {
          fetch(url)
        }, [
          url,
          fetch,
          handleSubmit,
        ])
        `,
      },
      // FunctionExpression init in wrong position
      {
        code: `
        const handleSubmit = function() {}
        useEffect(() => {
          fetch(url)
        }, [
          url,
          handleSubmit,
          fetch,
        ])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        const handleSubmit = function() {}
        useEffect(() => {
          fetch(url)
        }, [
          url,
          fetch,
          handleSubmit,
        ])
        `,
      },
      // TSFunctionType annotation (no initializer) in wrong position
      {
        code: `
        let handler: () => void
        useEffect(() => {
          fetch(url)
        }, [
          url,
          handler,
          fetch,
        ])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        let handler: () => void
        useEffect(() => {
          fetch(url)
        }, [
          url,
          fetch,
          handler,
        ])
        `,
      },
      // TSFunctionType with parameters (no initializer) in wrong position
      {
        code: `
        let onClick: (event: MouseEvent) => void
        useEffect(() => {
          fetch(url)
        }, [
          url,
          onClick,
          fetch,
        ])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        let onClick: (event: MouseEvent) => void
        useEffect(() => {
          fetch(url)
        }, [
          url,
          fetch,
          onClick,
        ])
        `,
      },
      // TSTypeReference to function type alias (no initializer) in wrong position
      {
        code: `
        type EventHandler = (event: Event) => void
        let onClick: EventHandler
        useEffect(() => {
          fetch(url)
        }, [
          url,
          onClick,
          fetch,
        ])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        type EventHandler = (event: Event) => void
        let onClick: EventHandler
        useEffect(() => {
          fetch(url)
        }, [
          url,
          fetch,
          onClick,
        ])
        `,
      },
      // Multiple typed functions in wrong alphabetical order within function group
      {
        code: `
        type Method = () => void
        const method: Method = () => {}
        function handleSubmit() {}
        useEffect(() => {
          fetch(url)
        }, [
          url,
          fetch,
          method,
          handleSubmit,
        ])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        type Method = () => void
        const method: Method = () => {}
        function handleSubmit() {}
        useEffect(() => {
          fetch(url)
        }, [
          url,
          fetch,
          handleSubmit,
          method,
        ])
        `,
      },
      // Empty deps array should be formatted as single line
      {
        code: `
        useEffect(() => {
          fetch(url)
        }, [
        ])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        useEffect(() => {
          fetch(url)
        }, [])
        `,
      },
      {
        code: `
        useEffect(() => {
          fetch(url)
        }, [

        ])
        `,
        errors: [{ messageId: 'formatDependenciesArray' }],
        output: `
        useEffect(() => {
          fetch(url)
        }, [])
        `,
      },
    ],
  })
})
