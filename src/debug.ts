/* istanbul ignore file */

import createDebug from 'debug'

const CONSOLE_STYLES = {
  reset: '\x1b[0m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  crimson: '\x1b[38m'
}

const DEBUG_NAMESPACES = {
  server: '185',
  board: '45',
  sound: '32',
  middleware: '41'
} as const

const LOG_COLORS = {
  log: CONSOLE_STYLES.white,
  warn: CONSOLE_STYLES.yellow,
  error: CONSOLE_STYLES.red
} as const

type DebugType = {
  [K in keyof typeof LOG_COLORS]: (...args: any[]) => void
}

function debugModule (namespace: keyof typeof DEBUG_NAMESPACES): DebugType {
  const debugModule = createDebug(`online-soundboard:${namespace}`)
  debugModule.color = DEBUG_NAMESPACES[namespace]
  return {
    log: (...args: any[]): void => debugModule(`${LOG_COLORS.log}${args.join(' ')}${CONSOLE_STYLES.reset}`),
    warn: (...args: any[]): void => debugModule(`${LOG_COLORS.warn}${args.join(' ')}${CONSOLE_STYLES.reset}`),
    error: (...args: any[]): void => debugModule(`${LOG_COLORS.error}${args.join(' ')}${CONSOLE_STYLES.reset}`)
  }
}

export default debugModule
