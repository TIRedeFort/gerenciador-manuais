const db = require('../config/database');

// Listar todas as lojas
exports.listar = async (req, res) => {
    try {
        const result = await db.execute(
            `SELECT ID_LOJA, NUMERO_LOJA, NOME_LOJA, STATUS, DATA_CRIACAO
             FROM TIRF_LOJAS
             ORDER BY CASE WHEN NUMERO_LOJA = '33' THEN 0 ELSE 1 END, NUMERO_LOJA`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar lojas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Buscar loja por ID
exports.buscarPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.execute(
            `SELECT ID_LOJA, NUMERO_LOJA, NOME_LOJA, STATUS, DATA_CRIACAO
             FROM TIRF_LOJAS
             WHERE ID_LOJA = :id`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Loja não encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar loja:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Buscar loja por número
exports.buscarPorNumero = async (req, res) => {
    try {
        const { numero } = req.params;
        const result = await db.execute(
            `SELECT ID_LOJA, NUMERO_LOJA, NOME_LOJA, STATUS, DATA_CRIACAO
             FROM TIRF_LOJAS
             WHERE NUMERO_LOJA = :numero`,
            [numero]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Loja não encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar loja:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Criar loja
exports.criar = async (req, res) => {
    try {
        const { numero_loja, nome_loja } = req.body;

        if (!numero_loja || !nome_loja) {
            return res.status(400).json({ error: 'Número e nome da loja são obrigatórios' });
        }

        // Verificar se número já existe
        const exists = await db.execute(
            'SELECT ID_LOJA FROM TIRF_LOJAS WHERE NUMERO_LOJA = :numero',
            [numero_loja]
        );

        if (exists.rows.length > 0) {
            return res.status(400).json({ error: 'Já existe uma loja com este número' });
        }

        await db.execute(
            `INSERT INTO TIRF_LOJAS (NUMERO_LOJA, NOME_LOJA)
             VALUES (:numero_loja, :nome_loja)`,
            [numero_loja, nome_loja]
        );

        res.status(201).json({ message: 'Loja criada com sucesso' });
    } catch (error) {
        console.error('Erro ao criar loja:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Atualizar loja
exports.atualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { numero_loja, nome_loja } = req.body;

        if (!numero_loja || !nome_loja) {
            return res.status(400).json({ error: 'Número e nome da loja são obrigatórios' });
        }

        // Verificar se número já existe em outra loja
        const exists = await db.execute(
            'SELECT ID_LOJA FROM TIRF_LOJAS WHERE NUMERO_LOJA = :numero AND ID_LOJA != :id',
            [numero_loja, id]
        );

        if (exists.rows.length > 0) {
            return res.status(400).json({ error: 'Já existe outra loja com este número' });
        }

        await db.execute(
            `UPDATE TIRF_LOJAS 
             SET NUMERO_LOJA = :numero_loja, NOME_LOJA = :nome_loja
             WHERE ID_LOJA = :id`,
            [numero_loja, nome_loja, id]
        );

        res.json({ message: 'Loja atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar loja:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Toggle status da loja (ativar/desativar)
exports.toggleStatus = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar status atual
        const current = await db.execute(
            'SELECT STATUS FROM TIRF_LOJAS WHERE ID_LOJA = :id',
            [id]
        );

        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Loja não encontrada' });
        }

        const novoStatus = current.rows[0].STATUS === 'ATIVO' ? 'INATIVO' : 'ATIVO';

        await db.execute(
            'UPDATE TIRF_LOJAS SET STATUS = :status WHERE ID_LOJA = :id',
            [novoStatus, id]
        );

        // Se inativou a loja, inativar também os usuários da loja
        if (novoStatus === 'INATIVO') {
            await db.execute(
                'UPDATE TIRF_USUARIOS SET STATUS = :status WHERE ID_LOJA = :id',
                ['INATIVO', id]
            );
        }

        res.json({
            message: `Loja ${novoStatus === 'ATIVO' ? 'ativada' : 'desativada'} com sucesso`,
            status: novoStatus
        });
    } catch (error) {
        console.error('Erro ao alterar status da loja:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Listar usuários de uma loja
exports.listarUsuarios = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.execute(
            `SELECT u.ID_USUARIO, u.NOME, u.LOGIN, u.PERFIL, 
                    NVL(u.STATUS, 'ATIVO') AS STATUS, u.DATA_CRIACAO
             FROM TIRF_USUARIOS u
             INNER JOIN TIRF_USUARIO_LOJAS ul ON u.ID_USUARIO = ul.ID_USUARIO
             WHERE ul.ID_LOJA = :id
             ORDER BY u.NOME`,
            [id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar usuários da loja:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Listar todos os usuários de lojas agrupados por loja
exports.listarTodosUsuariosLojas = async (req, res) => {
    try {
        const result = await db.execute(
            `SELECT u.ID_USUARIO, u.NOME, u.LOGIN, u.PERFIL, 
                    NVL(u.STATUS, 'ATIVO') AS STATUS, u.DATA_CRIACAO,
                    l.ID_LOJA, l.NUMERO_LOJA, l.NOME_LOJA
             FROM TIRF_USUARIOS u
             INNER JOIN TIRF_USUARIO_LOJAS ul ON u.ID_USUARIO = ul.ID_USUARIO
             INNER JOIN TIRF_LOJAS l ON ul.ID_LOJA = l.ID_LOJA
             ORDER BY CASE WHEN l.NUMERO_LOJA = '33' THEN 0 ELSE 1 END, l.NUMERO_LOJA, u.NOME`
        );

        // Agrupar por loja mantendo a ordem do SQL
        const lojasOrdenadas = [];
        const mapaAgrupado = new Map();

        result.rows.forEach(row => {
            const lojaKey = row.ID_LOJA;
            if (!mapaAgrupado.has(lojaKey)) {
                const novaLoja = {
                    id_loja: row.ID_LOJA,
                    numero_loja: row.NUMERO_LOJA,
                    nome_loja: row.NOME_LOJA,
                    usuarios: []
                };
                mapaAgrupado.set(lojaKey, novaLoja);
                lojasOrdenadas.push(novaLoja);
            }

            mapaAgrupado.get(lojaKey).usuarios.push({
                id_usuario: row.ID_USUARIO,
                nome: row.NOME,
                login: row.LOGIN,
                perfil: row.PERFIL,
                status: row.STATUS,
                data_criacao: row.DATA_CRIACAO
            });
        });

        res.json(lojasOrdenadas);
    } catch (error) {
        console.error('Erro ao listar usuários de lojas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Excluir loja (apenas se não tiver usuários)
exports.excluir = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se tem usuários vinculados
        const usuarios = await db.execute(
            'SELECT COUNT(*) AS COUNT FROM TIRF_USUARIOS WHERE ID_LOJA = :id',
            [id]
        );

        const count = usuarios.rows[0].COUNT || usuarios.rows[0].count || 0;
        if (count > 0) {
            return res.status(400).json({
                error: 'Não é possível excluir a loja pois existem usuários vinculados. Remova os usuários primeiro.'
            });
        }

        await db.execute(
            'DELETE FROM TIRF_LOJAS WHERE ID_LOJA = :id',
            [id]
        );

        res.json({ message: 'Loja excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir loja:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
