import { DataTypes, Sequelize } from 'sequelize';

const tableName = 'notifications';

const columnDefinitions = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  link: {
    type: DataTypes.STRING(300),
    allowNull: true,
  },
  metadata: {
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
    defaultValue: Sequelize.fn('NOW'),
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: Sequelize.fn('NOW'),
  },
};

async function getTableDefinition(queryInterface) {
  try {
    return await queryInterface.describeTable(tableName);
  } catch (error) {
    if (
      error?.name === 'SequelizeDatabaseError' ||
      error?.name === 'SequelizeUnknownConstraintError' ||
      /doesn't exist/i.test(error?.message || '')
    ) {
      return null;
    }
    throw error;
  }
}

async function ensureColumn(queryInterface, tableDefinition, columnName, definition) {
  if (!tableDefinition[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function makeColumnNullable(queryInterface, tableDefinition, columnName) {
  if (!tableDefinition[columnName] || tableDefinition[columnName].allowNull) return;

  const baseType = tableDefinition[columnName].type;
  await queryInterface.changeColumn(tableName, columnName, {
    type: baseType,
    allowNull: true,
  });
}

async function ensureIndex(queryInterface, fields) {
  const existingIndexes = await queryInterface.showIndex(tableName);
  const hasIndex = existingIndexes.some((index) => {
    const indexFields = index.fields.map((field) => field.attribute);
    return indexFields.length === fields.length && indexFields.every((field, idx) => field === fields[idx]);
  });

  if (!hasIndex) {
    await queryInterface.addIndex(tableName, fields);
  }
}

export async function up({ context: queryInterface }) {
  const existingTable = await getTableDefinition(queryInterface);

  if (!existingTable) {
    await queryInterface.createTable(tableName, columnDefinitions);
  } else {
    const renamePairs = [
      ['userId', 'user_id'],
      ['readAt', 'read_at'],
      ['createdAt', 'created_at'],
      ['updatedAt', 'updated_at'],
    ];

    for (const [legacyName, canonicalName] of renamePairs) {
      if (existingTable[legacyName] && !existingTable[canonicalName]) {
        await queryInterface.renameColumn(tableName, legacyName, canonicalName);
      }
    }

    const normalizedDefinition = await queryInterface.describeTable(tableName);
    for (const [columnName, definition] of Object.entries(columnDefinitions)) {
      await ensureColumn(queryInterface, normalizedDefinition, columnName, definition);
    }

    // Legacy notification tables used patient-centric storage. Keep them writable by
    // making obsolete columns optional once user_id-based delivery is in place.
    await makeColumnNullable(queryInterface, normalizedDefinition, 'patient_id');
    await makeColumnNullable(queryInterface, normalizedDefinition, 'doctor_id');
  }

  await ensureIndex(queryInterface, ['user_id', 'read_at']);
  await ensureIndex(queryInterface, ['user_id', 'created_at']);
}

export async function down({ context: queryInterface }) {
  await queryInterface.dropTable(tableName);
}
