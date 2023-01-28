import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { selectors } from "./redux/store";

import { Box } from "@mui/material";
import { CssBaseline, ThemeProvider, GlobalStyles } from "@mui/material";
import * as themes from "./themes";
import Header from "./components/Header";

import Pages from "./pages";

import { Outlet, useLocation } from "react-router-dom";

import background from "./assets/images/background-minified.jpg";

const Background = () => {

  return (
    <Box sx={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
    }}>
      <Box sx={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "110%",
        height: "110%",
        backgroundImage: `url(${background})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        },
      }} />
    </Box>
  )
};

const App = ({ isDarkMode }) => {

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
      <Box sx={{
        overflow: "hidden",
        width: "100%",
        height: "100%",
        position: "absolute",
      }}>
        <Box style={{
          top: location.pathname === "/" ? 0 : -100,
          opacity: location.pathname === "/" ? 1 : 0,
        }} sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          transition: theme => theme.transitions.create(["top", "opacity"], {
            duration: theme.transitions.duration.short,
          }),
        }}>
          <Background />
          <Pages.Main />
        </Box>
      </Box>
      <Outlet />
    </ThemeProvider>
  );
};

export default connect(state => ({
  isDarkMode: selectors.ui.getTheme(state),
}))(App);