-- ============================================
-- Fort Manuais de Processos - Data Replication
-- ============================================

DECLARE
    v_suffix VARCHAR2(10);
    v_sql CLOB;
    v_exists NUMBER;
BEGIN
    DBMS_OUTPUT.PUT_LINE('Iniciando replicação de dados...');

    -- 1. Replicar Módulos e Aplicações para TODAS as lojas (2 a 50)
    FOR i IN 2..50 LOOP
        -- Pular lojas excluídas (mesma lógica da migration)
        IF i IN (4, 22, 34, 38, 43, 45) THEN
            CONTINUE;
        END IF;

        v_suffix := 'LOJA' || LPAD(i, 2, '0');
        
        DBMS_OUTPUT.PUT_LINE('Processando ' || v_suffix);

        -- A. Módulos
        -- Verifica se tabela existe antes de tentar inserir
        SELECT COUNT(*) INTO v_exists FROM user_tables WHERE table_name = 'TIRF_MODULOS_' || v_suffix;
        IF v_exists > 0 THEN
            BEGIN
                v_sql := 'INSERT INTO TIRF_MODULOS_' || v_suffix || ' (ID_MODULO, NOME_MODULO, ICONE)
                          SELECT ID_MODULO, NOME_MODULO, ICONE FROM TIRF_MODULOS m
                          WHERE NOT EXISTS (SELECT 1 FROM TIRF_MODULOS_' || v_suffix || ' tm WHERE tm.ID_MODULO = m.ID_MODULO)';
                EXECUTE IMMEDIATE v_sql;
                DBMS_OUTPUT.PUT_LINE('  - Módulos replicados.');
            EXCEPTION
                WHEN OTHERS THEN
                    DBMS_OUTPUT.PUT_LINE('  - Erro ao replicar módulos: ' || SQLERRM);
            END;
        END IF;

        -- B. Aplicações
        SELECT COUNT(*) INTO v_exists FROM user_tables WHERE table_name = 'TIRF_APLICACOES_' || v_suffix;
        IF v_exists > 0 THEN
            BEGIN
                v_sql := 'INSERT INTO TIRF_APLICACOES_' || v_suffix || ' (ID_APLICACAO, ID_MODULO, NOME_APLICACAO)
                          SELECT ID_APLICACAO, ID_MODULO, NOME_APLICACAO FROM TIRF_APLICACOES a
                          WHERE NOT EXISTS (SELECT 1 FROM TIRF_APLICACOES_' || v_suffix || ' ta WHERE ta.ID_APLICACAO = a.ID_APLICACAO)';
                EXECUTE IMMEDIATE v_sql;
                DBMS_OUTPUT.PUT_LINE('  - Aplicações replicadas.');
            EXCEPTION
                WHEN OTHERS THEN
                    DBMS_OUTPUT.PUT_LINE('  - Erro ao replicar aplicações: ' || SQLERRM);
            END;
        END IF;

    END LOOP;

    -- 2. Copiar Manuais Existentes para a Loja 33
    SELECT COUNT(*) INTO v_exists FROM user_tables WHERE table_name = 'TIRF_MANUAIS_LOJA33';
    IF v_exists > 0 THEN
        DBMS_OUTPUT.PUT_LINE('Copiando manuais para Loja 33...');
        BEGIN
            -- Copia mantendo IDs para integridade, mas apenas se não existir conflito
            EXECUTE IMMEDIATE 'INSERT INTO TIRF_MANUAIS_LOJA33 (
                                   ID_MANUAL, ID_APLICACAO, ID_AUTOR, ID_ULTIMO_ACESSO, ID_ULTIMO_EDITOR, 
                                   TITULO, DESCRICAO_CARD, CONTEUDO_HTML, QTD_VIEWS, STATUS, 
                                   DATA_CRIACAO, DATA_ATUALIZACAO
                               )
                               SELECT 
                                   ID_MANUAL, ID_APLICACAO, ID_AUTOR, ID_ULTIMO_ACESSO, ID_ULTIMO_EDITOR, 
                                   TITULO, DESCRICAO_CARD, CONTEUDO_HTML, QTD_VIEWS, STATUS, 
                                   DATA_CRIACAO, DATA_ATUALIZACAO
                               FROM TIRF_MANUAIS m
                               WHERE NOT EXISTS (SELECT 1 FROM TIRF_MANUAIS_LOJA33 tm WHERE tm.ID_MANUAL = m.ID_MANUAL)';
            
            DBMS_OUTPUT.PUT_LINE('Manuais copiados com sucesso para Loja 33.');
        EXCEPTION
            WHEN OTHERS THEN
                DBMS_OUTPUT.PUT_LINE('Erro ao copiar manuais para Loja 33: ' || SQLERRM);
        END;
    ELSE
        DBMS_OUTPUT.PUT_LINE('Tabela TIRF_MANUAIS_LOJA33 não encontrada. Execute a migração de lojas primeiro.');
    END IF;

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Processo concluído.');
END;
/
