-- Script de Correção: Adicionar coluna ID_LOJA e FK em TIRF_USUARIOS
-- Motivo: Estas instruções foram sobrescritas acidentalmente na migração anterior.

DECLARE
  v_count NUMBER;
  v_sql VARCHAR2(4000);
BEGIN
    -- 1. Verificar/Adicionar coluna ID_LOJA
    SELECT count(*) INTO v_count FROM user_tab_columns 
    WHERE table_name = 'TIRF_USUARIOS' AND column_name = 'ID_LOJA';
    
    IF v_count = 0 THEN
        DBMS_OUTPUT.PUT_LINE('Adicionando coluna ID_LOJA...');
        EXECUTE IMMEDIATE 'ALTER TABLE TIRF_USUARIOS ADD ID_LOJA NUMBER';
        
        -- Adicionar índice para performance
        EXECUTE IMMEDIATE 'CREATE INDEX IDX_USUARIOS_LOJA ON TIRF_USUARIOS(ID_LOJA)';
    ELSE
        DBMS_OUTPUT.PUT_LINE('Coluna ID_LOJA já existe.');
    END IF;

    -- 2. Verificar/Adicionar Foreign Key FK_USUARIO_LOJA
    SELECT count(*) INTO v_count FROM user_constraints 
    WHERE table_name = 'TIRF_USUARIOS' AND constraint_name = 'FK_USUARIO_LOJA';
    
    IF v_count = 0 THEN
        DBMS_OUTPUT.PUT_LINE('Adicionando FK_USUARIO_LOJA...');
        EXECUTE IMMEDIATE 'ALTER TABLE TIRF_USUARIOS ADD CONSTRAINT FK_USUARIO_LOJA FOREIGN KEY (ID_LOJA) REFERENCES TIRF_LOJAS(ID_LOJA)';
    ELSE
        DBMS_OUTPUT.PUT_LINE('FK_USUARIO_LOJA já existe.');
    END IF;
    
    COMMIT;
END;
/
