'use strict';

const Sequelize = require('sequelize');
let sequelize = null;

module.exports = () => {
  if (!sequelize) {
    sequelize = new Sequelize(
      process.env.SQL_HOST
    );
  }

  return sequelize;
};
