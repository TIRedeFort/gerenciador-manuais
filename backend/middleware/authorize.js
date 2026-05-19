// Middleware para verificar se o usuário é do perfil TI
const authorize = (...allowedProfiles) => {
    return (req, res, next) => {
        if (!req.userPerfil) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        if (!allowedProfiles.includes(req.userPerfil)) {
            return res.status(403).json({
                error: 'Acesso negado. Você não tem permissão para esta ação.'
            });
        }

        next();
    };
};

// Atalho para autorização apenas TI
const authorizeTI = authorize('TI');

// Middleware para verificar se o usuário é o autor do manual
const authorizeAuthor = async (req, res, next) => {
    try {
        const db = require('../config/database');
        const { id } = req.params;

        if (!req.userId) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        // Determinar tabela baseada na loja
        const loja = req.query.loja || req.body.loja;
        let tableName = 'TIRF_MANUAIS'; // Default

        if (loja && /^\d{2}$/.test(loja)) {
            tableName = `TIRF_MANUAIS_LOJA${loja}`;
        }

        const result = await db.execute(
            `SELECT ID_AUTOR FROM ${tableName} WHERE ID_MANUAL = :id`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Manual não encontrado' });
        }

        const manual = result.rows[0];
        const idAutor = manual.ID_AUTOR;

        // Permite edição se:
        // 1. É o autor do manual OU
        // 2. É usuário TI
        if (req.userId === idAutor || req.userPerfil === 'TI') {
            next();
        } else {
            return res.status(403).json({
                error: 'Acesso negado. Você não tem permissão para editar este manual.'
            });
        }
    } catch (error) {
        console.error('Erro ao verificar autorização de autor:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

module.exports = { authorize, authorizeTI, authorizeAuthor };
