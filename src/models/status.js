const { Sequelize, DataTypes } = require("sequelize");
const setupDatabase = require("../lib/db");

const sequelize = setupDatabase();

const Status = sequelize.define("status", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  balance_usdt: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  balance_eth: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  position: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  last_price_buy: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  last_price_sell: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  bot_id: {
    type: Sequelize.INTEGER,
  },
});
module.exports = Status;
