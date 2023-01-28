const types = {
  SET_THEME: "ui/setTheme",
}

const initialState = {
  theme: "dark",
};

export const reducer = (state = initialState, action) => {
  switch (action.type) {
    case types.SET_THEME:
      return { ...state, theme: action.theme };
    default:
      return state;
  }
};

export const actions = {
  setTheme: theme => ({ type: types.SET_THEME, theme }),
}

export const selectors = {
  getTheme: state => state.ui.theme,
}

export default reducer;