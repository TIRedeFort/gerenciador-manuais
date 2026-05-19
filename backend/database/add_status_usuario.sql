-- Script para adicionar status de usuário (ativo/inativo)
-- Execute no Oracle

ALTER TABLE TIRF_USUARIOS ADD STATUS VARCHAR2(20) DEFAULT 'ATIVO' CHECK (STATUS IN ('ATIVO', 'INATIVO'));

-- Admin fica ativo
UPDATE TIRF_USUARIOS SET STATUS = 'ATIVO';
COMMIT;
