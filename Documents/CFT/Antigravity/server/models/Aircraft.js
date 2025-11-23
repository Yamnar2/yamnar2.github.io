const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Aircraft = sequelize.define('Aircraft', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    registration: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true
        }
    },
    manufacturer: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    model: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    serial_number: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    debt_status: {
        type: DataTypes.ENUM('paid', 'pending', 'authorized', 'specific_amount'),
        allowNull: false,
        defaultValue: 'paid'
    },
    debt_details: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    debt_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    debt_currency: {
        type: DataTypes.STRING(3),
        allowNull: true
    },
    airworthiness_cert: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    airworthiness_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isDate: true
        }
    },
    radio_station_cert: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    radio_station_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isDate: true
        }
    },
    insurance: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    insurance_expiry: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isDate: true
        }
    }
}, {
    tableName: 'aircraft'
});

module.exports = Aircraft;
