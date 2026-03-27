import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('clinics', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('hospital', 'clinic', 'diagnostic_center'),
      allowNull: false,
      defaultValue: 'clinic',
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    address_line: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    area: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
    },
    departments: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    services: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    operating_hours: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
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

  await queryInterface.addColumn('doctors', 'clinic_id', {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'clinics', key: 'id' },
    onDelete: 'SET NULL',
  });

  await queryInterface.addIndex('doctors', ['clinic_id'], {
    name: 'doctors_clinic_id',
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex('doctors', 'doctors_clinic_id');
  await queryInterface.removeColumn('doctors', 'clinic_id');
  await queryInterface.dropTable('clinics');
}
