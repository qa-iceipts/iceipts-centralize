'use strict';

module.exports = (sequelize, DataTypes) => {
  const EinvoiceEvent = sequelize.define('einvoiceEvent', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    dispatcherId: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    irn: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    eventType: {
      type: DataTypes.ENUM('GENERATE', 'CANCEL', 'GET_BY_IRN', 'GET_BY_DOC'),
      allowNull: false
    },
    provider: {
      type: DataTypes.ENUM('WHITEBOOKS'),
      allowNull: false,
      defaultValue: 'WHITEBOOKS'
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
    tableName: 'einvoice_events',
    timestamps: true
  });

  return EinvoiceEvent;
};
