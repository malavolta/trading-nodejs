const { Sequelize, DataTypes } = require("sequelize");
const setupDatabase = require("../lib/db");

const sequelize = setupDatabase();

const TradingHistory = sequelize.define("trading_history", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  symbol: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  price: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  operation: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});
module.exports = TradingHistory;
