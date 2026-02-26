import { createTheme } from "@mui/material";
import { merge } from "lodash";

const base = {
  palette: {
    primary: {
      main: "#e78c30",
    },
    secondary: {
      main: "#ca2d2a",
    },
  },
  typography: {
    fontFamily: [
      "Poppins",
      "-apple-system",
      "BlinkMacSystemFont",
      "\"Segoe UI\"",
      "Roboto",
      "\"Helvetica Neue\"",
      "Arial",
      "sans-serif",
      "\"Apple Color Emoji\"",
      "\"Segoe UI Emoji\"",
      "\"Segoe UI Symbol\"",
    ].join(","),
  },
};

export const light = createTheme(base);

export const dark = createTheme(merge({}, base, {
  palette: {
    mode: "dark",
  },
}));

export default createTheme(base);
