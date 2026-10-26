const portal = require('../services/portalAuth');
const service = portal.createService(require('../config/database'));
const attempts = new Map();
function rateLimit(req, res, next) {
    const now = Date.now();
    for (const [key, entry] of attempts) if (entry.until < now) attempts.delete(key);
    const key = req.ip;
    if (!attempts.has(key) && attempts.size >= 10000) return res.status(429).json({ error: 'Tente novamente mais tarde' });
    const entry = attempts.get(key) || { count: 0, until: now + 900000 };
    entry.count += 1;
    attempts.set(key, entry);
    if (entry.count > 15) return res.status(429).json({ error: 'Muitas tentativas. Tente novamente mais tarde.' });
    next();
}
const handle = action => async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try { await action(req, res); }
    catch (error) { res.status(error.status || 503).json({ error: error.status ? error.message : 'Autenticação indisponível' }); }
};
const login = handle(async (req, res) => {
    const username = req.body.username ?? req.body.login;
    const password = req.body.password ?? req.body.senha;
    if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password) {
        return res.status(400).json({ error: 'Informe usuário e senha' });
    }
    const payload = await service.request('/auth/login', { body: { username: username.trim(), password } });
    if (typeof payload.token !== 'string' || !payload.token) return res.status(503).json({ error: 'Token Portal inválido' });
    const session = await service.load(payload.token);
    res.cookie(portal.COOKIE, payload.token, portal.cookieOptions());
    res.json({ user: session.user });
});
const me = handle(async (req, res) => res.json({ user: (await service.load(portal.readCookie(req))).user }));
const changePassword = handle(async (req, res) => {
    const token = portal.readCookie(req);
    await service.load(token);
    const newPassword = req.body.newPassword ?? req.body.novaSenha;
    if (typeof newPassword !== 'string' || newPassword.length < 8) return res.status(400).json({ error: 'Informe senha de pelo menos 8 caracteres' });
    const payload = await service.request('/auth/change-password', { token, body: { newPassword } });
    const nextToken = typeof payload.token === 'string' && payload.token ? payload.token : token;
    const session = await service.load(nextToken);
    res.cookie(portal.COOKIE, nextToken, portal.cookieOptions());
    res.json({ user: session.user });
});
const callback = handle(async (req, res) => {
    if (!portal.enabled() || !process.env.SSO_CLIENT_SECRET) return res.status(503).json({ error: 'SSO indisponível' });
    res.set('Referrer-Policy', 'no-referrer');
    const codeVerifier = portal.consumeState(req, res);
    const payload = await service.request('/auth/sso/exchange', { body: {
        clientId: portal.APP_ID, code: req.query.code, codeVerifier, clientSecret: process.env.SSO_CLIENT_SECRET
    } });
    if (typeof payload.token !== 'string' || !payload.token) return res.status(503).json({ error: 'Token Portal inválido' });
    const session = await service.load(payload.token);
    res.cookie(portal.COOKIE, payload.token, portal.cookieOptions());
    res.redirect(302, session.temporary ? '/manuais/alterar-senha' : '/manuais/');
});
const logout = (req, res) => {
    const options = portal.cookieOptions();
    delete options.maxAge;
    res.clearCookie(portal.COOKIE, options);
    res.json({ ok: true });
};
module.exports = { rateLimit, login, me, changePassword, callback, logout };
