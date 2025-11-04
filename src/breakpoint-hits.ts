import { scan } from 'rxjs'


// convert it to the final breakpoint change object
const breakpointHits = <K>(initialBreakpoints: K[]) => scan((
  {
    curr: previous,
  },
  actual: {
    name: K,
    matches: boolean,
  }[],
) => {
  const current = [...previous] // add previous breakpoint but without the removed ones
  for (const { matches, name } of actual) {
    if (!matches) {
      const index = current.indexOf(name)
      /* istanbul ignore else */
      if (index !== -1) current.splice(index, 1)
    } else /* istanbul ignore else */ if (!current.includes(name)) current.push(name)
  }
  return {
    curr: current,
    prev: previous,
  }
}, {
  curr: initialBreakpoints,
  prev: [] as K[],
}) // initial value


export default breakpointHits
