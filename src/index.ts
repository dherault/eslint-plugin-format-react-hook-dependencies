import { formatDependenciesArray } from './rules/format-dependencies-array'
import type {Config} from 'eslint/config'

type ConfigurationName = 'recommended'

const plugin = {
  meta: {
    name: 'eslint-plugin-format-react-hook-dependencies',
    version: '1.0.0',
  },
  rules: {
    'format-dependencies-array': formatDependenciesArray,
  },
  configs: {} as Record<ConfigurationName, Config>,
}

Object.assign(plugin.configs, {
  recommended: {
    plugins: {
      'format-react-hook-dependencies': plugin,
    },
    rules: {
      'format-react-hook-dependencies/format-dependencies-array': 'error',
    },
  },
})

export default plugin
