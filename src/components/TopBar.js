import React from "react";

import Image from "next/image";
import Link from "next/link";
import Router from "next/router";

import useTranslation from "next-translate/useTranslation";

import {
  AppBar, Toolbar, IconButton, Button as MuiButton, ButtonGroup,
  Box, ToggleButton, ToggleButtonGroup,
  styled,
} from "@mui/material";

import Logo from "../../public/img/logo.svg";

const Button = styled(MuiButton)({
  fontWeight: 700,
  textShadow: "2px 2px 0 rgba(0, 0, 0, 0.5)",
})

const TopBar = () => {

  const { t, lang } = useTranslation("common");

  function changeLanguage(l) {
    Router.push('/', undefined, { locale: l })
  }

  return (
    <AppBar position="fixed">
      <Toolbar variant="dense">
        <Link href="/" passHref={true}>
          <IconButton size="small" edge="start" sx={{ mr: 2 }}>
            <Image src={Logo} />
          </IconButton>
        </Link>
        <Link href="/" passHref={true}>
          <Button color="secondary">
            {t("home")}
          </Button>
        </Link>
        <Link href="/about" passHref={true}>
          <Button color="secondary">
            {t("about")}
          </Button>
        </Link>
        <Link href="/geo" passHref={true}>
          <Button color="secondary">
            {t("geoeditor")}
          </Button>
        </Link>
        <Box component="span" flexGrow={1} />
        <ButtonGroup variant="outlined" size="small">
          <Link href="" locale="tr" passHref>
            <Button disabled={lang === "tr"}>
              TR
            </Button>
          </Link>
          <Link href="" locale="en" passHref>
            <Button disabled={lang === "en"}>
              EN
            </Button>
          </Link>
          <Link href="" locale="cn" passHref>
            <Button disabled>
              CN
            </Button>
          </Link>
        </ButtonGroup>
      </Toolbar>
    </AppBar>
  )
}

export default TopBar;