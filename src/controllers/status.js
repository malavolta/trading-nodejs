const { Status } = require('../models/status');
const { Op } = require('sequelize');

module.exports = {
  update: async ({
    bot_id,
    update
  }) => {
    //TODO: send this to a queue
    const {
      balance_usdt,
      balance_eth,
      position,
      last_price_buy,
      last_price_sell
    } = update;

    await Status.update(
      {
        balance_usdt,
        balance_eth,
        position,
        last_price_buy,
        last_price_sell,
        bot_id,
      },
      {
        where: {
          bot_id,
        },
      }
    );
  },
  findStatus: async (bot_id) => {
    const status = Status.findOne({
      where: {
        bot_id: {
          [Op.eq]: bot_id,
        },
      },
    });

    return status;
  }
};