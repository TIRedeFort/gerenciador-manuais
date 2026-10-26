const { randomBytes, createHash, timingSafeEqual } = require('node:crypto');

const APP_ID = 'manuais';
const COOKIE = 'manuais_session';
const STATE = 'manuais_sso_state';
const VERIFIER = 'manuais_sso_verifier';
const enabled = () => process.env.PORTAL_AUTH_ENABLED === 'true';
const failure = (status, message) => Object.assign(new Error(message), { status });
const cookieOptions = (sso = false) => ({ httpOnly: true, secure: true, sameSite: 'lax',
    path: sso ? '/manuais/api/auth/sso' : '/manuais', maxAge: sso ? 300000 : 28800000 });
function readCookie(req, name = COOKIE) {
    try {
        const item = String(req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`));
        return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
    } catch { return null; }
}
function validatedUrl(configured) {
    let url;
    try { url = new URL(configured); } catch { throw failure(503, 'URL de autenticação inválida'); }
    const localHttp = url.protocol === 'http:' && process.env.NODE_ENV !== 'production'
        && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !localHttp) || url.username || url.password || url.search || url.hash
        || url.href.includes('?') || url.href.includes('#')) throw failure(503, 'URL de autenticação inválida');
    return url;
}
function portalUrl(publicUrl = false) {
    const configured = publicUrl ? process.env.PORTAL_PUBLIC_URL || process.env.PORTAL_URL : process.env.PORTAL_URL;
    if (!configured) throw failure(503, 'Portal não configurado');
    const url = validatedUrl(configured);
    const base = url.pathname.replace(/\/+$/, '').replace(/(?:\/api)+$/, '');
    return `${url.origin}${base}/api`;
}
function origin() {
    const url = validatedUrl(process.env.SSO_PUBLIC_ORIGIN);
    if (url.pathname !== '/') throw failure(503, 'SSO_PUBLIC_ORIGIN inválido');
    return url.origin;
}
function checkOrigin(req, res, next) {
    if (!enabled() || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    try {
        if (req.headers.origin !== origin()) throw failure(403, 'Origin não autorizado');
        next();
    } catch (error) { res.status(error.status || 503).json({ error: error.message }); }
}
function profileOf(payload) {
    if (!Array.isArray(payload.applications) || !payload.applications.some(app => app === APP_ID || app?.id === APP_ID)) {
        throw failure(403, 'Sem acesso ao Manuais');
    }
    const profile = payload.systemProfiles?.[APP_ID];
    if (!profile || !['TI', 'COLABORADOR', 'LEITOR'].includes(profile.role) || !Array.isArray(profile.stores)
        || !profile.stores.every(store => /^(0?[1-9]|[1-9][0-9])$/.test(String(store)))) {
        throw failure(403, 'Perfil Manuais inválido');
    }
    const stores = [...new Set(profile.stores.map(store => String(store).padStart(2, '0')))];
    if (profile.role !== 'TI' && !stores.length) throw failure(403, 'Perfil sem lojas');
    return { role: profile.role, stores };
}
function createService(db, fetcher = (...args) => fetch(...args)) {
    async function request(path, { token, body } = {}) {
        let response;
        try {
            response = await fetcher(`${portalUrl()}${path}`, {
                method: body === undefined ? 'GET' : 'POST',
                headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
                body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000), redirect: 'error'
            });
        } catch { throw failure(503, 'Portal indisponível'); }
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw failure([400, 401, 403, 429].includes(response.status) ? response.status : 503, 'Não foi possível autenticar no Portal');
        return payload;
    }
    async function load(token) {
        if (!token) throw failure(401, 'Entre para continuar');
        const payload = await request('/auth/me', { token });
        const portalUser = payload.user;
        if (!portalUser || typeof portalUser.id !== 'string' || portalUser.id.length === 0 || portalUser.id.length > 50
            || typeof portalUser.mustChangePassword !== 'boolean') {
            throw failure(503, 'Sessão Portal inválida');
        }
        if (portalUser.mustChangePassword) return { user: { nome: portalUser.name || portalUser.username, primeiroLogin: true }, temporary: true };
        const profile = profileOf(payload);
        const stores = await db.execute("SELECT ID_LOJA, NUMERO_LOJA, NOME_LOJA FROM TIRF_LOJAS WHERE STATUS = 'ATIVO'");
        const allowed = profile.stores.map(number => {
            const store = stores.rows.find(row => String(row.NUMERO_LOJA).padStart(2, '0') === number);
            if (!store) throw failure(403, 'Loja inexistente ou inativa');
            return { idLoja: store.ID_LOJA, numeroLoja: number, nomeLoja: store.NOME_LOJA };
        });
        let result = await db.execute("SELECT ID_USUARIO, NOME, LOGIN, NVL(STATUS, 'ATIVO') AS STATUS FROM TIRF_USUARIOS WHERE PORTAL_USUARIO_ID = :portalId", [portalUser.id]);
        if (!result.rows.length) {
            const connection = await db.getConnection();
            try {
                await connection.execute('LOCK TABLE TIRF_USUARIOS IN SHARE ROW EXCLUSIVE MODE NOWAIT', [], { autoCommit: false });
                const linked = await connection.execute('SELECT ID_USUARIO FROM TIRF_USUARIOS WHERE PORTAL_USUARIO_ID = :portalId',
                    [portalUser.id], { autoCommit: false });
                if (!linked.rows.length) {
                    const canonical = value => typeof value === 'string' ? value.trim().toLowerCase() || null : null;
                    const candidates = await connection.execute(`SELECT ID_USUARIO FROM TIRF_USUARIOS
                        WHERE LOWER(TRIM(LOGIN)) IN (:username, :email)
                           OR LOWER(REGEXP_REPLACE(TRIM(NOME), '[[:space:]]+', ' ')) = :nome`, {
                        username: canonical(portalUser.username), email: canonical(portalUser.email),
                        nome: canonical(portalUser.name)?.replace(/\s+/g, ' ') || null
                    }, { autoCommit: false });
                    if (candidates.rows.length) throw failure(409, 'Vínculo nativo pendente de revisão; conclua a migração da conta');
                    await connection.execute(`INSERT INTO TIRF_USUARIOS (NOME, LOGIN, SENHA, PERFIL, PRIMEIRO_LOGIN, PORTAL_USUARIO_ID)
                        VALUES (:nome, :login, :senha, :perfil, 0, :portalId)`, {
                        nome: String(portalUser.name || portalUser.username || 'Portal').slice(0, 100),
                        login: `portal:${createHash('sha256').update(portalUser.id).digest('base64url')}`,
                        senha: randomBytes(48).toString('hex'), perfil: profile.role, portalId: portalUser.id
                    }, { autoCommit: false });
                }
                await connection.commit();
            } catch (error) {
                await connection.rollback();
                if (error.errorNum !== 1) throw error;
            } finally { await connection.close(); }
            result = await db.execute("SELECT ID_USUARIO, NOME, LOGIN, NVL(STATUS, 'ATIVO') AS STATUS FROM TIRF_USUARIOS WHERE PORTAL_USUARIO_ID = :portalId", [portalUser.id]);
        }
        const native = result.rows[0];
        if (!native || native.STATUS !== 'ATIVO') throw failure(403, 'Perfil nativo indisponível; vincule a conta na migração');
        return { user: { id: native.ID_USUARIO, nome: native.NOME, login: native.LOGIN, perfil: profile.role,
            primeiroLogin: false, lojasPermitidas: allowed, ...allowed[0] }, stores: profile.stores, temporary: false };
    }
    return { request, load };
}
function ssoStart(req, res) {
    if (!enabled() || !process.env.SSO_CLIENT_SECRET) return res.status(503).json({ error: 'SSO indisponível' });
    try {
        const state = randomBytes(32).toString('base64url');
        const verifier = randomBytes(32).toString('base64url');
        const url = new URL(`${portalUrl(true)}/auth/sso/authorize`);
        url.search = new URLSearchParams({ client_id: APP_ID, state, code_challenge: createHash('sha256').update(verifier).digest('base64url'),
            code_challenge_method: 'S256', redirect_uri: `${origin()}/manuais/api/auth/sso/callback` }).toString();
        res.cookie(STATE, state, cookieOptions(true));
        res.cookie(VERIFIER, verifier, cookieOptions(true));
        res.set('Referrer-Policy', 'no-referrer');
        res.redirect(302, url.href);
    } catch { res.status(503).json({ error: 'SSO não configurado' }); }
}
function consumeState(req, res) {
    const expected = readCookie(req, STATE);
    const verifier = readCookie(req, VERIFIER);
    const options = cookieOptions(true);
    delete options.maxAge;
    res.clearCookie(STATE, options);
    res.clearCookie(VERIFIER, options);
    const state = req.query.state;
    if (![expected, verifier, state, req.query.code].every(value => typeof value === 'string' && /^[\w-]{43}$/.test(value))
        || !timingSafeEqual(Buffer.from(expected), Buffer.from(state))) throw failure(400, 'Estado SSO inválido');
    return verifier;
}
module.exports = { APP_ID, COOKIE, enabled, cookieOptions, readCookie, checkOrigin, profileOf, createService, ssoStart, consumeState };
