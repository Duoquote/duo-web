import { configureStore } from "@reduxjs/toolkit";

import * as ui from "./reducers/ui";

const store = configureStore({
  reducer: {
    ui: ui.reducer,
  },
})

export const selectors = {
  ui: ui.selectors,
};

export const actions = {
  ui: ui.actions,
}

export default store;