import { DataTypes } from 'sequelize';

export async function up({ context: queryInterface }) {
    await queryInterface.addColumn('patients', 'profile_image', {
        type: DataTypes.STRING(500),
        allowNull: true,
    });
}

export async function down({ context: queryInterface }) {
    await queryInterface.removeColumn('patients', 'profile_image');
}
