const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/database');

async function testUpdate() {
    console.log('Iniciando teste de update...');
    await db.initialize();

    const loja = '10'; // Vamos tentar Loja 10 (ou mude para uma que tenha dados)
    const tableName = `TIRF_MANUAIS_LOJA${loja}`;

    try {
        // Buscar um manual qualquer
        const result = await db.execute(`SELECT ID_MANUAL, ID_APLICACAO FROM ${tableName} FETCH FIRST 1 ROWS ONLY`);

        if (result.rows.length === 0) {
            console.log(`Nenhum manual encontrado na loja ${loja}`);
            await db.close();
            return;
        }

        const manual = result.rows[0];
        console.log('Manual encontrado:', manual);

        const sql = `UPDATE ${tableName} 
                   SET TITULO = :titulo, 
                       DESCRICAO_CARD = :descricao, 
                       DATA_ATUALIZACAO = SYSDATE,
                       ID_ULTIMO_EDITOR = :userId,
                       ID_APLICACAO = :id_aplicacao
                   WHERE ID_MANUAL = :id`;

        const params = {
            titulo: 'Teste Update Script',
            descricao: 'Teste Descricao',
            userId: 1, // Supondo user ID 1 existe
            id_aplicacao: manual.ID_APLICACAO,
            id: manual.ID_MANUAL
        };

        console.log('Tentando update com params:', params);

        await db.execute(sql, params);
        console.log('Update com sucesso!');

    } catch (err) {
        console.error('ERRO NO UPDATE:', err);
    }

    await db.close();
    process.exit(0);
}

testUpdate();
