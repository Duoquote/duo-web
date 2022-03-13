import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    background: {
      default: "#061620",
      paper: "#1c2b36",
    },
    primary: {
      main: "#1de9b6",
    },
    secondary: {
      main: "#ff9800",
    },
    mode: "dark",
  },
  typography: {
    fontFamily: "SometypeMono, Roboto, sans-serif",
    h1: {
      fontFamily: "Poppins, Roboto, sans-serif",
    },
    h2: {
      fontFamily: "Poppins, Roboto, sans-serif",
    },
    h3: {
      fontFamily: "Poppins, Roboto, sans-serif",
    },
    h4: {
      fontFamily: "Poppins, Roboto, sans-serif",
    },
    h5: {
      fontFamily: "Poppins, Roboto, sans-serif",
    },
    h6: {
      fontFamily: "Poppins, Roboto, sans-serif",
    },
  },
});

export default theme;
