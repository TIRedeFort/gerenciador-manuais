-- Script para adicionar campo de primeiro login
-- Execute no Oracle

ALTER TABLE TIRF_USUARIOS ADD PRIMEIRO_LOGIN NUMBER(1) DEFAULT 1;

-- Novos usuários terão PRIMEIRO_LOGIN = 1 (precisam trocar senha)
-- Apenas o Administrador TI não precisa trocar
UPDATE TIRF_USUARIOS SET PRIMEIRO_LOGIN = 0 WHERE LOGIN = 'ti.cd@rfcentral.com.br';
COMMIT;
