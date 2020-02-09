[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads-image]][npm-url] [![Dependencies][deps-image]][deps-url] [![star this repo][gh-stars-image]][gh-url] [![fork this repo][gh-forks-image]][gh-url] [![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url] ![Code Style][codestyle-image]

# breakpoint-changes-rx

> Detect and handle breakpoint changes using RxJS Observables

This package helps to detect current breakpoints and breakpoint changes. It initializes with a breakpoint configuration and provides Observables and useful functions.
Multiple breakpoints at the same time are supported.


## Install

```sh
$ yarn add breakpoint-changes-rx
```

## `breakpoints(breakpointDefinitions)`

This function initializes the breakpoint detection and returns an object containing following properties:

- [`breakpointsChanges$`](#breakpointsCHanges$)
- [`breakpointsChangesBehavior$`](#breakpointsChangesBehavior$)
- [`breakpointsChange(bp)`](#breakpointsChange(bp))
- [`breakpointsInRange(range)`](#breakpointsInRange(range))
- [`getCurrentBreakpoints()`](#getCurrentBreakpoints())
- [`includesBreakpoints(bps)`](#includesBreakpoints(bps))
- [`includesBreakpoint(bp)`](#includesBreakpoint(bp))

> ℹ️ [`window.matchMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia) and [`MediaQueryList.addListener()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList/addListener) are used so only browsers supporting this features can be used.

For details about the breakpointDefinitions see [Configuration](#Configuration) section

```javascript
import breakpoints, { parseBreakpoints } from 'breakpoint-changes-rx';
import style from './style.scss';

const breakpointDefinitions = parseBreakpoints(style);

const bps = breakpoints(breakpointDefinitions);

console.log('current breakpoints: %o', bps.getCurrentBreakpoints());
```

### `breakpointsChanges$`

An [observable](https://rxjs-dev.firebaseapp.com/guide/observable) that emits a value when breakpoints change. The format of these values is

```javascript
{
  curr: ['md'],
  prev: ['lg'],
}
```

Usage example:

```javascript
bps.breakpointChanges$.subscribe(({ curr, prev }) => {
  console.log('previous breakpoint is %o, actual breakpoint is %o', prev, curr);
});
```

Current and previous breakpoints are stored in arrays because it's possible to have multiple active breakpoints at the same time.

### `breakpointsChangesBehavior$`

This is the same as [`breakpointsChanges$`](#breakpointsChanges$) except it is a [`BehaviorSubject`](https://rxjs-dev.firebaseapp.com/guide/subject#behaviorsubject). So when a new Observer subscribes it will immediately emit the current breakpoint data.

### `getCurrentBreakpoints()`

Returns the current active breakpoints as an array.

```javascript
const current = bp.getCurrentBreakpoints();

console.log('current breakpoints are %o', current); // e.g. ['lg']
```

### `breakpointsChange(bp)`

Returns an observable that emits a `boolean` value when the given breakpoint gets entered or left.

```javascript
bp.breakpointsChange('md').subscribe((active) => {
  console.log('breakpoint md %s', active ? 'entered' : 'left');
});
```

### `breakpointsInRange(range)`

Returns an observable that emits a `boolean` value when a range of breakpoints gets entered or left. If a change appears between the given range no value gets emitted.

```javascript
bp.breakpointsInRange(['sm', 'md']).subscribe((active) => {
  console.log('range gets %s', active ? 'entered' : 'left');
});
```

### `includesBreakpoints(bps)`

Returns `true` if the current breakpoints contain breakpoints which are part of the given `array`.

```javascript
console.log('this might be a mobile device %o', bp.includesBreakpoints(['sm', 'md']));
```

### `includesBreakpoint(bp)`

Returns `true` if the given breakpoint is part of the current active breakpoints.

```javascript
console.log('breakpoint "md" is active %o', bp.includesBreakpoint('md'));
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
  "sm": { "max": "767px", },
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

```javascript
import { parseBreakpoints } from 'breakpoint-changes-rx';
import style from './style.scss';

const breakpointDefinitions = parseBreakpoints(style);
```

It filters all properties of the passed object that matches the breakpoint pattern.

This function can use an optional configuration.

Name          | Description                                                                            | Default
--------------|----------------------------------------------------------------------------------------|--------------------------------------
`regex`       | A regular expression describing the breakpoint naming to parse                         | `/^breakpoint-(\w*)-((max)|(min))$/`
`groupName`   | The index of the capture group that contains the name of the breakpoint                | `1`
`groupMinMax` | The capture group index that contains the identifier for min or max of the breakpoint  | `2`
`isMin`       | A function that returns `true` if the given min/max value represents min               | `(val) => val === nameMin`

## License

MIT © 2020 [Jens Simon](https://github.com/jenssimon)

[npm-url]: https://www.npmjs.com/package/breakpoint-changes-rx
[npm-image]: https://badgen.net/npm/v/breakpoint-changes-rx
[npm-downloads-image]: https://badgen.net/npm/dw/breakpoint-changes-rx

[deps-url]: https://david-dm.org/jenssimon/breakpoint-changes-rx
[deps-image]: https://badgen.net/david/dep/jenssimon/breakpoint-changes-rx

[gh-url]: https://github.com/jenssimon/breakpoint-changes-rx
[gh-stars-image]: https://badgen.net/github/stars/jenssimon/breakpoint-changes-rx
[gh-forks-image]: https://badgen.net/github/forks/jenssimon/breakpoint-changes-rx

[travis-url]: https://travis-ci.com/jenssimon/breakpoint-changes-rx
[travis-image]: https://travis-ci.com/jenssimon/breakpoint-changes-rx.svg?branch=master

[coveralls-url]: https://coveralls.io/github/jenssimon/breakpoint-changes-rx?branch=master
[coveralls-image]: https://coveralls.io/repos/github/jenssimon/breakpoint-changes-rx/badge.svg?branch=master

[codestyle-image]: https://badgen.net/badge/code%20style/airbnb/f2a
