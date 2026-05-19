const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../config/database');
const fs = require('fs');

async function run() {
    console.log('Iniciando correção de usuarios/lojas...');
    try {
        await db.initialize();
        const sqlPath = path.join(__dirname, 'fix_users_loja.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // O arquivo migration_lojas.sql contém blocos PL/SQL grandes.
        // O node-oracledb executa scripts PL/SQL via execute().
        // No entanto, o arquivo tem múltiplos comandos separados por "/" ou ";".
        // Vamos tentar executar o bloco PL/SQL principal (que começa com DECLARE e termina com END; /)
        // Parsear esse arquivo complexo pode ser difícil de forma simples.

        // Estratégia: Split por "/" sozinho em uma linha, que é o terminador comum de scripts Oracle.
        const statements = sql
            .split(/\n\/\s*(\n|$)/) // Split by "/" on its own line
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const stmt of statements) {
            // Se for um bloco vazio ou comentário puro, pular.
            if (!stmt || stmt.startsWith('--') && !stmt.includes('DECLARE') && !stmt.includes('CREATE')) continue;

            console.log('Executando bloco SQL/PLSQL...');
            // Remover "SET SERVEROUTPUT ON" que é comando do SQLPlus, não SQL
            let cleanStmt = stmt.replace(/^SET SERVEROUTPUT ON;/im, '').trim();

            // Oracledb não gosta de ";" no final de comandos SQL normais (CREATE TABLE...), 
            // mas precisa em PL/SQL. O split pelo "/" deve ter separado os blocos.
            // Se for comando simples (CREATE TABLE...), remover ; final se existir e não for PL/SQL.
            // Mas o PL/SQL deve manter os ; internos. O ; final do bloco é removido pelo split.

            // Ajuste fino: remover ; apenas se for o último char e a query NÃO começar com DECLARE ou BEGIN
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
                    // Não dar throw para continuar tentando os outros blocos
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

// Timeout para garantir conexão do pool
setTimeout(run, 1000);
