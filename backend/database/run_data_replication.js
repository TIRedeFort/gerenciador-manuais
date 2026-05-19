const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/database');
const fs = require('fs');

async function run() {
    console.log('Iniciando replicação de dados...');
    try {
        await db.initialize();
        const sqlPath = path.join(__dirname, 'replicate_data.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Estratégia: Split por "/" sozinho em uma linha, que é o terminador comum de scripts Oracle.
        const statements = sql
            .split(/\n\/\s*(\n|$)/)
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const stmt of statements) {
            // Se for um bloco vazio ou comentário puro, pular.
            if (!stmt || (stmt.startsWith('--') && !stmt.includes('DECLARE') && !stmt.includes('BEGIN'))) continue;

            console.log('Executando bloco SQL/PLSQL...');
            let cleanStmt = stmt.replace(/^SET SERVEROUTPUT ON;/im, '').trim();

            if (cleanStmt.endsWith(';') && !cleanStmt.match(/^(DECLARE|BEGIN)/i)) {
                cleanStmt = cleanStmt.slice(0, -1);
            }

            try {
                await db.execute(cleanStmt);
                console.log('Sucesso.');
            } catch (err) {
                console.error('Erro ao executar bloco:', err); // Mostrar erro completo
                console.error('Mensagem:', err.message);
            }
        }

        console.log('Replicação finalizada!');
        process.exit(0);
    } catch (error) {
        console.error('Erro fatal na replicação:', error);
        process.exit(1);
    }
}

// Timeout para garantir conexão do pool
setTimeout(run, 1000);
