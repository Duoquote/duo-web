import React from "react";

import {
  Box, Container, Paper,
} from "@mui/material";

import { alpha, useTheme } from "@mui/material";

import logo from "../assets/images/logo.svg";

const Main = () => {

  const theme = useTheme();

  return (
    <Box sx={{
      height: "100%",
      width: "100%",
      overflowY: "auto",
    }}>
      <Container maxWidth="md" sx={{ position: "relative" }}>
        <Box sx={{ mt: 10, mb: 6 }}>
          <Box
            component="img"
            src={logo}
            sx={{
              width: 256,
              mx: "auto",
              display: "block",
              filter: "drop-shadow(0px 0px 6px black)",
              animation: "breath 2s infinite",
            }}
          />
        </Box>
        <Box sx={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          mb: 6,
          gap: 1,
        }}>
          <a target="_blank" href="https://www.linkedin.com/in/duoquote/">
            <img src="https://img.shields.io/badge/linkedin-%230077B5.svg?style=for-the-badge&logo=linkedin&logoColor=white" alt="Duoquote" />
          </a>
          <a target="_blank" href="https://www.hackerrank.com/Duoquote">
            <img src="https://img.shields.io/badge/-Hackerrank-2EC866?style=for-the-badge&logo=HackerRank&logoColor=white" alt="Duoquote" />
          </a>
          <a target="_blank" href="https://stackoverflow.com/users/7493063/guven-degirmenci?tab=profile">
            <img src="https://img.shields.io/badge/-Stackoverflow-FE7A16?style=for-the-badge&logo=stack-overflow&logoColor=white" alt="Duoquote" />
          </a>
          <a target="_blank" href="https://steamcommunity.com/id/duoquote">
            <img src="https://img.shields.io/badge/steam-%23000000.svg?style=for-the-badge&logo=steam&logoColor=white" alt="Duoquote" />
          </a>
          <a target="_blank" href="https://www.instagram.com/duoquote/">
            <img src="https://img.shields.io/badge/Instagram-%23E4405F.svg?style=for-the-badge&logo=Instagram&logoColor=white" alt="Duoquote" />
          </a>
          <a target="_blank" href="https://www.facebook.com/Duoquote">
            <img src="https://img.shields.io/badge/Facebook-%231877F2.svg?style=for-the-badge&logo=Facebook&logoColor=white" alt="Duoquote" />
          </a>
        </Box>
        <Box
          sx={{
            mx: "auto",
            display: "block",
            border: theme => `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
            mb: 6,
            width: "100%",
            maxWidth: 512,
          }}
          component="img"
          src={`https://github-readme-stats.vercel.app/api/wakatime?username=duoquote&theme=dark&text_color=${theme.palette.text.primary.slice(1)}&bg_color=${theme.palette.background.default.slice(1)}&border_radius=0&hide_border=true&layout=compact&langs_count=8&custom_title=Coding%20Time%20Stats`}
        />
      </Container>
    </Box>
  );
};

export default Main;