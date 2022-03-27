import geoReducer from "./geo";

import { combineReducers } from "redux";


const rootReducer = combineReducers({
  geo: geoReducer,
});

export default rootReducer;