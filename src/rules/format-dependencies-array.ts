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
        const sortedDepTexts = [...depTexts].sort((a, b) => a.localeCompare(b))

        // Determine if the hook call (excluding deps array) is multiline
        // We check if the callback argument (first arg) is multiline
        const callbackArg = node.arguments[0]
        const hookIsMultiline = callbackArg ? isMultiline(callbackArg) : false

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
            } else {
              fixedText = `[${sortedDepTexts.join(', ')}]`
            }

            return fixer.replaceText(depsArray, fixedText)
          },
        })
      },
    }
  },
}
