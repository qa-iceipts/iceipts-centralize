"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class drivers extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // drivers.hasMany(models.vehicleDetails, { onDelete: "CASCADE" });
    }
  }
  drivers.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      driverImage: {
        type: DataTypes.TEXT,
      },
      dlNumber: {
        type: DataTypes.STRING,
      },
      fullName: {
        type: DataTypes.STRING,
      },
      email: {
        type: DataTypes.STRING,
      },
      mobile: {
        type: DataTypes.STRING,
      },
      address: {
        type: DataTypes.STRING,
      },
      joiningDate: {
        type: DataTypes.DATE,
      },
      salary: {
        type: DataTypes.DOUBLE,
      },
      gender: {
        type: DataTypes.STRING,
      },
      assets: {
        type: DataTypes.STRING,
      },
      assignVehicle: {
        type: DataTypes.STRING,
      },
      uploadAadharCard: {
        type: DataTypes.STRING,
      },
      uploadDrivingLic: {
        type: DataTypes.STRING,
      },
      userId: {
        type: DataTypes.STRING,
      },
      pan: {
        type: DataTypes.STRING,
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      dob: {
        type: DataTypes.DATE,
      },
      dlValidUpto: {
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      modelName: "drivers",
      defaultScope: {
        // exclude password hash by default
        attributes: { exclude: ["createdAt", "updatedAt"] },
      },
    }
  );

  return drivers;
};
