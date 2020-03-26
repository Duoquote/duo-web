import _ from "lodash";

function fillData(fill) {
  [...document.querySelectorAll("*[data-fill]")].forEach(function(elem){
    var order = JSON.parse(elem.getAttribute("data-fill"));
    if (order.target.indexOf("attr") != 0) {
      if (_.has(fill, order.path)) {
        elem[order.target] = _.get(fill, order.path);
      } else {
        elem[order.target] = order.default;
      }
    }
  })
}

var req = new XMLHttpRequest();
var data;
req.open("GET", "data.json", true);
req.responseType = "text";
req.addEventListener("load", function(resp){
  data = JSON.parse(resp.target.response);
  [...document.getElementById("lang-btn").children].forEach(function(elem){
    elem.addEventListener("click", function(){
      if (document.body.parentNode.getAttribute("lang") != elem.innerText) {
        document.body.parentNode.setAttribute("lang", elem.innerText);
        fillData(data[elem.innerText]);
      }
    })
  })
})
req.send();
