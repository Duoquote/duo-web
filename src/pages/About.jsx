import React from "react";

import {
  Box, Container, Paper, Typography, GlobalStyles,
} from "@mui/material";

import pp from "../assets/images/pp.jpg";
import miau from "../assets/images/miau.jpg";

import { useTranslation } from "react-i18next";

const About = () => {

  const { t } = useTranslation();

  return (
    <React.Fragment>
      <Box sx={{
        height: "100%",
        width: "100%",
        pt: 6,
      }}>
        <Container maxWidth="md" sx={{ p: 4, height: "100%", display: "flex", flexDirection: "column" }}>
          <Box>
            <Box sx={{
              background: `url(${pp}) no-repeat center center`,
              backgroundSize: "cover",
              height: 256,
              width: 256,
              float: "right",
              borderRadius: 1,
              ml: 2,
              mb: 2,
            }} />
            <Typography variant="h4" gutterBottom>
              {t("about.title")}
            </Typography>
            <Typography variant="body1" gutterBottom>
              {t("about.description")}
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{
            background: `url(${miau}) no-repeat center center`,
            backgroundSize: "cover",
            height: 256,
            width: 256,
            borderRadius: 1,
            alignSelf: "center",
          }} />
        </Container>
      </Box>
    </React.Fragment>
  );
};

export default About;