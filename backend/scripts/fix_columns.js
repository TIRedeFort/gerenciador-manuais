const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/database');

async function fixTables() {
    console.log('Iniciando correção de tabelas de loja...');
    await db.initialize();

    // Corrigir Tabela Principal (TIRF_MANUAIS)
    try {
        const mainTable = 'TIRF_MANUAIS';
        // ARQUIVO_PDF
        try {
            await db.execute(`ALTER TABLE ${mainTable} ADD (ARQUIVO_PDF VARCHAR2(500))`);
            console.log(`[${mainTable}] Coluna ARQUIVO_PDF adicionada.`);
        } catch (err) {
            if (!err.message.includes('ORA-01430')) console.error(`[${mainTable}] Erro ao adicionar ARQUIVO_PDF:`, err.message);
        }
        // TIPO_CONTEUDO
        try {
            await db.execute(`ALTER TABLE ${mainTable} ADD (TIPO_CONTEUDO VARCHAR2(50))`);
            console.log(`[${mainTable}] Coluna TIPO_CONTEUDO adicionada.`);
        } catch (err) {
            if (!err.message.includes('ORA-01430')) console.error(`[${mainTable}] Erro ao adicionar TIPO_CONTEUDO:`, err.message);
        }
    } catch (error) {
        console.error('Erro processando TIRF_MANUAIS:', error);
    }

    // Lojas de 1 a 100
    for (let i = 1; i <= 100; i++) {
        const loja = i.toString().padStart(2, '0');
        const tableName = `TIRF_MANUAIS_LOJA${loja}`;

        try {
            // Tenta adicionar ARQUIVO_PDF
            try {
                await db.execute(`ALTER TABLE ${tableName} ADD (ARQUIVO_PDF VARCHAR2(500))`);
                console.log(`[${tableName}] Coluna ARQUIVO_PDF adicionada.`);
            } catch (err) {
                // Ignore se já existe (ORA-01430) ou tabela não existe (ORA-00942)
                if (err.message.includes('ORA-01430')) {
                    // console.log(`[${tableName}] Coluna ARQUIVO_PDF já existe.`);
                } else if (err.message.includes('ORA-00942')) {
                    // Tabela não existe, ignora
                } else {
                    console.error(`[${tableName}] Erro ao adicionar ARQUIVO_PDF:`, err.message);
                }
            }

            // Tenta adicionar TIPO_CONTEUDO (por garantia)
            try {
                await db.execute(`ALTER TABLE ${tableName} ADD (TIPO_CONTEUDO VARCHAR2(50))`);
                console.log(`[${tableName}] Coluna TIPO_CONTEUDO adicionada.`);
            } catch (err) {
                if (err.message.includes('ORA-01430')) {
                    // já existe
                } else if (!err.message.includes('ORA-00942')) {
                    // Tabela não existe, ignora
                } else {
                    console.error(`[${tableName}] Erro ao adicionar TIPO_CONTEUDO:`, err.message);
                }
            }

            // Tenta adicionar ID_ULTIMO_EDITOR
            try {
                await db.execute(`ALTER TABLE ${tableName} ADD (ID_ULTIMO_EDITOR NUMBER)`);
                console.log(`[${tableName}] Coluna ID_ULTIMO_EDITOR adicionada.`);
            } catch (err) {
                if (err.message.includes('ORA-01430')) {
                    // já existe
                } else if (!err.message.includes('ORA-00942')) {
                    // Tabela não existe, ignora
                } else {
                    console.error(`[${tableName}] Erro ao adicionar ID_ULTIMO_EDITOR:`, err.message);
                }
            }

        } catch (error) {
            console.error(`Erro processando ${tableName}:`, error);
        }
    }

    console.log('Finalizado.');
    await db.close();
    process.exit(0);
}

fixTables();
