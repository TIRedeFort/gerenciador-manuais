require('dotenv').config({ path: './backend/.env' });
const db = require('./backend/config/database');
async function run() {
    try {
        await db.initialize();
        const result = await db.execute("SELECT SEARCH_CONDITION FROM ALL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'CHK_USUARIO_PERFIL'");
        if (result.rows && result.rows.length > 0) {
            console.log('CONSTRAINT_DEFINITION:', result.rows[0].SEARCH_CONDITION);
        } else {
            console.log('Constraint not found');
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await db.close();
    }
}
run();
