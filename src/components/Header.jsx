import React, { useEffect } from "react";

import {
  AppBar, Toolbar, IconButton, Typography, Button, Box,
  useTheme, lighten, alpha,
} from "@mui/material";

import { useNavigate, useLocation } from "react-router-dom";

import {
  MdHome,
} from "react-icons/md";

import logo from "../assets/images/logo.svg";

const Header = ({ }) => {

  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AppBar style={{
      background: location.pathname === "/" ? `linear-gradient(${alpha(theme.palette.primary.main, 0.1)}, rgb(255 255 255 / 0%))` : undefined,
      boxShadow: location.pathname === "/" ? "none" : undefined,
    }} sx={{
      transition: theme => theme.transitions.create(["background-color", "box-shadow"], {
        duration: theme.transitions.duration.short,
      }),
    }} position="fixed">
      <Toolbar style={{
        height: location.pathname === "/" ? 96 : 48,
      }} sx={{
        transition: theme => theme.transitions.create(["height"], {
          duration: theme.transitions.duration.short,
        }),
      }} variant="dense">
        <Button
          onClick={() => navigate("/")}
          size="small"
          variant="contained"
          color="inherit"
          style={{
            backgroundColor: location.pathname === "/" ? "#ffffff00" : theme.palette.text.primary,
            boxShadow: location.pathname === "/" ? "none" : undefined,
            color: location.pathname === "/" ? theme.palette.getContrastText(theme.palette.background.default) : theme.palette.getContrastText(theme.palette.text.primary),
          }}
          sx={{
            mr: 2,
            transition: theme => theme.transitions.create(["background-color", "box-shadow", "color"], {
              duration: theme.transitions.duration.short,
            }),
          }}
        >
          <Box sx={{
            width: 24,
            height: 24,
            backgroundImage: `url(${logo})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            mr: 1,
          }} />
          <Typography fontWeight="bold" variant="subtitle2" textTransform="capitalize">
            Güven Değirmenci
          </Typography>
        </Button>
        <Button onClick={() => navigate("/about")}>
          About
        </Button>
        <Box component="span" sx={{ flexGrow: 1 }} />
        {/* <Button color="inherit">Login</Button> */}
      </Toolbar>
    </AppBar>
  );
};

export default Header;