import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Clinic = sequelize.define(
  'Clinic',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('hospital', 'clinic', 'diagnostic_center'),
      allowNull: false,
      defaultValue: 'clinic',
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    addressLine: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    area: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
    },
    departments: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    services: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    operatingHours: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'clinics',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['status'] }, { fields: ['city'] }],
  }
);

export default Clinic;
