
const oracledb = require('oracledb');

// Inicializar modo Thick com Oracle Instant Client
try {
    const oracleClientPath = process.env.ORACLE_CLIENT_PATH || 'C:\\instantclient_23_0';
    oracledb.initOracleClient({ libDir: oracleClientPath });
    console.log('✅ Oracle Instant Client inicializado (modo Thick)');
} catch (err) {
    if (err.message.includes('already been initialized')) {
        console.log('ℹ️ Oracle Client já inicializado');
    } else {
        console.error('⚠️ Erro ao inicializar Oracle Client:', err.message);
    }
}

// Configuração para retornar objetos ao invés de arrays
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

// Pool de conexões
let pool;

async function initialize() {
    try {
        pool = await oracledb.createPool({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: process.env.DB_CONNECTION_STRING,
            poolMin: 2,
            poolMax: 10,
            poolIncrement: 1
        });
        console.log('✅ Conexão com Oracle estabelecida com sucesso!');

        // --- MIGRATION: ADICIONAR ID_ULTIMO_EDITOR ---
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.execute(`ALTER TABLE TIRF_MANUAIS ADD (ID_ULTIMO_EDITOR NUMBER)`);
            console.log('✅ MIGRAÇÃO: Coluna ID_ULTIMO_EDITOR adicionada.');
        } catch (e) {
            if (!e.message.includes('ORA-01430')) console.error('⚠️ Migração Editor:', e.message);
        } finally {
            if (conn) {
                try {
                    // Tentar adicionar FK em bloco separado para garantir
                    const connFK = await pool.getConnection();
                    await connFK.execute(`ALTER TABLE TIRF_MANUAIS ADD CONSTRAINT FK_MANUAL_EDITOR FOREIGN KEY (ID_ULTIMO_EDITOR) REFERENCES TIRF_USUARIOS(ID_USUARIO)`);
                    console.log('✅ MIGRAÇÃO: FK_MANUAL_EDITOR adicionada.');
                    await connFK.close();
                } catch (e) {
                    if (!e.message.includes('ORA-02275')) console.error('⚠️ Migração FK:', e.message);
                }
                await conn.close();
            }
        }
        // ---------------------------------------------      

    } catch (err) {
        console.error('❌ Erro ao conectar com Oracle:', err);
        throw err;
    }
}

async function close() {
    try {
        await pool.close(10);
        console.log('Conexão com Oracle encerrada.');
    } catch (err) {
        console.error('Erro ao fechar conexão:', err);
    }
}

async function getConnection() {
    return await pool.getConnection();
}

async function execute(sql, binds = [], options = {}) {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, binds, options);
        return result;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Erro ao liberar conexão:', err);
            }
        }
    }
}

module.exports = {
    initialize,
    close,
    getConnection,
    execute,
    oracledb
};
