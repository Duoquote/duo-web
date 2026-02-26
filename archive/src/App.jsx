import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { selectors } from "./redux/store";

import { Box } from "@mui/material";
import { CssBaseline, ThemeProvider, GlobalStyles } from "@mui/material";
import * as themes from "./themes";
import Header from "./components/Header";

import Pages from "./pages";

import { Outlet, useLocation } from "react-router-dom";

const App = ({ isDarkMode, children }) => {

  const [theme, setTheme] = useState(isDarkMode ? themes.dark : themes.light);
  const location = useLocation();

  useEffect(() => {
    setTheme(isDarkMode ? themes.dark : themes.light);
  }, [isDarkMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={{
        body: {
          height: "100%",
          width: "100%",
          margin: 0,
        },
        html: {
          height: "100%",
          width: "100%",
        },
        "#root": {
          height: "100%",
          width: "100%",
        },
        "*::-webkit-scrollbar": {
          width: "0.8em",
        },
        "*::-webkit-scrollbar-track": {
          boxShadow: "inset 0 0 6px rgba(0, 0, 0, 0)",
        },
        "*::-webkit-scrollbar-thumb": {
          backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.356)" : "rgba(0, 0, 0, 0.356)",
        },
        "*::-webkit-scrollbar-corner": {
          backgroundColor: "transparent",
        },
        "@keyframes breath": {
          "0%": {
            transform: "scale(1)",
          },
          "50%": {
            transform: "scale(1.1)",
          },
          "100%": {
            transform: "scale(1)",
          },
        },
      }} />
      <Header />
      {children}
      <Outlet />
    </ThemeProvider>
  );
};

export default connect(state => ({
  isDarkMode: selectors.ui.getTheme(state),
}))(App);