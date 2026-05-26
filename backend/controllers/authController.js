const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Login
exports.login = async (req, res) => {
    try {
        const { login, senha } = req.body;
        const loginLower = login ? login.toLowerCase() : '';

        if (!login || !senha) {
            return res.status(400).json({ error: 'Login e senha são obrigatórios' });
        }

        const result = await db.execute(
            `SELECT u.ID_USUARIO, u.NOME, u.LOGIN, u.SENHA, u.PERFIL, 
                    NVL(u.PRIMEIRO_LOGIN, 1) AS PRIMEIRO_LOGIN,
                    NVL(u.STATUS, 'ATIVO') AS STATUS
             FROM TIRF_USUARIOS u
             WHERE u.LOGIN = :login`,
            [loginLower]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }

        const user = result.rows[0];

        // Buscar todas as lojas do usuário
        const lojasResult = await db.execute(
            `SELECT l.ID_LOJA, l.NUMERO_LOJA, l.NOME_LOJA, l.STATUS
             FROM TIRF_USUARIO_LOJAS ul
             INNER JOIN TIRF_LOJAS l ON ul.ID_LOJA = l.ID_LOJA
             WHERE ul.ID_USUARIO = :userId
             AND l.STATUS = 'ATIVO'
             ORDER BY l.NUMERO_LOJA`,
            [user.ID_USUARIO]
        );

        const lojasPermitidas = lojasResult.rows.map(loja => ({
            idLoja: loja.ID_LOJA,
            numeroLoja: loja.NUMERO_LOJA,
            nomeLoja: loja.NOME_LOJA
        }));

        // Verificar se usuário está inativo
        if (user.STATUS === 'INATIVO') {
            return res.status(401).json({ error: 'Usuário desabilitado. Entre em contato com o administrador.' });
        }

        const senhaValida = await bcrypt.compare(senha, user.SENHA);
        if (!senhaValida) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }

        const tokenPayload = {
            id: user.ID_USUARIO,
            nome: user.NOME,
            perfil: user.PERFIL
        };

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        const userData = {
            id: user.ID_USUARIO,
            nome: user.NOME,
            login: user.LOGIN,
            perfil: user.PERFIL,
            primeiroLogin: user.PRIMEIRO_LOGIN === 1,
            lojasPermitidas: lojasPermitidas,
            // Por compatibilidade, manter numeroLoja com a primeira loja (se houver)
            numeroLoja: lojasPermitidas.length > 0 ? lojasPermitidas[0].numeroLoja : null,
            idLoja: lojasPermitidas.length > 0 ? lojasPermitidas[0].idLoja : null,
            nomeLoja: lojasPermitidas.length > 0 ? lojasPermitidas[0].nomeLoja : null
        }

        res.json({
            token,
            user: userData
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Registrar usuário (apenas TI pode criar outros usuários TI)
exports.register = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { nome, login, senha, perfil, lojas_ids, id_loja } = req.body;
        const loginLower = login ? login.toLowerCase() : '';

        if (!nome || !login || !senha) {
            return res.status(400).json({ error: 'Nome, login e senha são obrigatórios' });
        }

        // Normalizar lojas (suportar tanto id_loja único quanto array lojas_ids)
        let lojasParaVincular = [];
        if (lojas_ids && Array.isArray(lojas_ids)) {
            lojasParaVincular = lojas_ids;
        } else if (id_loja) {
            lojasParaVincular = [id_loja];
        }

        // Validação: Usuário perfil LOJA deve ter loja vinculada
        if ((!perfil || perfil === 'LOJA') && lojasParaVincular.length === 0) {
            return res.status(400).json({ error: 'É obrigatório vincular o usuário a pelo menos uma loja' });
        }

        // Verificar se login já existe
        const exists = await connection.execute(
            'SELECT ID_USUARIO FROM TIRF_USUARIOS WHERE LOGIN = :login',
            [loginLower]
        );

        if (exists.rows.length > 0) {
            return res.status(400).json({ error: 'Login já existe' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);
        const perfilFinal = perfil || 'LEITOR';

        // Definir ID_LOJA principal (para retrocompatibilidade com lojaController)
        // Usa a primeira loja da lista se houver
        const idLojaPrincipal = lojasParaVincular.length > 0 ? lojasParaVincular[0] : null;

        // Inserir usuário
        const result = await connection.execute(
            `INSERT INTO TIRF_USUARIOS (NOME, LOGIN, SENHA, PERFIL) 
             VALUES (:nome, :login, :senha, :perfil)
             RETURNING ID_USUARIO INTO :id`,
            {
                nome,
                login: loginLower,
                senha: senhaHash,
                perfil: perfilFinal,
                id: { dir: db.oracledb.BIND_OUT, type: db.oracledb.NUMBER }
            }
        );

        const userId = result.outBinds.id[0];

        // Inserir lojas do usuário na tabela de relacionamento
        if (lojasParaVincular.length > 0) {
            for (const lojaId of lojasParaVincular) {
                // Verificar duplicidade antes de inserir
                const check = await connection.execute(
                    'SELECT 1 FROM TIRF_USUARIO_LOJAS WHERE ID_USUARIO = :p_user_id AND ID_LOJA = :p_loja_id',
                    [userId, lojaId]
                );

                if (check.rows.length === 0) {
                    await connection.execute(
                        `INSERT INTO TIRF_USUARIO_LOJAS (ID_USUARIO, ID_LOJA) VALUES (:p_user_id, :p_loja_id)`,
                        [userId, lojaId]
                    );
                }
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'Usuário criado com sucesso' });
    } catch (error) {
        await connection.rollback();
        const fs = require('fs');
        fs.writeFileSync('error_log_auth_register.txt', JSON.stringify(error, Object.getOwnPropertyNames(error), 2) + '\n' + error.stack);
        console.error('Erro ao registrar:', error);
        res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
    } finally {
        await connection.close();
    }
};

// Obter perfil do usuário logado
exports.getProfile = async (req, res) => {
    try {
        const result = await db.execute(
            `SELECT ID_USUARIO, NOME, LOGIN, PERFIL, DATA_CRIACAO 
             FROM TIRF_USUARIOS 
             WHERE ID_USUARIO = :id`,
            [req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Listar todos os usuários (apenas TI)
exports.listarUsuarios = async (req, res) => {
    try {
        const result = await db.execute(
            `SELECT u.ID_USUARIO, u.NOME, u.LOGIN, u.PERFIL, 
                    NVL(u.STATUS, 'ATIVO') AS STATUS, u.DATA_CRIACAO,
                    LISTAGG(CASE WHEN l.NUMERO_LOJA = '33' THEN 'CD' ELSE 'Loja ' || l.NUMERO_LOJA END, ', ') WITHIN GROUP (ORDER BY CASE WHEN l.NUMERO_LOJA = '33' THEN 0 ELSE 1 END, l.NUMERO_LOJA) AS LOJAS_NOMES,
                    LISTAGG(l.ID_LOJA, ',') WITHIN GROUP (ORDER BY CASE WHEN l.NUMERO_LOJA = '33' THEN 0 ELSE 1 END, l.NUMERO_LOJA) AS LOJAS_IDS
             FROM TIRF_USUARIOS u
             LEFT JOIN TIRF_USUARIO_LOJAS ul ON u.ID_USUARIO = ul.ID_USUARIO
             LEFT JOIN TIRF_LOJAS l ON ul.ID_LOJA = l.ID_LOJA
             GROUP BY u.ID_USUARIO, u.NOME, u.LOGIN, u.PERFIL, u.STATUS, u.DATA_CRIACAO
             ORDER BY u.NOME`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Atualizar usuário (apenas TI)
exports.atualizarUsuario = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id } = req.params;
        const { nome, senha, perfil, lojas_ids, id_loja } = req.body;

        // Normalizar lojas
        let lojasParaVincular = [];
        if (lojas_ids && Array.isArray(lojas_ids)) {
            lojasParaVincular = lojas_ids;
        } else if (id_loja) {
            lojasParaVincular = [id_loja];
        }

        // Validação (opcional na edição? melhor manter consistência)
        if ((perfil === 'LOJA') && lojasParaVincular.length === 0) {
            // Se for LOJA, exige loja. Se for TI, talvez não.
            // Vamos verificar se o usuário existente já tem loja se não enviaram nada?
            // Não, se enviaram id_loja vazio no form, quer dizer que removeram.
            return res.status(400).json({ error: 'Usuário de loja deve ter pelo menos uma loja vinculada' });
        }

        // Se senha foi fornecida, atualizar com hash
        if (senha) {
            const senhaHash = await bcrypt.hash(senha, 10);
            await connection.execute(
                `UPDATE TIRF_USUARIOS 
                 SET NOME = :nome, SENHA = :senha, PERFIL = :perfil
                 WHERE ID_USUARIO = :id`,
                {
                    nome,
                    senha: senhaHash,
                    perfil,
                    id
                }
            );
        } else {
            await connection.execute(
                `UPDATE TIRF_USUARIOS 
                 SET NOME = :nome, PERFIL = :perfil
                 WHERE ID_USUARIO = :id`,
                {
                    nome,
                    perfil,
                    id
                }
            );
        }

        // Remover associações antigas de lojas
        await connection.execute(
            `DELETE FROM TIRF_USUARIO_LOJAS WHERE ID_USUARIO = :id`,
            [id]
        );

        // Inserir novas associações de lojas
        if (lojasParaVincular.length > 0) {
            for (const lojaId of lojasParaVincular) {
                // Verificar duplicidade (não deve ter pois deletamos tudo, mas ok)
                const check = await connection.execute(
                    'SELECT 1 FROM TIRF_USUARIO_LOJAS WHERE ID_USUARIO = :p_user_id AND ID_LOJA = :p_loja_id',
                    [id, lojaId]
                );

                if (check.rows.length === 0) {
                    await connection.execute(
                        `INSERT INTO TIRF_USUARIO_LOJAS (ID_USUARIO, ID_LOJA) VALUES (:p_user_id, :p_loja_id)`,
                        [id, lojaId]
                    );
                }
            }
        }

        await connection.commit();
        res.json({ message: 'Usuário atualizado com sucesso' });
    } catch (error) {
        await connection.rollback();
        const fs = require('fs');
        fs.writeFileSync('error_log_auth_update.txt', JSON.stringify(error, Object.getOwnPropertyNames(error), 2) + '\n' + error.stack);
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
    } finally {
        await connection.close();
    }
};

// Excluir usuário (qualquer administrador TI)
exports.excluirUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        // Não permitir excluir o próprio usuário
        if (parseInt(id) === req.userId) {
            return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário' });
        }

        // Verificar se é o usuário administrador TI (não pode se excluir)
        const adminCheck = await db.execute(
            'SELECT LOGIN FROM TIRF_USUARIOS WHERE ID_USUARIO = :id',
            [id]
        );

        if (adminCheck.rows.length > 0 && adminCheck.rows[0].LOGIN === 'ti.cd@rfcentral.com.br') {
            return res.status(400).json({ error: 'O usuário Administrador TI não pode ser excluído' });
        }

        try {
            const result = await db.execute(
                'DELETE FROM TIRF_USUARIOS WHERE ID_USUARIO = :id',
                [id]
            );

            if (result.rowsAffected === 0) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            res.json({ message: 'Usuário excluído com sucesso' });
        } catch (dbError) {
            // Se falhar por integridade referencial (tem manuais/dependências), inativa o usuário
            if (dbError.message.includes('ORA-02292')) {
                await db.execute(
                    `UPDATE TIRF_USUARIOS SET STATUS = 'INATIVO' WHERE ID_USUARIO = :id`,
                    [id]
                );
                return res.json({
                    message: 'Usuário inativado pois possui registros associados (manuais/histórico).',
                    status: 'INATIVO'
                });
            }
            throw dbError; // Relança outros erros
        }
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Alterar senha (primeiro login ou redefinição)
exports.alterarSenha = async (req, res) => {
    try {
        const { novaSenha } = req.body;

        if (!novaSenha || novaSenha.length < 6) {
            return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
        }

        const senhaHash = await bcrypt.hash(novaSenha, 10);

        await db.execute(
            `UPDATE TIRF_USUARIOS 
             SET SENHA = :senha, PRIMEIRO_LOGIN = 0 
             WHERE ID_USUARIO = :id`,
            [senhaHash, req.userId]
        );

        res.json({ message: 'Senha alterada com sucesso' });
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Alternar status do usuário (ativar/desativar)
exports.toggleStatusUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se é o usuário administrador TI
        const adminCheck = await db.execute(
            'SELECT LOGIN, NVL(STATUS, \'ATIVO\') AS STATUS FROM TIRF_USUARIOS WHERE ID_USUARIO = :id',
            [id]
        );

        if (adminCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        if (adminCheck.rows[0].LOGIN === 'ti.cd@rfcentral.com.br') {
            return res.status(400).json({ error: 'O usuário Administrador TI não pode ser desativado' });
        }

        const currentStatus = adminCheck.rows[0].STATUS;
        const newStatus = currentStatus === 'ATIVO' ? 'INATIVO' : 'ATIVO';

        await db.execute(
            'UPDATE TIRF_USUARIOS SET STATUS = :status WHERE ID_USUARIO = :id',
            [newStatus, id]
        );

        res.json({
            message: `Usuário ${newStatus === 'ATIVO' ? 'ativado' : 'desativado'} com sucesso`,
            status: newStatus
        });
    } catch (error) {
        console.error('Erro ao alterar status do usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
