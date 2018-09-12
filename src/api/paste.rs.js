import * as Rx from "rxjs"
import { tap, flatMap, map } from "rxjs/operators"

const URL = "https://paste.rs"

export const save = todos => {
  if (todos.length === 0) {
    return Rx.of("")
  }

  const body = todos
    .map(({ checked, label }) => `[${checked ? "x" : " "}] ${label}`)
    .join("\n")

  return Rx.from(fetch(URL, { method: "POST", body })).pipe(
    flatMap(response => response.text()),
    tap(url => console.log("New paste created: ", url)),
    map(url => url.match(/\w+$/)[0])
  )
}

export const load = id =>
  Rx.from(fetch(`${URL}/${id}`)).pipe(
    tap(response => console.log("Loaded paste: ", response.url)),
    flatMap(response => response.text()),
    flatMap(x =>
      x.trim().split("\n")
        .map(x => x.match(/^\s*\[([x ])\]\s*(.*\S)\s*$/))
        .filter(x => !!x)
        .map(x => ({
          checked: x[1] === "x",
          label: x[2]
        })))
  )

export const delete_ = id =>
  Rx.from(fetch(`${URL}/${id}`, { method: "DELETE" })).pipe(
    tap(response => console.log("Deleted paste: ", response.url))
  )
