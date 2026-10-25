import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'neon-grid', component: 'Pane', requestId: 'neon-grid',
  props: { title: 'NEON // GRID', isFocused: false, bodyColumns: 40, placement: 'dock', scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

test('pane and band draw on every surface', async ($, on) => {
  on('command.register', () => ({ value: { command: 'neon' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  on('ui.render', ($, e) => { const { Text } = $.ui.resolve(e); return <Text>engine</Text> })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'Bash', command: 'ls' })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /NEON GRID/ }))?.text).toBe('// NEON GRID_')
    expect((await ui.find({ type: 'Text', text: /^Bash$/ }))?.text).toBe('Bash')
    await ui.unmount()
    const band = await $.ui.mount({ plugin: 'neon-grid', component: 'AbovePrompt', props: { hasSurvey: false }, surface } as any)
    expect((await band.find({ type: 'Text', text: /CONEXI/ }))?.text).toBe('// CONEXIÓN ESTABLECIDA_')
    await band.unmount()
  }
})
