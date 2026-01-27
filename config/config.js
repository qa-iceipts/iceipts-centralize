require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DEV_DB_USERNAME || 'root',
    password: process.env.DEV_DB_PASSWORD || 'root',
    database: process.env.DEV_DB_DATABASE || 'central_gateway',
    host: process.env.DEV_DB_HOST || '192.168.31.51',
    port: parseInt(process.env.DEV_DB_PORT) || 3306,
    dialect: process.env.DEV_DB_DIALECT || 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    timezone: '+05:30'
  },
  test: {
    username: process.env.TEST_DB_USERNAME || 'admin',
    password: process.env.TEST_DB_PASSWORD || 'gvpr9988',
    database: process.env.TEST_DB_DATABASE || 'central_gateway',
    host: process.env.TEST_DB_HOST || 'gvpr-staging-db.c8ajg3wl9b2r.ap-south-1.rds.amazonaws.com',
    port: parseInt(process.env.TEST_DB_PORT) || 3306,
    dialect: process.env.TEST_DB_DIALECT || 'mysql',
    dialectOptions: process.env.TEST_SSLMODE === 'true' ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {},
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    timezone: '+05:30'
  },
  production: {
    username: process.env.PROD_DB_USERNAME || 'root',
    password: process.env.PROD_DB_PASSWORD || '',
    database: process.env.PROD_DB_DATABASE || 'central_gateway_prod',
    host: process.env.PROD_DB_HOST || '192.168.31.51',
    port: parseInt(process.env.PROD_DB_PORT) || 3306,
    dialect: process.env.PROD_DB_DIALECT || 'mysql',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000
    },
    timezone: '+05:30'
  }
};
