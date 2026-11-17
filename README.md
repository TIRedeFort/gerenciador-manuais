# Gerenciador de Manuais

Sistema de gerenciamento de manuais e documentacoes.

## EasyPanel

Use o `Dockerfile` na raiz do repositorio e exponha a porta `1601`.

URL esperada:

```text
https://app.fortsupermercados.com.br/manuais/
```

Variaveis de ambiente:

```env
DB_USER=consinco
DB_PASSWORD=consinco
DB_CONNECTION_STRING=fort-bd-orcl-01.skyone.app:1569/RDFORTPRD
ORACLE_CLIENT_PATH=/opt/oracle/instantclient

JWT_SECRET=fort_manuais_super_secret_key_2024
JWT_EXPIRES_IN=24h

PORT=1601
NODE_ENV=production
```

Os arquivos historicos em `backend/uploads` incluidos no repositorio nao substituem o armazenamento de producao. Configure um bind mount persistente para `/app/backend/uploads` antes de implantar. Nunca dependa da camada gravavel do container para guardar uploads. Procedimentos, backup e verificacao: [ops/STORAGE.md](ops/STORAGE.md).

## Login Portal

Contrato, configuração, SELECT de migração e validação local: [PORTAL_AUTH.md](PORTAL_AUTH.md).
