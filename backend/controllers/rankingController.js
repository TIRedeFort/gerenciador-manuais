const db = require('../config/database');

// Helper to get table name based on loja parameter
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

// Listar ranking de usuários por quantidade de manuais criados
exports.listarRanking = async (req, res) => {
    try {
        const tableManual = getTableName('TIRF_MANUAIS', req);

        const result = await db.execute(
            `SELECT 
                u.ID_USUARIO,
                u.NOME,
                u.LOGIN,
                u.PERFIL,
                COUNT(m.ID_MANUAL) AS TOTAL_MANUAIS
             FROM TIRF_USUARIOS u
             LEFT JOIN ${tableManual} m ON u.ID_USUARIO = m.ID_AUTOR 
                AND m.STATUS = 'ATIVO'
             WHERE u.STATUS = 'ATIVO'
             GROUP BY u.ID_USUARIO, u.NOME, u.LOGIN, u.PERFIL
             HAVING COUNT(m.ID_MANUAL) > 0
             ORDER BY TOTAL_MANUAIS DESC, u.NOME ASC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar ranking:', error);
        res.status(500).json({ error: 'Erro ao buscar ranking de usuários' });
    }
};

// Listar manuais de um usuário específico, separados por módulos
exports.listarManuaisUsuario = async (req, res) => {
    try {
        const { userId } = req.params;
        const tableManual = getTableName('TIRF_MANUAIS', req);
        const tableApp = getTableName('TIRF_APLICACOES', req);
        const tableMod = getTableName('TIRF_MODULOS', req);

        // Buscar informações do usuário
        const userResult = await db.execute(
            `SELECT ID_USUARIO, NOME, LOGIN, PERFIL
             FROM TIRF_USUARIOS 
             WHERE ID_USUARIO = :userId`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const usuario = userResult.rows[0];

        // Buscar manuais agrupados por módulo
        const manuaisResult = await db.execute(
            `SELECT 
                mod.ID_MODULO,
                mod.NOME_MODULO,
                mod.ICONE AS ICONE_MODULO,
                app.ID_APLICACAO,
                app.NOME_APLICACAO,
                m.ID_MANUAL,
                m.TITULO,
                m.DESCRICAO_CARD AS DESCRICAO,
                m.DATA_CRIACAO,
                m.DATA_ATUALIZACAO
             FROM ${tableManual} m
             INNER JOIN ${tableApp} app ON m.ID_APLICACAO = app.ID_APLICACAO
             INNER JOIN ${tableMod} mod ON app.ID_MODULO = mod.ID_MODULO
             WHERE m.ID_AUTOR = :userId
                AND m.STATUS = 'ATIVO'
             ORDER BY mod.NOME_MODULO, app.NOME_APLICACAO, m.TITULO`,
            [userId]
        );

        // Organizar manuais por módulo
        const manuaisPorModulo = {};

        manuaisResult.rows.forEach(manual => {
            const moduloId = manual.ID_MODULO;

            if (!manuaisPorModulo[moduloId]) {
                manuaisPorModulo[moduloId] = {
                    id: manual.ID_MODULO,
                    nome: manual.NOME_MODULO,
                    icone: manual.ICONE_MODULO,
                    aplicacoes: {}
                };
            }

            const aplicacaoId = manual.ID_APLICACAO;

            if (!manuaisPorModulo[moduloId].aplicacoes[aplicacaoId]) {
                manuaisPorModulo[moduloId].aplicacoes[aplicacaoId] = {
                    id: manual.ID_APLICACAO,
                    nome: manual.NOME_APLICACAO,
                    manuais: []
                };
            }

            manuaisPorModulo[moduloId].aplicacoes[aplicacaoId].manuais.push({
                id: manual.ID_MANUAL,
                titulo: manual.TITULO,
                descricao: manual.DESCRICAO,
                dataCriacao: manual.DATA_CRIACAO,
                dataAtualizacao: manual.DATA_ATUALIZACAO
            });
        });

        // Converter objetos em arrays
        const modulos = Object.values(manuaisPorModulo).map(modulo => ({
            ...modulo,
            aplicacoes: Object.values(modulo.aplicacoes)
        }));

        res.json({
            usuario: {
                id: usuario.ID_USUARIO,
                nome: usuario.NOME,
                login: usuario.LOGIN,
                perfil: usuario.PERFIL
            },
            modulos,
            totalManuais: manuaisResult.rows.length
        });
    } catch (error) {
        console.error('Erro ao buscar manuais do usuário:', error);
        res.status(500).json({ error: 'Erro ao buscar manuais do usuário' });
    }
};
