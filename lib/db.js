"use strict";
const Sequelize = require("sequelize");
let sequelize = null;

module.exports = function setupDatabase() {
  if (!sequelize) {
    sequelize = new Sequelize(
      "postgres://ndjxqepu:z08mETdzGqrASiYbJ1cubgxI5GxThrPg@batyr.db.elephantsql.com/ndjxqepu"
    );
  }
  return sequelize;
};
