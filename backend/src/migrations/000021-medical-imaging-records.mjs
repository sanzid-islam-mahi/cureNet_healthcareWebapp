import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('medical_imaging_records', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'patients', key: 'id' },
      onDelete: 'CASCADE',
    },
    appointment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'appointments', key: 'id' },
      onDelete: 'SET NULL',
    },
    uploaded_by_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    study_type: {
      type: DataTypes.ENUM('xray', 'mri', 'ct', 'ultrasound', 'echo', 'mammography', 'other'),
      allowNull: false,
      defaultValue: 'other',
    },
    body_part: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    study_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    source_type: {
      type: DataTypes.ENUM('provider'),
      allowNull: false,
      defaultValue: 'provider',
    },
    report_text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    file_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('available', 'archived'),
      allowNull: false,
      defaultValue: 'available',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  await queryInterface.addIndex('medical_imaging_records', ['patient_id']);
  await queryInterface.addIndex('medical_imaging_records', ['appointment_id']);
  await queryInterface.addIndex('medical_imaging_records', ['uploaded_by_user_id']);
  await queryInterface.addIndex('medical_imaging_records', ['study_date']);
  await queryInterface.addIndex('medical_imaging_records', ['status']);
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('medical_imaging_records');
}
