const ACTION_TYPES = {
  SET_GEOMETRY: "geo/setGeometry",
}

const setGeometry = (data) => {
  return {
    type: ACTION_TYPES.SET_GEOMETRY,
    data,
  }
}

export const actions = {
  setGeometry,
}

const initialState = {
  geometry: null,
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case ACTION_TYPES.SET_GEOMETRY:
      return {
        ...state,
        geometry: action.data,
      }
    default:
      return state
  }
}

export default reducer;