export interface BreakpointDefinition {
  min?: string | number
  max?: string | number
}


export type BreakpointDefinitions = Record<string, BreakpointDefinition>


export interface BreakpointParseConfig {
  regex?: RegExp
  groupName?: number
  groupMinMax?: number
  isMin: (value: string) => boolean
}
