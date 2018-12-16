// courtesy https://github.com/pcrain/review-reappropriator
// https://www.npmjs.com/package/google-play-scraper#reviews
const util          = require("util");
const fs            = require('fs');
const readline      = require('readline');
const gplay         = require('google-play-scraper');

const REVIEW_PAGES  = 5; //each page of the review approximately gives 40 Reviews
const PAGES         = 5;
const SLEEPTIME     = 5000;

global.existingapps  = new Set();
global.existingrevs  = new Set();
global.newapplist    = [];
global.newreviewlist = [];
global.currentcat    = "";
global.currentapp    = "";
global.tsvapppath    = "./apps.csv";
global.tsvrevpath    = "./reviews.csv";

global.shouldabort   = false;

function sleep(ms){
  return new Promise(resolve=>{
    setTimeout(resolve,ms)
  })
}

async function getAppIds(){
  if (fs.existsSync(tsvapppath)) {
    await readAppTsv(listApps);
  } else {
    await listApps();
  }
}

async function doNothing() {
  return;
}

async function getAppReviews(){
  if (fs.existsSync(tsvrevpath)) {
    await readRevTsv(doNothing);
  }
  if (fs.existsSync(tsvapppath)) {
    await readAppTsv(listReviews);
  }
}

async function readRevTsv(_onFinish) {
  var lineReader = readline.createInterface({
    input: fs.createReadStream(tsvrevpath)
  });

  lineReader.on('line', function (line) {
    splitline = line.split(",");
    appid     = splitline[1];
    // console.log(appid);
    if (appid != "appId") {
      existingrevs.add(appid);
    }
  }).on('close', function (err) {
    console.log(
      util.format(
        "1) Loaded reviews for %d existing apps",
        existingrevs.size
        )
      );
      _onFinish();
  });
}

async function readAppTsv(_onFinish) {
  var lineReader = readline.createInterface({
    input: fs.createReadStream(tsvapppath)
  });

  lineReader.on('line', function (line) {
    splitline = line.split(",");
    //splitline = line.split(","); 
    appid     = splitline[0];
    // console.log(appid);
    if (appid != "appId") {
      existingapps.add(appid);
    }
  }).on('close', function (err) {
    console.log(
      util.format(
        "1) Loaded %d existing apps",
        existingapps.size
        )
      );
      _onFinish();
  });
}

async function listReviews() {

for(var x = 0; x < REVIEW_PAGES; ++x) {

 
  tsvexists = fs.existsSync(tsvrevpath);
  global.revstream = fs.createWriteStream(tsvrevpath, {flags:'a'});
  if (!tsvexists) {
    //revstream.write("id,appId,date,score,text\n");
    revstream.write("id,appId,date,score,text\n");
  }

  appidlist = Array.from(existingapps);
  // var start = 0;
  // for (var i=appidlist.length-1; i >= 0; --i) {
  //   currentapp = appidlist[i];
  //   if (existingrevs.has(currentapp)) {
  //     start = i;
  //     console.log(util.format("Starting at entry %s",i));
  //     await sleep(SLEEPTIME);
  //     break;
  //   }
  // }
  for (var i=0; i<appidlist.length; ++i) {
    if (shouldabort) {
      break;
    }
    currentapp = appidlist[i];
    //if (existingrevs.has(currentapp)) {
     // console.log(util.format("reviews for %s already exist",currentapp))
      //continue;
   // }
    // else if (i < start) {
    //   console.log(util.format("no reviews for %s exist",currentapp))
    //   continue;
    // }
    if (i > 0) {
      await sleep(SLEEPTIME);
    }
    // console.log(appidlist[i]);
    //for(var x = 1; x < 3; x++) {  

        await gplay.reviews({
            appId : appidlist[i],
            page  : x,
            //sort  : gplay.sort.HELPFULNESS,
            sort  : gplay.sort.NEWEST,
          }).then(handleReviewInfo, function(err) {
            console.log(err);
            //shouldabort = true;
            shouldabort = false;
            // await sleep(1000*60*61); //wait an hour before continuing
          });
   // }
    
    // break;
  }
  console.log("3) finished reading / writing reviews");
  revstream.end();
}
}   



async function listApps() {
  var categories = [];
  Object.keys(gplay.category).forEach(function(key) {
    categories.push(gplay.category[key]);
  });
  for (var c = 0; c < categories.length; ++c) {
    currentcat = categories[c];
    console.log("Category: "+currentcat);
    for (var i = 0; i < PAGES; ++i) {
      if (i > 0) {
        await sleep(SLEEPTIME);
      }
      console.log(util.format("Scanning %s %d-%d",currentcat,i*100,100+i*100));
      await gplay.list({
        num      : 100,
        start    : i*100,
        category : currentcat,
      }).then(handleAppInfo, console.log);
    }
  }
  console.log("3) finished reading");
  writeAppsToFile();
}

async function handleAppInfo(data) {
  var newapps = 0;
  for (var i = 0; i < data.length; ++i) {
    appid               = data[i]["appId"];
    data[i]["category"] = currentcat;
    if (! existingapps.has(appid) ) {
      existingapps.add(appid);
      newapplist.push(data[i]);
      ++newapps;
    }
  }
  console.log(util.format("2) found %d new apps",newapps));
}

async function handleReviewInfo(data) {
  var newreviews = 0;
  var noreviews = false;
  if (! existingrevs.has(currentapp) ) {
    //existingrevs.add(currentapp);
    if (data.length == 0) {
      data.push({
        "id"    : "",
        "appId" : currentapp,
        "date"  : "",
        "score" : 0,
        "text"  : "",
      });
      var noreviews = true;
    }
    for (var i = 0; i < data.length; ++i) {
      // console.log(data[i]);
      data[i]["appId"] = currentapp;
      newreviewlist.push(data[i]);
      ++newreviews;
      writeReviewToFile(revstream,data[i]);
    }
  }
  if (noreviews) {
    console.log(util.format("2) found no new reviews for %s",currentapp));
  } else {
    console.log(util.format("2) found %d new reviews for %s",newreviews,currentapp));
  }
}

function writeReviewToFile(stream,review) {
  stream.write(
    //util.format("%s,%s,%s,%s,%s\n",
    util.format("%s,%s,%s,%s,%s\n",
      review["id"],
      review["appId"],
      review["date"],
      review["score"],
      //review["text"].replace(/[\r\n,\ ]+/g, ' ')
      review["text"].replace(/[\r\n,\ ]+/g, ' ')
      )
    );
}

function writeAppsToFile() {
  tsvexists = fs.existsSync(tsvapppath);
  var outstream = fs.createWriteStream(tsvapppath, {flags:'a'});
  if (!tsvexists) {
    outstream.write("appId,category,url,title,summary,developer,developerId,icon,score,scoreText,priceText,free\n");
  }
  for (var i = 0; i < newapplist.length; ++i) {
    outstream.write(
      util.format("%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
        newapplist[i]["appId"],
        newapplist[i]["category"],
        newapplist[i]["url"],
        newapplist[i]["title"],
        newapplist[i]["summary"],
        newapplist[i]["developer"],
        newapplist[i]["developerId"],
        newapplist[i]["icon"],
        newapplist[i]["score"],
        newapplist[i]["scoreText"],
        newapplist[i]["priceText"],
        newapplist[i]["free"]
        )
      );
  }
  outstream.end();
  console.log("4) finished writing");
}

// getAppIds();
getAppReviews();