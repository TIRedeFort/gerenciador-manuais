const oracledb = require('oracledb');
require('dotenv').config({ path: './backend/.env' });

async function run() {
    let connection;

    try {
        console.log('Conectando ao Oracle...');
        connection = await oracledb.getConnection({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: process.env.DB_CONNECT_STRING
        });

        console.log('Executando alterações...');

        // Adicionar coluna ID_ULTIMO_EDITOR se não existir
        try {
            await connection.execute(`ALTER TABLE TIRF_MANUAIS ADD (ID_ULTIMO_EDITOR NUMBER)`);
            console.log('Coluna ID_ULTIMO_EDITOR adicionada.');
        } catch (e) {
            if (e.message.includes('ORA-01430')) {
                console.log('Coluna ID_ULTIMO_EDITOR já existe.');
            } else {
                throw e;
            }
        }

        // Adicionar Constraint FK
        try {
            await connection.execute(`ALTER TABLE TIRF_MANUAIS ADD CONSTRAINT FK_MANUAL_EDITOR FOREIGN KEY (ID_ULTIMO_EDITOR) REFERENCES TIRF_USUARIOS(ID_USUARIO)`);
            console.log('Constraint FK_MANUAL_EDITOR adicionada.');
        } catch (e) {
            if (e.message.includes('ORA-02275')) {
                console.log('Constraint FK_MANUAL_EDITOR já existe.');
            } else {
                throw e;
            }
        }

        console.log('Migração concluída com sucesso!');

    } catch (err) {
        console.error('Erro na migração:', err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
}

run();
