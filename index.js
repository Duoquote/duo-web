const http = require("http"),
      https = require("https"),
      express = require("express"),
      app = express(),
      compression = require("compression"),
      path = require("path"),
      fs = require("fs"),
      config = require("./config.js"),
      cookieParser = require("cookie-parser"),
      data = require("./data.js")

//       Sentry = require("@sentry/node")
//
// Sentry.init({ dsn: "https://8fe9d7e1290f4e0a8d2fd2a0a05a2dd9@sentry.io/4845641" });
//
// app.use(Sentry.Handlers.requestHandler());

//console.log(JSON.stringify(data));

app.use(compression());

app.use(cookieParser());

app.set("view engine", "pug");

jsFiles = fs.readdirSync(path.resolve(config.DIST_DIR, "dist/"));

app.get("/", (req, res) => {
  res.render("index", {
    jsFiles: jsFiles,
    data: {
      ...data.global,
      ...data.lang["TR"]
    },
    svgName: (
      fs.existsSync(path.resolve(config.SRC_DIR, config.SVG_NAME))
    ) ? fs.readFileSync(path.resolve(config.SRC_DIR, config.SVG_NAME)) : false
  })
})

app.get("/data.json", (req, res) => {
  res.json(
    Object.keys(data.lang).reduce((dict, lang) => {
      dict[lang] = {data: {
        ...data.lang[lang]
      }}
      return dict;
    }, {})
  )
})

app.use(express.static("static", {
    maxAge: 7 * 86400000
  })
);

http.createServer(app).listen(config.PORT, ()=>{
  console.log(`Listening on port '${config.PORT}'`);
})
