// import '../__mocks__/matchMedia.mock';
import breakpoints, { parseBreakpoints, BreakpointDefinitions } from '../index';

const testBreakpointData = (multipleMatches = false): BreakpointDefinitions => ({
  sm: { max: '767px', maxInt: 767 },
  md: {
    min: '768px', minInt: 768, max: '991px', maxInt: 991,
  },
  lg: {
    min: '992px', minInt: 992, max: '1199px', maxInt: 1199,
  },
  xl: { min: '1200px', minInt: 1200 },
  ...multipleMatches ? {
    mdx: {
      min: '768px', minInt: 768, max: '849px', maxInt: 849,
    },
    mdy: {
      min: '850px', minInt: 850, max: '991px', maxInt: 991,
    },
  } : {},
});

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
      sm: { max: '500px', maxInt: 500 },
    });

    expect(parseBreakpoints({
      'breakpoint-sm-max': '767px',
      'breakpoint-ab-sm-max': '500px',
    }, {
      regex: /^breakpoint-(ab-(\w*))-((max)|(min))$/,
      groupName: 2,
    })).toStrictEqual({
      sm: { max: '500px', maxInt: 500 },
    });

    expect(parseBreakpoints({
      'breakpoint-sm-max': '767px',
      'breakpoint-xm-xmax': '500px',
    }, {
      regex: /^breakpoint-(\w*)-(x)((max)|(min))$/,
      groupMinMax: 3,
    })).toStrictEqual({
      xm: { max: '500px', maxInt: 500 },
    });

    expect(parseBreakpoints({
      'breakpoint-sm-min': '767px',
      'breakpoint-xm-mini': '500px',
    }, {
      regex: /^breakpoint-(\w*)-((maxi)|(mini))$/,
      isMin: (value) => value === 'mini',
    })).toStrictEqual({
      xm: { min: '500px', minInt: 500 },
    });
  });
});

describe('initialization and detect breakpoints on init', () => {
  it('initializes with one detected breakpoint', () => {
    const matchMediaQueries: string[] = [];
    const listenerMock = jest.fn();
    const matchMediaImpl = jest.fn().mockImplementation((query) => {
      matchMediaQueries.push(query);
      return {
        matches: query === '(min-width: 992px) and (max-width: 1199px)',
        media: query,
        onchange: null,
        addListener: listenerMock,
      };
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaImpl,
    });

    const bp = breakpoints(testBreakpointData());
    expect(matchMediaImpl).toHaveBeenCalledTimes(4);

    expect(matchMediaQueries).toContain('(max-width: 767px)');
    expect(matchMediaQueries).toContain('(min-width: 768px) and (max-width: 991px)');
    expect(matchMediaQueries).toContain('(min-width: 992px) and (max-width: 1199px)');
    expect(matchMediaQueries).toContain('(min-width: 1200px)');

    expect(listenerMock).toHaveBeenCalledTimes(4);

    expect(bp.getCurrentBreakpoints()).toStrictEqual(['lg']);

    expect(bp.includesBreakpoint('sm')).toBe(false);
    expect(bp.includesBreakpoint('md')).toBe(false);
    expect(bp.includesBreakpoint('lg')).toBe(true);
    expect(bp.includesBreakpoint('xl')).toBe(false);
    expect(bp.includesBreakpoint('foo')).toBe(false);

    expect(bp.includesBreakpoints(['sm'])).toBe(false);
    expect(bp.includesBreakpoints(['md'])).toBe(false);
    expect(bp.includesBreakpoints(['lg'])).toBe(true);
    expect(bp.includesBreakpoints(['xl'])).toBe(false);
    expect(bp.includesBreakpoints(['foo'])).toBe(false);

    expect(bp.includesBreakpoints(['sm', 'md'])).toBe(false);
    expect(bp.includesBreakpoints(['lg', 'xl'])).toBe(true);
  });

  it('initializes with multiple detected breakpoints', () => {
    const matchMediaQueries: string[] = [];
    const listenerMock = jest.fn();
    const matchMediaImpl = jest.fn().mockImplementation((query) => {
      matchMediaQueries.push(query);
      return {
        matches: [
          '(min-width: 768px) and (max-width: 991px)',
          '(min-width: 768px) and (max-width: 849px)',
        ].includes(query),
        media: query,
        onchange: null,
        addListener: listenerMock,
      };
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaImpl,
    });

    const bp = breakpoints(testBreakpointData(true));
    expect(matchMediaImpl).toHaveBeenCalledTimes(6);

    expect(matchMediaQueries).toContain('(max-width: 767px)');
    expect(matchMediaQueries).toContain('(min-width: 768px) and (max-width: 991px)');
    expect(matchMediaQueries).toContain('(min-width: 768px) and (max-width: 849px)');
    expect(matchMediaQueries).toContain('(min-width: 850px) and (max-width: 991px)');
    expect(matchMediaQueries).toContain('(min-width: 992px) and (max-width: 1199px)');
    expect(matchMediaQueries).toContain('(min-width: 1200px)');

    expect(listenerMock).toHaveBeenCalledTimes(6);

    expect(bp.getCurrentBreakpoints()).toStrictEqual(['md', 'mdx']);

    expect(bp.includesBreakpoint('sm')).toBe(false);
    expect(bp.includesBreakpoint('md')).toBe(true);
    expect(bp.includesBreakpoint('mdx')).toBe(true);
    expect(bp.includesBreakpoint('mdy')).toBe(false);
    expect(bp.includesBreakpoint('lg')).toBe(false);
    expect(bp.includesBreakpoint('xl')).toBe(false);
    expect(bp.includesBreakpoint('foo')).toBe(false);

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
});

describe('detect breakpoint changes', () => {
  it('detects breakpoint change (single breakpoint scenario)', () => {
    jest.useFakeTimers();
    const matchMediaQueries: string[] = [];
    const mqlListeners: Map<string, Function> = new Map();
    const matchMediaImpl = jest.fn().mockImplementation((query) => {
      matchMediaQueries.push(query);
      return {
        matches: [
          '(min-width: 992px) and (max-width: 1199px)',
        ].includes(query),
        media: query,
        onchange: null,
        addListener: (fnc: Function): void => {
          mqlListeners.set(query, fnc);
        },
      };
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaImpl,
    });

    const bp = breakpoints(testBreakpointData(false));

    expect(bp.getCurrentBreakpoints()).toStrictEqual(['lg']);

    const breakpointChangesObservable = jest.fn();
    bp.breakpointsChanges$.subscribe(breakpointChangesObservable);
    const mdObservable = jest.fn();
    bp.breakpointsChange('md').subscribe(mdObservable);
    const lgObservable = jest.fn();
    bp.breakpointsChange('lg').subscribe(lgObservable);
    const breakpointRangeObservable = jest.fn();
    bp.breakpointsInRange(['sm', 'md']).subscribe(breakpointRangeObservable);

    const mdListener = mqlListeners.get('(min-width: 768px) and (max-width: 991px)');
    const lgListener = mqlListeners.get('(min-width: 992px) and (max-width: 1199px)');
    if (mdListener && lgListener) {
      mdListener({ matches: true });
      lgListener({ matches: false });
    }
    jest.runOnlyPendingTimers();

    expect(breakpointChangesObservable).toHaveBeenCalledTimes(1);
    expect(breakpointChangesObservable.mock.calls[0][0]).toStrictEqual({ curr: ['md'], prev: ['lg'] });

    expect(mdObservable).toHaveBeenCalledTimes(1);
    expect(mdObservable.mock.calls[0][0]).toBe(true);

    expect(lgObservable).toHaveBeenCalledTimes(1);
    expect(lgObservable.mock.calls[0][0]).toBe(false);

    expect(breakpointRangeObservable).toHaveBeenCalledTimes(1);
    expect(breakpointRangeObservable.mock.calls[0][0]).toBe(true);
  });
});
