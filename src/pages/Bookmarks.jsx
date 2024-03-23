import React, { useState } from "react";

import {
  Box, Container, Paper, Typography, Grid,
  Card,
  Tooltip,
} from "@mui/material";

const Pin = ({ url, name, description }) => {

  return (
    <Grid item xs={12} sm={6} md={4}>
      <Tooltip title={description} arrow>
        <Paper
          title={description}
          variant="outlined"
          sx={{
            p: 2,
            cursor: "pointer",
          }}
          onClick={() => window.open(url, "_blank")}
        >
          <Typography variant="h5" gutterBottom>
            {name}
          </Typography>
          <Typography variant="body2" gutterBottom>
            {url}
          </Typography>
        </Paper>
      </Tooltip>
    </Grid>
  )
}

const Bookmarks = () => {

  return (
    <Container>
      <Box sx={{
        height: "100%",
        width: "100%",
        pt: 6,
      }}>
        <Container maxWidth="md" sx={{
          p: 4,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: "100%"
        }}>
          <Grid container spacing={2}>
            <Pin
              name="BBOX Finder"
              url="http://bboxfinder.com/"
              description="A tool to get bounding boxes."
            />
            <Pin
              name="Geohash Converter"
              url="http://geohash.co/"
              description="A tool to convert geohash to coordinates."
            />
            <Pin
              name="GeoJSON.io"
              url="http://geojson.io/"
              description="A tool to play with areas and create/edit GeoJSON data type."
            />
            <Pin
              name="HERE Playground"
              url="https://refclient.ext.here.com/"
              description="HERE REST API Playground."
            />
            <Pin
              name="Photopea"
              url="https://www.photopea.com/"
              description="A Photoshop-like online image editor."
            />
            <Pin
              name="Eraser"
              url="https://www.eraser.io/"
              description="Documents & diagrams editor."
            />
          </Grid>
        </Container>
      </Box>
    </Container>
  );
};

export default Bookmarks;