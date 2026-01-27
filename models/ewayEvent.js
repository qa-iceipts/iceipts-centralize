'use strict';

module.exports = (sequelize, DataTypes) => {
  const EwayEvent = sequelize.define('ewayEvent', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    dispatcherId: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    ewayBillNo: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    eventType: {
      type: DataTypes.ENUM('GENERATE', 'CANCEL', 'EXTEND'),
      allowNull: false
    },
    provider: {
      type: DataTypes.ENUM('NIC', 'WHITEBOOKS'),
      allowNull: false
    },
    requestData: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    responseData: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false
    }
  }, {
    tableName: 'eway_events',
    timestamps: true
  });

  return EwayEvent;
};
