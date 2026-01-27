'use strict';

module.exports = (sequelize, DataTypes) => {
  const Dispatcher = sequelize.define('dispatcher', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    dispatcherId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    mineId: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    orgId: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    mineName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    gstin: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'dispatchers',
    timestamps: true
  });

  return Dispatcher;
};
