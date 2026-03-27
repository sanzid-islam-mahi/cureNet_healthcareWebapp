import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.addColumn('appointments', 'clinic_id', {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'clinics', key: 'id' },
    onDelete: 'SET NULL',
  });

  await queryInterface.addIndex('appointments', ['clinic_id'], {
    name: 'appointments_clinic_id',
  });

  await queryInterface.sequelize.query(`
    UPDATE appointments a
    JOIN doctors d ON d.id = a.doctor_id
    SET a.clinic_id = d.clinic_id
    WHERE a.clinic_id IS NULL
  `);
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex('appointments', 'appointments_clinic_id');
  await queryInterface.removeColumn('appointments', 'clinic_id');
}
