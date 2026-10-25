import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Call, Turn } from '../types'

// Neon Grid tokens
const BLACK = '#0e0e0e'
const RAISED = '#141414'
const HIGH = '#242424'
const YELLOW = '#fcee0a'
const YELLOW_DIM = '#9c9503'
const CYAN = '#00f0ff'
const WHITE = '#ffffff'
const MUTED = '#cbcbcb'
const SUBTLE = '#808080'
const MAGENTA = '#c362c0'

const PANE = 'neon-grid'
const STRIPES = '▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚'

const calls = atom({ plugin: 'neon-grid', key: 'calls' } as const, [], { shape: 'calls-1' })
const last = atom({ plugin: 'neon-grid', key: 'last' } as const, null)
const turns = atom({ plugin: 'neon-grid', key: 'turns' } as const, 0)
const toolsTotal = atom({ plugin: 'neon-grid', key: 'toolsTotal' } as const, 0)
const isBandHidden = atom({ plugin: 'neon-grid', key: 'isBandHidden' } as const, false)

export const register: Register = on => {
  let startedAt = 0
  let tools = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'neon', description: 'Abre el panel Neon Grid y muestra la franja' })
    void $.ui.open({ id: PANE, title: 'NEON // GRID' })

    return next(e)
  })

  on('command.run', { command: 'neon' }, async $ => {
    await update($, isBandHidden, () => false)
    await $.ui.open({ id: PANE, title: 'NEON // GRID' })

    return { text: '// PANEL NEON GRID ABIERTO_' }
  })

  on('prompt.submit', async ($, e, next) => {
    startedAt = await $.clock.now().catch(() => 0)
    tools = 0

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    tools += 1
    const call: Call = { id: e.tool_use_id, tool: e.tool, isDone: false }
    await update($, calls, list => [...list, call].slice(-100)).catch(() => {})
    await update($, toolsTotal, n => n + 1).catch(() => {})
    try {
      return await next(e)
    } finally {
      await update($, calls, list => list.map(one => (one.id === call.id ? { ...one, isDone: true } : one))).catch(() => {})
    }
  })

  on('turn.complete', async ($, e, next) => {
    // No real start or end time means no duration, not a huge one
    const now = await $.clock.now().catch(() => 0)
    const seconds = startedAt && now ? Math.max(0, Math.round((now - startedAt) / 1000)) : null
    const turn: Turn = { seconds, tools }
    await update($, last, () => turn)
    await update($, turns, n => n + 1)

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, calls)
    const turn = await read($, last)
    const count = await read($, turns)
    const total = await read($, toolsTotal)
    const running = list.filter(c => !c.isDone)
    const room = Math.max(3, (e.viewport?.rows ?? 30) - 16)
    const width = Math.max(10, (e.viewport?.columns ?? 40) - 2)

    return (
      <Box flexDirection="column" backgroundColor={BLACK} padding="sm" gap="sm">
        <Box backgroundColor={YELLOW} paddingX="sm">
          <Text color={BLACK} weight="bold" size="heading">// NEON GRID_</Text>
        </Box>
        <Text color={YELLOW} mono>{STRIPES.slice(0, width)}</Text>

        <Box flexDirection="column" backgroundColor={RAISED} padding="sm" borderStyle="single" borderColor={running.length ? CYAN : HIGH}>
          <Text color={SUBTLE} size="caption" weight="bold">ESTADO</Text>
          {running.length > 0 ? (
            <Text color={CYAN} weight="bold">{'> EJECUTANDO '}{(running[running.length - 1]?.tool ?? "").toUpperCase()}</Text>
          ) : (
            <Text color={WHITE} weight="bold">{'> EN ESPERA_'}</Text>
          )}
        </Box>

        <Box flexDirection="row" gap="sm">
          <Box flexDirection="column" flexGrow={1} backgroundColor={HIGH} padding="sm">
            <Text color={SUBTLE} size="caption" weight="bold">TURNOS</Text>
            <Text color={YELLOW} size="title" weight="bold" tabular>{String(count)}</Text>
          </Box>
          <Box flexDirection="column" flexGrow={1} backgroundColor={HIGH} padding="sm">
            <Text color={SUBTLE} size="caption" weight="bold">HERRAMIENTAS</Text>
            <Text color={CYAN} size="title" weight="bold" tabular>{String(total)}</Text>
          </Box>
          <Box flexDirection="column" flexGrow={1} backgroundColor={HIGH} padding="sm">
            <Text color={SUBTLE} size="caption" weight="bold">ÚLTIMO</Text>
            <Text color={WHITE} size="title" weight="bold" tabular>{turn?.seconds != null ? `${turn.seconds}s` : '--'}</Text>
          </Box>
        </Box>

        <Box flexDirection="column" gap="xs">
          <Text color={MAGENTA} size="caption" weight="bold">REGISTRO</Text>
          {list.length === 0 && <Text color={MUTED}>Sin actividad todavía.</Text>}
          {list.slice(-room).reverse().map(call => (
            <Box key={call.id} flexDirection="row" gap="sm">
              <Text color={call.isDone ? YELLOW_DIM : CYAN} mono>{call.isDone ? '[OK]' : '[>>]'}</Text>
              <Text color={call.isDone ? MUTED : WHITE} mono>{call.tool}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isBandHidden))) {
      return next(e)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const turn = await read($, last)
    const running = (await read($, calls)).filter(c => !c.isDone)

    return (
      <Box flexDirection="row" alignItems="center" gap="sm" backgroundColor={BLACK} paddingX="sm" borderStyle="single" borderColor={YELLOW}>
        <Text color={YELLOW} weight="bold" mono>// CONEXIÓN ESTABLECIDA_</Text>
        {running.length > 0 && <Text color={CYAN} mono>{'▸ '}{running[running.length - 1]?.tool}</Text>}
        {turn && <Text color={MUTED} mono>{'▸ '}{turn.seconds != null ? `${turn.seconds}s · ` : ''}{turn.tools} herr.</Text>}
        <Box flexGrow={1} />
        <Button key="neon-open" label="PANEL" onPress={() => $.ui.open({ id: PANE, title: 'NEON // GRID' })} />
        <Button key="neon-hide" label="OCULTAR" onPress={() => update($, isBandHidden, () => true)} />
      </Box>
    )
  })
}
