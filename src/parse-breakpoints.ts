import type {
  BreakpointDefinitions,
  BreakpointParseConfig,
} from './types.js'

const defaultParseConfig: BreakpointParseConfig = {
  regex: /^breakpoint-(\w*)-((max)|(min))$/,
  groupName: 1,
  groupMinMax: 2,
  isMin: (value) => value === 'min',
}

const parseBreakpoints = (
  object: Record<string, unknown>,
  config?: Partial<BreakpointParseConfig>,
): BreakpointDefinitions => {
  const parseConfig: BreakpointParseConfig = {
    ...defaultParseConfig,
    ...config,
  }
  return Object.entries(object)
    // eslint-disable-next-line unicorn/no-array-reduce
    .reduce<BreakpointDefinitions>(
      (
        object_,
        [key, value],
      ) => {
        const breakpointMatch = new RegExp(parseConfig.regex as RegExp).exec(key)
        if (breakpointMatch && typeof value === 'string') {
          const name = breakpointMatch[parseConfig.groupName as number]

          let breakpoint = object_[name]
          if (!breakpoint) {
            breakpoint = {}
            object_[name] = breakpoint
          }

          breakpoint[
            parseConfig.isMin(breakpointMatch[parseConfig.groupMinMax as number])
              ? 'min'
              : 'max'
          ] = value as string
        }

        return object_
      },
      {},
    )
}

export default parseBreakpoints
