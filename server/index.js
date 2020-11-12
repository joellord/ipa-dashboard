const express = require("express");
const fetch = require("node-fetch");
const Crawler = require("./Crawler");
const config = require("./config.json");

const app = express();
const PORT = process.env.PORT || 3000;

let crawler = new Crawler(config.crawler);

const API_KEY = config.icao_api_key;

const SKIP_ICAO_CALLS = false;

let data = {
  notams: [],
  metar: {}
};

app.use(express.static(`${__dirname}/../dashboard`));

app.get("/notams", (req, res) => {
  res.send(data.notams).status(200);
});

app.get("/metar", (req, res) => {
  res.send(data.metar).status(200);
});

app.get("/bookings", (req, res) => {
  res.send(crawler.getBookings()).status(200);
});

app.get("/aircrafts", (req, res) => {
  res.send(crawler.getAircraftStatus()).status(200);
});

app.listen(PORT, () => console.log(`Dashboard server listening on port ${PORT}`));

const updateNotams = () => {
  console.log("Fetching new NOTAMs");
  const URL = `https://v4p4sz5ijk.execute-api.us-east-1.amazonaws.com/anbdata/states/notams/notams-realtime-list?api_key=${API_KEY}&format=json&criticality=&locations=cynd`;
  fetch(URL).then(resp => resp.json()).then(notams => {
    console.log(`Received ${notams.length} NOTAMs`);
    data.notams = notams;
  });
  setTimeout(updateNotams, 1000 * 60 * 60);
}
if (!SKIP_ICAO_CALLS) updateNotams();

const updateMetar = () => {
  console.log("Fetching METAR");
  const URL = `https://v4p4sz5ijk.execute-api.us-east-1.amazonaws.com/anbdata/airports/weather/current-conditions-list?api_key=${API_KEY}&airports=cynd&states=&format=json`;
  fetch(URL).then(resp => resp.json()).then(metar => {
    console.log(`Received ${metar.length} METAR`);
    data.metar = metar;
  });
  setTimeout(updateMetar, 1000 * 60 * 60);
}
if (!SKIP_ICAO_CALLS) updateMetar();

