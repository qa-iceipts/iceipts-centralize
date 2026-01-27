"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class staticVehicleData extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) { }
  }
  staticVehicleData.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      truckOwner: {
        type: DataTypes.STRING,
      },
      address: {
        type: DataTypes.STRING,
      },
      pincode: {
        type: DataTypes.STRING,
      },
      state: {
        type: DataTypes.STRING,
      },
      city: {
        type: DataTypes.STRING,
      },
      truckNo: {
        type: DataTypes.STRING,
      },
      type: {
        type: DataTypes.STRING,
      },
      phoneNumber: {
        type: DataTypes.STRING,
      },
      rcBook: {
        type: DataTypes.BOOLEAN,
      },
      fitnessCertificate: {
        type: DataTypes.BOOLEAN,
      },
      puccValidUpto: {
        type: DataTypes.STRING,
      },
      rcExpiryDate: {
        type: DataTypes.STRING,
      },
      vehicleInsuranceUpto: {
        type: DataTypes.TEXT,
      }
    },
    {
      sequelize,
      modelName: "staticVehicleData",
      defaultScope: {
        // exclude password hash by default
        attributes: { exclude: ["createdAt", "updatedAt"] },
      },
    }
  );

  return staticVehicleData;
};
