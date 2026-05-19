const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/database');
const fs = require('fs');

async function run() {
    console.log('Iniciando migração completa de lojas...');
    try {
        await db.initialize();
        const sqlPath = path.join(__dirname, 'migration_lojas.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Estratégia: Split por "/" sozinho em uma linha, suportando \r\n
        const statements = sql
            .split(/\r?\n\/\s*(\r?\n|$)/)
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const stmt of statements) {
            // Se for comentário puro (sem DECLARE/BEGIN/CREATE), pular
            if (!stmt || (stmt.startsWith('--') && !stmt.includes('DECLARE') && !stmt.includes('BEGIN') && !stmt.includes('CREATE'))) continue;

            console.log('Executando bloco SQL/PLSQL...');
            // Remover "SET SERVEROUTPUT"
            let cleanStmt = stmt.replace(/^SET SERVEROUTPUT ON;/im, '').trim();

            // Remover ponto e vírgula final se não for bloco PL/SQL
            if (cleanStmt.endsWith(';') && !cleanStmt.match(/^(DECLARE|BEGIN)/i)) {
                cleanStmt = cleanStmt.slice(0, -1);
            }

            try {
                await db.execute(cleanStmt);
                console.log('Sucesso.');
            } catch (err) {
                if (err.message.includes('ORA-00955') || err.message.includes('ORA-01430')) {
                    console.log('Objeto já existe, ignorando erro.');
                } else {
                    console.error('Erro ao executar bloco:', err.message);
                }
            }
        }

        console.log('Migração de Lojas finalizada!');
        process.exit(0);
    } catch (error) {
        console.error('Erro fatal na migração:', error);
        process.exit(1);
    }
}

setTimeout(run, 1000);
