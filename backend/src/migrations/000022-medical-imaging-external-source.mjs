export async function up({ context: queryInterface }) {
  await queryInterface.sequelize.query(
    "ALTER TABLE `medical_imaging_records` MODIFY `source_type` ENUM('provider','external') NOT NULL DEFAULT 'provider';"
  );
}

export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query(
    "ALTER TABLE `medical_imaging_records` MODIFY `source_type` ENUM('provider') NOT NULL DEFAULT 'provider';"
  );
}
