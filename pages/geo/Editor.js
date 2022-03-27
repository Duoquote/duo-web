import React, { useEffect, useState, useRef } from "react";

import Editor, { DiffEditor, useMonaco, loader } from "@monaco-editor/react";
import { SizeMe } from "react-sizeme";

import useTranslation from "next-translate/useTranslation";
import Trans from "next-translate/Trans";

import {
  Box, AppBar, Toolbar, IconButton, MenuIcon, Typography, Button,
  Grid, Paper, Divider, Tooltip,
  styled
} from "@mui/material";

import {
  MdPreview,
  MdCenterFocusWeak,
} from "react-icons/md";

// import geojsonhint from "@mapbox/geojsonhint/lib";

import { connect, useDispatch } from "react-redux";
import { actions } from "../../redux/reducers/geo";

const Map = dynamic(() => import("./Map"), { ssr: false })


const GeoEditor = ({ geo }) => {

  const editorRef = useRef(null);

  const dispatch = useDispatch();

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor; 
  }

  const handleEditorChange = (val, event) => {

    try {
      dispatch(actions.setGeometry(JSON.parse(val)));
    } catch (error) {
      console.log(error);
      dispatch(actions.setGeometry(null));
    }
  }

  // useEffect(() => console.log(editorRef.current), [editorRef.current])

  return (
    <React.Fragment>
      <Grid sx={{ height: "100%" }} container spacing={2}>
        <Grid sx={{ height: "100%" }} item xs={6}>
          <Map />
        </Grid>
        <Grid sx={{ height: "100%" }} item xs={6}>
          <Box
            sx={{
              borderRadius: 2,
              overflow: "hidden",
              height: "100%",
            }}
          >
            <AppBar position="relative">
              <Toolbar variant="dense">
                <Tooltip title="Önizle">
                  <IconButton disabled>
                    <MdPreview />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Geometriyi Ortala">
                  <IconButton disabled>
                    <MdCenterFocusWeak />
                  </IconButton>
                </Tooltip>
              </Toolbar>
            </AppBar>
            <SizeMe monitorHeight>
              {({ size }) => (
                <Editor
                  theme="vs-dark"
                  height={size.height}
                  onChange={handleEditorChange}
                  defaultValue={'{\n    "type": "FeatureCollection",\n    "features": []\n}'}
                  defaultLanguage="json"
                  onMount={handleEditorDidMount}
                  onValidate={(e) => console.log(e)}
                />
              )}
            </SizeMe>
          </Box>
        </Grid>
      </Grid>
    </React.Fragment>
  );
}

export default connect(state => ({
  geo: state.geo,
}))(GeoEditor);