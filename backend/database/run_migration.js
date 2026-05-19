const db = require('../config/database');
const fs = require('fs');
const path = require('path');

async function run() {
    console.log('Iniciando migração...');
    try {
        const sqlPath = path.join(__dirname, 'migration_pdf.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Oracle não aceita múltiplos statements com ; em uma única chamada execute() normalmente,
        // mas vamos tentar dividir.
        const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

        for (const stmt of statements) {
            if (stmt.toUpperCase() === 'COMMIT') {
                await db.commit();
                console.log('Commit executado.');
            } else {
                try {
                    console.log(`Executando: ${stmt}`);
                    await db.execute(stmt);
                } catch (err) {
                    if (err.message.includes('ORA-01430')) {
                        console.log('Coluna já existe, pulando.');
                    } else {
                        throw err;
                    }
                }
            }
        }
        console.log('Migração concluída com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('Erro na migração:', error);
        process.exit(1);
    }
}

// Pequeno delay para garantir que o pool conectou (initOracleClient é síncrono, mas pool é async as vezes)
setTimeout(run, 2000);
