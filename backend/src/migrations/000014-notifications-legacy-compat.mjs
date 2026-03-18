export async function up({ context: queryInterface }) {
  const tableDefinition = await queryInterface.describeTable('notifications');

  if (tableDefinition.patient_id && !tableDefinition.patient_id.allowNull) {
    await queryInterface.changeColumn('notifications', 'patient_id', {
      type: tableDefinition.patient_id.type,
      allowNull: true,
    });
  }

  if (tableDefinition.doctor_id && !tableDefinition.doctor_id.allowNull) {
    await queryInterface.changeColumn('notifications', 'doctor_id', {
      type: tableDefinition.doctor_id.type,
      allowNull: true,
    });
  }
}

export async function down() {}
