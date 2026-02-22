import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';

const Patient = sequelize.define(
  'Patient',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    profileImage: { type: DataTypes.STRING(500), allowNull: true },
    bloodType: { type: DataTypes.STRING(10), allowNull: true },
    allergies: { type: DataTypes.TEXT, allowNull: true },
    emergencyContact: { type: DataTypes.STRING(100), allowNull: true },
    emergencyPhone: { type: DataTypes.STRING(20), allowNull: true },
    insuranceProvider: { type: DataTypes.STRING(100), allowNull: true },
    insuranceNumber: { type: DataTypes.STRING(50), allowNull: true },
  },
  {
    tableName: 'patients',
    timestamps: true,
    underscored: true,
  }
);

User.hasOne(Patient, { foreignKey: 'userId' });
Patient.belongsTo(User, { foreignKey: 'userId' });

export default Patient;
