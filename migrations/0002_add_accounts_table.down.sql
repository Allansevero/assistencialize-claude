-- Remover a ligação entre as tabelas
ALTER TABLE instances DROP CONSTRAINT fk_accounts;
ALTER TABLE instances DROP COLUMN account_id;

-- Renomear a tabela 'instances' de volta para 'users'
ALTER TABLE instances RENAME TO users;

-- Eliminar a tabela de contas
DROP TABLE accounts;