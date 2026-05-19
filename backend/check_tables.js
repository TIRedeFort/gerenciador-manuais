require('dotenv').config();
const db = require('./config/database');

async function checkTables() {
    try {
        await db.initialize();

        const result = await db.execute(
            `SELECT TABLE_NAME FROM USER_TABLES 
             WHERE TABLE_NAME LIKE 'TIRF_MANUAIS%' 
             ORDER BY TABLE_NAME`
        );

        console.log('--- TABLES FOUND ---');
        result.rows.forEach(r => console.log(r.TABLE_NAME));

        await db.close();
    } catch (err) {
        console.error(err);
    }
}

checkTables();
