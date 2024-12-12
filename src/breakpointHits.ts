import { scan } from 'rxjs'

// convert it to the final breakpoint change object
const breakpointHits = <K>(initialBreakpoints: K[]) => scan((
  {
    curr: prev,
  },
  actual: {
    name: K
    matches: boolean
  }[],
) => {
  const curr = [...prev] // add previous breakpoint but without the removed ones
  actual.forEach(({ matches, name }) => {
    // eslint-disable-next-line sonarjs/no-selector-parameter
    if (!matches) {
      const idx = curr.indexOf(name)
      /* istanbul ignore else */
      if (idx !== -1) curr.splice(idx, 1)
    } else /* istanbul ignore else */ if (!curr.includes(name)) curr.push(name)
  })
  return {
    curr,
    prev,
  }
}, {
  curr: initialBreakpoints,
  prev: [] as K[],
}) // initial value

export default breakpointHits
