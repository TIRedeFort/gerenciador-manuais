const { randomUUID } = require('node:crypto');

function createAuditMiddleware({ applicationId, modules = [], actor = request => request.user,
  loginPaths = ['/login', '/auth/login'], auditLogins = true, loginAlreadyRecorded = () => false, portalIds = false, anonymous = false, env = process.env, fetchImpl = globalThis.fetch }) {
  const key = env.FORT_AUDIT_KEY;
  if (!key || env.FORT_AUDIT_ENABLED === 'false') return (_request, _response, next) => next();
  let endpoint;
  try {
    endpoint = new URL(env.FORT_AUDIT_URL || 'https://app.fortsupermercados.com.br/auditoria/api/ingest');
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || key.length < 32) throw new Error();
  } catch {
    console.warn('[Auditoria] Configuração inválida; aplicação continua sem coleta.');
    return (_request, _response, next) => next();
  }
  let pending = 0;
  let pausedUntil = 0;
  let lastWarning = 0;
  const recentReads = new Map();
  function warn() {
    if (Date.now() - lastWarning > 60000) { lastWarning = Date.now(); console.warn('[Auditoria] Coleta indisponível ou saturada; aplicação continua normalmente.'); }
  }
  function identity(user) {
    if (!user || typeof user !== 'object' || user.mustChangePassword || user.must_change_password || user.requiresPasswordChange || user.primeiroLogin || user.trocarSenha || user.firstAccessRequired) return null;
    const nativeId = user.id ?? user.ID ?? user.userId ?? user.sub;
    const username = user.username ?? user.USERNAME ?? user.usuario ?? user.email ?? user.login ?? user.nome ?? user.name ?? nativeId;
    if (nativeId == null || !username) return null;
    const portalId = user.portalUsuarioId ?? user.portal_usuario_id ?? user.portalUserId ?? user.PORTAL_USUARIO_ID ?? (portalIds ? nativeId : null);
    const result = { nativeId: String(nativeId).slice(0, 120), username: String(username).slice(0, 200) };
    if (portalId) result.portalId = String(portalId).slice(0, 50);
    const name = user.name ?? user.nome ?? user.nome_completo ?? user.NOME_COMPLETO;
    if (name) result.name = String(name).slice(0, 200);
    return result;
  }
  function emit(event, readKey) {
    if (readKey && recentReads.has(readKey)) return;
    if (pending >= 4 || Date.now() < pausedUntil) { warn(); return; }
    if (readKey) {
      if (recentReads.size >= 5000) recentReads.delete(recentReads.keys().next().value);
      recentReads.set(readKey, true);
    }
    pending++;
    const body = JSON.stringify({ eventId: randomUUID(), ...event });
    void (async () => {
      let delivered = false;
      try {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await fetchImpl(endpoint, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(2000),
              headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body });
            await response.arrayBuffer();
            if (response.ok) { delivered = true; return; }
            if (response.status < 500 && response.status !== 429) { warn(); return; }
          } catch { if (attempt === 1) break; }
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        pausedUntil = Date.now() + 10000; warn();
      } finally { pending--; if (!delivered && readKey) recentReads.delete(readKey); }
    })().catch(warn);
  }
  return function audit(request, response, next) {
    let capturedUser;
    let route;
    let base;
    let failed = false;
    const originalJson = response.json;
    response.json = function json(payload) {
      try {
        route = Array.isArray(request.route?.path) ? request.route.path.find(value => typeof value === 'string') : request.route?.path;
        base = request.baseUrl || '';
        const path = String(request.path || '').replace(/\/$/, '');
        if (auditLogins && loginPaths.some(value => path.endsWith(value))) {
          capturedUser = identity(payload?.user || payload);
          if (payload?.requiresPasswordChange || payload?.mustChangePassword || payload?.requires_password_change) capturedUser = null;
        }
        failed = payload?.success === false || Boolean(payload?.error);
      } catch { capturedUser = null; }
      return originalJson.call(this, payload);
    };
    response.once('finish', () => {
      try {
        const status = response.statusCode;
        const originalPath = String(request.originalUrl || '').split('?')[0];
        const login = auditLogins && loginPaths.some(value => originalPath.replace(/\/$/, '').endsWith(value));
        if (login && status === 401) {
          const entered = request.body?.username || request.body?.email || request.body?.login || 'Não identificado';
          emit({ type: 'LOGIN_FALHA', user: { username: String(entered).slice(0, 200) }, feature: 'autenticacao', action: 'login', result: 'FALHA', httpStatus: status });
          return;
        }
        const user = identity(actor(request)) || capturedUser || (anonymous && status >= 200 && status < 300 ? { nativeId: 'public', username: 'Acesso público sem identificação', kind: 'ANONIMO' } : null);
        if (!user || status < 200 || (status >= 300 && status < 400)) return;
        const result = status === 401 || status === 403 ? 'NEGADO' : status >= 400 || failed ? 'FALHA' : 'SUCESSO';
        if (login) {
          if (loginAlreadyRecorded(request)) return;
          if (status < 300 && !failed) emit({ type: 'LOGIN_SUCESSO', user, feature: 'autenticacao', action: 'login', result, httpStatus: status });
          return;
        }
        const pattern = route || (Array.isArray(request.route?.path) ? request.route.path.find(value => typeof value === 'string') : request.route?.path);
        if (!['POST', 'PUT', 'PATCH', 'DELETE', 'GET'].includes(request.method) || typeof pattern !== 'string') return;
        if (pattern.includes('*') || /(?:^|\/)(?:health|ready|auth|ping|poll|heartbeat|token|session)(?:\/|$)/i.test((base || request.baseUrl || '') + pattern)) return;
        const selected = modules.find(([prefix]) => prefix.startsWith('/') ? originalPath.startsWith(prefix) : originalPath.split('/').includes(prefix));
        if (!selected) return;
        const suffix = pattern.replace(/:[A-Za-z0-9_]+/g, 'item').replace(/[^a-zA-Z0-9]+/g, '.').replace(/^\.|\.$/g, '').slice(0, 100) || 'colecao';
        const action = (request.method.toLowerCase() + '.' + suffix).slice(0, 120);
        const read = request.method === 'GET' && result === 'SUCESSO';
        const readKey = read ? `${user.portalId || user.nativeId}|${selected[1]}|${action}|${Math.floor(Date.now() / 1800000)}` : undefined;
        emit({ type: read ? 'ATIVIDADE' : 'USO_FUNCIONALIDADE', user, feature: selected[1], action, result, httpStatus: status }, readKey);
      } catch { warn(); }
    });
    next();
  };
}

module.exports = { createAuditMiddleware };
