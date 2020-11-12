# IPA Dashboard POC

## Install Instructions

```
git clone https://github.com/joellord/ipa-dashboard
cd ipa-dashboard/server
npm install
node .
```

Point your browser to `http://localhost:3000`

## Configuration

You will need a `config.json` file in the `/server` folder. 

```
{
  "crawler": {
    "username": "info@",
    "password": "pass",
    "base_url": "https://somethingsomething.website.tld"
  },
  "icao_api_key": "73436680-2451-11eb-b151-073f9d3e9a96"
}
```
Where `crawler` information is for the flight log server.
ICAO API key can be created at [https://www.icao.int/safety/iStars/HTMLPage/API-Data-Service.html](ICAO Website) and is used for METAR and NOTAM data.