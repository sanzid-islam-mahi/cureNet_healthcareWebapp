import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import crypto from 'crypto';
import User from './User.js';

const EmailVerificationCode = sequelize.define(
  'EmailVerificationCode',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
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
    codeHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    consumedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resendCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    attemptCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lastSentAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: 'email_verification_codes',
    timestamps: true,
    underscored: true,
  }
);

User.hasMany(EmailVerificationCode, { foreignKey: 'userId' });
EmailVerificationCode.belongsTo(User, { foreignKey: 'userId' });

EmailVerificationCode.generateCode = function () {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
};

EmailVerificationCode.hashCode = function (code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
};

export default EmailVerificationCode;
