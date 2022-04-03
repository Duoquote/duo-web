import React from "react";
import {
  Box, Container
} from "@mui/material";

import dynamic from "next/dynamic";

import useTranslation from "next-translate/useTranslation";

import Editor from "./Editor";

const Geo = () => {

  const { t, lang } = useTranslation("common");

  return (
    <Box fixed sx={{
      padding: 4,
      paddingTop: 10,
      height: "100%",
    }}>
      <Editor />
    </Box>
  )
}

export default Geo;