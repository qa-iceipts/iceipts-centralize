'use strict';

module.exports = (sequelize, DataTypes) => {
  const PermitEvent = sequelize.define('permitEvent', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    dispatcherId: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    permitNo: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    eventType: {
      type: DataTypes.ENUM('VALIDATE', 'CHECK_STATUS'),
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
    tableName: 'permit_events',
    timestamps: true
  });

  return PermitEvent;
};
