const db = require('../config/database');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
    console.log('Iniciando replicação gerada...');
    try {
        await db.initialize();
        const sqlPath = path.join(__dirname, 'replicate_generated.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split by ";"
        const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

        for (const stmt of statements) {
            if (stmt.toUpperCase() === 'COMMIT') {
                await db.commit();
                console.log('Commit executado.');
            } else {
                try {
                    // console.log(`Executando: ${stmt.substring(0, 50)}...`); 
                    await db.execute(stmt);
                } catch (err) {
                    if (err.message.includes('ORA-00001') || err.message.includes('ORA-00955')) {
                        // Ignore duplicates if any
                    } else if (err.message.includes('ORA-00942')) {
                        console.error('Tabela nao encontrada para statement, ignorando (pode ser loja excluida nao tratada):', stmt.substring(0, 50));
                    } else {
                        console.error('Erro:', err.message);
                        throw err;
                    }
                }
            }
        }
        console.log('Replicação concluída com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('Erro fatal:', error);
        process.exit(1);
    }
}

setTimeout(run, 1000);
