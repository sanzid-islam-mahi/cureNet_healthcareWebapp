import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.addColumn('appointments', 'requires_reschedule', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await queryInterface.addColumn('appointments', 'reschedule_reason', {
    type: DataTypes.STRING(80),
    allowNull: true,
  });

  await queryInterface.addIndex('appointments', ['requires_reschedule'], {
    name: 'appointments_requires_reschedule',
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex('appointments', 'appointments_requires_reschedule');
  await queryInterface.removeColumn('appointments', 'reschedule_reason');
  await queryInterface.removeColumn('appointments', 'requires_reschedule');
}
