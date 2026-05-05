import type { Rule } from 'eslint'
import type { CallExpression, ArrayExpression, Node } from 'estree'

const hookNames = ['useMemo', 'useCallback', 'useEffect', 'useLayoutEffect', 'useImperativeHandle']

function isHookCall(node: CallExpression): boolean {
  if (node.callee.type === 'Identifier') {
    return hookNames.includes(node.callee.name)
  }

  return false
}

function isMultiline(node: Node): boolean {
  return node.loc!.start.line !== node.loc!.end.line
}

function getIndent(sourceCode: Rule.RuleContext['sourceCode'], node: Node): string {
  const line = sourceCode.lines[node.loc!.start.line - 1]

  return line.match(/^\s*/)?.[0] ?? ''
}

// Collect identifiers declared as functions (via initializer or TS type annotation) in the program AST
function getDeclaredFunctionIdentifiers(programNode: Node, depNames: Set<string>): Set<string> {
  const functions = new Set<string>()
  // First pass: collect type alias names that resolve to function types (TSFunctionType)
  const functionTypeAliases = new Set<string>()

  function isNodeFunctionType(n: unknown): boolean {
    if (!n || typeof n !== 'object') return false
    const obj = n as Record<string, unknown>
    return obj.type === 'TSFunctionType'
  }

  function traverse(n: unknown): void {
    if (!n || typeof n !== 'object') return
    const obj = n as Record<string, unknown>

    // type Foo = () => void  →  TSTypeAliasDeclaration
    if (obj.type === 'TSTypeAliasDeclaration') {
      const id = obj.id as Record<string, unknown>
      if (id && id.type === 'Identifier' && isNodeFunctionType(obj.typeAnnotation)) {
        functionTypeAliases.add(id.name as string)
      }
    }

    for (const key of Object.keys(obj)) {
      if (key === 'parent') continue
      const val = obj[key]
      if (Array.isArray(val)) {
        val.forEach(item => { if (item && typeof item === 'object' && 'type' in item) traverse(item) })
      }
      else if (val && typeof val === 'object' && 'type' in val) {
        traverse(val)
      }
    }
  }

  traverse(programNode)

  // Second pass: collect variables/functions that are identifiably functions
  function traverseForFunctions(n: unknown): void {
    if (!n || typeof n !== 'object') return
    const obj = n as Record<string, unknown>

    // function foo() {}
    if (obj.type === 'FunctionDeclaration') {
      const id = obj.id as Record<string, unknown> | null
      if (id && id.type === 'Identifier' && depNames.has(id.name as string)) {
        functions.add(id.name as string)
      }
    }

    // const foo = () => {} | const foo = function() {} | const foo: () => void | const foo: FnAlias
    if (obj.type === 'VariableDeclarator') {
      const id = obj.id as Record<string, unknown>
      const init = obj.init as Record<string, unknown> | null

      if (id && id.type === 'Identifier' && depNames.has(id.name as string)) {
        if (init && (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')) {
          functions.add(id.name as string)
        }
        else {
          // Check TypeScript type annotation
          const typeAnnotation = id.typeAnnotation as Record<string, unknown> | null
          if (typeAnnotation) {
            const inner = typeAnnotation.typeAnnotation as Record<string, unknown>
            if (inner) {
              if (inner.type === 'TSFunctionType') {
                functions.add(id.name as string)
              }
              else if (inner.type === 'TSTypeReference') {
                const typeName = inner.typeName as Record<string, unknown>
                if (typeName && typeName.type === 'Identifier' && functionTypeAliases.has(typeName.name as string)) {
                  functions.add(id.name as string)
                }
              }
            }
          }
        }
      }
    }

    for (const key of Object.keys(obj)) {
      if (key === 'parent') continue
      const val = obj[key]
      if (Array.isArray(val)) {
        val.forEach(item => { if (item && typeof item === 'object' && 'type' in item) traverseForFunctions(item) })
      }
      else if (val && typeof val === 'object' && 'type' in val) {
        traverseForFunctions(val)
      }
    }
  }

  traverseForFunctions(programNode)
  return functions
}

// Collect all identifiers used as direct callees in CallExpressions within the given node
function getCalledIdentifiers(node: Node): Set<string> {
  const called = new Set<string>()

  function traverse(n: unknown): void {
    if (!n || typeof n !== 'object') return
    const obj = n as Record<string, unknown>

    if (obj.type === 'CallExpression') {
      const callee = obj.callee as Record<string, unknown>
      if (callee && callee.type === 'Identifier') {
        called.add(callee.name as string)
      }
    }

    for (const key of Object.keys(obj)) {
      if (key === 'parent') continue
      const val = obj[key]
      if (Array.isArray(val)) {
        val.forEach(item => { if (item && typeof item === 'object' && 'type' in item) traverse(item) })
      }
      else if (val && typeof val === 'object' && 'type' in val) {
        traverse(val)
      }
    }
  }

  traverse(node)
  return called
}

export const formatDependenciesArray: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Format dependencies array in React hooks to be more readable and maintainable',
      recommended: true,
      url: 'https://github.com/dherault/eslint-plugin-format-react-hook-dependencies',
    },
    fixable: 'code',
    schema: [
      {
        type: 'array',
        items: {
          type: 'string',
        },
        uniqueItems: true,
      },
    ],
    messages: {
      formatDependenciesArray: 'React dependencies array should be formatted consistently.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode

    return {
      CallExpression(node: CallExpression) {
        if (!isHookCall(node)) return

        // The dependencies array is the last argument
        const lastArg = node.arguments[node.arguments.length - 1]
        if (!lastArg || lastArg.type !== 'ArrayExpression') return

        const depsArray = lastArg as ArrayExpression
        const deps = depsArray.elements

        // Get the text of each dependency
        const depTexts = deps.map(dep => dep ? sourceCode.getText(dep as Node) : '')

        // Determine which deps are called as functions in the callback body
        const callbackArg = node.arguments[0]
        const calledFunctions = callbackArg ? getCalledIdentifiers(callbackArg as Node) : new Set<string>()

        // Determine which deps are declared as functions in the program scope
        const depNamesSet = new Set(depTexts)
        const declaredFunctions = getDeclaredFunctionIdentifiers(sourceCode.ast as unknown as Node, depNamesSet)

        // Sort: non-functions first (alphabetically), then functions (alphabetically)
        const sortedDepTexts = [...depTexts].sort((a, b) => {
          const aIsFunc = calledFunctions.has(a) || declaredFunctions.has(a)
          const bIsFunc = calledFunctions.has(b) || declaredFunctions.has(b)
          if (aIsFunc !== bIsFunc) return aIsFunc ? 1 : -1
          return a.localeCompare(b)
        })

        // Determine if the hook call (excluding deps array) is multiline
        // We check if the callback argument (first arg) is multiline
        const hookIsMultiline = callbackArg ? isMultiline(callbackArg as Node) : false

        // Check if deps are already sorted
        const isSorted = depTexts.every((text, i) => text === sortedDepTexts[i])

        // Check if the array is already multiline
        const arrayIsMultiline = isMultiline(depsArray)

        // Determine if deps should be multiline
        const shouldBeMultiline = hookIsMultiline && deps.length > 0

        // No issues if already sorted and formatting is correct
        if (isSorted && (shouldBeMultiline === arrayIsMultiline || deps.length === 0)) return

        const baseIndent = getIndent(sourceCode, depsArray)

        context.report({
          node: depsArray,
          messageId: 'formatDependenciesArray',
          fix(fixer) {
            let fixedText: string

            if (shouldBeMultiline) {
              const elementIndent = baseIndent + '  '
              const elements = sortedDepTexts.map(text => `${elementIndent}${text},`).join('\n')
              fixedText = `[\n${elements}\n${baseIndent}]`
            }
            else {
              fixedText = `[${sortedDepTexts.join(', ')}]`
            }

            return fixer.replaceText(depsArray, fixedText)
          },
        })
      },
    }
  },
}
