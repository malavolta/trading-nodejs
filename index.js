const axios = require("axios");
const setupDatabase = require("./src/lib/db");
const TradingHistory = require("./src/models/trading");
const Status = require("./src/models/status");
const Binance = require("binance-api-node").default;
const TelegramBot = require("node-telegram-bot-api");
const moment = require("moment");
const cron = require("node-cron");
const { tradeHistory, tradeStatus } = require("./src/controllers");
const getTecnicalData = require("./src/controllers/technicalData/taapi");

require("dotenv").config();
console.log(process.env.SQL_HOST);
const bot_id = 1;
const SYMBOL = "ETH/USDT";
const OPEN = "OPEN";
const CLOSED = "CLOSED";
const EXCHANGE_COMMISSION = 0.1; //%
const TAKE_PROFIT = 0.9 + EXCHANGE_COMMISSION; //%
const DYNAMIC_STOP_LOSS = -0.3;

const ID_CHAT_TELEGRAN = -1001564716717;

const token = "1940484539:AAGcq64PybEfHHF2vEEHR_JSU3QITFqvl6o";
const bot = new TelegramBot(token, { polling: true });

let status = {
  balance_usdt: 5000,
  balance_eth: 2,
  position: CLOSED,
  last_price_buy: 0,
  last_price_sell: 0,
};

let current_profit = 0;
let higer_profit = 0;

let WATCH_RSI_LESS_20 = false;

cron.schedule("*/3 * * * * *", async () => {
  const start = new Date().getTime();

  let tecnicalData = await getTecnicalData();
  tecnicalData = tecnicalData.data.data;
  console.log("RUN");
  try {
    let rsi = tecnicalData.filter((data) => data.id.match(/rsi.*/));
    let typprice = tecnicalData.filter((data) => data.id.match(/typprice.*/));
    let price = typprice[0].result.value.toFixed(2);

    current_profit = (((price - status.last_price_buy) / price) * 100).toFixed(
      2
    );
    let current_rsi = rsi[0].result.value.toFixed(2);

    if (current_rsi <= 25 && status.position === CLOSED) {
      WATCH_RSI_LESS_20 = true;
    }

    if (status.position === OPEN)
      if (current_profit > higer_profit) higer_profit = current_profit;

    // CONDICION PARA COMPRAR RSI DEBIO ESTAR ANTES EN UN VALOR MENOR A 25, POSICION CERRADA, VALOR ACTUAL DE RSI ES MAYOR A 31
    if (WATCH_RSI_LESS_20 && status.position === CLOSED && current_rsi >= 31) {
      status.balance_eth = status.balance_usdt / price;
      status.last_price_buy = price;
      status.position = OPEN;
      current_profit = 0;
      higer_profit = 0;
      WATCH_RSI_LESS_20 = false;

      tradeHistory.create({
        symbol: SYMBOL,
        price: price,
        amount: status.balance_eth,
        operation: "BUY",
        bot_id: bot_id,
      });

      tradeStatus.update(bot_id, {
        balance_usdt: status.balance_usdt,
        balance_eth: status.balance_usdt / price,
        position: OPEN,
        last_price_buy: price,
        last_price_sell: status.last_price_sell,
      });

      bot.sendMessage(
        -1001564716717,
        `BUY ETH \nAMOUNT: ${status.balance_eth.toFixed(
          2
        )}\nPRICE: ${price}\nRSI: ${current_rsi}`
      );

      console.log(
        `BUY ETH \nAMOUNT: ${status.balance_eth.toFixed(
          2
        )}\nPRICE: ${price}\nRSI: ${current_rsi}`
      );
    }

    //STOP LOSS  VENDER CUANDO LA PERDIDA ES SUPERIOR AL -0.2%
    if (
      current_profit - higer_profit <= DYNAMIC_STOP_LOSS &&
      status.position === OPEN
    ) {
      status.position = CLOSED;
      status.balance_usdt = price * status.balance_eth;
      status.last_price_sell = price;
      WATCH_RSI_LESS_20 = false;
      higer_profit = 0;

      tradeHistory.create({
        symbol: SYMBOL,
        price: price,
        amount: status.balance_eth,
        operation: "SELL",
        bot_id: bot_id,
      });
      tradeStatus.update(bot_id, {
        balance_usdt: price * status.balance_eth,
        balance_eth: status.balance_eth,
        position: CLOSED,
        last_price_buy: status.last_price_buy,
        last_price_sell: price,
      });

      bot.sendMessage(
        -1001564716717,
        `STOP LOSS ETH\nAMOUNT: ${status.balance_usdt}\nPRICE: ${price}\nPROFIT: ${profit}\nRSI: ${current_rsi}`
      );

      console.log(
        `STOP LOSS ETH\nAMOUNT: ${status.balance_usdt}\nPRICE: ${price}\nPROFIT: ${current_profit}\nRSI: ${current_rsi}`
      );
    }

    //SELL SELL SELL SELL
    if (current_profit >= TAKE_PROFIT && status.position === OPEN) {
      status.position = CLOSED;
      status.balance_usdt = price * status.balance_eth;
      status.last_price_sell = price;
      status.position = CLOSED;
      higer_profit = 0;
      WATCH_RSI_LESS_20 = false;

      tradeHistory.create({
        symbol: SYMBOL,
        price: price,
        amount: status.balance_eth,
        operation: "SELL",
        bot_id: bot_id,
      });

      tradeStatus.update(bot_id, {
        balance_usdt: price * status.balance_eth,
        balance_eth: status.balance_eth,
        position: CLOSED,
        last_price_buy: status.last_price_buy,
        last_price_sell: price,
      });

      bot.sendMessage(
        -1001564716717,
        `SELL ETH\nAMOUNT: ${status.balance_usdt}\nPRICE: ${price}\nPROFIT: ${profit}\nRSI: ${current_rsi}`
      );

      console.log(
        `SELL ETH\nAMOUNT: ${status.balance_usdt}\nPRICE: ${price}\nPROFIT: ${current_profit}\nRSI: ${current_rsi}`
      );
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
    // sequelize.sync({ force: false }).then(() => {
    //   TradingHistory.bulkCreate([
    //     {
    //       symbol: "ETH/USDT",
    //       price: 2.4,
    //       amount: 1,
    //       operation: "BUY",
    //       bot_id: -1,
    //     },
    //   ]);

    //   Status.update(
    //     {
    //       balance_usdt: status.balance_usdt,
    //       balance_eth: status.balance_eth,
    //       position: status.position,
    //       last_price_buy: status.last_price_buy,
    //       last_price_sell: status.last_price_sell,
    //       bot_id: bot_id,
    //     },
    //     {
    //       where: {
    //         id: 1,
    //         bot_id: bot_id,
    //       },
    //     }
    //   );
    // });

    // commented by simon
    // Status.findAll({
    //   where: {
    //     bot_id: {
    //       [Op.eq]: bot_id,
    //     },
    //   },
    // })
    //   .then((result) => {
    //     status = result[0];
    //   })
    //   .catch((err) => {
    //     console.log(err);
    //   });
    //CHECK: why is looking for the first status?
    //status = tradeStatus.findStatus(bot_id);
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

startApp();

cron.schedule("*/15 * * * *", async () => {
  if (status.position === OPEN) {
    // bot.sendMessage(
    //   ID_CHAT_TELEGRAN,
    //   `OPEN POSITION\n\nOPENING PRICE: ${status.last_price_buy}\nACTUAL PROFIT: ${current_profit}%`
    // );
  }
});

bot.onText(/\/balance/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1];

  bot.sendMessage(chatId, `$ ${status.balance_usdt.toFixed(2)}  `);
});
bot.onText(/\/profit_current_position/, (msg, match) => {
  if (status.position === OPEN) {
    bot.sendMessage(msg.chat.id, `current position ${current_profit}% `);
  } else {
    bot.sendMessage(msg.chat.id, "you don't have open position");
  }
});
bot.onText(/\/profit/, (msg, match) => {
  //To Do mejorar cuando se buscar el profit y tiene una posicion abierta
  let initial_amount = 2500;
  let chat = match.input.split(" ");
  let profit_days = chat.length > 1 ? chat[1] : 30;

  if (status.position === OPEN) {
    bot.sendMessage(msg.chat.id, `current position ${current_profit}% `);
  } else {
    bot.sendMessage(msg.chat.id, "you don't have open position");
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

  console.log(chatId);
  bot.sendMessage(
    chatId,
    `position: ${status.position}\nbalance usdt ${status.balance_usdt}\nlast price sell = ${status.last_price_sell}
  `
  );
});
