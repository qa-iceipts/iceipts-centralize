'use strict';

module.exports = (sequelize, DataTypes) => {
  const VehicleEvent = sequelize.define('vehicleEvent', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    dispatcherId: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    vehicleNumber: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    eventType: {
      type: DataTypes.ENUM('RC_VALIDATION', 'DL_VALIDATION'),
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
    tableName: 'vehicle_events',
    timestamps: true
  });

  return VehicleEvent;
};
