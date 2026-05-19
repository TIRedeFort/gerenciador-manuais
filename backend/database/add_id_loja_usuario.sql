-- Migration: Adicionar campo ID_LOJA à tabela TIRF_USUARIOS
-- Este script verifica se a coluna já existe antes de adicioná-la

DECLARE
    v_count NUMBER;
BEGIN
    -- Verificar se a coluna ID_LOJA já existe
    SELECT COUNT(*) INTO v_count 
    FROM user_tab_columns 
    WHERE table_name = 'TIRF_USUARIOS' AND column_name = 'ID_LOJA';
    
    IF v_count = 0 THEN
        -- Adicionar coluna ID_LOJA
        EXECUTE IMMEDIATE 'ALTER TABLE TIRF_USUARIOS ADD (ID_LOJA NUMBER)';
        DBMS_OUTPUT.PUT_LINE('✅ Coluna ID_LOJA adicionada à tabela TIRF_USUARIOS');
        
        -- Adicionar índice para performance
        EXECUTE IMMEDIATE 'CREATE INDEX IDX_USUARIOS_ID_LOJA ON TIRF_USUARIOS(ID_LOJA)';
        DBMS_OUTPUT.PUT_LINE('✅ Índice IDX_USUARIOS_ID_LOJA criado');
    ELSE
        DBMS_OUTPUT.PUT_LINE('ℹ️ Coluna ID_LOJA já existe');
    END IF;
    
    -- Verificar se a FK já existe
    SELECT COUNT(*) INTO v_count 
    FROM user_constraints 
    WHERE table_name = 'TIRF_USUARIOS' AND constraint_name = 'FK_USUARIO_LOJA';
    
    IF v_count = 0 THEN
        -- Adicionar Foreign Key
        EXECUTE IMMEDIATE 'ALTER TABLE TIRF_USUARIOS ADD CONSTRAINT FK_USUARIO_LOJA FOREIGN KEY (ID_LOJA) REFERENCES TIRF_LOJAS(ID_LOJA)';
        DBMS_OUTPUT.PUT_LINE('✅ Foreign Key FK_USUARIO_LOJA adicionada');
    ELSE
        DBMS_OUTPUT.PUT_LINE('ℹ️ Foreign Key FK_USUARIO_LOJA já existe');
    END IF;
    
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('✅ Migration concluída com sucesso!');
    
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('❌ Erro: ' || SQLERRM);
        ROLLBACK;
END;
/
