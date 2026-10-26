const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const { createHash } = require('node:crypto');
const portal = require('../services/portalAuth');

const profile = () => ({ user: { id: 'User-A_b7', name: 'Pessoa', mustChangePassword: false },
    applications: ['manuais'], systemProfiles: { manuais: { role: 'COLABORADOR', stores: ['02'] } } });
const native = { ID_USUARIO: 42, NOME: 'Autor antigo', LOGIN: 'antigo', STATUS: 'ATIVO' };
const stores = [{ ID_LOJA: 9, NUMERO_LOJA: '02', NOME_LOJA: 'Loja 02' }];

test('Portal flag defaults off', () => {
    const configured = process.env.PORTAL_AUTH_ENABLED;
    delete process.env.PORTAL_AUTH_ENABLED;
    assert.equal(portal.enabled(), false);
    if (configured !== undefined) process.env.PORTAL_AUTH_ENABLED = configured;
});

test('Portal profile validates grants, role and store numbers without global admin escalation', () => {
    assert.equal(portal.profileOf(profile()).role, 'COLABORADOR');
    for (const mutate of [payload => { payload.applications = []; },
        payload => { payload.systemProfiles = {}; },
        payload => { payload.systemProfiles.manuais.role = 'superadmin'; },
        payload => { payload.systemProfiles.manuais.stores = ['02;DROP']; },
        payload => { payload.systemProfiles.manuais.stores = []; }]) {
        const payload = profile();
        payload.user.role = 'superadmin';
        mutate(payload);
        assert.throws(() => portal.profileOf(payload), { status: 403 });
    }
});

test('live sessions preserve native IDs, reject revoked grants, outages and inactive stores', async () => {
    process.env.PORTAL_URL = 'https://portal.test/portal';
    let payload = profile();
    let calls = 0;
    const database = { execute: async sql => ({ rows: sql.includes('TIRF_LOJAS') ? stores : [native] }) };
    const service = portal.createService(database, async (url, options) => {
        calls += 1;
        assert.equal(url, 'https://portal.test/portal/api/auth/me');
        assert.equal(options.headers.Authorization, 'Bearer private');
        assert.ok(options.signal);
        return { ok: true, json: async () => payload };
    });
    assert.equal((await service.load('private')).user.id, 42);
    payload.applications = [];
    await assert.rejects(service.load('private'), { status: 403 });
    assert.equal(calls, 2);
    payload = profile();
    payload.systemProfiles.manuais.stores = ['99'];
    await assert.rejects(service.load('private'), { status: 403 });
    await assert.rejects(service.load(null), { status: 401 });
    const unavailable = portal.createService(database, async () => { throw new Error('timeout'); });
    await assert.rejects(unavailable.load('private'), { status: 503 });
    const expired = portal.createService(database, async () => ({ ok: false, status: 401, json: async () => ({}) }));
    await assert.rejects(expired.load('private'), { status: 401 });
});

test('Portal string IDs survive lookup and provisioning exactly, including the 50-character boundary', async () => {
    for (const id of ['User-A_b7', '550e8400-e29b-41d4-a716-446655440000', '000007', ' Ab-_ ', 'A-_'.repeat(16) + 'Z_']) {
        const payload = profile();
        payload.user.id = id;
        let inserted = false;
        const database = {
            execute: async (sql, binds) => {
                if (sql.includes('TIRF_LOJAS')) return { rows: stores };
                assert.deepEqual(binds, [id]);
                return { rows: inserted ? [native] : [] };
            },
            getConnection: async () => ({
                execute: async (sql, binds) => {
                    if (sql.startsWith('LOCK TABLE')) return {};
                    if (sql.startsWith('SELECT')) return { rows: [] };
                    assert.equal(binds.portalId, id);
                    assert.equal(typeof binds.portalId, 'string');
                    assert.equal(binds.login, `portal:${createHash('sha256').update(id).digest('base64url')}`);
                    assert.equal(binds.login.length, 50);
                    inserted = true;
                }, commit: async () => {}, close: async () => {}, rollback: async () => {}
            })
        };
        const service = portal.createService(database, async () => ({ ok: true, json: async () => payload }));
        assert.equal((await service.load('private')).user.id, 42);
        assert.equal(inserted, true);
    }
});

test('invalid Portal ID types and lengths fail closed before native access, including temporary sessions', async () => {
    for (const id of [7, null, undefined, '', 'a'.repeat(51), {}, ['User-A_b7']]) {
        for (const temporary of [false, true]) {
            const payload = profile();
            payload.user.id = id;
            payload.user.mustChangePassword = temporary;
            const database = { execute: async () => assert.fail('Invalid identity must not access native data') };
            const service = portal.createService(database, async () => ({ ok: true, json: async () => payload }));
            await assert.rejects(service.load('private'), { status: 503 });
        }
    }
});

test('new profiles use dedicated login and never merge or overwrite existing owners', async () => {
    let inserted = false;
    const executed = [];
    const database = {
        execute: async sql => {
            executed.push(sql);
            return { rows: sql.includes('TIRF_LOJAS') ? stores : inserted ? [native] : [] };
        },
        getConnection: async () => ({
            execute: async (sql, binds, options) => {
                if (sql.startsWith('LOCK TABLE')) return {};
                if (sql.startsWith('SELECT')) return { rows: [] };
                assert.match(sql, /^INSERT INTO TIRF_USUARIOS/);
                assert.equal(binds.login, `portal:${createHash('sha256').update('User-A_b7').digest('base64url')}`);
                assert.equal(binds.portalId, 'User-A_b7');
                assert.equal(options.autoCommit, false);
                inserted = true;
            }, commit: async () => {}, close: async () => {}, rollback: async () => {}
        })
    };
    const service = portal.createService(database, async () => ({ ok: true, json: async () => profile() }));
    assert.equal((await service.load('private')).user.id, 42);
    assert.ok(executed.filter(sql => sql.includes('TIRF_USUARIOS')).every(sql => sql.includes('WHERE PORTAL_USUARIO_ID')));
    inserted = false;
    database.getConnection = async () => ({ execute: async () => { throw Object.assign(new Error('collision'), { errorNum: 1 }); },
        rollback: async () => {}, close: async () => {} });
    await assert.rejects(service.load('private'), { status: 403 });
});

test('provisioning locks and rechecks identity, blocking native username, email and canonical name candidates', async () => {
    for (const match of ['username', 'email', 'nome', 'linked']) {
        const payload = profile();
        Object.assign(payload.user, {
            username: match === 'username' ? ' Old.Login ' : undefined,
            email: match === 'email' ? ' Owner@Example.test ' : undefined,
            name: match === 'nome' ? '  Existing   Owner  ' : undefined
        });
        let rolledBack = false;
        let committed = false;
        let locked = false;
        let databaseReads = 0;
        const database = {
            execute: async sql => {
                if (sql.includes('TIRF_LOJAS')) return { rows: stores };
                databaseReads += 1;
                return { rows: databaseReads > 1 && match === 'linked' ? [native] : [] };
            },
            getConnection: async () => ({
                execute: async (sql, binds, options) => {
                    assert.equal(options.autoCommit, false);
                    if (sql.startsWith('LOCK TABLE')) { locked = true; return {}; }
                    assert.equal(locked, true);
                    if (sql.includes('WHERE PORTAL_USUARIO_ID')) {
                        assert.deepEqual(binds, [payload.user.id]);
                        return { rows: match === 'linked' ? [native] : [] };
                    }
                    assert.match(sql, /^SELECT ID_USUARIO FROM TIRF_USUARIOS/);
                    assert.match(sql, /LOWER\(TRIM\(LOGIN\)\) IN/);
                    assert.match(sql, /REGEXP_REPLACE\(TRIM\(NOME\)/);
                    assert.deepEqual(binds, { username: match === 'username' ? 'old.login' : null,
                        email: match === 'email' ? 'owner@example.test' : null, nome: match === 'nome' ? 'existing owner' : null });
                    return { rows: [native] };
                }, commit: async () => { committed = true; }, rollback: async () => { rolledBack = true; }, close: async () => {}
            })
        };
        const service = portal.createService(database, async () => ({ ok: true, json: async () => payload }));
        if (match === 'linked') {
            assert.equal((await service.load('private')).user.id, 42);
            assert.equal(committed, true);
        } else {
            await assert.rejects(service.load('private'), { status: 409 });
            assert.equal(rolledBack, true);
            assert.equal(committed, false);
        }
    }
});

test('Portal URLs normalize API suffixes and reject downgrade, credentials, query and fragment before fetch', async () => {
    const saved = { NODE_ENV: process.env.NODE_ENV, PORTAL_URL: process.env.PORTAL_URL };
    try {
        let called = false;
        const service = portal.createService({}, async (url, options) => {
            called = true;
            assert.equal(url, 'https://portal.test/portal/api/auth/login');
            assert.equal(options.redirect, 'error');
            return { ok: true, json: async () => ({}) };
        });
        process.env.NODE_ENV = 'production';
        for (const suffix of ['', '/', '/api', '/api/', '/api/api/']) {
            process.env.PORTAL_URL = `https://portal.test/portal${suffix}`;
            await service.request('/auth/login', { body: { password: 'secret' } });
        }
        for (const url of ['http://portal.test/portal', 'http://localhost:3000/portal', 'http://127.0.0.1/portal',
            'https://user:secret@portal.test/portal', 'https://user@portal.test/portal',
            'https://portal.test/portal?secret=bad', 'https://portal.test/portal#bad', 'https://portal.test/portal?',
            'https://portal.test/portal#', 'file:///portal', 'not a URL']) {
            process.env.PORTAL_URL = url;
            called = false;
            await assert.rejects(service.request('/auth/login', { body: { password: 'secret' } }), { status: 503 });
            assert.equal(called, false);
        }
        process.env.NODE_ENV = 'test';
        for (const host of ['localhost', '127.0.0.1', '[::1]']) {
            process.env.PORTAL_URL = `http://${host}:3000/portal/api/`;
            const local = portal.createService({}, async url => {
                assert.equal(url, `http://${host}:3000/portal/api/auth/me`);
                return { ok: true, json: async () => ({}) };
            });
            await local.request('/auth/me');
        }
        for (const host of ['portal.test', 'localhost.evil.test', '192.168.1.2']) {
            process.env.PORTAL_URL = `http://${host}/portal`;
            await assert.rejects(service.request('/auth/me'), { status: 503 });
        }
    } finally {
        for (const [key, value] of Object.entries(saved)) {
            if (value === undefined) delete process.env[key]; else process.env[key] = value;
        }
    }
});

test('SSO public URL and configured Origin reject embedded credentials and URL metadata', () => {
    const keys = ['NODE_ENV', 'PORTAL_AUTH_ENABLED', 'PORTAL_PUBLIC_URL', 'SSO_PUBLIC_ORIGIN', 'SSO_CLIENT_SECRET'];
    const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    try {
        process.env.NODE_ENV = 'production';
        process.env.PORTAL_AUTH_ENABLED = 'true';
        process.env.SSO_CLIENT_SECRET = 'secret';
        process.env.SSO_PUBLIC_ORIGIN = 'https://manual.test';
        for (const configured of ['http://public.test/portal', 'https://user:secret@public.test/portal',
            'https://public.test/portal?bad', 'https://public.test/portal#bad']) {
            process.env.PORTAL_PUBLIC_URL = configured;
            const res = { status(code) { this.code = code; return this; }, json() {} };
            portal.ssoStart({}, res);
            assert.equal(res.code, 503);
        }
        for (const configured of ['https://user:secret@manual.test', 'https://user@manual.test',
            'https://manual.test/?bad', 'https://manual.test/#bad', 'https://manual.test/path', 'http://localhost']) {
            process.env.SSO_PUBLIC_ORIGIN = configured;
            let passed = false;
            const res = { status(code) { this.code = code; return this; }, json() {} };
            portal.checkOrigin({ method: 'POST', headers: { origin: 'https://manual.test' } }, res, () => { passed = true; });
            assert.equal(res.code, 503);
            assert.equal(passed, false);
        }
    } finally {
        for (const [key, value] of Object.entries(saved)) {
            if (value === undefined) delete process.env[key]; else process.env[key] = value;
        }
    }
});

test('real fetch rejects redirects without forwarding passwords, bearer tokens or SSO secrets', async () => {
    const saved = { NODE_ENV: process.env.NODE_ENV, PORTAL_URL: process.env.PORTAL_URL };
    let forwarded = 0;
    let redirectStatus = 302;
    const app = express();
    app.all('/leak', (req, res) => { forwarded += 1; res.json({}); });
    app.use((req, res) => res.redirect(redirectStatus, '/leak'));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
        process.env.NODE_ENV = 'test';
        process.env.PORTAL_URL = `http://127.0.0.1:${server.address().port}/portal/api`;
        const service = portal.createService({});
        for (const status of [301, 302, 303, 307, 308]) {
            redirectStatus = status;
            for (const [path, options] of [['/auth/login', { body: { password: 'secret' } }],
                ['/auth/me', { token: 'private' }], ['/auth/sso/exchange', { body: { clientSecret: 'secret' } }]]) {
                await assert.rejects(service.request(path, options), { status: 503 });
            }
        }
        assert.equal(forwarded, 0);
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
        for (const [key, value] of Object.entries(saved)) {
            if (value === undefined) delete process.env[key]; else process.env[key] = value;
        }
    }
});

test('HTTP login, temporary password isolation, origin, scope, revocation and PKCE SSO', async () => {
    process.env.PORTAL_AUTH_ENABLED = 'true';
    process.env.SSO_PUBLIC_ORIGIN = 'https://manual.test';
    process.env.PORTAL_PUBLIC_URL = 'https://public.test/portal';
    process.env.SSO_CLIENT_SECRET = 'test-secret';
    let payload = profile();
    let available = true;
    let exchanged;
    let logins = 0;
    const originalFetch = global.fetch;
    const databasePath = require.resolve('../config/database');
    const previousDatabase = require.cache[databasePath];
    require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true,
        exports: { execute: async sql => ({ rows: sql.includes('TIRF_LOJAS') ? stores : [native] }) } };
    global.fetch = async (url, options) => {
        assert.ok(String(url).startsWith('https://portal.test/portal/api/auth/'));
        if (!available) throw new Error('offline');
        const body = options.body && JSON.parse(options.body);
        if (String(url).endsWith('/login')) {
            logins += 1;
            assert.deepEqual(body, { username: 'pessoa', password: 'senha' });
            return { ok: true, json: async () => ({ token: 'private', user: payload.user }) };
        }
        if (String(url).endsWith('/exchange')) {
            exchanged = body;
            return { ok: true, json: async () => ({ token: 'private' }) };
        }
        if (String(url).endsWith('/change-password')) {
            assert.deepEqual(body, { newPassword: 'new-password' });
            payload.user.mustChangePassword = false;
            return { ok: true, json: async () => ({}) };
        }
        return { ok: true, json: async () => payload };
    };
    const app = express();
    app.use(express.json());
    app.use(portal.checkOrigin);
    app.use('/manuais/api/auth', require('../routes/auth'));
    app.use('/manuais/api/manuais', require('../middleware/portalSession'), (req, res) => res.json({ id: req.userId, stores: req.allowedStores }));
    app.use('/manuais/uploads', require('../middleware/portalSession'), (req, res) => res.send('pdf'));
    app.post('/multipart-scope', (req, res, next) => {
        req.portalSession = {};
        req.userPerfil = 'COLABORADOR';
        req.allowedStores = ['02'];
        next();
    }, require('../middleware/portalSession').checkStores, (req, res) => res.json({ loja: req.query.loja }));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/manuais/api`;
    const request = (path, options = {}) => originalFetch(`${base}${path}`, { redirect: 'manual', ...options });
    const headers = { Origin: 'https://manual.test', 'Content-Type': 'application/json', Cookie: 'manuais_session=private' };
    try {
        const scopeRequest = body => originalFetch(`${base.split('/manuais/api')[0]}/multipart-scope`, {
            method: 'POST', headers, body: JSON.stringify(body)
        });
        assert.equal((await scopeRequest({ loja: '99' })).status, 403);
        assert.deepEqual(await (await scopeRequest({ loja: '02' })).json(), { loja: '02' });
        assert.equal((await request('/manuais')).status, 401);
        assert.equal((await request('/manuais', { headers: { Authorization: 'Bearer native-jwt' } })).status, 401);
        payload.user.mustChangePassword = true;
        payload.applications = [];
        const login = await request('/auth/login', { method: 'POST', headers, body: JSON.stringify({ login: 'pessoa', senha: 'senha' }) });
        assert.equal(login.status, 200);
        const loginBody = await login.json();
        assert.equal(loginBody.user.primeiroLogin, true);
        assert.equal(loginBody.token, undefined);
        assert.match(login.headers.get('set-cookie'), /HttpOnly/);
        assert.match(login.headers.get('set-cookie'), /Secure/);
        assert.match(login.headers.get('set-cookie'), /SameSite=Lax/);
        assert.match(login.headers.get('set-cookie'), /Path=\/manuais/);
        assert.equal((await request('/auth/me', { headers })).status, 200);
        assert.equal((await request('/manuais', { headers })).status, 403);
        assert.equal((await request('/auth/profile', { headers })).status, 403);
        assert.equal((await originalFetch(`${base.replace('/api', '')}/uploads/manual.pdf`, { headers })).status, 403);
        const temporaryLogout = await request('/auth/logout', { method: 'POST', headers });
        assert.equal(temporaryLogout.status, 200);
        assert.match(temporaryLogout.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
        assert.equal((await request('/auth/change-password', { method: 'POST', headers: { ...headers, Origin: 'https://evil.test' }, body: '{}' })).status, 403);
        payload.applications = ['manuais'];
        assert.equal((await request('/auth/change-password', { method: 'POST', headers, body: JSON.stringify({ newPassword: 'new-password' }) })).status, 200);
        assert.equal((await request('/manuais?loja=99', { headers })).status, 403);
        assert.equal((await request('/manuais?loja=02', { method: 'POST', headers, body: JSON.stringify({ loja: '99' }) })).status, 403);
        assert.equal((await request('/manuais?loja=02', { headers })).status, 200);
        payload.systemProfiles.manuais.role = 'LEITOR';
        assert.equal((await request('/manuais', { method: 'POST', headers, body: '{}' })).status, 403);
        payload.applications = [];
        assert.equal((await request('/manuais', { headers })).status, 403);
        assert.equal((await originalFetch(`${base.replace('/api', '')}/uploads/manual.pdf`, { headers })).status, 403);
        available = false;
        assert.equal((await request('/manuais', { headers })).status, 503);
        available = true;
        payload = profile();
        assert.equal((await request('/auth/register', { method: 'POST', headers, body: '{}' })).status, 403);
        const start = await request('/auth/sso/start');
        assert.equal(start.status, 302);
        const authorize = new URL(start.headers.get('location'));
        assert.equal(authorize.origin, 'https://public.test');
        assert.equal(authorize.searchParams.get('client_id'), 'manuais');
        assert.equal(authorize.searchParams.get('redirect_uri'), 'https://manual.test/manuais/api/auth/sso/callback');
        const cookies = start.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
        const verifier = decodeURIComponent(cookies.match(/manuais_sso_verifier=([^;]+)/)[1]);
        assert.equal(authorize.searchParams.get('code_challenge'), createHash('sha256').update(verifier).digest('base64url'));
        assert.equal((await request(`/auth/sso/callback?code=${'a'.repeat(43)}&state=${'b'.repeat(43)}`, { headers: { Cookie: cookies } })).status, 400);
        const callback = await request(`/auth/sso/callback?code=${'a'.repeat(43)}&state=${authorize.searchParams.get('state')}`, { headers: { Cookie: cookies } });
        assert.equal(callback.status, 302);
        assert.equal(callback.headers.get('location'), '/manuais/');
        assert.match(callback.headers.getSetCookie().find(value => value.startsWith('manuais_sso_state=')), /Expires=Thu, 01 Jan 1970/);
        assert.equal(exchanged.clientId, 'manuais');
        assert.equal(exchanged.codeVerifier, verifier);
        assert.equal(exchanged.clientSecret, 'test-secret');
        assert.equal((await request(`/auth/sso/callback?code=${'a'.repeat(43)}&state=${authorize.searchParams.get('state')}`)).status, 400);
        assert.equal((await request('/auth/sso/callback?code=bad&state=bad')).status, 400);
        assert.equal((await request('/auth/logout', { method: 'POST', headers })).status, 200);
        for (let attempt = 0; attempt < 15; attempt += 1) await request('/auth/login', { method: 'POST', headers, body: JSON.stringify({ login: 'pessoa', senha: 'senha' }) });
        assert.equal(logins, 15);
        const limited = await request('/auth/login', { method: 'POST', headers, body: '{}' });
        assert.equal(limited.status, 429);
        process.env.PORTAL_AUTH_ENABLED = 'false';
        assert.equal((await request('/auth/sso/start')).status, 503);
        assert.equal((await request('/auth/sso/callback')).status, 503);
    } finally {
        global.fetch = originalFetch;
        if (previousDatabase) require.cache[databasePath] = previousDatabase;
        else delete require.cache[databasePath];
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
        delete process.env.PORTAL_AUTH_ENABLED;
    }
});
