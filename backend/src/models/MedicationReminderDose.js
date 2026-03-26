import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import MedicationReminderPlan from './MedicationReminderPlan.js';

export const reminderDoseStatuses = ['scheduled', 'sent', 'taken', 'missed', 'skipped'];

const MedicationReminderDose = sequelize.define(
  'MedicationReminderDose',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    reminderPlanId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'medication_reminder_plans', key: 'id' },
      onDelete: 'CASCADE',
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...reminderDoseStatuses),
      allowNull: false,
      defaultValue: 'scheduled',
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    takenAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    skippedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    channelState: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: 'medication_reminder_doses',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['reminder_plan_id'] },
      { fields: ['scheduled_at'] },
      { fields: ['status'] },
    ],
  }
);

MedicationReminderPlan.hasMany(MedicationReminderDose, { foreignKey: 'reminderPlanId', as: 'Doses' });
MedicationReminderDose.belongsTo(MedicationReminderPlan, { foreignKey: 'reminderPlanId', as: 'Plan' });

export default MedicationReminderDose;
