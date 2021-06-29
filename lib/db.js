"use strict";
const Sequelize = require("sequelize");
let sequelize = null;

module.exports = function setupDatabase() {
  if (!sequelize) {
    sequelize = new Sequelize("postgres://trading:2828@localhost:5432/trading");
  }
  return sequelize;
};
