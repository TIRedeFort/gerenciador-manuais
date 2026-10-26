const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { authorizeTI } = require('../middleware/authorize');
const portal = require('../services/portalAuth');
const portalController = require('../controllers/portalAuthController');

router.use(portal.checkOrigin);
router.get('/mode', (req, res) => res.json({ portalAuthEnabled: portal.enabled() }));
router.get('/sso/start', portal.ssoStart);
router.get('/sso/callback', portalController.callback);
router.post('/logout', portalController.logout);
router.get('/me', (req, res, next) => portal.enabled() ? portalController.me(req, res) : next(), auth, async (req, res) => {
    try {
        const db = require('../config/database');
        const result = await db.execute("SELECT ID_USUARIO, NOME, LOGIN, PERFIL, PRIMEIRO_LOGIN FROM TIRF_USUARIOS WHERE ID_USUARIO = :id AND NVL(STATUS, 'ATIVO') = 'ATIVO'", [req.userId]);
        if (!result.rows[0]) return res.status(401).json({ error: 'Sessão inválida' });
        const native = result.rows[0];
        const stores = await db.execute(`SELECT l.ID_LOJA, l.NUMERO_LOJA, l.NOME_LOJA FROM TIRF_USUARIO_LOJAS ul
            JOIN TIRF_LOJAS l ON l.ID_LOJA = ul.ID_LOJA WHERE ul.ID_USUARIO = :id AND l.STATUS = 'ATIVO'`, [req.userId]);
        const lojasPermitidas = stores.rows.map(row => ({ idLoja: row.ID_LOJA, numeroLoja: row.NUMERO_LOJA, nomeLoja: row.NOME_LOJA }));
        res.json({ user: { id: native.ID_USUARIO, nome: native.NOME, login: native.LOGIN, perfil: native.PERFIL,
            primeiroLogin: native.PRIMEIRO_LOGIN === 1, lojasPermitidas, ...lojasPermitidas[0] } });
    } catch { res.status(503).json({ error: 'Sessão indisponível' }); }
});
router.post('/change-password', (req, res, next) => {
    if (portal.enabled()) return portalController.changePassword(req, res);
    req.body.novaSenha = req.body.newPassword ?? req.body.novaSenha;
    next();
}, auth, authController.alterarSenha);
router.use((req, res, next) => {
    if (portal.enabled() && req.path !== '/login' && req.path !== '/alterar-senha' && req.method !== 'GET') {
        return res.status(403).json({ error: 'Gerencie contas e permissões pelo Portal' });
    }
    next();
});

// Rotas públicas
router.post('/login', portalController.rateLimit, (req, res, next) => portal.enabled() ? portalController.login(req, res) : next(), authController.login);

// Rota para criar primeiro usuário (depois pode remover ou proteger)
router.post('/register', auth, authorizeTI, authController.register);

// Rota protegida
router.get('/profile', auth, authController.getProfile);

// Criar usuário TI (apenas TI pode)
router.post('/register/ti', auth, authorizeTI, authController.register);

// Gerenciamento de usuários (apenas TI)
router.get('/usuarios', auth, authorizeTI, authController.listarUsuarios);
router.put('/usuarios/:id', auth, authorizeTI, authController.atualizarUsuario);
router.put('/usuarios/:id/toggle-status', auth, authorizeTI, authController.toggleStatusUsuario);
router.delete('/usuarios/:id', auth, authorizeTI, authController.excluirUsuario);

// Alterar senha (primeiro login ou redefinição)
router.put('/alterar-senha', (req, res, next) => portal.enabled() ? portalController.changePassword(req, res) : next(), auth, authController.alterarSenha);

module.exports = router;

