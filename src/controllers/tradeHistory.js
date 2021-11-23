const { TradingHistory } = require("../models/trading");

module.exports = {
  create: async ({ symbol, price, amount, operation, bot_id }) => {
    //TODO: send this to a queue
    await TradingHistory.create({
      symbol,
      price,
      amount,
      operation,
      bot_id,
    });
  },
};
