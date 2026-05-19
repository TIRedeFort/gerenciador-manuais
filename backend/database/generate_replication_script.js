const fs = require('fs');
const path = require('path');

const excludedStores = [4, 22, 34, 38, 43, 45];
let sqlContent = '-- Generated Replication Script\n\n';

for (let i = 2; i <= 50; i++) {
    if (excludedStores.includes(i)) continue;

    const suffix = `LOJA${i.toString().padStart(2, '0')}`;

    // Modules
    sqlContent += `
INSERT INTO TIRF_MODULOS_${suffix} (ID_MODULO, NOME_MODULO, ICONE)
SELECT ID_MODULO, NOME_MODULO, ICONE FROM TIRF_MODULOS m
WHERE NOT EXISTS (SELECT 1 FROM TIRF_MODULOS_${suffix} tm WHERE tm.ID_MODULO = m.ID_MODULO);
`;

    // Applications
    sqlContent += `
INSERT INTO TIRF_APLICACOES_${suffix} (ID_APLICACAO, ID_MODULO, NOME_APLICACAO)
SELECT ID_APLICACAO, ID_MODULO, NOME_APLICACAO FROM TIRF_APLICACOES a
WHERE NOT EXISTS (SELECT 1 FROM TIRF_APLICACOES_${suffix} ta WHERE ta.ID_APLICACAO = a.ID_APLICACAO);
`;

}

// Manuals for Loja 33
sqlContent += `
INSERT INTO TIRF_MANUAIS_LOJA33 (
    ID_MANUAL, ID_APLICACAO, ID_AUTOR, ID_ULTIMO_ACESSO, ID_ULTIMO_EDITOR, 
    TITULO, DESCRICAO_CARD, CONTEUDO_HTML, QTD_VIEWS, STATUS, 
    DATA_CRIACAO, DATA_ATUALIZACAO
)
SELECT 
    ID_MANUAL, ID_APLICACAO, ID_AUTOR, ID_ULTIMO_ACESSO, ID_ULTIMO_EDITOR, 
    TITULO, DESCRICAO_CARD, CONTEUDO_HTML, QTD_VIEWS, STATUS, 
    DATA_CRIACAO, DATA_ATUALIZACAO
FROM TIRF_MANUAIS m
WHERE NOT EXISTS (SELECT 1 FROM TIRF_MANUAIS_LOJA33 tm WHERE tm.ID_MANUAL = m.ID_MANUAL);
`;

sqlContent += '\nCOMMIT;\n';

fs.writeFileSync(path.join(__dirname, 'replicate_generated.sql'), sqlContent);
console.log('Generated replicate_generated.sql');
