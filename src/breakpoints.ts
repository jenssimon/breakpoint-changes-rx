import {
  Observable, merge, Subject, BehaviorSubject, ConnectableObservable, Observer,
} from 'rxjs';
import {
  scan, filter, map, multicast, bufferTime,
} from 'rxjs/operators';

export interface BreakpointDefinition {
  [key: string]: string | number | undefined;
  min?: string|number;
  max?: string|number;
}
export type BreakpointDefinitions = Record<string, BreakpointDefinition>

interface BreakpointMatch {
  name: string;
  matches: boolean;
}

export interface BreakpointState {
  curr: string[];
  prev: string[];
}

type BreakpointMinMaxDetector = (val: string) => boolean;

export interface BreakpointParseConfig {
  regex?: RegExp;
  groupName?: number;
  groupMinMax?: number;
  isMin?: BreakpointMinMaxDetector;
}

type IBreakpointChanges$ = ConnectableObservable<BreakpointState>;
type IGetCurrentBreakpoints = () => string[];
type IIncludesBreakpoints = (bps: string[]) => boolean;
type IIncludesBreakpoint = (bp: string) => boolean;
type IBreakpointsChange = (bp: string) => Observable<boolean>
type IBreakpointsInRange = (range: string[]) => Observable<boolean>;

interface BreakpointFncs {
  breakpointsChanges$: IBreakpointChanges$;
  breakpointsChangesBehavior$: BehaviorSubject<BreakpointState>;
  getCurrentBreakpoints: IGetCurrentBreakpoints;
  includesBreakpoints: IIncludesBreakpoints;
  includesBreakpoint: IIncludesBreakpoint;
  breakpointsChange: IBreakpointsChange;
  breakpointsInRange: IBreakpointsInRange;
}


const nameMin = 'min';
const nameMax = 'max';

const defaultParseConfig: BreakpointParseConfig = {
  regex: /^breakpoint-(\w*)-((max)|(min))$/,
  groupName: 1,
  groupMinMax: 2,
  isMin: (val) => val === nameMin,
};

export const parseBreakpoints = (object: object, config?: BreakpointParseConfig): BreakpointDefinitions => {
  const parseConfig: BreakpointParseConfig = {
    ...defaultParseConfig,
    ...config || {},
  };
  return Object.entries(object).reduce((obj, [key, value]) => {
    const breakpointMatch = key.match(parseConfig.regex as RegExp);
    if (breakpointMatch && typeof value === 'string') {
      const name = breakpointMatch[parseConfig.groupName as number];
      const minMax = (parseConfig.isMin as BreakpointMinMaxDetector)(breakpointMatch[
        parseConfig.groupMinMax as number]);
      let breakpoint = obj[name];
      if (!breakpoint) {
        breakpoint = {};
        obj[name] = breakpoint;
      }
      breakpoint[minMax ? nameMin : nameMax] = value as string;
    }
    return obj;
  }, {} as BreakpointDefinitions);
};

const breakpoints = (breakpointDefinitions: BreakpointDefinitions): BreakpointFncs => {
  const initialBreakpoints: string[] = [];
  const breakpointsChangesSource$: Observable<BreakpointState> = merge(
    ...Object.entries(breakpointDefinitions)
      .map(([name, breakpoint]): Observable<BreakpointMatch> => {
        const { min, max } = breakpoint;
        // matchMedia, build media query
        const mediaQueryList = matchMedia([['min', min], ['max', max]]
          .filter(([, val]) => val)
          .map(([str, val]) => `(${str}-width: ${typeof val !== 'string' ? `${String(val)}px` : val})`)
          .join(' and '));

        // set the current breakpoints
        if (mediaQueryList.matches) {
          initialBreakpoints.push(name as string);
        }

        return new Observable((subscriber): void => {
          mediaQueryList.addListener(({ matches }) => {
            subscriber.next({ name: name as string, matches });
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
    }, { curr: initialBreakpoints, prev: [] as string[] }), // initial value
  );

  // multicast Observable
  const breakpointsChanges$ = breakpointsChangesSource$
    .pipe(multicast((): Subject<BreakpointState> => new Subject())) as IBreakpointChanges$;
  breakpointsChanges$.connect();

  const breakpointsChangesBehavior$ = new BehaviorSubject({ curr: initialBreakpoints, prev: [] as string[] });
  breakpointsChanges$.subscribe(breakpointsChangesBehavior$ as Observer<BreakpointState>);

  /**
   * Returns the current breakpoint names.
   *
   * @returns the current breakpoint names
   */
  // TODO: check array.includes(getCurrentBreakpoints()[0]))
  const getCurrentBreakpoints: IGetCurrentBreakpoints = () => {
    let bps: string[] = [];
    breakpointsChangesBehavior$.subscribe({
      next: ({ curr }) => {
        bps = curr;
      },
    });
    return bps as string[];
  };

  const breakpointListContainsBreakpoint = (bpl: string[], bp: string): boolean => bpl.includes(bp);
  const breakpointListContainsBreakpoints = (bpl: string[], bps: string[]): boolean => bps.some((bp) => bpl
    .includes(bp));

  const includesBreakpoints: IIncludesBreakpoints = (bps) => breakpointListContainsBreakpoints(
    getCurrentBreakpoints(), bps,
  );
  const includesBreakpoint: IIncludesBreakpoint = (bp) => includesBreakpoints([bp]);

  /**
   * Create an observable emitting values for entering or leaving a breakpoint.
   *
   * @param bp the breakpoint name
   *
   * @returns an Observerable containing entering/leaving the breakpoint
   */
  const breakpointsChange: IBreakpointsChange = (bp) => breakpointsChanges$.pipe(
    filter(({ curr, prev }) => [curr, prev].some((b) => breakpointListContainsBreakpoint(b, bp))),
    filter(({ curr, prev }) => curr.includes(bp) !== prev.includes(bp)),
    map(({ curr }) => curr.includes(bp)),
  );

  /**
   * Create an observable emitting values for entering or leaving a breakpoint range
   *
   * @param range  an array containing a range of breakpoints
   *
   * @returns an Oberservable containing entering/leaving the breakpoint range
   */
  const breakpointsInRange: IBreakpointsInRange = (range) => {
    const isInRange = (bpl: string[]): boolean => breakpointListContainsBreakpoints(bpl, range);
    return breakpointsChanges$.pipe(
      map(({ curr, prev }) => ({ curr: isInRange(curr), prev: isInRange(prev) })),
      filter(({ curr, prev }) => curr !== prev),
      map(({ curr }) => curr),
    );
  };

  return {
    breakpointsChanges$,
    breakpointsChangesBehavior$,
    getCurrentBreakpoints,
    includesBreakpoints,
    includesBreakpoint,
    breakpointsChange,
    breakpointsInRange,
  };
};

export default breakpoints;
