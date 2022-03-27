import L from "leaflet";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { SizeMe } from "react-sizeme";
import useTranslation from "next-translate/useTranslation";

import {
  Box, Grid, Paper, Divider,
} from "@mui/material";

import { connect, useDispatch } from "react-redux";
import { actions } from "../../redux/reducers/geo";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

const Map = ({ geo }) => {

  const { t, lang } = useTranslation("common");

  useEffect(() => console.log(geo.geometry), [geo.geometry]);

  return (
    <SizeMe refreshMode="throttle" monitorHeight>
      {({ size }) => (
        <Box
          component={MapContainer}
          center={[0, 0]}
          zoom={2}
          sx={{
            height: size.height,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <TileLayer
            // attribution='&copy; <a href="https://www.google.com/maps ">Google Maps</a>'
            url={`https://mt{s}.google.com/vt/lyrs=m&hl=${lang}&x={x}&y={y}&z={z}`}
            subdomains={["0", "1", "2", "3"]}
          />
          <GeoJSON data={geo.geometry} key={Date.now().toString()} />
        </Box>
      )}
    </SizeMe>
  )
}


export default connect(state => ({
  geo: state.geo,
}))(Map);