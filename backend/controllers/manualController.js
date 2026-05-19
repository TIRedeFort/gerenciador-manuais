const db = require('../config/database');
const oracledb = require('oracledb');

// Helper to get table name
const getTableName = async (base, req) => {
    let loja = req.query.loja || req.body.loja;

    // Verificar permissões para todos os perfis, exceto TI
    if (req.userPerfil !== 'TI') {
        // Cache na requisição para evitar queries repetidas
        if (!req.allowedStores) {
            const result = await db.execute(
                `SELECT l.NUMERO_LOJA FROM TIRF_USUARIO_LOJAS ul
                  JOIN TIRF_LOJAS l ON ul.ID_LOJA = l.ID_LOJA
                  WHERE ul.ID_USUARIO = :userId AND l.STATUS = 'ATIVO'`,
                [req.userId]
            );
            // Normalizar para string para garantir comparação correta
            req.allowedStores = result.rows.map(r => String(r.NUMERO_LOJA).padStart(2, '0'));
        }

        const allowed = req.allowedStores; // Array of strings like ['01', '33']

        // Normalizar a loja solicitada
        let lojaSolicitada = null;
        if (loja) {
            lojaSolicitada = String(loja).padStart(2, '0');
        }

        if (lojaSolicitada) {
            // Tratamento para loja 33 (CD) e 01 (Matriz) que usam tabela base
            if (['33', '01'].includes(lojaSolicitada)) {
                if (!allowed.includes(lojaSolicitada)) {
                    throw new Error(`Acesso negado: Sem permissão para visualizar manuais da loja ${loja}`);
                }
            } else if (!allowed.includes(lojaSolicitada)) {
                // Tentar verificar se existe correspondência sem padding se falhar (ex: '1' vs '01')
                // Mas como normalizamos tudo para padStart 2, deve bater.
                throw new Error(`Acesso negado: Sem permissão para a loja ${loja}`);
            }
        } else {
            // Sem loja explícita -> Default
            // Se tem permissão ao CD (33) ou Matriz (01), mantém null (vai para base)
            const hasBaseAccess = allowed.includes('33') || allowed.includes('01');

            if (!hasBaseAccess) {
                // Se não pode ver CD/Matriz, redireciona para primeira loja permitida.
                if (allowed.length > 0) {
                    loja = allowed[0]; // Já é string formatada
                    req.query.loja = loja; // Atualiza para o restante do codigo usar
                } else {
                    throw new Error('Acesso negado: Usuário sem lojas vinculadas');
                }
            }
        }
    }

    // Loja 33 e 01 usam as tabelas genéricas
    const lojaStr = loja ? String(loja).padStart(2, '0') : null;
    if (lojaStr && ['33', '01'].includes(lojaStr)) {
        return base;
    }

    if (loja && /^\d+$/.test(loja)) {
        return `${base}_LOJA${String(loja).padStart(2, '0')}`;
    }
    return base;
};

// Listar manuais ativos
exports.listar = async (req, res) => {
    try {
        const tableManual = await getTableName('TIRF_MANUAIS', req);
        const tableApp = await getTableName('TIRF_APLICACOES', req);
        const tableMod = await getTableName('TIRF_MODULOS', req);

        const result = await db.execute(
            `SELECT m.ID_MANUAL, m.TITULO, m.DESCRICAO_CARD, m.QTD_VIEWS, 
                m.DATA_CRIACAO, m.DATA_ATUALIZACAO, m.TIPO_CONTEUDO,
                m.ID_APLICACAO, a.NOME_APLICACAO,
                mo.ID_MODULO, mo.NOME_MODULO,
                u.NOME AS AUTOR
             FROM ${tableManual} m
             JOIN ${tableApp} a ON m.ID_APLICACAO = a.ID_APLICACAO
             JOIN ${tableMod} mo ON a.ID_MODULO = mo.ID_MODULO
             JOIN TIRF_USUARIOS u ON m.ID_AUTOR = u.ID_USUARIO
             WHERE m.STATUS = 'ATIVO'
             ORDER BY m.DATA_ATUALIZACAO DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar manuais:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Listar manuais por aplicação
exports.listarPorAplicacao = async (req, res) => {
    try {
        const { aplicacaoId } = req.params;
        const tableManual = await getTableName('TIRF_MANUAIS', req);

        const result = await db.execute(
            `SELECT m.ID_MANUAL, m.TITULO, m.DESCRICAO_CARD, m.QTD_VIEWS,
                    m.DATA_CRIACAO, m.DATA_ATUALIZACAO,
                    u.NOME AS AUTOR
             FROM ${tableManual} m
             JOIN TIRF_USUARIOS u ON m.ID_AUTOR = u.ID_USUARIO
             WHERE m.ID_APLICACAO = :aplicacaoId AND m.STATUS = 'ATIVO'
             ORDER BY m.DATA_ATUALIZACAO DESC`,
            [aplicacaoId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar manuais por aplicação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Top Views (Dashboard)
exports.topViews = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const tableManual = await getTableName('TIRF_MANUAIS', req);
        const tableApp = await getTableName('TIRF_APLICACOES', req);
        const tableMod = await getTableName('TIRF_MODULOS', req);

        const result = await db.execute(
            `SELECT m.ID_MANUAL, m.TITULO, m.DESCRICAO_CARD, m.QTD_VIEWS,
                    a.NOME_APLICACAO, mo.NOME_MODULO
             FROM ${tableManual} m
             JOIN ${tableApp} a ON m.ID_APLICACAO = a.ID_APLICACAO
             JOIN ${tableMod} mo ON a.ID_MODULO = mo.ID_MODULO
             WHERE m.STATUS = 'ATIVO'
             ORDER BY m.QTD_VIEWS DESC
             FETCH FIRST :limit ROWS ONLY`,
            [limit]
        );
        res.json(result.rows);
    } catch (error) {
        const fs = require('fs');
        fs.writeFileSync('controller_error.txt', 'topViews: ' + (error.stack || error.toString()));
        console.error('Erro ao buscar top views:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Recentes (Dashboard)
exports.recentes = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const tableManual = await getTableName('TIRF_MANUAIS', req);
        const tableApp = await getTableName('TIRF_APLICACOES', req);
        const tableMod = await getTableName('TIRF_MODULOS', req);

        const result = await db.execute(
            `SELECT m.ID_MANUAL, m.TITULO, m.DESCRICAO_CARD, m.QTD_VIEWS,
                    m.DATA_ATUALIZACAO, a.NOME_APLICACAO, mo.NOME_MODULO
             FROM ${tableManual} m
             JOIN ${tableApp} a ON m.ID_APLICACAO = a.ID_APLICACAO
             JOIN ${tableMod} mo ON a.ID_MODULO = mo.ID_MODULO
             WHERE m.STATUS = 'ATIVO'
             ORDER BY m.DATA_ATUALIZACAO DESC
             FETCH FIRST :limit ROWS ONLY`,
            [limit]
        );
        res.json(result.rows);
    } catch (error) {
        const fs = require('fs');
        fs.writeFileSync('controller_error.txt', 'recentes: ' + (error.stack || error.toString()));
        console.error('Erro ao buscar recentes:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Contar manuais ativos
exports.contar = async (req, res) => {
    try {
        const tableManual = await getTableName('TIRF_MANUAIS', req);
        const result = await db.execute(
            `SELECT COUNT(*) as count FROM ${tableManual} WHERE STATUS = 'ATIVO'`
        );
        // O oracledb pode retornar o count como [ { COUNT: 123 } ] ou [ [ 123 ] ] dependendo da config
        // Mas com outFormat padrão (OBJECT) costuma ser { COUNT: 123 } (UPPERCASE)
        // Vamos garantir pegando a primeira chave ou valor
        const row = result.rows[0];
        let count = 0;
        if (row) {
            const values = Object.values(row);
            count = values[0];
        }
        res.json({ count });
    } catch (error) {
        const fs = require('fs');
        fs.writeFileSync('controller_error.txt', 'contar: ' + (error.stack || error.toString()));
        console.error('Erro ao contar manuais:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Buscar manual por ID (incrementa views apenas se countView=true)
exports.buscarPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const countView = req.query.countView !== 'false';
        const tableManual = await getTableName('TIRF_MANUAIS', req);
        const tableApp = await getTableName('TIRF_APLICACOES', req);
        const tableMod = await getTableName('TIRF_MODULOS', req);

        // 1. Buscar dados atuais (incluindo último acesso anterior e editor)
        const result = await db.execute(
            `SELECT m.ID_MANUAL, m.ID_APLICACAO, m.ID_AUTOR, m.TITULO, m.DESCRICAO_CARD, 
                    m.CONTEUDO_HTML, m.QTD_VIEWS, m.DATA_CRIACAO, m.DATA_ATUALIZACAO,
                    m.TIPO_CONTEUDO, m.ARQUIVO_PDF,
                    a.NOME_APLICACAO, mo.NOME_MODULO, mo.ID_MODULO,
                    u.NOME AS AUTOR,
                    ua.NOME AS ULTIMO_ACESSO,
                    ue.NOME AS EDITOR
             FROM ${tableManual} m
             JOIN ${tableApp} a ON m.ID_APLICACAO = a.ID_APLICACAO
             JOIN ${tableMod} mo ON a.ID_MODULO = mo.ID_MODULO
             JOIN TIRF_USUARIOS u ON m.ID_AUTOR = u.ID_USUARIO
             LEFT JOIN TIRF_USUARIOS ua ON m.ID_ULTIMO_ACESSO = ua.ID_USUARIO
             LEFT JOIN TIRF_USUARIOS ue ON m.ID_ULTIMO_EDITOR = ue.ID_USUARIO
             WHERE m.ID_MANUAL = :id`,
            [id],
            { fetchInfo: { CONTEUDO_HTML: { type: oracledb.STRING } } }
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Manual não encontrado' });
        }

        const manual = result.rows[0];

        // 2. Atualizar no banco (se countView for true)
        if (req.query.countView === 'true' || req.query.countView === true) {
            if (req.userId) {
                // Se for TI, NÃO atualiza o último acesso, apenas views
                if (req.userPerfil === 'TI') {
                    await db.execute(
                        `UPDATE ${tableManual} 
                         SET QTD_VIEWS = QTD_VIEWS + 1 
                         WHERE ID_MANUAL = :id`,
                        [id]
                    );
                } else {
                    // Outros perfis: atualiza view e último acesso
                    await db.execute(
                        `UPDATE ${tableManual} 
                         SET QTD_VIEWS = QTD_VIEWS + 1, 
                             ID_ULTIMO_ACESSO = :userId 
                         WHERE ID_MANUAL = :id`,
                        [req.userId, id]
                    );
                }
            } else {
                // Usuário anônimo: apenas atualiza view
                await db.execute(
                    `UPDATE ${tableManual} 
                     SET QTD_VIEWS = QTD_VIEWS + 1 
                     WHERE ID_MANUAL = :id`,
                    [id]
                );
            }
            // Incrementa view no objeto de retorno para refletir o acesso atual na tela
            manual.QTD_VIEWS += 1;
        }

        // Retorna o manual com o ULTIMO_ACESSO de quem acessou ANTES deste request
        res.json(manual);
    } catch (error) {
        console.error('Erro ao buscar manual:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Criar manual (apenas TI e Colaborador)
exports.criar = async (req, res) => {
    try {
        const { id_aplicacao, titulo, descricao_card, conteudo_html, tipo_conteudo, loja } = req.body;
        // Normalizar path para URL (windows backslashes)
        const arquivo_pdf = req.file ? req.file.path.replace(/\\/g, '/') : null;

        // Determinar tabela baseada na loja enviada no body
        // Simulando req para getTableName (espera req.body.loja ou req.query.loja)
        // Como 'loja' está no body, o helper já deve funcionar se passarmos req.
        const tableManual = await getTableName('TIRF_MANUAIS', req);

        // Se vier arquivo, força tipo PDF
        const tipoFinal = arquivo_pdf ? 'PDF' : (tipo_conteudo || 'HTML');

        if (!id_aplicacao || !titulo) {
            return res.status(400).json({ error: 'Campos obrigatórios: id_aplicacao, titulo' });
        }

        await db.execute(
            `INSERT INTO ${tableManual} (
                ID_APLICACAO, ID_AUTOR, TITULO, DESCRICAO_CARD, 
                CONTEUDO_HTML, ID_ULTIMO_EDITOR, TIPO_CONTEUDO, ARQUIVO_PDF
             )
             VALUES (
                :id_aplicacao, :id_autor, :titulo, :descricao_card, 
                :conteudo_html, :id_autor, :tipo_conteudo, :arquivo_pdf
             )`,
            {
                id_aplicacao,
                id_autor: req.userId,
                titulo,
                descricao_card,
                conteudo_html: conteudo_html || '',
                tipo_conteudo: tipoFinal,
                arquivo_pdf: arquivo_pdf
            }
        );

        res.status(201).json({ message: 'Manual criado com sucesso' });
    } catch (error) {
        console.error('Erro ao criar manual:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Atualizar manual (apenas autor ou TI)
// Nota: A verificação de autorização é feita no middleware authorizeAuthor
exports.atualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_aplicacao, titulo, descricao_card, conteudo_html, tipo_conteudo } = req.body;
        const arquivo_pdf = req.file ? req.file.path.replace(/\\/g, '/') : null;
        const tableManual = await getTableName('TIRF_MANUAIS', req);

        // Se upload novo, atualiza path e tipo. Se não, mantem o que tem ou atualiza tipo se mudou explicitamente
        // Para simplificar: se upload, TIPO vira PDF. Se sem upload e mandou HTML, vira HTML.

        if (!id_aplicacao) {
            return res.status(400).json({ error: 'id_aplicacao é obrigatório' });
        }

        let sql = `UPDATE ${tableManual} 
                   SET TITULO = :titulo, 
                       DESCRICAO_CARD = :descricao, 
                       DATA_ATUALIZACAO = SYSDATE,
                       ID_ULTIMO_EDITOR = :userId,
                       ID_APLICACAO = :id_aplicacao`;

        const params = {
            titulo,
            descricao: descricao_card,
            userId: req.userId,
            id_aplicacao,
            id
        };

        if (arquivo_pdf) {
            sql += `, ARQUIVO_PDF = :arquivo_pdf, TIPO_CONTEUDO = 'PDF'`;
            params.arquivo_pdf = arquivo_pdf;
        } else if (tipo_conteudo === 'HTML') {
            // Se mudou para HTML explicitamente (ex: removeu PDF no front)
            sql += `, TIPO_CONTEUDO = 'HTML'`;
            // Não limpamos PDF do banco necessariamente, mas o front vai ignorar
        }

        if (conteudo_html !== undefined) {
            sql += `, CONTEUDO_HTML = :conteudo`;
            params.conteudo = conteudo_html;
        }

        sql += ` WHERE ID_MANUAL = :id`;

        await db.execute(sql, params);

        res.json({ message: 'Manual atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar manual:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Duplicar manual para treinamentos de lojas
exports.duplicarParaTreinamentos = async (req, res) => {
    try {
        const { id } = req.params;
        const { lojas } = req.body; // Array de códigos de lojas, ex: ['01', '02', '33']

        if (!lojas || !Array.isArray(lojas) || lojas.length === 0) {
            return res.status(400).json({ error: 'É necessário informar ao menos uma loja' });
        }

        // Buscar o manual original da tabela correta
        const sourceTableManual = await getTableName('TIRF_MANUAIS', req);
        const manualOriginal = await db.execute(
            `SELECT * FROM ${sourceTableManual} WHERE ID_MANUAL = :id`,
            [id]
        );

        if (manualOriginal.rows.length === 0) {
            return res.status(404).json({ error: 'Manual não encontrado' });
        }

        const manual = manualOriginal.rows[0];
        const resultados = [];

        for (const loja of lojas) {
            if (!/^\d{2}$/.test(loja)) {
                resultados.push({ loja, sucesso: false, erro: 'Código de loja inválido' });
                continue;
            }

            const tableManual = `TIRF_MANUAIS_LOJA${loja}`;
            const tableApp = `TIRF_APLICACOES_LOJA${loja}`;

            try {
                // Verificar se a aplicação existe na loja
                const appCheck = await db.execute(
                    `SELECT ID_APLICACAO FROM ${tableApp} WHERE ID_APLICACAO = :appId`,
                    [manual.ID_APLICACAO]
                );

                if (appCheck.rows.length === 0) {
                    resultados.push({ loja, sucesso: false, erro: 'Aplicação não existe nesta loja' });
                    continue;
                }

                // Inserir o manual duplicado
                await db.execute(
                    `INSERT INTO ${tableManual} (
                        TITULO, DESCRICAO_CARD, CONTEUDO_HTML, ID_APLICACAO, 
                        ID_AUTOR, STATUS, TIPO_CONTEUDO, ARQUIVO_PDF, QTD_VIEWS,
                        DATA_CRIACAO, DATA_ATUALIZACAO
                    ) VALUES (
                        :titulo, :descricao, :conteudo, :appId,
                        :autor, 'ATIVO', :tipo, :arquivo_pdf, 0,
                        SYSDATE, SYSDATE
                    )`,
                    {
                        titulo: manual.TITULO,
                        descricao: manual.DESCRICAO_CARD,
                        conteudo: manual.CONTEUDO_HTML,
                        appId: manual.ID_APLICACAO,
                        autor: req.userId,
                        tipo: manual.TIPO_CONTEUDO || 'HTML',
                        arquivo_pdf: manual.ARQUIVO_PDF || null
                    }
                );

                resultados.push({ loja, sucesso: true });
            } catch (err) {
                console.error(`Erro ao duplicar para loja ${loja}:`, err.message);
                resultados.push({ loja, sucesso: false, erro: err.message });
            }
        }

        res.json({
            message: 'Processo de duplicação concluído',
            resultados
        });
    } catch (error) {
        console.error('Erro ao duplicar manual:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Soft delete - enviar para lixeira (apenas TI)
exports.excluir = async (req, res) => {
    try {
        const { id } = req.params;
        const tableManual = await getTableName('TIRF_MANUAIS', req);

        // Verificação de segurança adicional - apenas TI pode excluir
        if (req.userPerfil !== 'TI') {
            return res.status(403).json({
                error: 'Acesso negado. Apenas usuários com cargo TI podem excluir manuais.'
            });
        }

        const result = await db.execute(
            `UPDATE ${tableManual} SET STATUS = 'LIXEIRA' WHERE ID_MANUAL = :id`,
            [id]
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Manual não encontrado' });
        }

        res.json({ message: 'Manual enviado para lixeira' });
    } catch (error) {
        const fs = require('fs');
        fs.writeFileSync('manual_delete_error.txt', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        console.error('Erro ao excluir manual:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Listar lixeira (apenas TI)
exports.listarLixeira = async (req, res) => {
    try {
        const tableManual = await getTableName('TIRF_MANUAIS', req);
        const tableApp = await getTableName('TIRF_APLICACOES', req);
        const tableMod = await getTableName('TIRF_MODULOS', req);

        const result = await db.execute(
            `SELECT m.ID_MANUAL, m.TITULO, m.DESCRICAO_CARD, 
                    m.DATA_CRIACAO, m.DATA_ATUALIZACAO,
                    a.NOME_APLICACAO, mo.NOME_MODULO,
                    u.NOME AS AUTOR
             FROM ${tableManual} m
             JOIN ${tableApp} a ON m.ID_APLICACAO = a.ID_APLICACAO
             JOIN ${tableMod} mo ON a.ID_MODULO = mo.ID_MODULO
             JOIN TIRF_USUARIOS u ON m.ID_AUTOR = u.ID_USUARIO
             WHERE m.STATUS = 'LIXEIRA'
             ORDER BY m.DATA_ATUALIZACAO DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar lixeira:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Restaurar da lixeira (apenas TI)
exports.restaurar = async (req, res) => {
    try {
        const { id } = req.params;
        const tableManual = await getTableName('TIRF_MANUAIS', req);

        const result = await db.execute(
            `UPDATE ${tableManual} SET STATUS = 'ATIVO' WHERE ID_MANUAL = :id`,
            [id]
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Manual não encontrado' });
        }

        res.json({ message: 'Manual restaurado com sucesso' });
    } catch (error) {
        console.error('Erro ao restaurar manual:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Excluir permanentemente (apenas TI)
exports.excluirPermanente = async (req, res) => {
    try {
        const { id } = req.params;
        const tableManual = await getTableName('TIRF_MANUAIS', req);

        const result = await db.execute(
            `DELETE FROM ${tableManual} WHERE ID_MANUAL = :id AND STATUS = :status`,
            [id, 'LIXEIRA']
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Manual não encontrado na lixeira' });
        }

        res.json({ message: 'Manual excluído permanentemente' });
    } catch (error) {
        console.error('Erro ao excluir permanentemente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Buscar manuais (pesquisa)
exports.buscar = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 3) {
            return res.status(400).json({ error: 'Termo de busca deve ter pelo menos 3 caracteres' });
        }

        const tableManual = await getTableName('TIRF_MANUAIS', req);
        const tableApp = await getTableName('TIRF_APLICACOES', req);
        const tableMod = await getTableName('TIRF_MODULOS', req);

        const result = await db.execute(
            `SELECT m.ID_MANUAL, m.TITULO, m.DESCRICAO_CARD, m.QTD_VIEWS,
                    m.ID_APLICACAO, a.NOME_APLICACAO,
                    mo.ID_MODULO, mo.NOME_MODULO
             FROM ${tableManual} m
             JOIN ${tableApp} a ON m.ID_APLICACAO = a.ID_APLICACAO
             JOIN ${tableMod} mo ON a.ID_MODULO = mo.ID_MODULO
             WHERE m.STATUS = 'ATIVO' 
                 AND (UPPER(m.TITULO) LIKE UPPER(:termo) 
                            OR UPPER(m.DESCRICAO_CARD) LIKE UPPER(:termo))
             ORDER BY m.QTD_VIEWS DESC`,
            { termo: `%${q}%` }
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro na busca:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
