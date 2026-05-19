const db = require('../config/database');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function check() {
    try {
        await db.initialize();
        console.log('Verificando Loja 33...');

        let result = await db.execute("SELECT count(*) as CNT FROM user_tables WHERE table_name = 'TIRF_MANUAIS_LOJA33'");
        if (result.rows[0].CNT == 0) {
            console.log('Tabela TIRF_MANUAIS_LOJA33 NÃO existe.');
        } else {
            console.log('Tabela TIRF_MANUAIS_LOJA33 EXISTE.');

            result = await db.execute("SELECT count(*) as CNT FROM TIRF_MANUAIS_LOJA33");
            console.log('Quantidade de manuais na Loja 33: ' + result.rows[0].CNT);

            result = await db.execute("SELECT count(*) as CNT FROM TIRF_MODULOS_LOJA33");
            console.log('Quantidade de módulos na Loja 33: ' + result.rows[0].CNT);
        }
        process.exit(0);
    } catch (err) {
        console.error('Erro:', err);
        process.exit(1);
    }
}

setTimeout(check, 1000);
