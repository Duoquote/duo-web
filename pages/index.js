import React, { useState } from "react";

import useTranslation from "next-translate/useTranslation";

import Link from "next/link";

import {
  Box, AppBar, Toolbar, IconButton, MenuIcon, Typography, Button,
  Grid, Paper, Popover,
} from "@mui/material";

import About from "./about/About";

const Index = () => {

  const { t, lang } = useTranslation("common");

  const [[targetPopover, anchorEl], setAnchorEl] = useState([null, null]);

  return (
    <React.Fragment>
      <Popover
        sx={{
          pointerEvents: "none",
          margin: 1,
        }}
        open={Boolean(anchorEl)}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl([null, null])}
        disableRestoreFocus
      >
        <Box sx={{ padding: 1, }}>
          {
            targetPopover === "about" && t("gotopage")
          }
        </Box>
      </Popover>
      <Box sx={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: 4,
        paddingTop: 10,
      }}>
        <Grid container spacing={4}>
          <Grid sx={{ height: "100%" }} item xs={12} md={6}>
            <Box
              component={Paper}
              sx={{
                height: "100%",
                display: "inline-flex",
                flexDirection: "column",
                padding: 4,
              }}
            >
              <Typography variant="h3" gutterBottom>
                {t("about")}
              </Typography>
              <Link href="/about" passHref>
                <Box
                  component={Paper}
                  variant="outlined"
                  onMouseEnter={(e) => setAnchorEl(["about", e.currentTarget])}
                  onMouseLeave={() => setAnchorEl([null, null])}
                  sx={{
                    height: "100%",
                    padding: 4,
                    overflowY: "scroll",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      cursor: "pointer",
                      backgroundColor: theme => theme.palette.primary.dark,
                    },
                  }}
                >
                  <About isCompact={true} />
                </Box>
              </Link>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box
              component={Paper}
              sx={{
                height: "100%",
                position: "relative",
              }}
            >
              <Box sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}>
                <Typography variant="h5">
                  {t("comingSoon")}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </React.Fragment>
  )
}

export default Index;