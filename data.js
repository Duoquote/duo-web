const md = require("markdown").markdown,
      fs = require("fs"),
      path = require("path"),
      config = require("./config.js")

function loadPages(lang) {
  return fs.readdirSync(`./pages/${lang}`).reduce((dict, page)=>{
    var label = path.parse(page).name;
    dict.pages[label] = md.toHTML(
      fs.readFileSync(`./pages/${lang}/${page}`, "utf8")
    )
    dict.labels_available.push(label);
    return dict;
  }, {
    labels_available: [],
    pages: {}
  })
}

module.exports = {
  global: {
    fullname: "Güven Değirmenci",
    firstname: "Güven",
    lastname: "Değirmenci",
    nick: "Duoquote",
    description: "Developer, Tech Enthusiast",
    url: "http://guvendegirmenci.com/"
  },
  lang: {
    TR: {
      labels: {
        about: "hakkımda",
        contact: "iletişim",
        links: "linkler",
        discord: "discord",
        blog: "blog",
        skills: "yetenekler"
      },
      ...loadPages("TR")
    },
    EN: {
      labels: {
        about: "about",
        contact: "contact",
        links: "links",
        discord: "discord",
        blog: "blog",
        skills: "skills"
      },
      ...loadPages("EN")
    }
  }
}
