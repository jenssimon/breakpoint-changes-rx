import { BehaviorSubject } from 'rxjs'
import {
  filter, map, bufferTime, share,
} from 'rxjs/operators'


import fromBreakpointDefinitions from './from-breakpoint-definitions.js'
import breakpointHits from './breakpoint-hits.js'

import type * as types from './types.js'

export type BreakpointDefinition = types.BreakpointDefinition;
export type BreakpointDefinitions = types.BreakpointDefinitions;
export type BreakpointParseConfig = types.BreakpointParseConfig;


const breakpoints = <
  T extends BreakpointDefinitions,
  K extends keyof T,
>(breakpointDefinitions: T) => {
  const initialBreakpoints: K[] = []

  const breakpointsChanges$ = fromBreakpointDefinitions(
    breakpointDefinitions,
    initialBreakpoints,
  ).pipe(
    bufferTime(250), // collect and combine multiple matchMedia() matches at the same time

    breakpointHits<K>(initialBreakpoints), // convert it to the final breakpoint change object

    share(), // multicast
  )

  const breakpointsChangesBehavior$ = new BehaviorSubject({
    curr: initialBreakpoints,
    prev: [] as K[],
  })
  breakpointsChanges$.subscribe(breakpointsChangesBehavior$)

  const getCurrentBreakpoints = () => {
    let bps: K[] = []
    breakpointsChangesBehavior$.subscribe({
      next: ({ curr }) => {
        bps = curr
      },
    })
    return bps
  }

  const breakpointListContainsBreakpoint = (
    bpl: K[],
    bp: K,
  ) => bpl.includes(bp)

  const breakpointListContainsBreakpoints = (
    bpl: K[],
    bps: K[],
  ) => bps.some(
    (bp) => bpl.includes(bp),
  )

  const includesBreakpoints = (
    bps: K[],
  ) => breakpointListContainsBreakpoints(
    getCurrentBreakpoints(),
    bps,
  )

  return {
    breakpointsChanges$,
    breakpointsChangesBehavior$,


    /**
     * Returns the current breakpoint names.
     *
     * @returns the current breakpoint names
     */
    getCurrentBreakpoints,


    /**
     * Returns true if the current breakpoints contain breakpoints which are part of the given array.
     *
     * @param bps an array of breakpoint names
     */
    includesBreakpoints: (
      bps: K[],
    ) => breakpointListContainsBreakpoints(
      getCurrentBreakpoints(),
      bps,
    ),


    /**
     * Returns `true` if the given breakpoint is part of the current active breakpoints.
     *
     * @param bp the breakpoint
     * @returns `true` if the breakpoint is included in current breakpoints
     */
    includesBreakpoint: (
      bp: K,
    ) => includesBreakpoints([bp]),


    /**
     * Create an observable emitting values for entering or leaving a breakpoint.
     *
     * @param bp the breakpoint name
     *
     * @returns an Observerable containing entering/leaving the breakpoint
     */
    breakpointsChange: (
      bp: K,
    ) => breakpointsChanges$.pipe(
      filter(({
        curr,
        prev,
      }) => [curr, prev].some((b) => breakpointListContainsBreakpoint(b, bp))),

      filter(({
        curr,
        prev,
      }) => curr.includes(bp) !== prev.includes(bp)),

      map(({ curr }) => curr.includes(bp)),
    ),


    /**
     * Create an observable emitting values for entering or leaving a breakpoint range
     *
     * @param range  an array containing a range of breakpoints
     *
     * @returns an Oberservable containing entering/leaving the breakpoint range
     */
    breakpointsInRange(
      range: K[],
    ) {
      const isInRange = (bpl: K[]) => breakpointListContainsBreakpoints(bpl, range)
      return breakpointsChanges$.pipe(
        map(({
          curr,
          prev,
        }) => ({
          curr: isInRange(curr),
          prev: isInRange(prev),
        })),

        filter(({
          curr,
          prev,
        }) => curr !== prev),

        map(({
          curr,
        }) => curr),
      )
    },
  }
}


export default breakpoints
export { default as parseBreakpoints } from './parse-breakpoints.js'
