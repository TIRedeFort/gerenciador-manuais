const db = require('../config/database');

// Helper to get table name
const getTableName = (base, req) => {
    const loja = req.query.loja || req.body.loja;
    // Loja 33 usa as tabelas genéricas
    if (loja && (loja === '33' || parseInt(loja) === 33)) {
        return base;
    }
    if (loja && /^\d{2}$/.test(loja)) {
        return `${base}_LOJA${loja}`;
    }
    return base;
};

// Listar todos os módulos
exports.listar = async (req, res) => {
    try {
        const table = getTableName('TIRF_MODULOS', req);
        const result = await db.execute(
            `SELECT ID_MODULO, NOME_MODULO, ICONE FROM ${table} ORDER BY NOME_MODULO`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar módulos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Buscar módulo por ID
exports.buscarPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.execute(
            'SELECT ID_MODULO, NOME_MODULO, ICONE FROM TIRF_MODULOS WHERE ID_MODULO = :id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Módulo não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar módulo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Criar módulo (apenas TI)
exports.criar = async (req, res) => {
    try {
        const { nome_modulo, icone } = req.body;

        if (!nome_modulo) {
            return res.status(400).json({ error: 'Nome do módulo é obrigatório' });
        }

        const result = await db.execute(
            `INSERT INTO TIRF_MODULOS (NOME_MODULO, ICONE) 
             VALUES (:nome, :icone)
             RETURNING ID_MODULO INTO :id`,
            {
                nome: nome_modulo,
                icone: icone || null,
                id: { type: require('oracledb').NUMBER, dir: require('oracledb').BIND_OUT }
            }
        );

        res.status(201).json({
            message: 'Módulo criado com sucesso',
            id: result.outBinds.id[0]
        });
    } catch (error) {
        console.error('Erro ao criar módulo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Atualizar módulo (apenas TI)
exports.atualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome_modulo, icone } = req.body;

        const result = await db.execute(
            `UPDATE TIRF_MODULOS 
             SET NOME_MODULO = :nome, ICONE = :icone 
             WHERE ID_MODULO = :id`,
            [nome_modulo, icone, id]
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Módulo não encontrado' });
        }

        res.json({ message: 'Módulo atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar módulo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Excluir módulo (apenas TI)
exports.excluir = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se há aplicações vinculadas
        const apps = await db.execute(
            'SELECT COUNT(*) AS TOTAL FROM TIRF_APLICACOES WHERE ID_MODULO = :id',
            [id]
        );

        if (apps.rows[0].TOTAL > 0) {
            return res.status(400).json({
                error: 'Não é possível excluir. Existem aplicações vinculadas a este módulo.'
            });
        }

        const result = await db.execute(
            'DELETE FROM TIRF_MODULOS WHERE ID_MODULO = :id',
            [id]
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Módulo não encontrado' });
        }

        res.json({ message: 'Módulo excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir módulo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
