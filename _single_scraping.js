var gplay = require("google-play-scraper");
var fs = require('fs');

var appId = "com.flipkart.android";


async function fetchFun() {

  var something = await gplay.reviews({ appId: appId, page: 0, sort:gplay.sort.NEWEST });

  //console.log(JSON.stringify(something));

  //return something;

  //var something_json = JSON.stringify(something)

  var something_json = JSON.stringify(something)

  fs.writeFileSync("output.json",something_json)


};

fetchFun();



