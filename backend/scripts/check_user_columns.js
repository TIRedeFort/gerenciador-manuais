require('dotenv').config({ path: '../.env' });
const db = require('../config/database');

async function checkColumns() {
    try {
        await db.initialize();
        const res = await db.execute("SELECT COLUMN_NAME FROM ALL_TAB_COLUMNS WHERE TABLE_NAME = 'TIRF_USUARIOS'");
        console.log(res.rows.map(r => r.COLUMN_NAME));
    } catch (e) { console.error(e); }
    finally { try { await db.close(); } catch { } }
}
checkColumns();
