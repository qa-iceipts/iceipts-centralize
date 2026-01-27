'use strict';

module.exports = (sequelize, DataTypes) => {
  const Drivers = sequelize.define('drivers', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    dlNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    fullName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    mobile: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    dob: {
      type: DataTypes.DATEONLY,
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
    driverImage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    validFrom: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    validTo: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    licenseClass: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'drivers',
    timestamps: true
  });

  return Drivers;
};
