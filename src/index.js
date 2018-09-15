import React from "react"
import ReactDOM from "react-dom"
import { componentFromStream, createEventHandler } from "recompose"
import {
  map,
  startWith,
  tap,
  filter,
  debounceTime,
  skip,
  delayWhen,
  scan,
  mapTo,
  finalize,
  concatMap,
  flatMap,
  catchError
} from "rxjs/operators"
import * as Rx from "rxjs"
import { InputGroup, Checkbox, Button, Callout, Spinner } from "@blueprintjs/core"

import "@blueprintjs/icons/lib/css/blueprint-icons.css"
import "@blueprintjs/core/lib/css/blueprint.css"

import "./styles.css"

import "./observableConfig"
import * as api from "./api/paste.rs"
//import * as api from "./api/fake"

const App = componentFromStream(prop$ => {
  const listId = localStorage.getItem("listId") || ""
  const listId$ = new Rx.BehaviorSubject(listId)
  const todo$ = new Rx.BehaviorSubject([])

  listId$.subscribe(id => localStorage.setItem("listId", id))

  const loading$ = new Rx.BehaviorSubject(0)
  const showLoading$ = loading$.pipe(
    // NOTE: allow some grace time before showing the loading indicator
    delayWhen(x => Rx.interval(x > 0 ? 2000 : 0)),
    scan((acc, value) => acc + value, 0),
    map(x => x > 0)
  )

  const saveTodo$ = new Rx.BehaviorSubject([])
  saveTodo$
    .pipe(
      skip(1),
      debounceTime(1000),
      tap(() => loading$.next(1)),
      concatMap(todos =>
        api.save(todos).pipe(
          map(newId => {
            const oldId = listId$.getValue()
            listId$.next(newId)
            return oldId
          }),
          flatMap(id => api.delete_(id).pipe(
            catchError(err => { console.error(err); return Rx.of(null) }),
          )),
          finalize(() => loading$.next(-1)),
        )
      ),
    )
    .subscribe()

  const { handler: loadListHandler, stream: loadListStream } = createEventHandler()
  const loadListId$ = loadListStream.pipe(
    map(e => e.target.value),
    startWith(listId)
  )
  loadListId$
    .pipe(
      debounceTime(1000),
      filter(id => !!id)
    )
    .subscribe(listId => {
      loading$.next(1)
      api.load(listId).subscribe({
        next: todos => {
          todo$.next(todos)
          listId$.next(listId)
        },
        complete: () => loading$.next(-1)
      })
    })

  const { handler: newEntryHandler, stream: newEntryStream } = createEventHandler()
  const { handler: addNewEntryHandler, stream: addNewEntryStream } = createEventHandler()
  const newEntry$ = Rx.merge(
    newEntryStream.pipe(
      map(e => e.target.value),
      startWith("")
    ),
    addNewEntryStream.pipe(
      filter(e => e.key === "Enter" && !!e.target.value),
      map(e => [...todo$.getValue(), { checked: false, label: e.target.value }]),
      tap(todos => todo$.next(todos)),
      tap(todos => saveTodo$.next(todos)),
      map(() => "")
    )
  )

  const { handler: checkHandler, stream: checkStream } = createEventHandler()
  checkStream.subscribe(i => {
    const todos = [...todo$.getValue()]
    todos[i].checked = !todos[i].checked
    todo$.next(todos)
    saveTodo$.next(todos)
  })

  const { handler: deleteHandler, stream: deleteStream } = createEventHandler()
  deleteStream.subscribe(i => {
    const todos = todo$.getValue()
    todos.splice(i, 1)
    todo$.next(todos)
    saveTodo$.next(todos)
  })

  const { handler: deleteListHandler, stream: deleteListStream } = createEventHandler()
  deleteListStream.subscribe(() => {
    todo$.next([])
    saveTodo$.next([])
  })

  return Rx.combineLatest(
    prop$,
    Rx.merge(loadListId$, listId$),
    newEntry$,
    todo$,
    showLoading$
  ).pipe(
    //tap(console.warn), // NOTE: debug
    map(([props, id, newEntry, todos, loading]) => (
      <div className="App bp3-dark">
        <div className="AppElement">
          <div className="ListId">
            <div style={{ flexGrow: 1 }}>
              <InputGroup
                placeholder="ID"
                onChange={loadListHandler}
                value={id}
                rightElement={loading ? <Spinner size={18} /> : undefined}
              />
            </div>
            <div>
              <Button icon="delete" onClick={deleteListHandler} />
            </div>
          </div>
        </div>
        <div className="AppElement">
          <InputGroup
            placeholder="new entry"
            onChange={newEntryHandler}
            onKeyPress={addNewEntryHandler}
            value={newEntry}
          />
        </div>
        {todos.length === 0 && (
          <div className="AppElement">
            <Callout>The list is empty.</Callout>
          </div>
        )}
        <ul className="Todo AppElement">
          {todos.map(({ checked, label }, i) => (
            <li key={i}>
              <div style={{ flexGrow: 1 }}>
                <Checkbox large checked={checked} onChange={() => checkHandler(i)}>
                  {label}
                </Checkbox>
              </div>
              <div>
                <Button icon="delete" onClick={() => deleteHandler(i)} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    ))
  )
})

const rootElement = document.getElementById("root")
ReactDOM.render(<App />, rootElement)
