# Login unificado Manuais

Implementação local, sem execução de DDL, migração de contas ou alteração de produção.
O Portal mantém contas, grants e `systemProfiles`; este aplicativo só adiciona o vínculo nativo.

## Configuração

```dotenv
PORTAL_AUTH_ENABLED=false
PORTAL_URL=https://portal.example/portal
# Opcional: URL pública do mesmo Portal, quando PORTAL_URL é interna
PORTAL_PUBLIC_URL=https://portal.example/portal
SSO_PUBLIC_ORIGIN=https://app.example
SSO_CLIENT_SECRET=
```

`PORTAL_URL` e `PORTAL_PUBLIC_URL` aceitam a base do Portal com ou sem o sufixo
`/api` e barras finais; a aplicação normaliza para um único `/api`.
URLs de autenticação exigem HTTPS, sem credenciais embutidas, query ou fragmento.
HTTP só é aceito fora de `NODE_ENV=production` para `localhost`, `127.0.0.1` ou
`[::1]`. `SSO_PUBLIC_ORIGIN` segue essas validações e não aceita caminho.
Fetch usa `redirect: 'error'`: redirects nunca encaminham senha, Bearer ou segredo SSO.
SSO requer segredo e cadastro do cliente `manuais`, com callback exato
`https://app.example/manuais/api/auth/sso/callback`. Node 22 é a base do Docker.
Cookies privados HttpOnly/Secure/SameSite=Lax têm path `/manuais`; desenvolvimento
precisa HTTPS no navegador. Não configure a API em outro domínio ou fora de `/manuais`.
`VITE_API_BASE_URL` usa `/manuais/api` por padrão.

A flag só habilita com valor literal `true`; ausente mantém autenticação nativa.
Habilitada, nenhuma senha ou JWT nativo autentica usuários. Login direto continua na
tela local e envia credenciais ao Portal. Somente GET `/manuais/api/auth/sso/start`
inicia SSO, explicitamente pela Central; não há redirecionamento automático ao Portal.

## Contrato e permissões

Portal: POST `/portal/api/auth/login` `{username,password}` retorna `{user,token}`;
GET `/portal/api/auth/me` com Bearer retorna `{user,applications,systemProfiles}`.
`user.id` é string não vazia com até 50 caracteres (Portal Oracle `VARCHAR2(50)`,
nanoid/UUID, incluindo hífen e underscore). O vínculo preserva o valor exato, sem
conversão numérica, trim ou normalização de caixa. `user.mustChangePassword` é booleano obrigatório.
`applications` precisa conter `manuais` (string ou objeto `{id:"manuais"}`).

```json
{"systemProfiles":{"manuais":{"role":"COLABORADOR","stores":["02","33"]}}}
```

Roles aceitos: `TI`, `COLABORADOR`, `LEITOR`. Não há conversão de superadmin global
em TI. Stores são números de loja de 1 a 99, normalizados para dois dígitos, e precisam
existir ativos em `TIRF_LOJAS`. Não são IDs. COLABORADOR/LEITOR exigem pelo menos
uma loja; TI mantém o acesso nativo a todas as lojas. LEITOR não pode mutar negócios.
01 e 33 compartilham tabelas-base de manuais; demais lojas usam sufixo `_LOJAxx`.
O relacionamento múltiplo já existente prevalece sobre `TIRF_USUARIOS.ID_LOJA`, campo
legado nullable. O perfil Portal é aplicado ao request, sem sobrescrever grants nativos.

Cada requisição de negócios, inclusive uploads/PDFs, revalida `/auth/me`, sem cache.
Revogação, perfil inválido, loja inativa ou indisponibilidade bloqueiam acesso.
Senha temporária só permite `/auth/me`, alteração de senha e logout; não provisiona perfil.
POST `/auth/change-password` `{newPassword}` e o alias PUT `/auth/alterar-senha`
`{novaSenha}` encaminham a alteração ao Portal. O token fica só no cookie, nunca no
JSON de resposta, URL ou localStorage. A UI recupera a sessão via `/auth/me`.
Logout remove a sessão deste aplicativo; não encerra outras sessões do Portal.
Mutações requerem Origin exatamente igual a `SSO_PUBLIC_ORIGIN`. Login tem limite
de 15 tentativas/IP em 15 minutos por processo. Fetch tem timeout de 10 segundos.
SSO usa PKCE S256, state/verifier em cookies privados por 5 minutos e troca de código
com `clientId=manuais`; o Portal deve consumir o código uma única vez.
Administração de contas/permissões fica no Portal quando a flag está ativa.

## Schema nativo e entrega para migração central

Schema Oracle confirmado: `TIRF_USUARIOS(ID_USUARIO NUMBER PK, NOME VARCHAR2(100),
LOGIN VARCHAR2(50) UNIQUE, SENHA VARCHAR2(255), PERFIL VARCHAR2(20), STATUS,
PRIMEIRO_LOGIN NUMBER(1), DATA_CRIACAO DATE, ID_LOJA NUMBER NULL)`; não há email.
O vínculo novo é `PORTAL_USUARIO_ID VARCHAR2(50) NULL`, índice único
`UX_TIRF_USUARIOS_PORTAL`. Executar separadamente, após revisão, apenas
`backend/database/portal_usuario_id.sql`. A aplicação não executa esse DDL ao iniciar.

SELECT exato para extração das contas/grants existentes pela migração central.
A fonte autoritativa das lojas é `TIRF_USUARIO_LOJAS` com `TIRF_LOJAS.NUMERO_LOJA`;
`u.ID_LOJA` é apenas informação legada, sem limitar ou substituir os múltiplos vínculos:

```sql
SELECT u.ID_USUARIO, u.NOME, u.LOGIN, u.SENHA, u.PERFIL,
       NVL(u.STATUS, 'ATIVO') AS STATUS,
       NVL(u.PRIMEIRO_LOGIN, 1) AS PRIMEIRO_LOGIN,
       u.ID_LOJA, ul.ID_LOJA AS ID_LOJA_VINCULO,
       l.NUMERO_LOJA, l.NOME_LOJA, l.STATUS AS STATUS_LOJA
FROM TIRF_USUARIOS u
LEFT JOIN TIRF_USUARIO_LOJAS ul ON ul.ID_USUARIO = u.ID_USUARIO
LEFT JOIN TIRF_LOJAS l ON l.ID_LOJA = ul.ID_LOJA
ORDER BY u.ID_USUARIO, l.NUMERO_LOJA
```

Essa consulta é especificação para migração; não é executada pelo login. Tratar hashes
como segredos e não exportar para logs. A migração central deve associar os usuários
antigos por identidade revisada e preencher PORTAL_USUARIO_ID, criar contas/grants e
`systemProfiles.manuais`. A flag só deve ser ligada após esses passos. Login nunca
associa por LOGIN/email. ID_USUARIO continua sendo autor/editor/acesso e preserva FKs.
Antes de provisionar, uma transação bloqueia `TIRF_USUARIOS` em modo
`SHARE ROW EXCLUSIVE NOWAIT` e reconsulta `PORTAL_USUARIO_ID`; um vínculo criado
concorrentemente reutiliza o ID nativo. Sem vínculo, candidatos por LOGIN igual ao
username/email Portal (trim e comparação sem distinção de caixa) ou NOME igual ao
nome Portal (também normalizando espaços) bloqueiam com HTTP 409, pendente de revisão.
O bloqueio inclui contas inativas e vinculadas a outra identidade. Não há associação
automática nem inserção de clone; a migração deve preencher o vínculo preservando autoria.
Falha ao adquirir o lock bloqueia o provisionamento com 503.
Somente contas sem candidatos podem ganhar perfil nativo usando login técnico
`portal:<SHA-256 do id em base64url>` (50 caracteres, respeitando `LOGIN VARCHAR2(50)`)
e senha aleatória inutilizável. Somente o login técnico usa hash; `PORTAL_USUARIO_ID`
sempre recebe a string original completa. Colisão ou conta inativa bloqueia sem sobrescrever ninguém.
Nenhum arquivo ou caminho de upload/PDF é movido, removido ou reescrito.

Reversão: desligar a flag restaura o modo nativo; manter o mapeamento nullable.
Não houve deploy, commit, push nem acesso ao banco neste trabalho.

## Validação local

```powershell
cd backend
node --test tests/portalAuth.test.js
cd ../frontend
node node_modules/vite/bin/vite.js build
```

Testes usam Portal e banco simulados e HTTP local, sem credenciais nem produção:
ausência de sessão, grants/roles/stores inválidos, revogação, falha Portal, senha
temporária, Origin, cookie privado, provisionamento sem clones, rechecagem do vínculo,
URLs seguras, redirects reais sem encaminhar segredos, rate limit e SSO PKCE.
