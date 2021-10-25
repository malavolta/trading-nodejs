const axios = require("axios");
const { Sequelize, Op } = require("sequelize");
const setupDatabase = require("./lib/db");
const TradingHistory = require("./models/trading");
const Status = require("./models/status");
const Binance = require("binance-api-node").default;
const TelegramBot = require("node-telegram-bot-api");
const moment = require("moment");
const cron = require("node-cron");
const percentile = require("percentile");

require("dotenv").config();

const sequelize = setupDatabase();
const bot_id = 1;
const SYMBOL = "ETH/USDT";
const INTERVAL_TECNICAL_DATA = "15m";
const OPEN = "OPEN";
const CLOSED = "CLOSED";
const SELL = "SELL";
const BUY = "BUY";
const RSI_BUY = 26;
const EXCHANGE_COMMISSION = 0.1; //%
const TAKE_PROFIT = 0.9 + EXCHANGE_COMMISSION; //%
const STOP_LOSS = -0.3;
const client = Binance({
  apiKey: process.env.APIKEY,
  apiSecret: process.env.APISECRET2,
});
const ID_CHAT_TELEGRAN = -1001564716717;

const token = "1940484539:AAEKJNvERWwr5EpeUXKGyZ8vgjWqLDWW0Dc";
const bot = new TelegramBot(token, { polling: true });

let status = {
  balance_usdt: 2463.241549800494,
  balance_eth: 0,
  position: CLOSED,
  last_price_buy: 0,
  last_price_sell: 0,
};

let profit = 0;

let WATCH_MINUSDI_LESS_30 = false;
let WATCH_RSI_LESS_20 = false;

const getTecnicalData = async function () {
  return new Promise((resolve, reject) => {
    axios
      .post("https://api.taapi.io/bulk", {
        secret: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im1hbGF2b2x0YTRAZ21haWwuY29tIiwiaWF0IjoxNjI2MDkyMjU5LCJleHAiOjc5MzMyOTIyNTl9.z_LFPFUpMuRB0SuiJbKXejIG1SMUz8TPVV9aC1jfRMU",
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
      })
      .then((response) => {
        resolve(response.data.data);
        //console.log(response.data.data);
      })
      .catch((error) => {
        console.log(error);
        reject(error);
      });
  });
};

cron.schedule("*/3 * * * * *", async () => {
  const start = new Date().getTime();
  tecnicalData = await getTecnicalData();

  try {
    let dmi = tecnicalData.filter((data) => data.id.match(/dmi.*/));
    let rsi = tecnicalData.filter((data) => data.id.match(/rsi.*/));
    let typprice = tecnicalData.filter((data) => data.id.match(/typprice.*/));
    let avgprice = tecnicalData
      .filter((data) => data.id.match(/avgprice.*/))[0]
      .result.value.toFixed(2);

    let price = typprice[0].result.value.toFixed(2);
    profit = (((price - status.last_price_buy) / price) * 100).toFixed(2);
    let avg_current_price = (((price - avgprice) / price) * 100).toFixed(2);
    let sar_backtrack = tecnicalData.filter((data) => data.id.match(/sar.*/));
    let current_rsi = rsi[0].result.value.toFixed(2);

    let sar = sar_backtrack[0].result.value.toFixed(2);
    let sar_signal = sar > price ? SELL : BUY;
    let rsi_average =
      rsi
        .map((rsi) => rsi.result.value)
        .reduce((previus, current) => previus + current) / 10;
    let adx = dmi[0].result.adx.toFixed(2);
    let plusdi = dmi[0].result.plusdi.toFixed(2);
    let minusdi = dmi[0].result.minusdi.toFixed(2);
    let dmi_adx_average =
      dmi
        .map((dmi) => dmi.result.adx)
        .reduce((previus, current) => previus + current) / 10;

    let dmi_plusdi_average = dmi[9].result.plusdi;

    let dmi_minusdi_average =
      dmi
        .map((dmi) => dmi.result.minusdi)
        .reduce((previus, current) => previus + current) / 10;
    console.log(current_rsi)
    if (current_rsi <= 25 && status.position === CLOSED) {
      WATCH_RSI_LESS_20 = true;
    }

    let indicators = `
    -----------------------
    price: ${price}  
    price avg: ${avgprice}
    ${avg_current_price}%
    watch_rsi: ${WATCH_RSI_LESS_20}
    position: ${status.position}
    plusdi: ${plusdi} minusdi: ${minusdi}
    minusdi <= plusdi: ${minusdi <= plusdi}
    current_rsi: ${current_rsi}
 `;

    if (WATCH_RSI_LESS_20 && status.position === CLOSED && current_rsi >= 31) {
      status.balance_eth = status.balance_usdt / price;
      status.last_price_buy = price;
      status.position = OPEN;
      profit = 0;
      WATCH_RSI_LESS_20 = false;

      await TradingHistory.create({
        symbol: SYMBOL,
        price: price,
        amount: status.balance_eth,
        operation: "BUY",
        bot_id: bot_id,
      });
      await Status.update(
        {
          balance_usdt: status.balance_usdt,
          balance_eth: status.balance_usdt / price,
          position: OPEN,
          last_price_buy: price,
          last_price_sell: status.last_price_sell,
          bot_id: bot_id,
        },
        {
          where: {
            bot_id: bot_id,
          },
        }
      );
      bot.sendMessage(
        -1001564716717,
        `BUY ETH \nAMOUNT: ${status.balance_eth.toFixed(
          2
        )}\nPRICE: ${price}\nRSI: ${current_rsi}`
      );
      console.log(indicators);
      console.log(
        `BUY ETH \nAMOUNT: ${status.balance_eth.toFixed(
          2
        )}\nPRICE: ${price}\nRSI: ${current_rsi}`)
    }

    //STOP LOSS
    if (profit <= STOP_LOSS && status.position === OPEN) {
      status.position = CLOSED;
      status.balance_usdt = price * status.balance_eth;
      status.last_price_sell = price;
      WATCH_RSI_LESS_20 = false;
      await TradingHistory.create({
        symbol: SYMBOL,
        price: price,
        amount: status.balance_eth,
        operation: "SELL",
        bot_id: bot_id,
      });
      await Status.update(
        {
          balance_usdt: price * status.balance_eth,
          balance_eth: status.balance_eth,
          position: CLOSED,
          last_price_buy: status.last_price_buy,
          last_price_sell: price,
          bot_id: bot_id,
        },
        {
          where: {
            bot_id: bot_id,
          },
        }
      );
      bot.sendMessage(
        -1001564716717,
        `STOP LOSS ETH\nAMOUNT: ${status.balance_usdt}\nPRICE: ${price}\nPROFIT: ${profit}\nRSI: ${current_rsi}`
      );
      console.log(indicators);
      console.log(
        `STOP LOSS ETH\nAMOUNT: ${status.balance_usdt}\nPRICE: ${price}\nPROFIT: ${profit}\nRSI: ${current_rsi}`)
    }
    //SELL SELL SELL SELL
    if (profit >= TAKE_PROFIT && status.position === OPEN) {
      status.position = CLOSED;
      status.balance_usdt = price * status.balance_eth;
      status.last_price_sell = price;
      status.position = CLOSED;
      WATCH_RSI_LESS_20 = false;
      await TradingHistory.create({
        symbol: SYMBOL,
        price: price,
        amount: status.balance_eth,
        operation: "SELL",
        bot_id: bot_id,
      });

      await Status.update(
        {
          balance_usdt: price * status.balance_eth,
          balance_eth: status.balance_eth,
          position: CLOSED,
          last_price_buy: status.last_price_buy,
          last_price_sell: price,
          bot_id: bot_id,
        },
        {
          where: {
            bot_id: bot_id,
          },
        }
      );

      bot.sendMessage(
        -1001564716717,
        `SELL ETH\nAMOUNT: ${status.balance_usdt}\nPRICE: ${price}\nPROFIT: ${profit}\nRSI: ${current_rsi}`
      );
      console.log(indicators);
      console.log(
        `SELL ETH\nAMOUNT: ${status.balance_usdt}\nPRICE: ${price}\nPROFIT: ${profit}\nRSI: ${current_rsi}`)
    }
  } catch (error) {
    console.error(error);
  }
  var end = new Date().getTime();
  var time = end - start;
});

const startApp = async function () {
  try {
    const sequelize = setupDatabase();
    await sequelize.authenticate();

    /*     sequelize.sync({ force: false }).then(() => {
      TradingHistory.bulkCreate([
        {
          symbol: "ETH/USDT",
          price: 2.4,
          amount: 1,
          operation: "BUY",
          bot_id: -1,
        },
        {
          symbol: "ETH/USDT",
          price: 2.5,
          amount: 1,
          operation: "BUY",
          bot_id: -1,
        },
        {
          symbol: "ETH/USDT",
          price: 2.8,
          amount: 1,
          operation: "BUY",
          bot_id: -1,
        },
      ]);

      Status.update(
        {
          balance_usdt: status.balance_usdt,
          balance_eth: status.balance_eth,
          position: status.position,
          last_price_buy: status.last_price_buy,
          last_price_sell: status.last_price_sell,
          bot_id: bot_id,
        },
        {
          where: {
            id: 1,
            bot_id: bot_id,
          },
        }
      );
    }); */
    Status.findAll({
      where: {
        bot_id: {
          [Op.eq]: bot_id,
        },
      },
    })
      .then((result) => {
        status = result[0];
      })
      .catch((err) => {
        console.log(err);
      });
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

startApp();

cron.schedule("*/15 * * * *", async () => {
  if (status.position === OPEN) {
    bot.sendMessage(
      ID_CHAT_TELEGRAN,
      `OPEN POSITION\n\nOPENING PRICE: ${status.last_price_buy}\nACTUAL PROFIT: ${profit}%`
    );
  }
});

/*
balance - actual balance in your account
profit - profit percentage in especifit x days
profit_current_position - profit for actual open position
status - bot status
*/

bot.onText(/\/balance/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1];
  bot.sendMessage(chatId, `$ ${status.balance_usdt.toFixed(2)}  `);
});
bot.onText(/\/profit_current_position/, (msg, match) => {
  if (status.position === OPEN) {
    bot.sendMessage(msg.chat.id, `current position ${profit}% `);
  } else {
    bot.sendMessage(msg.chat.id, `you don't have open position`);
  }
});
bot.onText(/\/profit/, (msg, match) => {
  let initial_amount = 2500;
  let chat = match.input.split(" ");
  let profit_days = chat.length > 1 ? chat[1] : 30;
  if (status.position === OPEN) {
    bot.sendMessage(msg.chat.id, `current position ${profit}% `);
  } else {
    bot.sendMessage(msg.chat.id, `you don't have open position`);
  }

  TradingHistory.findAll({
    where: {
      createdAt: {
        [Op.gt]: moment().subtract(profit_days, "days").toDate(),
      },
      bot_id: bot_id,
    },
  })
    .then((result) => {
      let buy = result.filter((data) => data.operation.match(/BUY.*/));
      let sell = result.filter((data) => data.operation.match(/SELL.*/));

      let total_buy = buy
        .map((data) => {
          return data.price * data.amount;
        })
        .reduce((prv, curr) => prv + curr);
      let total_sell = sell
        .map((data) => {
          return data.price * data.amount;
        })
        .reduce((prv, curr) => prv + curr);
      let profit = (((total_sell - total_buy) / initial_amount) * 100).toFixed(
        2
      );
      let balance = total_sell - total_buy;

      bot.sendMessage(
        msg.chat.id,
        `profit in last ${profit_days}\ndays: ${profit}%\nBalance: ${balance}`
      );
    })
    .catch((err) => {
      console.log(err);
    });
});

bot.onText(/\/status/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1];
  console.log(chatId)
  bot.sendMessage(
    chatId,
    `position: ${status.position}\nbalance usdt ${status.balance_usdt}\nlast price sell = ${status.last_price_sell}
  `
  );
});

/*
    adx: ${adx} dmi_adx_average: ${dmi_adx_average.toFixed(
      2
    )}                                                                    
    plusdi: ${dmi[0].result.plusdi.toFixed(
      2
    )}  dmi_plusdi_average: ${dmi_plusdi_average.toFixed(
      2
    )}                                                              
    minusdi: ${dmi[0].result.minusdi.toFixed(
      2
    )}  dmi_minusdi_average: ${dmi_minusdi_average.toFixed(2)}   

    profit - ganancias en los ultmos 30 dias
    status - estado actual del bot
    balance - saldo de la cuenta
*/
