const db = require('../config/database');

async function run() {
    console.log('Iniciando migração de correção...');
    try {
        await db.initialize(); // Garantir conexão

        try {
            await db.execute(`ALTER TABLE TIRF_MANUAIS ADD ARQUIVO_PDF VARCHAR2(255)`);
            console.log('Coluna ARQUIVO_PDF adicionada.');
        } catch (e) {
            console.log('Coluna ARQUIVO_PDF pode já existir:', e.message);
        }

        try {
            await db.execute(`ALTER TABLE TIRF_MANUAIS ADD TIPO_CONTEUDO VARCHAR2(10) DEFAULT 'HTML' CHECK (TIPO_CONTEUDO IN ('HTML', 'PDF'))`);
            console.log('Coluna TIPO_CONTEUDO adicionada.');
        } catch (e) {
            console.log('Coluna TIPO_CONTEUDO pode já existir:', e.message);
        }

        // Importante: COMMIT explícito
        await db.commit();
        console.log('Commit realizado.');

    } catch (error) {
        console.error('Erro geral:', error);
    } finally {
        await db.close();
    }
}

run();
