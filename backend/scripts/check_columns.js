const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/database');

async function checkColumns() {
    await db.initialize();
    const tableName = 'TIRF_MANUAIS_LOJA10'; // Ajuste conforme necessário

    try {
        const result = await db.execute(
            `SELECT column_name, data_type 
             FROM user_tab_columns 
             WHERE table_name = :tableName`,
            { tableName: tableName }
        );
        console.log(`Colunas em ${tableName}:`);
        console.table(result.rows);
    } catch (err) {
        console.error(err);
    }

    await db.close();
    process.exit(0);
}

checkColumns();
