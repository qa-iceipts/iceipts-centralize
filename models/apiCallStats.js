"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class apiCallStats extends Model {
    static associate(models) {
      // associations can be defined here
    }
  }

  apiCallStats.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      mineId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      orgId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      apiType: {
        type: DataTypes.ENUM(
          // VAHAN APIs
          'vahan_vehicle',
          'vahan_dl',
          // eWay APIs
          'eway_generate',
          'eway_cancel',
          'eway_extend',
          // eInvoice APIs
          'einvoice_generate',
          'einvoice_cancel',
          'einvoice_get_irn',
          'einvoice_get_details'
        ),
        allowNull: false,
      },
      month: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      successCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      failureCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "apiCallStats",
      indexes: [
        {
          unique: true,
          fields: ['mineId', 'apiType', 'month', 'year']
        },
        {
          fields: ['mineId']
        },
        {
          fields: ['apiType']
        },
        {
          fields: ['month', 'year']
        }
      ]
    }
  );

  return apiCallStats;
};
