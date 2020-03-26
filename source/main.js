import anime from "animejs/lib/anime.min.js";

var nameAnim = [];

window.addEventListener("load", function() {
  [
    ...document.querySelectorAll("ul[class~='main-nav'] > li > a"),
    document.querySelector("a[class~='navbar-brand']")
  ].forEach(function(navItem) {
    navItem.addEventListener("click", function() {
      var containerName = this.href.split("#")[1];
      var container = document.querySelector("div#" + containerName + "-container");
      changePage(container);
    })
  })

  // if (!window.document.documentMode) {
  //
  //   var textSVG = [...document.querySelectorAll("#main-container .row .col h1 div a svg path")];
  //   var waitLen = 100;
  //   anime({
  //     targets: textSVG,
  //     strokeDashoffset: anime.setDashoffset,
  //     duration: 0,
  //     fill: "#5ab3ff87"
  //   })
  //
  //   textSVG.forEach(function(elem) {
  //     setTimeout(function(){
  //       var textAnim = anime({
  //         targets: elem,
  //         keyframes: [
  //           {
  //             delay: 1000,
  //             strokeDashoffset: [anime.setDashoffset, 0],
  //             fill: "#5ab3ff87",
  //             duration: 2000
  //           },
  //           {
  //             delay: 3000,
  //             strokeDashoffset: [0, anime.setDashoffset],
  //             duration: 3000
  //           }
  //         ],
  //         easing: 'easeInOutElastic',
  //         loop: true
  //       })
  //       nameAnim.push(textAnim);
  //     }, waitLen)
  //     waitLen += 50;
  //   })
  //
  // } else {
  //   var nameElem = document.querySelector("#main-container .row .col h1 div a")
  //   nameElem.innerText = nameElem.getAttribute("data-name");
  //   nameElem.removeAttribute("data-name");
  // }
  //
  // document.querySelector("#main-container .row .col h1 div a")
  // .style.display = "inline";

  anime({
    targets: document.getElementById("overlay"),
    duration: 500,
    translateY: "-100%",
    easing: "easeOutExpo"
  })
})


function changePage(toPage) {
  var fromPage = document.querySelector("div[active]");
  if (fromPage.id == "main-container") {
    nameAnim.forEach(function(anim) {
      anim.pause();
    })
  }
  if (toPage.id == "main-container") {
    nameAnim.forEach(function(anim) {
      anim.play();
    })
  }
  if (fromPage != toPage) {
    var changeLine = anime.timeline({
      duration: 500
    })
    changeLine
    .add({
      targets: fromPage,
      translateY: -150,
      opacity: {
        value: 0,
        easing: "linear"
      },
      complete: function() {
        fromPage.removeAttribute("active");
        fromPage.className = fromPage.className.replace(/ ?active ?/, "");
      },
      duration: 300,
      easing: "easeInElastic"
    })
    .add({
      targets: toPage,
      translateY: [150, 0],
      opacity: {
        value: [0, 1],
        easing: "linear"
      },
      begin: function() {
        toPage.className += " active";
        toPage.setAttribute("active", "")
      },
      duration: 300,
      easing: "easeOutElastic"
    }, "-=100")
  }
}
