const db = require('../config/database');

async function checkLojas() {
    try {
        await db.initialize();
        const connection = await db.getConnection();

        const result = await connection.execute(
            `SELECT NUMERO_LOJA, NOME_LOJA FROM TIRF_LOJAS ORDER BY NUMERO_LOJA`
        );

        result.rows.forEach(r => {
            console.log(`[${r.NUMERO_LOJA}] ${r.NOME_LOJA}`);
        });

        await connection.close();
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await db.close();
    }
}

checkLojas();
