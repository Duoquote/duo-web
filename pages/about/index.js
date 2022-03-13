import React from "react";
import {
  Box, Container
} from "@mui/material";

import useTranslation from "next-translate/useTranslation";

import AboutComp from "./About";

const About = () => {

  const { t, lang } = useTranslation("common");

  return (
    <Container fixed sx={{
      padding: 4,
      paddingTop: 10,
    }}>
      <AboutComp />
    </Container>
  )
}

export default About;