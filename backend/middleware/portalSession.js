const portal = require('../services/portalAuth');
const service = portal.createService(require('../config/database'));
function checkStores(req, res, next) {
    if (!req.portalSession || req.userPerfil === 'TI') return next();
    const supplied = [req.query.loja, req.body?.loja].filter(value => value !== undefined);
    const normalized = supplied.map(value => String(value).padStart(2, '0'));
    if (normalized.some(value => !req.allowedStores.includes(value)) || new Set(normalized).size > 1) {
        return res.status(403).json({ error: 'Loja não autorizada' });
    }
    req.query.loja = normalized[0] || req.allowedStores[0];
    next();
}
async function portalSession(req, res, next) {
    if (!portal.enabled() || req.portalSession) return next();
    try {
        const session = await service.load(portal.readCookie(req));
        if (session.temporary) return res.status(403).json({ error: 'Altere sua senha para continuar', mustChangePassword: true });
        req.portalSession = session;
        req.userId = session.user.id;
        req.userNome = session.user.nome;
        req.userPerfil = session.user.perfil;
        req.allowedStores = session.stores;
        req.userIdLoja = session.user.idLoja || null;
        req.userNumeroLoja = session.user.numeroLoja || null;
        if (req.userPerfil === 'LEITOR' && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            return res.status(403).json({ error: 'Perfil somente leitura' });
        }
        if (/\/api\/(manuais|modulos|aplicacoes|ranking)(\/|$)/.test(req.originalUrl.split('?')[0])
            && !String(req.headers['content-type'] || '').startsWith('multipart/form-data')) {
            return checkStores(req, res, next);
        }
        next();
    } catch (error) { res.status(error.status || 503).json({ error: error.status ? error.message : 'Portal indisponível' }); }
}
module.exports = portalSession;
module.exports.checkStores = checkStores;
