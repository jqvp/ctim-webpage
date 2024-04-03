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

function getMetadata(pointcloud) {
  if (getMetadata.map[pointcloud]) return getMetadata.map[pointcloud]; 

  return getMetadata.map[pointcloud] = JSON.parse(fs.readFileSync(`potree/pointclouds/${pointcloud}/metadata.json`, {encoding: "utf8"}));
}
getMetadata.map = {};

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('static'));
app.use("/potree", express.static('potree'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/index.html');
});

/**
 * El patch recibe un Range: con los bytes a escribir
 */
app.patch("/potree/pointclouds/:pointcloud", express.json({limit: 1_000_000}), (req, res) => {
  const pointcloud = req.params.pointcloud;
  if (!pointclouds.includes(pointcloud)) {
    res.status(404).end(JSON.stringify({
      error: "no_pointcloud",
      message: `No pointcloud with name '${pointcloud}' was found`
    }));
    return;
  }

  const metadata = getMetadata(pointcloud);
  if (metadata.attributes.find(x => x.name === "classification").type !== "uint8") {
    throw new Error("Classification is not uint8 according to metadata");
  }

  let offsets = {};
  const bpp = metadata.attributes.reduce((ac ,x) => {
    offsets[x.name] = ac;
    return ac + parseInt(x.size);
  }, 0);
  const offset = offsets["classification"];
  const len = (req.body.indices[req.body.indices.length-1] - req.body.indices[0] + 1) * bpp;
  const byteOffset = parseInt(req.body.byteOffset) + req.body.indices[0] * bpp;
  const buf = new Uint8Array(len);

  if (byteOffset > Number.MAX_SAFE_INTEGER) {
    throw new Error("byteOffset too big for the Number type");
  }

  const file = fs.openSync(`potree/pointclouds/${pointcloud}/octree.bin`, 'r+');
  fs.readSync(file, buf, {position: byteOffset, length: len});

  for (const i of req.body.indices) {
    buf[(i-req.body.indices[0]) * bpp + offset] = req.body.classification;
  }

  fs.writeSync(file, buf, {position: byteOffset, length: len});
  fs.closeSync(file);
  console.log(`Wrote ${len} bytes of ${pointcloud} at ${byteOffset}`);

  res.status(200).end();
})

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log(`Your app is listening on http://localhost:${listener.address().port}/`);
});
