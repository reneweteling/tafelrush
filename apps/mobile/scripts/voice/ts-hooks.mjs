// Lets Node import the app's TypeScript (lib/voice-lines.ts) as it is: Node strips
// the types itself, this only adds the ".ts" that the imports leave out.

import { registerHooks } from 'node:module'

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context)
    } catch (err) {
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return next(`${specifier}.ts`, context)
      throw err
    }
  },
})
