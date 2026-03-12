import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('medication_doses', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'patients', key: 'id' },
      onDelete: 'CASCADE',
    },
    tracker_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'patient_medication_trackers', key: 'id' },
      onDelete: 'CASCADE',
    },
    scheduled_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    window_end_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'notified', 'taken', 'missed', 'skipped'),
      allowNull: false,
      defaultValue: 'scheduled',
    },
    taken_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    source: {
      type: DataTypes.ENUM('system', 'manual'),
      allowNull: false,
      defaultValue: 'system',
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

  await queryInterface.addIndex('medication_doses', ['tracker_id', 'scheduled_at']);
  await queryInterface.addIndex('medication_doses', ['patient_id', 'scheduled_at']);
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex('medication_doses', ['tracker_id', 'scheduled_at']);
  await queryInterface.removeIndex('medication_doses', ['patient_id', 'scheduled_at']);
  await queryInterface.dropTable('medication_doses');
}

