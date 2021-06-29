const axios = require("axios");
const { Sequelize } = require("sequelize");
const setupDatabase = require("./lib/db");
const TradingHistory = require("./models/trading");

var cron = require("node-cron");
var start = new Date();
var hrstart = process.hrtime();
var simulateTime = 5;

require("dotenv").config();

const sequelize = setupDatabase();
const SYMBOL = "ETH/USDT";
const INTERVAL_TECNICAL_DATA = "5m";

const RSI_SELL = "75";
const RST_BUY = "25";

const getTecnicalData = async function () {
  return new Promise((resolve, reject) => {
    axios
      .post("https://api.taapi.io/bulk", {
        secret: process.env.TAAPI_SECRET,
        construct: {
          exchange: "binance",
          symbol: SYMBOL,
          interval: INTERVAL_TECNICAL_DATA,
          indicators: [
            {
              indicator: "rsi",
            },
            {
              indicator: "typprice",
            },
            {
              indicator: "cmf",
              period: 20,
            },
          ],
        },
      })
      .then((response) => {
        resolve(response.data.data);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

cron.schedule("*/2 * * * * *", async () => {
  var start = new Date().getTime();
  const tecnicalData = await getTecnicalData();
  console.log(
    `price: ${tecnicalData[1].result.value.toFixed(
      0
    )} rsi: ${tecnicalData[0].result.value.toFixed(2)}`
  );

  var end = new Date().getTime();
  var time = end - start;
  console.log("Execution time: " + time);
});

/* const start = async function () {
  try {
    await sequelize.authenticate();
    sequelize.sync({ force: true }).then(() => {
      console.log(`Database & tables created!`);

      TradingHistory.bulkCreate([
        { symbol: "BTC", price: 2.34, amount: 1 },
        { symbol: "BTC", price: 3, amount: 2 },
        { symbol: "BTC", price: 4, amount: 5 },
      ])
        .then(function () {
          return TradingHistory.findAll();
        })
        .then(function (notes) {
          console.log(notes);
        });
    });
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }

  sequelize.close();
}; */

//start();
