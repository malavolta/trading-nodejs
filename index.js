const axios = require("axios");
const { Sequelize, Op } = require("sequelize");
const setupDatabase = require("./lib/db");
const TradingHistory = require("./models/trading");
const Status = require("./models/status");
const Binance = require("binance-api-node").default;
var cron = require("node-cron");

require("dotenv").config();

const sequelize = setupDatabase();
const SYMBOL = "ETH/USDT";
const INTERVAL_TECNICAL_DATA = "1m";
const RSI_SELL = 65;
const RSI_BUY = 20;
const OPEN = "OPEN";
const CLOSED = "CLOSED";
const EXCHANGE_COMMISSION = 0.1; //%
const TAKE_PROFIT = 0.3 + EXCHANGE_COMMISSION; //%
const PREVIOUS_RSI = [];
const client = Binance({
  apiKey: process.env.APIKEY,
  apiSecret: process.env.APISECRET2,
});

let frist_execution;
let status = {
  balance_usdt: 2463.241549800494,
  balance_eth: 0,
  position: CLOSED,
  last_price_buy: 2104.26,
  last_price_sell: 2046.87,
};
let count_executions = 0;

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
              indicator: "macd",
            },
          ],
        },
      })
      .then((response) => {
        resolve(response.data.data);
        //console.log(response.data.data);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

cron.schedule("*/2 * * * * *", async () => {
  let x = Math.floor(Math.random() * (65 - 60 + 1) + 60);
  const start = new Date().getTime();
  const tecnicalData = await getTecnicalData();
  const rsi = tecnicalData[0].result.value.toFixed(0);
  const price = tecnicalData[1].result.value.toFixed(2);
  const profit = (((price - status.last_price_buy) / price) * 100).toFixed(2);

  console.log(`price: ${price} rsi: ${rsi}`);

  status.position === OPEN && console.log(`profit: ${profit}%`);
  count_executions++;

  count_executions > 4 && PREVIOUS_RSI.shift();
  PREVIOUS_RSI.push(rsi);

  console.log(PREVIOUS_RSI);

  //BUY BUY BUY BUY BUY
  if (rsi <= RSI_BUY && status.position === CLOSED) {
    status.balance_eth = status.balance_usdt / price;
    status.last_price_buy = price;
    status.position = OPEN;

    console.log(`BUY ETH: ${status.balance_eth} PRICE: ${price}`);
    console.log(`${status.balance_eth}`);

    await TradingHistory.create({
      symbol: SYMBOL,
      price: price,
      amount: status.balance_eth,
      operation: "BUY",
    });

    await Status.create({
      id: 1,
      ...status,
    });
  }

  //SELL SELL SELL SELL
  if (rsi >= RSI_SELL && status.position === OPEN) {
    status.position = CLOSED;
    status.balance_usdt = price * status.balance_eth;
    status.last_price_sell = price;
    status.position = CLOSED;

    console.log(`SELL ETH: ${status.balance_eth} PRICE: ${price}`);
    console.log(`${status.balance_usdt}`);

    await TradingHistory.create({
      symbol: SYMBOL,
      price: price,
      amount: status.balance_usdt,
      operation: "SELL",
    });

    await Status.create({
      id: 1,
      ...status,
    });
  }

  var end = new Date().getTime();
  var time = end - start;
});

const startApp = async function () {
  try {
    const sequelize = setupDatabase();
    await sequelize.authenticate();
    sequelize.sync({ force: false }).then(() => {
      console.log(`Database & tables created!`);
      /*TradingHistory.bulkCreate([
        { symbol: "ETH/USDT", price: 2.4, amount: 1, operation: "BUY" },
        { symbol: "ETH/USDT", price: 2.5, amount: 1, operation: "BUY" },
        { symbol: "ETH/USDT", price: 2.8, amount: 1, operation: "BUY" },
      ]);*/
      Status.create({
        id: 1,
        balance_usdt: 0.0,
        balance_eth: 0.0,
        position: "TEST",
        last_price_buy: 0.0,
        last_price_sell: 0.0,
      });
    });
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

//startApp();
