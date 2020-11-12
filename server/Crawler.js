const pup = require("puppeteer");
const fs = require("fs");

class Crawler {
  username;
  password;
  base_url;
  TIMEOUT = 15000;
  bookings = {};

  constructor(options) {
    this.base_url = options.base_url;
    this.username = options.username;
    this.password = options.password;
    this.updateInterval = options.updateInterval || 10 * 60 * 1000;
    this.offline = options.offline;

    this.fetchBookings();
    setInterval(this.fetchBookings, this.updateInterval);
    this.fetchAircrafts();
    setInterval(this.fetchAircrafts, this.updateInterval);
  }

  async fetchAircrafts() {
    if (this.offline) {
      this.aircrafts = require("./offline/aircrafts.json");
      return false;
    }

    const browser = await pup.launch();

    const page = await browser.newPage();
    await page.goto(this.base_url);
  
    // Login
    await page.type("#user_session_email", "info@intlpilotacademy.com");
    await page.type("#user_session_password", "Cessna172");
    await page.click("input[name=commit]", {waitUntil: "domcontentloaded"});
  
    // Get aircrafts
    let today = new Date();
    let formattedDate = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
    let AIRCRAFTS_URL = `${this.base_url}/api/graphql`;
    
    await page.setRequestInterception(true);
    page.on("request", interceptedRequest => {
      let query = {"operationName":"aircraftStatus","variables":{"onlyWithWarnings":true},"query":"query aircraftStatus($onlyWithWarnings: Boolean) {\n  aircraftStatus(onlyWithWarnings: $onlyWithWarnings) {\n    id\n    callSign\n    aircraftModel\n    totalAirborneTime\n    totalTachoTime\n    totalLandings\n    currentAirportName\n    aircraftClass\n    tachoEnabled\n    totalWarnings\n    totalRemarks\n    isInMaintenance\n    inMaintenanceMessage\n    isBookedForMaintenance\n    bookedMaintenanceMessage\n    lastFlightInfo {\n      offBlockAt\n      onBlockAt\n      airborneAt\n      landingAt\n      tachoTimeOnStart\n      tachoTimeOnEnd\n      landingAt\n      offBlockAt\n      landings {\n        id\n        __typename\n      }\n      __typename\n    }\n    nextService {\n      nextServiceDate\n      nextServiceTachoTime\n      nextServiceAirborneTime\n      nextServiceCycles\n      dateWarningColor\n      airborneWarningColor\n      tachoWarningColor\n      cyclesWarningColor\n      __typename\n    }\n    worstWarning {\n      color\n      expiryDate\n      expiryAirborneTime\n      expiryTachoTime\n      statusValue\n      __typename\n    }\n    __typename\n  }\n}\n"};
      
      let postData = "";
      Object.keys(query).map(key => {
        postData += `${key}=${query[key]}&`;
      });
      
      let data = {
        method: "POST",
        headers: {
          ...interceptedRequest.headers(),
          "Content-Type": "application/x-www-form-urlencoded"
        },
        postData: postData
      };
      interceptedRequest.continue(data);
    });
    let aircrafts = await page.goto(AIRCRAFTS_URL);
    aircrafts = await aircrafts.json();
    aircrafts = aircrafts.data.aircraftStatus;
    this.aircrafts = aircrafts;

    await browser.close();

    console.log(`Aircrafts fetched (${this.aircrafts.length})`);
  }

  getAircraftStatus () {
    const statuses = this.aircrafts.map(aircraft => {
      return {
        callSign: aircraft.callSign,
        snags: aircraft.totalRemarks
      }
    });

    return statuses;
  }

  async fetchBookings() {
    if (this.offline) {
      this.bookings = require("./offline/bookings.json");
      return false;
    }
    const browser = await pup.launch();

    const page = await browser.newPage();
    await page.goto(this.base_url);
  
    // Login
    await page.type("#user_session_email", "info@intlpilotacademy.com");
    await page.type("#user_session_password", "Cessna172");
    await page.click("input[name=commit]", {waitUntil: "domcontentloaded"});
  
    // Get bookings
    let today = new Date();
    let formattedDate = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
    let BOOKINGS_URL = `${this.base_url}/api/v1/bookings?starts_at=${formattedDate}T05%3A00%3A00.000Z&ends_at=${formattedDate}T05%3A00%3A00.000Z&_=1605195585816`;
  
    await page.goto(BOOKINGS_URL, {waitUntil: "load"});
    let bookings = await page.content();
    // eww
    bookings = bookings.replace("<html><head></head><body><pre style=\"word-wrap: break-word; white-space: pre-wrap;\">", "");
    bookings = bookings.replace("</pre></body></html>", "");
    bookings = JSON.parse(bookings).bookings;

    this.bookings = bookings;
  
    await browser.close();
    console.log(`Bookings fetched (${this.bookings.length})`);
  }

  getBookings() {
    let flightCount = this.bookings.filter(booking => booking.flight_starts_at).length;
    let flightsLeft = this.bookings.filter(booking => {
      let currentTime = (new Date()).getTime();
      let endTime = new Date(booking.flight_ends_at).getTime();
      return booking.flight_starts_at && endTime > currentTime;
    }).length;

    return {
      flightCount,
      flightsLeft
    }
  }
}

module.exports = Crawler;
