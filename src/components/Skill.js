import React from "react";

import {
  Box, Paper, Typography, LinearProgress, Divider,
  styled,
} from "@mui/material";

const Level = styled(LinearProgress)(({ theme }) => ({
  height: 16,
}));

const Skill = ({ name, rate, color="info" }) => {
  return (
    <React.Fragment>
      <Box component={Paper} sx={{ paddingTop: 1, overflow: "hidden" }}>
        <Typography variant="h6" fontWeight="bold" sx={{ marginLeft: 2, marginBottom: 1 }}>
          {name}
        </Typography>
        {/* <Divider /> */}
        <Level color={color} variant="determinate" value={rate} />
      </Box>
    </React.Fragment>
  )
}

export default Skill;