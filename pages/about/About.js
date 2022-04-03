import React, { useEffect } from "react";

import useTranslation from "next-translate/useTranslation";
import Trans from "next-translate/Trans";

import {
  Box, AppBar, Toolbar, IconButton, MenuIcon, Typography, Button,
  Grid, Paper, Divider,
  styled
} from "@mui/material";

const HL = styled("span")(({ theme }) => ({
  fontWeight: "bold",
  color: theme.palette.secondary.main,
  textDecoration: "underline",
}))

import Skill from "../../src/components/Skill";

const languages = [
  {
    name: "python",
    rate: 95,
  },
  {
    name: "javascript",
    rate: 90,
  },
  {
    name: "dart",
    rate: 20,
  },
]

const frameworks = [
  {
    name: "react",
    rate: 95,
  },
  {
    name: "django",
    rate: 90,
  },
  {
    name: "nextjs",
    rate: 80,
  },
  {
    name: "electronjs",
    rate: 60,
  },
  {
    name: "leafletjs",
    rate: 60,
  },
  {
    name: "flask",
    rate: 50,
  },
  {
    name: "flutter",
    rate: 40,
  },
]

const techs = [
  {
    name: "postgres",
    rate: 95,
  },
  {
    name: "docker",
    rate: 90,
  },
  {
    name: "sql",
    rate: 85,
  },
  {
    name: "git",
    rate: 70,
  },
  {
    name: "mongodb",
    rate: 40,
  },
  {
    name: "redis",
    rate: 20,
  },
]

const other = [
  {
    name: "dataMining",
    rate: 85,
  },
  {
    name: "geospatial",
    rate: 80,
  },
  {
    name: "photoshop",
    rate: 70,
  },
]


const About = ({ isCompact = false }) => {

  const { t, lang } = useTranslation("common");

  return (
    <React.Fragment>
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Typography variant="subtitle">
            {t("introduction1")}
          </Typography>
          <Typography
            fontFamily="Poppins"
            fontWeight="bold"
            variant={isCompact ? "h3" : "h2"}
            color="primary"
            gutterBottom
            sx={{
              textDecoration: "underline",
            }}
          >
            Güven Değirmenci
          </Typography>
          <Typography gutterBottom variant="h6">
            <Trans i18nKey="common:introduction2" components={[<HL key="elem" />]}>
              I am <HL>Python</HL>, <HL>Javascript</HL> and <HL>Flutter</HL> developer.
            </Trans>
          </Typography>
          <Divider />
          <br></br>
          <Typography gutterBottom variant="h3">
            {t("skillsSection")}
          </Typography>
          <Typography sx={{ textDecoration: "underline" }} gutterBottom color="primary" variant={"h4"}>
            {t("languagesSection")}
          </Typography>
          <Grid container spacing={1}>
            {
              languages.map(skill => (
                <Grid key={skill.name} item xs={isCompact ? 12 : 4}>
                  <Skill
                    name={t(`skills.${skill.name}`)}
                    rate={skill.rate}
                  />
                </Grid>
              ))
            }
          </Grid>
          <br></br>
          <br></br>
          <Typography sx={{ textDecoration: "underline" }} gutterBottom color="primary" variant={"h4"}>
            {t("frameworkSection")}
          </Typography>
          <Grid container spacing={1}>
            {
              frameworks.map(skill => (
                <Grid key={skill.name} item xs={isCompact ? 12 : 4}>
                  <Skill
                    name={t(`skills.${skill.name}`)}
                    rate={skill.rate}
                    color="secondary"
                  />
                </Grid>
              ))
            }
          </Grid>
          <br></br>
          <br></br>
          <Typography sx={{ textDecoration: "underline" }} gutterBottom color="primary" variant={"h4"}>
            {t("techSection")}
          </Typography>
          <Grid container spacing={1}>
            {
              techs.map(skill => (
                <Grid key={skill.name} item xs={isCompact ? 12 : 4}>
                  <Skill
                    name={t(`skills.${skill.name}`)}
                    rate={skill.rate}
                    color="error"
                  />
                </Grid>
              ))
            }
          </Grid>
          <br></br>
          <br></br>
          <Typography sx={{ textDecoration: "underline" }} gutterBottom color="primary" variant={"h4"}>
            {t("otherSection")}
          </Typography>
          <Grid container spacing={1}>
            {
              other.map(skill => (
                <Grid key={skill.name} item xs={isCompact ? 12 : 4}>
                  <Skill
                    name={t(`skills.${skill.name}`)}
                    rate={skill.rate}
                    color="error"
                  />
                </Grid>
              ))
            }
          </Grid>
        </Grid>
      </Grid>
    </React.Fragment>
  );
}

export default About;