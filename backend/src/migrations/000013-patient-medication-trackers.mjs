import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('patient_medication_trackers', {
    id: { type: DataTypes.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
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
    medicine_key: { type: DataTypes.STRING(120), allowNull: false },
    medicine_name: { type: DataTypes.STRING(160), allowNull: false },
    times_per_day: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    meal_timing: {
      type: DataTypes.ENUM('before_meal', 'after_meal', 'with_meal', 'any'),
      allowNull: false,
      defaultValue: 'any',
    },
    duration_days: { type: DataTypes.INTEGER, allowNull: true },
    reminders_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    reminder_times: { type: DataTypes.JSON, allowNull: true },
    status: {
      type: DataTypes.ENUM('active', 'paused', 'completed'),
      allowNull: false,
      defaultValue: 'active',
    },
    started_at: { type: DataTypes.DATE, allowNull: false },
    completed_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });

  await queryInterface.addIndex('patient_medication_trackers', ['patient_id', 'prescription_id', 'medicine_key'], {
    unique: true,
    name: 'uniq_tracker_per_medicine',
  });
  await queryInterface.addIndex('patient_medication_trackers', ['patient_id', 'status']);
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex('patient_medication_trackers', 'uniq_tracker_per_medicine');
  await queryInterface.removeIndex('patient_medication_trackers', ['patient_id', 'status']);
  await queryInterface.dropTable('patient_medication_trackers');
}
