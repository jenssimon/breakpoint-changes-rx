import { Observable, merge } from 'rxjs'

import type { BreakpointDefinition, BreakpointDefinitions } from './types.js'

const mediaQueryFromBreakpoint = ({ min, max }: BreakpointDefinition) => [['min', min], ['max', max]]
  // filter empty
  .filter(([, value]) => value)

  .map(([string_, value]) => `(${string_}-width: ${
    typeof value === 'string'
      ? value
      : `${String(value)}px`
  })`)

  .join(' and ')

const fromBreakpointDefinitions = <K>(
  breakpointDefinitions: BreakpointDefinitions,
  initialBreakpoints?: K[],
) => merge(
    ...Object.entries(breakpointDefinitions)
      .map(([
        name,
        breakpoint,
      ]): Observable<{
      name: K
      matches: boolean
    }> => {
        const mediaQueryList = matchMedia(
          mediaQueryFromBreakpoint(breakpoint),
        )

        const nameTyped = name as K

        // set the current breakpoints
        if (initialBreakpoints && mediaQueryList.matches) initialBreakpoints.push(nameTyped)

        return new Observable((subscriber) => {
          mediaQueryList.addEventListener('change', ({
            matches,
          }) => {
            subscriber.next({
              name: nameTyped,
              matches,
            })
          })
        })
      }),
  )

export default fromBreakpointDefinitions
