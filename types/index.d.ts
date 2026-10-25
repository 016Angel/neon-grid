export type Call = { id: string; tool: string; isDone: boolean }
export type Turn = { seconds: number; tools: number }

declare module 'claude-code' {
  interface PluginState {
    'neon-grid': {
      calls: Shaped<Call[]>
      last: Turn | null
      turns: number
      isBandHidden: boolean
    }
  }
}
