/**
 * @jest-environment jsdom
 */
import {
  describe, expect, it, jest,
} from '@jest/globals'

import breakpoints, { parseBreakpoints } from '../breakpoints.js'

import type { BreakpointDefinitions } from '../types.js'

type AnyFunction = (args?: unknown) => unknown

const TEST_BREAKPOINT_DATA = {
  sm: { max: '767px' },
  md: { min: '768px', max: '991px' },
  lg: { min: '992px', max: '1199px' },
  xl: { min: '1200px' },
}

// for multiple matches add additional breakpoints
const TEST_BREAKPOINT_DATA_MULTIPLE_MATCHES = {
  ...TEST_BREAKPOINT_DATA,
  mdx: { min: '768px', max: '849px' },
  mdy: { min: '850px', max: '991px' },
}

/**
 * Generates a media query for a breakpoint.
 *
 * @param breakpoint  the name of the breakpoint
 * @param bps  the breakpoint definitions
 * @return the media query for the breakpoint
 */
const mqFor = (
  breakpoint: string,
  bps: BreakpointDefinitions,
) => (
  Object.entries(bps)
    .filter(([name]) => name === breakpoint)
    .map(([, { min, max }]) => [
      ['min', min], ['max', max],
    ]
      .filter(([, val]) => val)
      .map(([str, val]) => `(${str}-width: ${val})`)
      .join(' and '))
).reduce((prev, curr) => curr)

const mockMatchMedia = (
  matches: (query: string) => boolean,
) => {
  const matchMediaQueries: string[] = []
  const mqlListeners: Map<string, AnyFunction> = new Map()

  const listenerMock = jest.fn()
  const matchMediaImpl = jest.fn<(query: string) => object>().mockImplementation((query: string) => {
    matchMediaQueries.push(query)
    return {
      matches: matches(query), // "lg" matches
      media: query,
      onchange: null,
      addEventListener: (event: string, fnc: AnyFunction): void => {
        mqlListeners.set(query, fnc)
        listenerMock(event, fnc)
      },
    }
  })

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: matchMediaImpl,
  })

  return {
    matchMediaQueries,
    listenerMock,
    matchMediaImpl,
    mqlListeners,
  }
}

/*
 * parseBreakpoints()
 */
describe('parseBreakpoints', () => {
  it.each([
    [
      'parses breakpoint information from a possible return value of a CSS module',
      {
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
      },
      undefined,

      // expected
      TEST_BREAKPOINT_DATA,
    ],

    [
      'can use a custom config (regular expression)',
      {
        'breakpoint-sm-max': '767px',
        'bp-sm-max': '500px',
      },
      {
        regex: /^bp-(\w*)-((max)|(min))$/,
      },

      // expected
      {
        sm: { max: '500px' },
      },
    ],

    [
      'can use a custom config (regular expression with groupName)',
      {
        'breakpoint-sm-max': '767px',
        'breakpoint-ab-sm-max': '500px',
      },
      {
        regex: /^breakpoint-(ab-(\w*))-((max)|(min))$/,
        groupName: 2,
      },

      // expected
      {
        sm: { max: '500px' },
      },
    ],

    [
      'can use a custom config (regular expression with groupMinMax)',
      {
        'breakpoint-sm-max': '767px',
        'breakpoint-xm-xmax': '500px',
      },
      {
        regex: /^breakpoint-(\w*)-(x)((max)|(min))$/,
        groupMinMax: 3,
      },

      // expected
      {
        xm: { max: '500px' },
      },
    ],

    [
      'can use a custom config  (regular expression with isMin() function)',
      {
        'breakpoint-sm-min': '767px',
        'breakpoint-xm-mini': '500px',
      },
      {
        regex: /^breakpoint-(\w*)-((maxi)|(mini))$/,
        isMin: (value: string) => value === 'mini',
      },

      // expected
      {
        xm: { min: '500px' },
      },
    ],
  ])('%s', (name, sample, options, expected) => {
    expect(parseBreakpoints(sample, options)).toStrictEqual(expected)
  })
})

describe('initialization and detect breakpoints on init', () => {
  it('initializes with one detected breakpoint', () => {
    const {
      matchMediaQueries, listenerMock, matchMediaImpl,
    } = mockMatchMedia((query) => query === mqFor('lg', TEST_BREAKPOINT_DATA)) // "lg" matches

    const bp = breakpoints(TEST_BREAKPOINT_DATA as BreakpointDefinitions)

    expect(matchMediaImpl).toHaveBeenCalledTimes(4); // 4 breakpoints -> 4 matchMedia calls

    // are the correct media queries used?
    (['sm', 'md', 'lg', 'xl']).forEach((bpName: string) => {
      expect(matchMediaQueries).toContain(mqFor(bpName, TEST_BREAKPOINT_DATA))
    })

    expect(listenerMock).toHaveBeenCalledTimes(4) // listeners for all media queries added?

    expect(bp.getCurrentBreakpoints()).toStrictEqual(['lg'])

    const bpSubscriber = jest.fn()
    bp.breakpointsChanges$.subscribe(bpSubscriber)
    expect(bpSubscriber).toHaveBeenCalledTimes(0)

    const bpBehaviorSubscriber = jest.fn()
    bp.breakpointsChangesBehavior$.subscribe(bpBehaviorSubscriber)

    expect(bpBehaviorSubscriber).toHaveBeenCalledTimes(1)
    expect(bpBehaviorSubscriber.mock.calls[0][0]).toStrictEqual({
      curr: ['lg'], prev: [],
    });

    // includesBreakpoint()
    ['sm', 'md', 'lg', 'xl', 'foo'].forEach((bpName: string) => {
      expect(bp.includesBreakpoint(bpName)).toBe(bpName === 'lg')
    });

    // includesBreakpoints()
    [
      ['sm'], ['md'], ['lg'], ['xl'], ['foo'],
      ['sm', 'md'], ['lg', 'xl'],
    ].forEach((bpNames: string[]) => {
      expect(bp.includesBreakpoints(bpNames)).toBe(bpNames.includes('lg'))
    })
  })

  it('initializes with multiple detected breakpoints', () => {
    const {
      matchMediaQueries, listenerMock, matchMediaImpl,
    } = mockMatchMedia((query) => ['md', 'mdx']
      .map((bp) => mqFor(bp, TEST_BREAKPOINT_DATA_MULTIPLE_MATCHES))
      .includes(query)) // "md" and "mdx" matches

    const bp = breakpoints(TEST_BREAKPOINT_DATA_MULTIPLE_MATCHES)
    expect(matchMediaImpl).toHaveBeenCalledTimes(6) // 6 breakpoints -> 6 matchMedia calls

    const bpSubscriber = jest.fn()
    bp.breakpointsChanges$.subscribe(bpSubscriber)
    expect(bpSubscriber).toHaveBeenCalledTimes(0)

    const bpBehaviorSubscriber = jest.fn()
    bp.breakpointsChangesBehavior$.subscribe(bpBehaviorSubscriber)
    expect(bpBehaviorSubscriber).toHaveBeenCalledTimes(1)
    expect(bpBehaviorSubscriber.mock.calls[0][0]).toStrictEqual({ curr: ['md', 'mdx'], prev: [] });

    ['sm', 'md', 'mdx', 'mdy', 'lg', 'xl'].forEach((bpName: string) => {
      expect(matchMediaQueries).toContain(mqFor(bpName, TEST_BREAKPOINT_DATA_MULTIPLE_MATCHES))
    })

    expect(listenerMock).toHaveBeenCalledTimes(6)

    expect(bp.getCurrentBreakpoints()).toStrictEqual(['md', 'mdx']);

    // includesBreakpoint()
    ['sm', 'md', 'mdx', 'mdy', 'lg', 'xl', 'foo'].forEach((bpName) => {
      expect(bp.includesBreakpoint(bpName as 'sm')).toBe(['md', 'mdx'].includes(bpName))
    });

    // includesBreakpoints()
    [
      ['sm'], ['md'], ['mdx'], ['mdy'], ['lg'], ['xl'], ['foo'],
      ['sm', 'md'], ['md', 'mdx'], ['md', 'mdy'], ['md', 'lg'], ['mdx', 'mdy'], ['mdy', 'lg'], ['lg', 'xl'],
    ].forEach((bpNames: string[]) => {
      expect(bp.includesBreakpoints(bpNames as 'md'[])).toBe(
        // eslint-disable-next-line jest/no-conditional-in-test
        bpNames.includes('md')
        || bpNames.includes('mdx'),
      )
    })
  })

  it('initializes with number values for a breakpoint', () => {
    const {
      matchMediaQueries, listenerMock, matchMediaImpl,
    } = mockMatchMedia((query) => query === '(min-width: 768px) and (max-width: 991px)')

    const bp = breakpoints({
      md: { min: 768, max: 991 },
    })
    expect(matchMediaImpl).toHaveBeenCalledTimes(1) // 1 breakpoints -> 1 matchMedia calls

    // are the correct media queries used?
    expect(matchMediaQueries).toContain('(min-width: 768px) and (max-width: 991px)')

    expect(listenerMock).toHaveBeenCalledTimes(1) // listeners for all media queries added?

    expect(bp.getCurrentBreakpoints()).toStrictEqual(['md'])
  })
})

describe('detect breakpoint changes', () => {
  it('detects breakpoint change (single breakpoint scenario)', () => {
    const bpData = TEST_BREAKPOINT_DATA
    jest.useFakeTimers()
    const { mqlListeners } = mockMatchMedia((query) => [
      mqFor('lg', bpData), // initial match "lg"
    ].includes(query))

    const bp = breakpoints(bpData)

    expect(bp.getCurrentBreakpoints()).toStrictEqual(['lg'])

    const breakpointChangesObservable = jest.fn()
    bp.breakpointsChanges$.subscribe(breakpointChangesObservable)

    const [smObservable, mdObservable, lgObservable] = ['sm', 'md', 'lg']
      .map((bpName) => {
        const mock = jest.fn()
        bp.breakpointsChange(bpName as 'sm').subscribe(mock)
        return mock
      })

    const breakpointRangeObservable = jest.fn()
    bp.breakpointsInRange(['sm', 'md']).subscribe(breakpointRangeObservable)

    const [smListener, mdListener, lgListener] = ['sm', 'md', 'lg']
      .map((bpName) => mqlListeners.get(mqFor(bpName, bpData)) as AnyFunction)

    // change to "md"
    mdListener({ matches: true })
    lgListener({ matches: false })
    jest.runOnlyPendingTimers()

    expect(breakpointChangesObservable).toHaveBeenCalledTimes(1)
    expect(breakpointChangesObservable.mock.calls[0][0]).toStrictEqual({ curr: ['md'], prev: ['lg'] })

    expect(mdObservable).toHaveBeenCalledTimes(1)
    expect(mdObservable.mock.calls[0][0]).toBe(true)

    expect(lgObservable).toHaveBeenCalledTimes(1)
    expect(lgObservable.mock.calls[0][0]).toBe(false)

    expect(breakpointRangeObservable).toHaveBeenCalledTimes(1)
    expect(breakpointRangeObservable.mock.calls[0][0]).toBe(true)

    // change to "sm"
    mdListener({ matches: false })
    smListener({ matches: true })
    jest.runOnlyPendingTimers()

    expect(breakpointChangesObservable).toHaveBeenCalledTimes(2)
    expect(breakpointChangesObservable.mock.calls[1][0]).toStrictEqual({ curr: ['sm'], prev: ['md'] })

    expect(mdObservable).toHaveBeenCalledTimes(2)
    expect(mdObservable.mock.calls[1][0]).toBe(false)

    expect(lgObservable).toHaveBeenCalledTimes(1)

    expect(smObservable).toHaveBeenCalledTimes(1)
    expect(smObservable.mock.calls[0][0]).toBe(true)

    expect(breakpointRangeObservable).toHaveBeenCalledTimes(1)

    // change to "lg"
    smListener({ matches: false })
    lgListener({ matches: true })
    jest.runOnlyPendingTimers()

    expect(breakpointChangesObservable).toHaveBeenCalledTimes(3)
    expect(breakpointChangesObservable.mock.calls[2][0]).toStrictEqual({ curr: ['lg'], prev: ['sm'] })

    expect(mdObservable).toHaveBeenCalledTimes(2)

    expect(lgObservable).toHaveBeenCalledTimes(2)
    expect(lgObservable.mock.calls[1][0]).toBe(true)

    expect(smObservable).toHaveBeenCalledTimes(2)
    expect(smObservable.mock.calls[1][0]).toBe(false)

    expect(breakpointRangeObservable).toHaveBeenCalledTimes(2)
    expect(breakpointRangeObservable.mock.calls[1][0]).toBe(false)
  })

  it('detects breakpoint change (multiple breakpoint scenario)', () => {
    jest.useFakeTimers()

    const { mqlListeners } = mockMatchMedia((query) => [
      mqFor('lg', TEST_BREAKPOINT_DATA_MULTIPLE_MATCHES), // initial match "lg"
    ].includes(query))

    const bp = breakpoints(TEST_BREAKPOINT_DATA_MULTIPLE_MATCHES)

    const breakpointChangesObservable = jest.fn()
    bp.breakpointsChanges$.subscribe(breakpointChangesObservable)

    const [mdObservable, mdxObservable, mdyObservable, lgObservable] = ['md', 'mdx', 'mdy', 'lg']
      .map((bpName) => {
        const mock = jest.fn()
        bp.breakpointsChange(bpName as 'sm').subscribe(mock)
        return mock
      })

    const breakpointRangeObservable = jest.fn()
    bp.breakpointsInRange(['sm', 'md']).subscribe(breakpointRangeObservable)

    const [mdListener, mdxListener, mdyListener, lgListener] = ['md', 'mdx', 'mdy', 'lg']
      .map((bpName) => mqlListeners.get(mqFor(bpName, TEST_BREAKPOINT_DATA_MULTIPLE_MATCHES)) as AnyFunction)

    // switch to "md" and "mdx"
    mdListener({ matches: true })
    mdxListener({ matches: true })
    lgListener({ matches: false })
    jest.runOnlyPendingTimers()

    expect(breakpointChangesObservable).toHaveBeenCalledTimes(1)
    expect(breakpointChangesObservable.mock.calls[0][0]).toStrictEqual({ curr: ['md', 'mdx'], prev: ['lg'] })

    expect(mdObservable).toHaveBeenCalledTimes(1)
    expect(mdObservable.mock.calls[0][0]).toBe(true)

    expect(mdxObservable).toHaveBeenCalledTimes(1)
    expect(mdxObservable.mock.calls[0][0]).toBe(true)

    expect(mdyObservable).toHaveBeenCalledTimes(0)

    expect(lgObservable).toHaveBeenCalledTimes(1)
    expect(lgObservable.mock.calls[0][0]).toBe(false)

    expect(breakpointRangeObservable).toHaveBeenCalledTimes(1)
    expect(breakpointRangeObservable.mock.calls[0][0]).toBe(true)

    // switch to "md" and "mdy"
    mdxListener({ matches: false })
    mdyListener({ matches: true })
    jest.runOnlyPendingTimers()

    expect(breakpointChangesObservable).toHaveBeenCalledTimes(2)
    expect(breakpointChangesObservable.mock.calls[1][0]).toStrictEqual({ curr: ['md', 'mdy'], prev: ['md', 'mdx'] })

    expect(mdObservable).toHaveBeenCalledTimes(1)

    expect(mdxObservable).toHaveBeenCalledTimes(2)
    expect(mdxObservable.mock.calls[1][0]).toBe(false)

    expect(mdyObservable).toHaveBeenCalledTimes(1)
    expect(mdyObservable.mock.calls[0][0]).toBe(true)

    expect(lgObservable).toHaveBeenCalledTimes(1)

    expect(breakpointRangeObservable).toHaveBeenCalledTimes(1)

    // switch to "lg"
    mdListener({ matches: false })
    mdyListener({ matches: false })
    lgListener({ matches: true })
    jest.runOnlyPendingTimers()

    expect(breakpointChangesObservable).toHaveBeenCalledTimes(3)
    expect(breakpointChangesObservable.mock.calls[2][0]).toStrictEqual({ curr: ['lg'], prev: ['md', 'mdy'] })

    expect(mdObservable).toHaveBeenCalledTimes(2)
    expect(mdObservable.mock.calls[1][0]).toBe(false)

    expect(mdxObservable).toHaveBeenCalledTimes(2)

    expect(mdyObservable).toHaveBeenCalledTimes(2)
    expect(mdyObservable.mock.calls[1][0]).toBe(false)

    expect(lgObservable).toHaveBeenCalledTimes(2)
    expect(lgObservable.mock.calls[1][0]).toBe(true)

    expect(breakpointRangeObservable).toHaveBeenCalledTimes(2)
    expect(breakpointRangeObservable.mock.calls[1][0]).toBe(false)
  })
})
