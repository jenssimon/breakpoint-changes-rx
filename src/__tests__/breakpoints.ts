import breakpoints, { parseBreakpoints, BreakpointDefinitions } from '../breakpoints';

type AnyFunction = (args?: unknown) => unknown

/**
 * Helper function to generate breakpoint data
 *
 * @param multipleMatches contains multiple matches
 *
 * @return breakpoint data
 */
const testBreakpointData = (multipleMatches = false): BreakpointDefinitions => ({
  sm: { max: '767px' },
  md: { min: '768px', max: '991px' },
  lg: { min: '992px', max: '1199px' },
  xl: { min: '1200px' },

  // for multiple matches add additional breakpoints
  ...multipleMatches ? {
    mdx: { min: '768px', max: '849px' },
    mdy: { min: '850px', max: '991px' },
  } : {},
});

/**
 * Generates a media query for a breakpoint.
 *
 * @param breakpoint  the name of the breakpoint
 * @param bps  the breakpoint definitions
 * @return the media query for the breakpoint
 */
const mqFor = (breakpoint: string, bps: BreakpointDefinitions): string => (Object.entries(bps)
  .filter(([name]) => name === breakpoint)
  .map(([, { min, max }]): string => [['min', min], ['max', max]]
    .filter(([, val]) => val)
    .map(([str, val]) => `(${str}-width: ${val})`)
    .join(' and '))
).reduce((prev, curr) => curr);

/*
 * parseBreakpoints()
 */
describe('parseBreakpoints', () => {
  it('parses breakpoint information from a possible return value of a CSS module', () => {
    expect(parseBreakpoints({
      'foo-sm-min': '100px',
      'breakpoint-xl-min': '1200px',
      foo: 'bar',
      'breakpoint-sm-max': '767px',
      'breakpoint-md-max': '991px',
      bar: true,
      'breakpoint-lg-min': '992px',
      'breakpoint-md-min': '768px',
      'breakpoint-lg-max': '1199px',
      baz: 123,
    })).toStrictEqual(testBreakpointData());
  });

  it('can use a custom config', () => {
    expect(parseBreakpoints({
      'breakpoint-sm-max': '767px',
      'bp-sm-max': '500px',
    }, { regex: /^bp-(\w*)-((max)|(min))$/ })).toStrictEqual({
      sm: { max: '500px' },
    });

    expect(parseBreakpoints({
      'breakpoint-sm-max': '767px',
      'breakpoint-ab-sm-max': '500px',
    }, {
      regex: /^breakpoint-(ab-(\w*))-((max)|(min))$/,
      groupName: 2,
    })).toStrictEqual({
      sm: { max: '500px' },
    });

    expect(parseBreakpoints({
      'breakpoint-sm-max': '767px',
      'breakpoint-xm-xmax': '500px',
    }, {
      regex: /^breakpoint-(\w*)-(x)((max)|(min))$/,
      groupMinMax: 3,
    })).toStrictEqual({
      xm: { max: '500px' },
    });

    expect(parseBreakpoints({
      'breakpoint-sm-min': '767px',
      'breakpoint-xm-mini': '500px',
    }, {
      regex: /^breakpoint-(\w*)-((maxi)|(mini))$/,
      isMin: (value) => value === 'mini',
    })).toStrictEqual({
      xm: { min: '500px' },
    });
  });
});

describe('initialization and detect breakpoints on init', () => {
  it('initializes with one detected breakpoint', () => {
    const bpData = testBreakpointData();
    const matchMediaQueries: string[] = [];
    const listenerMock = jest.fn();
    const matchMediaImpl = jest.fn().mockImplementation((query) => {
      matchMediaQueries.push(query);
      return {
        matches: query === mqFor('lg', bpData), // "lg" matches
        media: query,
        onchange: null,
        addEventListener: listenerMock,
      };
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaImpl,
    });

    const bp = breakpoints(bpData);
    expect(matchMediaImpl).toHaveBeenCalledTimes(4); // 4 breakpoints -> 4 matchMedia calls

    // are the correct media queries used?
    expect(matchMediaQueries).toContain(mqFor('sm', bpData));
    expect(matchMediaQueries).toContain(mqFor('md', bpData));
    expect(matchMediaQueries).toContain(mqFor('lg', bpData));
    expect(matchMediaQueries).toContain(mqFor('xl', bpData));

    expect(listenerMock).toHaveBeenCalledTimes(4); // listeners for all media queries added?

    expect(bp.getCurrentBreakpoints()).toStrictEqual(['lg']);

    const bpSubscriber = jest.fn();
    bp.breakpointsChanges$.subscribe(bpSubscriber);
    expect(bpSubscriber).toHaveBeenCalledTimes(0);

    const bpBehaviorSubscriber = jest.fn();
    bp.breakpointsChangesBehavior$.subscribe(bpBehaviorSubscriber);
    expect(bpBehaviorSubscriber).toHaveBeenCalledTimes(1);
    expect(bpBehaviorSubscriber.mock.calls[0][0]).toStrictEqual({ curr: ['lg'], prev: [] });

    // includesBreakpoint()
    expect(bp.includesBreakpoint('sm')).toBe(false);
    expect(bp.includesBreakpoint('md')).toBe(false);
    expect(bp.includesBreakpoint('lg')).toBe(true);
    expect(bp.includesBreakpoint('xl')).toBe(false);
    expect(bp.includesBreakpoint('foo')).toBe(false);

    // includesBreakpoints()
    expect(bp.includesBreakpoints(['sm'])).toBe(false);
    expect(bp.includesBreakpoints(['md'])).toBe(false);
    expect(bp.includesBreakpoints(['lg'])).toBe(true);
    expect(bp.includesBreakpoints(['xl'])).toBe(false);
    expect(bp.includesBreakpoints(['foo'])).toBe(false);

    expect(bp.includesBreakpoints(['sm', 'md'])).toBe(false);
    expect(bp.includesBreakpoints(['lg', 'xl'])).toBe(true);
  });

  it('initializes with multiple detected breakpoints', () => {
    const bpData = testBreakpointData(true);
    const matchMediaQueries: string[] = [];
    const listenerMock = jest.fn();
    const matchMediaImpl = jest.fn().mockImplementation((query) => {
      matchMediaQueries.push(query);
      return {
        matches: [
          // "md" and "mdx" matches
          mqFor('md', bpData),
          mqFor('mdx', bpData),
        ].includes(query),
        media: query,
        onchange: null,
        addEventListener: listenerMock,
      };
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaImpl,
    });

    const bp = breakpoints(bpData);
    expect(matchMediaImpl).toHaveBeenCalledTimes(6); // 6 breakpoints -> 6 matchMedia calls

    const bpSubscriber = jest.fn();
    bp.breakpointsChanges$.subscribe(bpSubscriber);
    expect(bpSubscriber).toHaveBeenCalledTimes(0);

    const bpBehaviorSubscriber = jest.fn();
    bp.breakpointsChangesBehavior$.subscribe(bpBehaviorSubscriber);
    expect(bpBehaviorSubscriber).toHaveBeenCalledTimes(1);
    expect(bpBehaviorSubscriber.mock.calls[0][0]).toStrictEqual({ curr: ['md', 'mdx'], prev: [] });

    expect(matchMediaQueries).toContain(mqFor('sm', bpData));
    expect(matchMediaQueries).toContain(mqFor('md', bpData));
    expect(matchMediaQueries).toContain(mqFor('mdx', bpData));
    expect(matchMediaQueries).toContain(mqFor('mdy', bpData));
    expect(matchMediaQueries).toContain(mqFor('lg', bpData));
    expect(matchMediaQueries).toContain(mqFor('xl', bpData));

    expect(listenerMock).toHaveBeenCalledTimes(6);

    expect(bp.getCurrentBreakpoints()).toStrictEqual(['md', 'mdx']);

    // includesBreakpoint()
    expect(bp.includesBreakpoint('sm')).toBe(false);
    expect(bp.includesBreakpoint('md')).toBe(true);
    expect(bp.includesBreakpoint('mdx')).toBe(true);
    expect(bp.includesBreakpoint('mdy')).toBe(false);
    expect(bp.includesBreakpoint('lg')).toBe(false);
    expect(bp.includesBreakpoint('xl')).toBe(false);
    expect(bp.includesBreakpoint('foo')).toBe(false);

    // includesBreakpoints()
    expect(bp.includesBreakpoints(['sm'])).toBe(false);
    expect(bp.includesBreakpoints(['md'])).toBe(true);
    expect(bp.includesBreakpoints(['mdx'])).toBe(true);
    expect(bp.includesBreakpoints(['mdy'])).toBe(false);
    expect(bp.includesBreakpoints(['lg'])).toBe(false);
    expect(bp.includesBreakpoints(['xl'])).toBe(false);
    expect(bp.includesBreakpoints(['foo'])).toBe(false);

    expect(bp.includesBreakpoints(['sm', 'md'])).toBe(true);
    expect(bp.includesBreakpoints(['md', 'mdx'])).toBe(true);
    expect(bp.includesBreakpoints(['md', 'mdy'])).toBe(true);
    expect(bp.includesBreakpoints(['md', 'lg'])).toBe(true);
    expect(bp.includesBreakpoints(['mdx', 'mdy'])).toBe(true);
    expect(bp.includesBreakpoints(['mdx', 'lg'])).toBe(true);
    expect(bp.includesBreakpoints(['mdy', 'lg'])).toBe(false);
    expect(bp.includesBreakpoints(['lg', 'xl'])).toBe(false);
  });

  it('initializes with number values for a breakpoint', () => {
    const bpData = {
      md: { min: 768, max: 991 },
    };
    const matchMediaQueries: string[] = [];
    const listenerMock = jest.fn();
    const matchMediaImpl = jest.fn().mockImplementation((query) => {
      matchMediaQueries.push(query);
      return {
        matches: query === '(min-width: 768px) and (max-width: 991px)',
        media: query,
        onchange: null,
        addEventListener: listenerMock,
      };
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaImpl,
    });

    const bp = breakpoints(bpData);
    expect(matchMediaImpl).toHaveBeenCalledTimes(1); // 1 breakpoints -> 1 matchMedia calls

    // are the correct media queries used?
    expect(matchMediaQueries).toContain('(min-width: 768px) and (max-width: 991px)');

    expect(listenerMock).toHaveBeenCalledTimes(1); // listeners for all media queries added?

    expect(bp.getCurrentBreakpoints()).toStrictEqual(['md']);
  });
});

describe('detect breakpoint changes', () => {
  it('detects breakpoint change (single breakpoint scenario)', () => {
    const bpData = testBreakpointData();
    jest.useFakeTimers();
    const mqlListeners: Map<string, AnyFunction> = new Map();
    const matchMediaImpl = jest.fn().mockImplementation((query) => ({
      matches: [
        mqFor('lg', bpData), // initial match "lg"
      ].includes(query),
      media: query,
      onchange: null,
      addEventListener: (event: string, fnc: AnyFunction): void => {
        mqlListeners.set(query, fnc);
      },
    }));
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaImpl,
    });

    const bp = breakpoints(bpData);

    expect(bp.getCurrentBreakpoints()).toStrictEqual(['lg']);

    const breakpointChangesObservable = jest.fn();
    bp.breakpointsChanges$.subscribe(breakpointChangesObservable);
    const smObservable = jest.fn();
    bp.breakpointsChange('sm').subscribe(smObservable);
    const mdObservable = jest.fn();
    bp.breakpointsChange('md').subscribe(mdObservable);
    const lgObservable = jest.fn();
    bp.breakpointsChange('lg').subscribe(lgObservable);
    const breakpointRangeObservable = jest.fn();
    bp.breakpointsInRange(['sm', 'md']).subscribe(breakpointRangeObservable);

    const smListener = mqlListeners.get(mqFor('sm', bpData)) as AnyFunction;
    const mdListener = mqlListeners.get(mqFor('md', bpData)) as AnyFunction;
    const lgListener = mqlListeners.get(mqFor('lg', bpData)) as AnyFunction;

    // change to "md"
    mdListener({ matches: true });
    lgListener({ matches: false });
    jest.runOnlyPendingTimers();

    expect(breakpointChangesObservable).toHaveBeenCalledTimes(1);
    expect(breakpointChangesObservable.mock.calls[0][0]).toStrictEqual({ curr: ['md'], prev: ['lg'] });

    expect(mdObservable).toHaveBeenCalledTimes(1);
    expect(mdObservable.mock.calls[0][0]).toBe(true);

    expect(lgObservable).toHaveBeenCalledTimes(1);
    expect(lgObservable.mock.calls[0][0]).toBe(false);

    expect(breakpointRangeObservable).toHaveBeenCalledTimes(1);
    expect(breakpointRangeObservable.mock.calls[0][0]).toBe(true);

    // change to "sm"
    mdListener({ matches: false });
    smListener({ matches: true });
    jest.runOnlyPendingTimers();

    expect(breakpointChangesObservable).toHaveBeenCalledTimes(2);
    expect(breakpointChangesObservable.mock.calls[1][0]).toStrictEqual({ curr: ['sm'], prev: ['md'] });

    expect(mdObservable).toHaveBeenCalledTimes(2);
    expect(mdObservable.mock.calls[1][0]).toBe(false);

    expect(lgObservable).toHaveBeenCalledTimes(1);

    expect(smObservable).toHaveBeenCalledTimes(1);
    expect(smObservable.mock.calls[0][0]).toBe(true);

    expect(breakpointRangeObservable).toHaveBeenCalledTimes(1);

    // change to "lg"
    smListener({ matches: false });
    lgListener({ matches: true });
    jest.runOnlyPendingTimers();

    expect(breakpointChangesObservable).toHaveBeenCalledTimes(3);
    expect(breakpointChangesObservable.mock.calls[2][0]).toStrictEqual({ curr: ['lg'], prev: ['sm'] });

    expect(mdObservable).toHaveBeenCalledTimes(2);

    expect(lgObservable).toHaveBeenCalledTimes(2);
    expect(lgObservable.mock.calls[1][0]).toBe(true);

    expect(smObservable).toHaveBeenCalledTimes(2);
    expect(smObservable.mock.calls[1][0]).toBe(false);

    expect(breakpointRangeObservable).toHaveBeenCalledTimes(2);
    expect(breakpointRangeObservable.mock.calls[1][0]).toBe(false);
  });

  it('detects breakpoint change (multiple breakpoint scenario)', () => {
    const bpData = testBreakpointData(true);
    jest.useFakeTimers();
    const mqlListeners: Map<string, AnyFunction> = new Map();

    // eslint-disable-next-line sonarjs/no-identical-functions
    const matchMediaImpl = jest.fn().mockImplementation((query) => ({
      matches: [
        mqFor('lg', bpData), // initial match "lg"
      ].includes(query),
      media: query,
      onchange: null,

      addEventListener: (event: string, fnc: AnyFunction): void => {
        mqlListeners.set(query, fnc);
      },
    }));
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaImpl,
    });

    const bp = breakpoints(bpData);

    const breakpointChangesObservable = jest.fn();
    bp.breakpointsChanges$.subscribe(breakpointChangesObservable);
    const mdObservable = jest.fn();
    bp.breakpointsChange('md').subscribe(mdObservable);
    const mdxObservable = jest.fn();
    bp.breakpointsChange('mdx').subscribe(mdxObservable);
    const mdyObservable = jest.fn();
    bp.breakpointsChange('mdy').subscribe(mdyObservable);
    const lgObservable = jest.fn();
    bp.breakpointsChange('lg').subscribe(lgObservable);
    const breakpointRangeObservable = jest.fn();
    bp.breakpointsInRange(['sm', 'md']).subscribe(breakpointRangeObservable);

    const mdListener = mqlListeners.get(mqFor('md', bpData)) as AnyFunction;
    const mdxListener = mqlListeners.get(mqFor('mdx', bpData)) as AnyFunction;
    const mdyListener = mqlListeners.get(mqFor('mdy', bpData)) as AnyFunction;
    const lgListener = mqlListeners.get(mqFor('lg', bpData)) as AnyFunction;

    // switch to "md" and "mdx"
    mdListener({ matches: true });
    mdxListener({ matches: true });
    lgListener({ matches: false });
    jest.runOnlyPendingTimers();

    expect(breakpointChangesObservable).toHaveBeenCalledTimes(1);
    expect(breakpointChangesObservable.mock.calls[0][0]).toStrictEqual({ curr: ['md', 'mdx'], prev: ['lg'] });

    expect(mdObservable).toHaveBeenCalledTimes(1);
    expect(mdObservable.mock.calls[0][0]).toBe(true);

    expect(mdxObservable).toHaveBeenCalledTimes(1);
    expect(mdxObservable.mock.calls[0][0]).toBe(true);

    expect(mdyObservable).toHaveBeenCalledTimes(0);

    expect(lgObservable).toHaveBeenCalledTimes(1);
    expect(lgObservable.mock.calls[0][0]).toBe(false);

    expect(breakpointRangeObservable).toHaveBeenCalledTimes(1);
    expect(breakpointRangeObservable.mock.calls[0][0]).toBe(true);

    // switch to "md" and "mdy"
    mdxListener({ matches: false });
    mdyListener({ matches: true });
    jest.runOnlyPendingTimers();

    expect(breakpointChangesObservable).toHaveBeenCalledTimes(2);
    expect(breakpointChangesObservable.mock.calls[1][0]).toStrictEqual({ curr: ['md', 'mdy'], prev: ['md', 'mdx'] });

    expect(mdObservable).toHaveBeenCalledTimes(1);

    expect(mdxObservable).toHaveBeenCalledTimes(2);
    expect(mdxObservable.mock.calls[1][0]).toBe(false);

    expect(mdyObservable).toHaveBeenCalledTimes(1);
    expect(mdyObservable.mock.calls[0][0]).toBe(true);

    expect(lgObservable).toHaveBeenCalledTimes(1);

    expect(breakpointRangeObservable).toHaveBeenCalledTimes(1);

    // switch to "lg"
    mdListener({ matches: false });
    mdyListener({ matches: false });
    lgListener({ matches: true });
    jest.runOnlyPendingTimers();

    expect(breakpointChangesObservable).toHaveBeenCalledTimes(3);
    expect(breakpointChangesObservable.mock.calls[2][0]).toStrictEqual({ curr: ['lg'], prev: ['md', 'mdy'] });

    expect(mdObservable).toHaveBeenCalledTimes(2);
    expect(mdObservable.mock.calls[1][0]).toBe(false);

    expect(mdxObservable).toHaveBeenCalledTimes(2);

    expect(mdyObservable).toHaveBeenCalledTimes(2);
    expect(mdyObservable.mock.calls[1][0]).toBe(false);

    expect(lgObservable).toHaveBeenCalledTimes(2);
    expect(lgObservable.mock.calls[1][0]).toBe(true);

    expect(breakpointRangeObservable).toHaveBeenCalledTimes(2);
    expect(breakpointRangeObservable.mock.calls[1][0]).toBe(false);
  });
});
