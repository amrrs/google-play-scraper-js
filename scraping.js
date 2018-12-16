var gplay = require("google-play-scraper");
var fs = require('fs');

var appId = "com.flipkart.android";


async function fetchFun() {

  var page = 0;

  var something = await gplay.reviews({ appId: appId, page: page, sort:gplay.sort.NEWEST });

  //console.log(JSON.stringify(something));

  //return something;

  //var something_json = JSON.stringify(something)

  var something_json = JSON.stringify(something)

  fs.writeFileSync("output.json",something_json)


};

fetchFun();



