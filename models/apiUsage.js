'use strict';

module.exports = (sequelize, DataTypes) => {
  const ApiUsage = sequelize.define('apiUsage', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    dispatcherId: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    apiType: {
      type: DataTypes.ENUM('VAHAN', 'EWAY', 'EINVOICE'),
      allowNull: false
    },
    endpoint: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    responseTime: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    requestData: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    responseData: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'api_usage',
    timestamps: true
  });

  return ApiUsage;
};
