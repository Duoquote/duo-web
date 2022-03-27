import { useMemo } from "react";
import { createStore, applyMiddleware } from "redux";
import thunkMiddleware from "redux-thunk";
import { composeWithDevTools } from "redux-devtools-extension";
import rootReducer from "./reducers";

let store;

const initStore = (state) => {
  return createStore(
    rootReducer,
    state,
    composeWithDevTools(applyMiddleware(thunkMiddleware))
  )
}

export const makeStore = (preloadedState) => {
  let _store = store ?? initStore(preloadedState);

  if (preloadedState && store) {
    _store = initStore({
      ...store.getState(),
      ...preloadedState,
    });

    store = undefined;
  }

  if (typeof window === 'undefined') return _store;

  if (!store) store = _store;

  return _store;
}

export const useStore = (state) => {
  const store = useMemo(() => makeStore(state), [state]);
  return store;
}