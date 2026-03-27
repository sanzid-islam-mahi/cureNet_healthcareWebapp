import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';
import Clinic from './Clinic.js';

const Doctor = sequelize.define(
  'Doctor',
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
    bmdcRegistrationNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    experience: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Years of experience',
    },
    education: { type: DataTypes.TEXT, allowNull: true },
    certifications: { type: DataTypes.TEXT, allowNull: true },
    hospital: { type: DataTypes.STRING(200), allowNull: true },
    location: { type: DataTypes.STRING(300), allowNull: true },
    personalAddress: { type: DataTypes.STRING(500), allowNull: true },
    consultationFee: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    bio: { type: DataTypes.TEXT, allowNull: true },
    profileImage: { type: DataTypes.STRING(500), allowNull: true },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    clinicId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'clinics', key: 'id' },
      onDelete: 'SET NULL',
    },
    chamberTimes: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'DEPRECATED: Use chamberWindows instead. Explicit slot list per day: { monday: ["09:00", "09:30"], ... }',
    },
    chamberWindows: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Window-based availability: { monday: { morning: { enabled: true, maxPatients: 10 }, noon: { enabled: false, maxPatients: 0 }, evening: { enabled: true, maxPatients: 8 } }, ... }',
    },
    degrees: { type: DataTypes.JSON, allowNull: true },
    awards: { type: DataTypes.JSON, allowNull: true },
    languages: { type: DataTypes.JSON, allowNull: true },
    services: { type: DataTypes.JSON, allowNull: true },
    unavailableDates: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Doctor blackout dates: ["YYYY-MM-DD", ...]',
    },
  },
  {
    tableName: 'doctors',
    timestamps: true,
    underscored: true,
  }
);

User.hasOne(Doctor, { foreignKey: 'userId' });
Doctor.belongsTo(User, { foreignKey: 'userId' });
Clinic.hasMany(Doctor, { foreignKey: 'clinicId', as: 'Doctors' });
Doctor.belongsTo(Clinic, { foreignKey: 'clinicId', as: 'Clinic' });

export default Doctor;
