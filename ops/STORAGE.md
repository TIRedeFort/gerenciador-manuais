# Arquivos do Fort Manuais

## Persistencia obrigatoria no Easypanel

O banco guarda o conteudo HTML e os caminhos dos anexos. Imagens, PDFs e documentos enviados ficam no disco, nao dentro do Oracle. Os 134 arquivos historicos versionados no repositorio nao representam todos os uploads de producao.

Configuracao ativa desde 17/11/2026, no projeto `sistemas-redefort`, servico `manuais`:

| Configuracao | Valor |
| --- | --- |
| Tipo | Bind mount |
| Diretorio no host | `/etc/easypanel/projects/sistemas-redefort/manuais/uploads-persistent` |
| Destino no container | `/app/backend/uploads` |
| Diretorio da aplicacao | `UPLOADS_DIR=/app/backend/uploads` (padrao do Dockerfile) |
| Prefixo publico | `/manuais/uploads` |

O mount deve existir tanto no cadastro do Easypanel quanto no servico Docker. Uma variavel de ambiente, sozinha, nao torna o disco persistente. A autenticacao continua obrigatoria para acessar arquivos.

Antes de alterar mounts em uma instalacao existente:

1. Salvar a configuracao e todos os uploads atuais, inclusive dos containers antigos ainda disponiveis.
2. Recuperar somente arquivos referenciados, sem substituir conteudos por aproximacao de nome.
3. Pausar brevemente somente o Manuais para capturar os ultimos uploads sem escrita concorrente.
4. Copiar os arquivos para o diretorio persistente, configurar o mount no Easypanel e no Docker e retomar o servico.
5. Comparar os hashes de todos os arquivos e conferir a integridade das referencias antes e depois.

Nao remover o mount para reverter uma versao de codigo. A reversao do codigo deve continuar utilizando os mesmos dados persistentes. Nao apagar containers antigos ou backups enquanto houver arquivos pendentes de recuperacao.

## Verificacao de todos os manuais

No diretorio `backend`, com as mesmas variaveis Oracle da aplicacao:

```sh
node scripts/check-uploads.js > /caminho-protegido/integridade.json
```

O comando usa uma transacao Oracle somente de leitura, sem executar migracoes. Verifica a tabela principal e todas as tabelas `TIRF_MANUAIS_LOJAxx`, inclusive registros na lixeira. Analisa referencias locais a imagens, anexos, PDFs, CSS e `srcset`; detecta arquivos ausentes/vazios e referencias temporarias `blob:`. Nao testa a disponibilidade de sites externos nem comprova a integridade interna de cada formato de documento.

Codigos de saida: `0` sem pendencias detectadas; `2` com pendencias; `1` se nao foi possivel concluir a verificacao. O relatorio contem titulos e referencias dos manuais; mantenha-o em local protegido. Uma referencia `blob:` de WhatsApp nao e um arquivo do servidor: e necessario reenviar a imagem original.

## Backup diario verificado

Arquivos de operacao versionados nesta pasta:

- `backup-uploads.py`: cria um arquivo comprimido com manifesto SHA-256 e confere todos os arquivos do backup antes de publica-lo. Recusa diretorios ausentes, armazenamento vazio, links simbolicos ou arquivos alterados durante a copia.
- `fort-manuais-backup.service` e `fort-manuais-backup.timer`: executam diariamente as **03:15 de America/Sao_Paulo**, com ate tres tentativas em caso de falha. Uma execucao perdida e recuperada quando o timer volta a funcionar.

Instalacao efetuada no host:

```text
/usr/local/sbin/fort-manuais-backup.py
/etc/systemd/system/fort-manuais-backup.service
/etc/systemd/system/fort-manuais-backup.timer
```

Backups ficam em `/root/fort-manuais-backups`, com acesso restrito a root e retencao dos **14 arquivos mais recentes**. Somente backups concluidos e conferidos substituem backups antigos. Os uploads originais nunca sao apagados pelo script.

Conferir o funcionamento:

```sh
systemctl status fort-manuais-backup.timer
systemctl show fort-manuais-backup.service -p Result -p ExecMainStatus
journalctl -u fort-manuais-backup.service
```

Esses backups locais protegem contra perda no container, mas nao contra perda completa da VPS. Uma copia adicional foi transferida para a maquina local em 17/11/2026; copias externas recorrentes ainda precisam de destino e politica proprios. Os backups do Oracle permanecem separados e sob responsabilidade da administracao do banco.

Para restaurar, extrair o arquivo em um diretorio temporario protegido, conferir `manifest.json` e recuperar apenas os arquivos necessarios. Nao extrair nem sobrescrever indiscriminadamente o armazenamento ativo.

## Resultado da verificacao em 17/11/2026

- 400 registros conferidos em 44 tabelas; 209 caminhos de arquivos referenciados.
- Recuperacao acumulada: 99 imagens e 23 anexos adicionais. Nenhum conteudo de manual foi alterado no banco.
- 256 arquivos preservados na ativacao do mount, todos com hashes iguais ao snapshot anterior.
- Cinco arquivos ainda nao encontrados: dois documentos de Conferencia Cega (manuais **324** e **385**) e tres imagens de Campo IE invalido (manual **1941**).
- Quatro referencias `blob:` antigas: manual **141** na tabela principal e na loja 33; duas no manual **1661**, que esta na lixeira. Essas referencias precisam das imagens originais, nao podem ser recuperadas como URLs permanentes.
- Relatorios completos e snapshots da migracao: `/root/fort-manuals-storage-20261117`, protegidos e fora do repositorio.

Os arquivos nao encontrados e as referencias `blob:` nao foram removidos nem substituidos por outros documentos. Precisam ser reenviados a partir dos originais.
