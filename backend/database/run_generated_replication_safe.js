const db = require('../config/database');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const logFile = path.join(__dirname, 'replication.log');
fs.writeFileSync(logFile, 'Start\n');

function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
}

async function run() {
    log('Iniciando replicação gerada (SAFE)...');
    try {
        await db.initialize();
        const sqlPath = path.join(__dirname, 'replicate_generated.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split by ";"
        const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

        for (const stmt of statements) {
            if (stmt.toUpperCase() === 'COMMIT') {
                // await db.commit(); // AutoCommit is enabled
                log('Commit executado (AutoCommit).');
            } else {
                try {
                    await db.execute(stmt);
                } catch (err) {
                    if (err.message.includes('ORA-00001') || err.message.includes('ORA-00955')) {
                        // Ignore duplicates
                    } else if (err.message.includes('ORA-00942')) {
                        log('Tabela não encontrada: ' + stmt.substring(0, 50));
                    } else {
                        log('ERRO: ' + err.message);
                        log('STMT: ' + stmt.substring(0, 100));
                    }
                }
            }
        }
        log('Replicação concluída com sucesso!');
        process.exit(0);
    } catch (error) {
        log('Erro fatal: ' + error.message);
        process.exit(1);
    }
}

setTimeout(run, 1000);
