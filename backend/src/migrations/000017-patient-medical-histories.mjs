import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('patient_medical_histories', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: 'patients', key: 'id' },
      onDelete: 'CASCADE',
    },
    chronic_conditions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: JSON.stringify([]),
    },
    past_procedures: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: JSON.stringify([]),
    },
    family_history: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: JSON.stringify([]),
    },
    current_long_term_medications: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: JSON.stringify([]),
    },
    immunization_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lifestyle_risk_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    general_medical_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
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
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('patient_medical_histories');
}
