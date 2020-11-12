const pup = require("puppeteer");

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

    this.fetchBookings();
    setInterval(this.fetchBookings, this.updateInterval);
    this.fetchAircrafts();
    setInterval(this.fetchAircrafts, this.updateInterval);
  }

  async fetchAircrafts() {
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

// const TIMEOUT = 15000;

// (async () => {
//   let d = new Date();
//   const browser = await pup.launch();

//   const page = await browser.newPage();
//   await page.goto("https://ipa.flightlogger.net");

//   // Login
//   await page.type("#user_session_email", "info@intlpilotacademy.com");
//   await page.type("#user_session_password", "Cessna172");
//   await page.click("input[name=commit]", {waitUntil: "domcontentloaded"});
//   // await page.waitForNavigation({waitUntil: "networkidle0"}).catch(e => console.log("Home page not loaded"));

//   // // Go to Reports->Bookings
//   // await page.goto("https://ipa.flightlogger.net/booking_report", {waitUntil: "networkidle2"});
//   // await page.waitForTimeout(TIMEOUT);
//   // // await page.waitForSelector("input[name=from]");
//   // // await page.waitForNavigation({waitUntil: "networkidle2"}).catch(e => console.log("Could not load booking reports"));
//   // await page.focus("input[name=from]");
//   // await page.keyboard.down("Control");
//   // await page.keyboard.press("A");
//   // await page.keyboard.up("Control");
//   // await page.keyboard.press("Backspace");
//   // await page.type("input[name=from]", `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`);
//   // await page.focus("input[name=to]");
//   // await page.keyboard.down("Control");
//   // await page.keyboard.press("A");
//   // await page.keyboard.up("Control");
//   // await page.keyboard.press("Backspace");
//   // await page.type("input[name=to]", `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`);
//   // await page.click("#submit-btn");
//   // await page.waitForTimeout(TIMEOUT);
//   // await page.screenshot({path: "bookings.png"});
//   // await page.$("tbody").then(trs => {
//   //   trs = Array.from(trs);
//   //   // Get keys
//   //   let keys = Array.from(trs[0].cells).map(c => c.textContent);
//   //   trs.splice(0, 1);

//   //   let data = trs.map(row => Array.from(row.cells).map(c => c.textContent));
//   //   let bookings = data.map(row => {
//   //     let booking = {};
//   //     row.map((item, index) => {
//   //       booking[keys[index]] = item;
//   //     });
//   //     return booking;
//   //   });
    
//   //   return bookings;
//   // }).then(bookings => {
//   //   console.log(bookings);
//   // });

//   // Get bookings
//   let BOOKINGS_URL = `https://ipa.flightlogger.net/api/v1/bookings?starts_at=2020-11-12T05%3A00%3A00.000Z&ends_at=2020-11-12T05%3A00%3A00.000Z&_=1605195585816`;

//   await page.goto(BOOKINGS_URL, {waitUntil: "load"});
//   let bookings = await page.content();
//   // eww
//   bookings = bookings.replace("<html><head></head><body><pre style=\"word-wrap: break-word; white-space: pre-wrap;\">", "");
//   bookings = bookings.replace("</pre></body></html>", "");
//   bookings = JSON.parse(bookings).bookings;

//   let flightCount = bookings.filter(booking => booking.flight_starts_at).length;
//   let flightsLeft = bookings.filter(booking => {
//     let currentTime = (new Date()).getTime();
//     let endTime = new Date(booking.flight_ends_at).getTime();
//     return booking.flight_starts_at && endTime > currentTime;
//   }).length;

//   console.log(`Flights today: ${flightCount}, flights left: ${flightsLeft}`);
  

//   // await page.screenshot({path: "status.png"});

//   await browser.close();
// })();