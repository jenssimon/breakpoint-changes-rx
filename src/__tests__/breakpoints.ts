import '../__mocks__/matchMedia.mock';
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
  });

  /* it('returns the current breakpoints', () => {
    expect(getCurrentBreakpoints()).toEqual(['md']);
  }); */
});
