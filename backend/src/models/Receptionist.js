import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';
import Clinic from './Clinic.js';

const Receptionist = sequelize.define(
  'Receptionist',
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
    clinicId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'clinics', key: 'id' },
      onDelete: 'CASCADE',
    },
    employeeCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: 'receptionists',
    timestamps: true,
    underscored: true,
  }
);

User.hasOne(Receptionist, { foreignKey: 'userId' });
Receptionist.belongsTo(User, { foreignKey: 'userId' });
Clinic.hasMany(Receptionist, { foreignKey: 'clinicId', as: 'Receptionists' });
Receptionist.belongsTo(Clinic, { foreignKey: 'clinicId', as: 'Clinic' });

export default Receptionist;
