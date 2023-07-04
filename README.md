[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url] [![star this repo][gh-stars-image]][gh-url] [![fork this repo][gh-forks-image]][gh-url] [![CI][gh-status-image]][gh-status-url] [![Coverage Status][coveralls-image]][coveralls-url]

# breakpoint-changes-rx

> Detect and handle viewport changes. Using RxJS Observables

You have a responsive web site and want to handle viewport state with ease?

Here we are. Handing viewport state with the help of RxJS.

```typescript
import breakpoints, { parseBreakpoints } from 'breakpoint-changes-rx'
import style from './style.scss'

const breakpointDefinitions = parseBreakpoints(style)

const bps = breakpoints(breakpointDefinitions)

console.log('current breakpoints: %o', bps.getCurrentBreakpoints())
```

## What are the current viewports?

```typescript
console.log(
  breakpoints.getCurrentBreakpoints(), // [ "md", "lg" } ]
)
```

## Install

```sh
yarn add breakpoint-changes-rx
```

## `breakpoints(breakpointDefinitions)`

This function initializes the breakpoint detection and returns an object containing following properties:

- [breakpoint-changes-rx](#breakpoint-changes-rx)
  - [What are the current viewports?](#what-are-the-current-viewports)
  - [Install](#install)
  - [`breakpoints(breakpointDefinitions)`](#breakpointsbreakpointdefinitions)
    - [`breakpointsChanges$`](#breakpointschanges)
    - [`breakpointsChangesBehavior$`](#breakpointschangesbehavior)
    - [`getCurrentBreakpoints()`](#getcurrentbreakpoints)
    - [`breakpointsChange(bp)`](#breakpointschangebp)
    - [`breakpointsInRange(range)`](#breakpointsinrangerange)
    - [`includesBreakpoints(bps)`](#includesbreakpointsbps)
    - [`includesBreakpoint(bp)`](#includesbreakpointbp)
  - [Configuration](#configuration)
    - [Format](#format)
    - [`parseBreakpoints(object, config)`](#parsebreakpointsobject-config)
  - [License](#license)

For details about the breakpointDefinitions see [Configuration](#Configuration) section

```typescript
import breakpoints, { parseBreakpoints } from 'breakpoint-changes-rx'
import style from './style.scss'

const breakpointDefinitions = parseBreakpoints(style)

const bps = breakpoints(breakpointDefinitions)

console.log('current breakpoints: %o', bps.getCurrentBreakpoints())
```

### `breakpointsChanges$`

An [observable](https://rxjs-dev.firebaseapp.com/guide/observable) that emits a value when breakpoints change. The format of these values is

```typescript
{
  curr: ['md'],
  prev: ['lg'],
}
```

Usage example:

```typescript
bps.breakpointChanges$.subscribe(({
  curr,
  prev,
}) => {
  console.log('previous breakpoint is %o, actual breakpoint is %o', prev, curr)
})
```

Current and previous breakpoints are stored in arrays because it's possible to have multiple active breakpoints at the same time.

### `breakpointsChangesBehavior$`

This is the same as [`breakpointsChanges$`](#breakpointsChanges$) except it is a [`BehaviorSubject`](https://rxjs-dev.firebaseapp.com/guide/subject#behaviorsubject). So when a new Observer subscribes it will immediately emit the current breakpoint data.

### `getCurrentBreakpoints()`

Returns the current active breakpoints as an array.

```typescript
const current = bp.getCurrentBreakpoints()

console.log('current breakpoints are %o', current) // e.g. ['lg']
```

### `breakpointsChange(bp)`

Returns an observable that emits a `boolean` value when the given breakpoint gets entered or left.

```typescript
bp.breakpointsChange('md').subscribe((active) => {
  console.log('breakpoint md %s', active ? 'entered' : 'left')
})
```

### `breakpointsInRange(range)`

Returns an observable that emits a `boolean` value when a range of breakpoints gets entered or left. If a change appears between the given range no value gets emitted.

```typescript
bp.breakpointsInRange(['sm', 'md']).subscribe((active) => {
  console.log('range gets %s', active ? 'entered' : 'left')
})
```

### `includesBreakpoints(bps)`

Returns `true` if the current breakpoints contain breakpoints which are part of the given `array`.

```typescript
console.log('this might be a mobile device %o', bp.includesBreakpoints(['sm', 'md']))
```

### `includesBreakpoint(bp)`

Returns `true` if the given breakpoint is part of the current active breakpoints.

```typescript
console.log('breakpoint "md" is active %o', bp.includesBreakpoint('md'))
```

## Configuration

This section describes the configuration used by the [breakpoints(breakpointDefinitions)](#breakpoints(breakpointDefinitions)) function using this example

Breakpoint name | min    | max
----------------|----------|----------
sm              |          |  `767px`
md              |  `768px` |  `991px`
lg              |  `991px` | `1199px`
xl              | `1200px` |

### Format

The used format for this example is shown here:

```json
{
  "sm": { "max": "767px" },
  "md": { "min": "768px", "max": "991px" },
  "lg": { "min": "992px", "max": "1199px" },
  "xl": { "min": "1200px" }
}
```

The values for the `min`and `max` properties can also be of type `number`. In this case pixels as unit will be omitted.

### `parseBreakpoints(object, config)`

This function was created to parse breakpoint data from [exported variables of a CSS Module](https://github.com/css-modules/icss#specification).

```scss
:export {
  breakpoint-sm-max: $bp-small-max;
  breakpoint-md-min: $bp-medium;
  breakpoint-md-max: $bp-medium-max;
  breakpoint-lg-min: $bp-large;
  breakpoint-lg-max: $bp-large-max;
  breakpoint-xl-min: $bp-xlarge;
}
```

```typescript
import { parseBreakpoints } from 'breakpoint-changes-rx'
import style from './style.scss'

const breakpointDefinitions = parseBreakpoints(style)
```

It filters all properties of the passed object that matches the breakpoint pattern.

This function can use an optional configuration.

Name          | Description                                                                            | Default
--------------|----------------------------------------------------------------------------------------|--------------------------------------
`regex`       | A regular expression describing the breakpoint naming to parse                         | `/^breakpoint-(\w*)-((max)\|(min))$/`
`groupName`   | The index of the capture group that contains the name of the breakpoint                | `1`
`groupMinMax` | The capture group index that contains the identifier for min or max of the breakpoint  | `2`
`isMin`       | A function that returns `true` if the given min/max value represents min               | `(val) => val === nameMin`

## License

MIT © 2023 [Jens Simon](https://github.com/jenssimon)

[npm-url]: https://www.npmjs.com/package/breakpoint-changes-rx
[npm-image]: https://badgen.net/npm/v/breakpoint-changes-rx
[npm-downloads-image]: https://badgen.net/npm/dw/breakpoint-changes-rx

[gh-url]: https://github.com/jenssimon/breakpoint-changes-rx
[gh-stars-image]: https://badgen.net/github/stars/jenssimon/breakpoint-changes-rx
[gh-forks-image]: https://badgen.net/github/forks/jenssimon/breakpoint-changes-rx
[gh-status-image]: https://github.com/jenssimon/breakpoint-changes-rx/actions/workflows/ci.yml/badge.svg
[gh-status-url]: https://github.com/jenssimon/breakpoint-changes-rx/actions/workflows/ci.yml

[coveralls-url]: https://coveralls.io/github/jenssimon/breakpoint-changes-rx?branch=main
[coveralls-image]: https://coveralls.io/repos/github/jenssimon/breakpoint-changes-rx/badge.svg?branch=main
