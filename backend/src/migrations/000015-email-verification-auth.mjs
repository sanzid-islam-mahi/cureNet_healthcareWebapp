import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
  await queryInterface.addColumn('users', 'email_verified_at', {
    type: DataTypes.DATE,
    allowNull: true,
  });

  await queryInterface.createTable('email_verification_codes', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    purpose: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'email_verification',
    },
    code_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    consumed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resend_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    attempt_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    last_sent_at: {
      type: DataTypes.DATE,
      allowNull: false,
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

  await queryInterface.addIndex('email_verification_codes', ['user_id', 'purpose'], {
    name: 'email_verification_codes_user_purpose_idx',
  });
  await queryInterface.addIndex('email_verification_codes', ['expires_at'], {
    name: 'email_verification_codes_expires_idx',
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeIndex('email_verification_codes', 'email_verification_codes_expires_idx');
  await queryInterface.removeIndex('email_verification_codes', 'email_verification_codes_user_purpose_idx');
  await queryInterface.dropTable('email_verification_codes');
  await queryInterface.removeColumn('users', 'email_verified_at');
}
