const axios = require("axios");

const SYMBOL = "ETH/USDT";
const INTERVAL_TECNICAL_DATA = "5m";

module.exports = async () => {
  try {
    const result = await axios.post("https://api.taapi.io/bulk", {
      secret:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im1hbGF2b2x0YTRAZ21haWwuY29tIiwiaWF0IjoxNjI2MDkyMjU5LCJleHAiOjc5MzMyOTIyNTl9.z_LFPFUpMuRB0SuiJbKXejIG1SMUz8TPVV9aC1jfRMU",
      construct: {
        exchange: "binance",
        symbol: SYMBOL,
        interval: INTERVAL_TECNICAL_DATA,
        indicators: [
          {
            indicator: "rsi",
            backtracks: 5,
          },
          {
            indicator: "typprice",
            backtracks: 2,
            interval: "1m",
          },
          {
            indicator: "dmi",
            backtracks: 10,
          },
          {
            indicator: "sar",
            optInMaximum: "0.02",
            //backtracks: 5,
          },
          {
            indicator: "avgprice",
            backtrack: 50,
            //backtracks: 5,
          },
        ],
      },
    });

    return result;
  } catch (err) {
    //TODO: send to sentry
    console.log(err);
  }
};
