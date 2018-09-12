import * as Rx from "rxjs"
import { delay, tap } from "rxjs/operators"

const DELAY = 3000

export const save = todos => {
  if (todos.length === 0) {
    return Rx.of("")
  }

  const s = todos
    .map(({ checked, label }) => `[${checked ? "x" : " "}] ${label}`)
    .join("\n")
  console.log("save:", s)

  return Rx.of(new Date().getTime().toString()).pipe(
    delay(DELAY),
    tap(x => console.log("saved", todos.length, "to:", x))
  )
}

export const load = id => {
  console.log("load list:", id)

  return Rx.of([
    { checked: true, label: "foo" },
    { checked: false, label: "bar" }
  ]).pipe(delay(DELAY))
}

export const delete_ = id => {
  if (!id) {
    return Rx.of(null)
  }
  console.log("delete list:", id)

  return Rx.of(null).pipe(
    delay(DELAY),
    tap(() => console.log("deletion completed"))
  )
}
