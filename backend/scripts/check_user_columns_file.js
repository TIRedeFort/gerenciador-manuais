require('dotenv').config({ path: '../.env' });
const db = require('../config/database');
const fs = require('fs');

async function checkColumns() {
    try {
        await db.initialize();
        const res = await db.execute("SELECT COLUMN_NAME FROM ALL_TAB_COLUMNS WHERE TABLE_NAME = 'TIRF_USUARIOS'");
        const columns = res.rows.map(r => r.COLUMN_NAME);
        fs.writeFileSync('columns_output.txt', JSON.stringify(columns, null, 2));
        console.log('Done writing columns.');
    } catch (e) {
        console.error(e);
        fs.writeFileSync('columns_output.txt', 'Error: ' + e.message);
    }
    finally { try { await db.close(); } catch { } }
}
checkColumns();
