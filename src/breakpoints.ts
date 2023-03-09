import {
  Observable, merge, BehaviorSubject,
} from 'rxjs';
import {
  scan, filter, map, bufferTime, share,
} from 'rxjs/operators';

export interface BreakpointDefinition {
  min?: string | number;
  max?: string | number;
}

export type BreakpointDefinitions = Record<string, BreakpointDefinition>;

export interface BreakpointParseConfig {
  regex?: RegExp;
  groupName?: number;
  groupMinMax?: number;
  isMin: (val: string) => boolean;
}

const nameMin = 'min';
const nameMax = 'max';

const defaultParseConfig: BreakpointParseConfig = {
  regex: /^breakpoint-(\w*)-((max)|(min))$/,
  groupName: 1,
  groupMinMax: 2,
  isMin: (val) => val === nameMin,
};

export const parseBreakpoints = (
  object: Record<string, unknown>,
  config?: Partial<BreakpointParseConfig>,
): BreakpointDefinitions => {
  const parseConfig: BreakpointParseConfig = {
    ...defaultParseConfig,
    ...config,
  };
  return Object.entries(object).reduce<BreakpointDefinitions>((obj, [key, value]) => {
    const breakpointMatch = key.match(parseConfig.regex as RegExp);
    if (breakpointMatch && typeof value === 'string') {
      const name = breakpointMatch[parseConfig.groupName as number];
      let breakpoint = obj[name];
      if (!breakpoint) {
        breakpoint = {};
        obj[name] = breakpoint;
      }
      breakpoint[
        parseConfig.isMin(breakpointMatch[parseConfig.groupMinMax as number])
          ? nameMin
          : nameMax
      ] = value as string;
    }
    return obj;
  }, {});
};

const breakpoints = <T extends BreakpointDefinitions, K extends keyof T>(breakpointDefinitions: T) => {
  const initialBreakpoints: K[] = [];
  const breakpointsChanges$ = merge(
    ...Object.entries(breakpointDefinitions)
      .map(([name, breakpoint]): Observable<{ name: K; matches: boolean }> => {
        const { min, max } = breakpoint;
        // matchMedia, build media query
        const mediaQueryList = matchMedia([['min', min], ['max', max]]
          .filter(([, val]) => val)

          .map(([str, val]) => `(${str}-width: ${
            typeof val === 'string'
              ? val
              : `${String(val)}px`
          })`)
          .join(' and '));

        // set the current breakpoints
        if (mediaQueryList.matches) {
          initialBreakpoints.push(name as K);
        }

        return new Observable((subscriber): void => {
          mediaQueryList.addEventListener('change', ({ matches }) => {
            subscriber.next({ name: name as K, matches });
          });
        });
      }),
  ).pipe(
    bufferTime(250), // collect and combine multiple matchMedia() matches at the same time
    filter(({ length }): boolean => !!length), // and filter empty

    // convert it to the final breakpoint change object
    scan(({ curr: prev }, actual) => {
      const curr = [...prev]; // add previous breakpoint but without the removed ones
      actual.forEach(({ matches, name }) => {
        if (!matches) {
          const idx = curr.indexOf(name);
          /* istanbul ignore else */
          if (idx !== -1) {
            curr.splice(idx, 1);
          }
        } else /* istanbul ignore else */ if (!curr.includes(name)) {
          curr.push(name);
        }
      });
      return { curr, prev };
    }, { curr: initialBreakpoints, prev: [] as K[] }), // initial value

    share(), // multicast
  );

  const breakpointsChangesBehavior$ = new BehaviorSubject({ curr: initialBreakpoints, prev: [] as K[] });
  breakpointsChanges$.subscribe(breakpointsChangesBehavior$);

  // TODO: check array.includes(getCurrentBreakpoints()[0]))
  const getCurrentBreakpoints = () => {
    let bps: K[] = [];
    breakpointsChangesBehavior$.subscribe({
      next: ({ curr }) => {
        bps = curr;
      },
    });
    return bps as K[];
  };

  const breakpointListContainsBreakpoint = (bpl: K[], bp: K) => bpl.includes(bp);
  const breakpointListContainsBreakpoints = (bpl: K[], bps: K[]) => bps.some(
    (bp) => bpl.includes(bp),
  );

  const includesBreakpoints = (bps: K[]) => breakpointListContainsBreakpoints(
    getCurrentBreakpoints(),
    bps,
  );

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
    includesBreakpoints: (bps: K[]) => breakpointListContainsBreakpoints(
      getCurrentBreakpoints(),
      bps,
    ),

    /**
     * Returns `true` if the given breakpoint is part of the current active breakpoints.
     *
     * @param bp the breakpoint
     * @returns `true` if the breakpoint is included in current breakpoints
     */
    includesBreakpoint: (bp: K) => includesBreakpoints([bp]),

    /**
     * Create an observable emitting values for entering or leaving a breakpoint.
     *
     * @param bp the breakpoint name
     *
     * @returns an Observerable containing entering/leaving the breakpoint
     */
    breakpointsChange: (bp: K) => breakpointsChanges$.pipe(
      filter(({ curr, prev }) => [curr, prev].some((b) => breakpointListContainsBreakpoint(b, bp))),
      filter(({ curr, prev }) => curr.includes(bp) !== prev.includes(bp)),
      map(({ curr }) => curr.includes(bp)),
    ),

    /**
     * Create an observable emitting values for entering or leaving a breakpoint range
     *
     * @param range  an array containing a range of breakpoints
     *
     * @returns an Oberservable containing entering/leaving the breakpoint range
     */
    breakpointsInRange(range: K[]) {
      const isInRange = (bpl: K[]) => breakpointListContainsBreakpoints(bpl, range);
      return breakpointsChanges$.pipe(
        map(({ curr, prev }) => ({ curr: isInRange(curr), prev: isInRange(prev) })),
        filter(({ curr, prev }) => curr !== prev),
        map(({ curr }) => curr),
      );
    },
  };
};

export default breakpoints;
