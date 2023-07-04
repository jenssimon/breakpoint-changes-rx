import type {
  BreakpointDefinitions,
  BreakpointParseConfig,
} from './types'

const defaultParseConfig: BreakpointParseConfig = {
  regex: /^breakpoint-(\w*)-((max)|(min))$/,
  groupName: 1,
  groupMinMax: 2,
  isMin: (val) => val === 'min',
}

export default (
  object: Record<string, unknown>,
  config?: Partial<BreakpointParseConfig>,
): BreakpointDefinitions => {
  const parseConfig: BreakpointParseConfig = {
    ...defaultParseConfig,
    ...config,
  }
  return Object.entries(object)
    .reduce<BreakpointDefinitions>(
    (
      obj,
      [key, value],
    ) => {
      const breakpointMatch = key.match(parseConfig.regex as RegExp)
      if (breakpointMatch && typeof value === 'string') {
        const name = breakpointMatch[parseConfig.groupName as number]

        let breakpoint = obj[name]
        if (!breakpoint) {
          breakpoint = {}
          obj[name] = breakpoint
        }

        breakpoint[
          parseConfig.isMin(breakpointMatch[parseConfig.groupMinMax as number])
            ? 'min'
            : 'max'
        ] = value as string
      }

      return obj
    },
    {},
  )
}
