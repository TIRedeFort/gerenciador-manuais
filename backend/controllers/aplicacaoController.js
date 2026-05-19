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

// Listar todas as aplicações
exports.listar = async (req, res) => {
    try {
        const tableApp = getTableName('TIRF_APLICACOES', req);
        const tableMod = getTableName('TIRF_MODULOS', req);

        const result = await db.execute(
            `SELECT a.ID_APLICACAO, a.ID_MODULO, a.NOME_APLICACAO, m.NOME_MODULO
             FROM ${tableApp} a
             JOIN ${tableMod} m ON a.ID_MODULO = m.ID_MODULO
             ORDER BY m.NOME_MODULO, a.NOME_APLICACAO`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar aplicações:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Listar aplicações por módulo
exports.listarPorModulo = async (req, res) => {
    try {
        const { moduloId } = req.params;
        const tableApp = getTableName('TIRF_APLICACOES', req);

        const result = await db.execute(
            `SELECT ID_APLICACAO, ID_MODULO, NOME_APLICACAO 
             FROM ${tableApp} 
             WHERE ID_MODULO = :moduloId
             ORDER BY NOME_APLICACAO`,
            [moduloId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar aplicações por módulo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Buscar aplicação por ID
exports.buscarPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.execute(
            `SELECT a.ID_APLICACAO, a.ID_MODULO, a.NOME_APLICACAO, m.NOME_MODULO
             FROM TIRF_APLICACOES a
             JOIN TIRF_MODULOS m ON a.ID_MODULO = m.ID_MODULO
             WHERE a.ID_APLICACAO = :id`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Aplicação não encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar aplicação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Criar aplicação (apenas TI)
exports.criar = async (req, res) => {
    try {
        const { id_modulo, nome_aplicacao } = req.body;

        if (!id_modulo || !nome_aplicacao) {
            return res.status(400).json({ error: 'Módulo e nome da aplicação são obrigatórios' });
        }

        const result = await db.execute(
            `INSERT INTO TIRF_APLICACOES (ID_MODULO, NOME_APLICACAO) 
             VALUES (:id_modulo, :nome)
             RETURNING ID_APLICACAO INTO :id`,
            {
                id_modulo,
                nome: nome_aplicacao,
                id: { type: require('oracledb').NUMBER, dir: require('oracledb').BIND_OUT }
            }
        );

        res.status(201).json({
            message: 'Aplicação criada com sucesso',
            id: result.outBinds.id[0]
        });
    } catch (error) {
        console.error('Erro ao criar aplicação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Atualizar aplicação (apenas TI)
exports.atualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_modulo, nome_aplicacao } = req.body;

        const result = await db.execute(
            `UPDATE TIRF_APLICACOES 
             SET ID_MODULO = :id_modulo, NOME_APLICACAO = :nome 
             WHERE ID_APLICACAO = :id`,
            [id_modulo, nome_aplicacao, id]
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Aplicação não encontrada' });
        }

        res.json({ message: 'Aplicação atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar aplicação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Excluir aplicação (apenas TI)
exports.excluir = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se há manuais vinculados
        const manuais = await db.execute(
            'SELECT COUNT(*) AS TOTAL FROM TIRF_MANUAIS WHERE ID_APLICACAO = :id',
            [id]
        );

        if (manuais.rows[0].TOTAL > 0) {
            return res.status(400).json({
                error: 'Não é possível excluir. Existem manuais vinculados a esta aplicação.'
            });
        }

        const result = await db.execute(
            'DELETE FROM TIRF_APLICACOES WHERE ID_APLICACAO = :id',
            [id]
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Aplicação não encontrada' });
        }

        res.json({ message: 'Aplicação excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir aplicação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
