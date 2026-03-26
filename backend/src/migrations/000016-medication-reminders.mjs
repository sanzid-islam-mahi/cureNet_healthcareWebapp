import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('medication_reminder_plans', {
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
    prescription_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'prescriptions', key: 'id' },
      onDelete: 'CASCADE',
    },
    appointment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'appointments', key: 'id' },
      onDelete: 'SET NULL',
    },
    medicine_index: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    medicine_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    dosage: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    frequency_label: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'paused', 'stopped'),
      allowNull: false,
      defaultValue: 'active',
    },
    timezone: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'UTC',
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    schedule_times: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    last_generated_at: {
      type: DataTypes.DATE,
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

  await queryInterface.createTable('medication_reminder_doses', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    reminder_plan_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'medication_reminder_plans', key: 'id' },
      onDelete: 'CASCADE',
    },
    scheduled_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'sent', 'taken', 'missed', 'skipped'),
      allowNull: false,
      defaultValue: 'scheduled',
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    taken_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    skipped_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    channel_state: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
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

  await queryInterface.addIndex('medication_reminder_plans', ['patient_id']);
  await queryInterface.addIndex('medication_reminder_plans', ['prescription_id']);
  await queryInterface.addIndex('medication_reminder_plans', ['status']);
  await queryInterface.addIndex('medication_reminder_doses', ['reminder_plan_id']);
  await queryInterface.addIndex('medication_reminder_doses', ['scheduled_at']);
  await queryInterface.addIndex('medication_reminder_doses', ['status']);
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable('medication_reminder_doses');
  await queryInterface.dropTable('medication_reminder_plans');
}
