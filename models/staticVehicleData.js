'use strict';

module.exports = (sequelize, DataTypes) => {
  const StaticVehicleData = sequelize.define('staticVehicleData', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    truckNo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    truckOwner: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    pincode: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    fitnessCertificate: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    rcBook: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    chassisNumber: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    engineNumber: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    registrationDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    fitnessValidUpto: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'static_vehicle_data',
    timestamps: true
  });

  return StaticVehicleData;
};
