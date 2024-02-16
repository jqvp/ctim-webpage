// server.js
// where your node app starts

// init project
var express = require('express');
const fs = require('fs');

var app = express();

require('dotenv').config();

let pointclouds = [];
fs.readdirSync("potree/pointclouds").forEach(f => {
  console.log(f);
  if (fs.statSync("potree/pointclouds/" + f).isDirectory) pointclouds.push(f);
});

fs.writeFileSync("potree/build/potree/resources/pointclouds.json", JSON.stringify(pointclouds));

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('static'));
app.use("/potree", express.static('potree'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/index.html');
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on http://localhost:' + listener.address().port + "/");
});
