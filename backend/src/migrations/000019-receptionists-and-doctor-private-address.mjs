import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.changeColumn('users', 'role', {
    type: DataTypes.ENUM('patient', 'doctor', 'admin', 'receptionist'),
    allowNull: false,
    defaultValue: 'patient',
  });

  await queryInterface.addColumn('doctors', 'personal_address', {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Private doctor residence/contact address. Not visible to patients.',
  });

  await queryInterface.createTable('receptionists', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    clinic_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'clinics', key: 'id' },
      onDelete: 'CASCADE',
    },
    employee_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
  await queryInterface.dropTable('receptionists');
  await queryInterface.removeColumn('doctors', 'personal_address');
  await queryInterface.changeColumn('users', 'role', {
    type: DataTypes.ENUM('patient', 'doctor', 'admin'),
    allowNull: false,
    defaultValue: 'patient',
  });
}
