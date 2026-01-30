const logger = require('./logger');
const env = process.env.NODE_ENV || 'development';
const config = require('../config/config')[env];
const mysql = require('mysql2/promise');

module.exports = (async function initialize() {
  logger.info('Initializing database...', { env });

  // Create database if it doesn't exist
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password
  });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\`;`);

  const db = require('../models');

  // Authenticate
  await db.sequelize.authenticate();
  logger.info('Database authenticated successfully');

  // Sync all models with database
  await db.sequelize.sync({ force: false });
  // await db.staticVehicleData.sync({ alter: true });
  logger.info('Database synced successfully');

  return db;
})();
