import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Patient from './Patient.js';
import Appointment from './Appointment.js';
import User from './User.js';
import {
  MEDICAL_IMAGING_SOURCE_TYPES,
  MEDICAL_IMAGING_STATUSES,
  MEDICAL_IMAGING_STUDY_TYPES,
} from '../lib/medicalImaging.js';

const MedicalImagingRecord = sequelize.define(
  'MedicalImagingRecord',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'patients', key: 'id' },
      onDelete: 'CASCADE',
    },
    appointmentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'appointments', key: 'id' },
      onDelete: 'SET NULL',
    },
    uploadedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    studyType: {
      type: DataTypes.ENUM(...MEDICAL_IMAGING_STUDY_TYPES),
      allowNull: false,
      defaultValue: 'other',
    },
    bodyPart: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    studyDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    sourceType: {
      type: DataTypes.ENUM(...MEDICAL_IMAGING_SOURCE_TYPES),
      allowNull: false,
      defaultValue: 'provider',
    },
    reportText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fileUrl: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...MEDICAL_IMAGING_STATUSES),
      allowNull: false,
      defaultValue: 'available',
    },
  },
  {
    tableName: 'medical_imaging_records',
    timestamps: true,
    underscored: true,
  }
);

Patient.hasMany(MedicalImagingRecord, { foreignKey: 'patientId', as: 'ImagingRecords' });
MedicalImagingRecord.belongsTo(Patient, { foreignKey: 'patientId', as: 'Patient' });

Appointment.hasMany(MedicalImagingRecord, { foreignKey: 'appointmentId', as: 'ImagingRecords' });
MedicalImagingRecord.belongsTo(Appointment, { foreignKey: 'appointmentId', as: 'Appointment' });

User.hasMany(MedicalImagingRecord, { foreignKey: 'uploadedByUserId', as: 'UploadedImagingRecords' });
MedicalImagingRecord.belongsTo(User, { foreignKey: 'uploadedByUserId', as: 'Uploader' });

export default MedicalImagingRecord;
