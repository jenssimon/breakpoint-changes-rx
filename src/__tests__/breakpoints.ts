// import '../__mocks__/matchMedia.mock';
import breakpoints, { parseBreakpoints } from '../index';

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
    })).toStrictEqual({
      sm: { max: '767px', maxInt: 767 },
      md: {
        min: '768px', minInt: 768, max: '991px', maxInt: 991,
      },
      lg: {
        min: '992px', minInt: 992, max: '1199px', maxInt: 1199,
      },
      xl: { min: '1200px', minInt: 1200 },
    });
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

describe('breakpoints', () => {
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

    const bp = breakpoints({
      sm: { max: '767px', maxInt: 767 },
      md: {
        min: '768px', minInt: 768, max: '991px', maxInt: 991,
      },
      lg: {
        min: '992px', minInt: 992, max: '1199px', maxInt: 1199,
      },
      xl: { min: '1200px', minInt: 1200 },
    });
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
});
