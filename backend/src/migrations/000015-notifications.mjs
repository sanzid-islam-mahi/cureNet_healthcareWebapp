import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.createTable('notifications', {
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
    type: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    read_at: {
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

  await queryInterface.addIndex('notifications', ['patient_id', 'created_at']);
  await queryInterface.addIndex('notifications', ['patient_id', 'read_at']);
  await queryInterface.addIndex('notifications', ['type']);
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex('notifications', ['patient_id', 'created_at']);
  await queryInterface.removeIndex('notifications', ['patient_id', 'read_at']);
  await queryInterface.removeIndex('notifications', ['type']);
  await queryInterface.dropTable('notifications');
}

