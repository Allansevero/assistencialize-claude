-- Criar a nova tabela para guardar as contas dos clientes (email/senha)
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Renomear a tabela 'users' para 'instances' para ser mais claro
-- A tabela agora representa instâncias/sessões do WhatsApp, não utilizadores do sistema
ALTER TABLE users RENAME TO instances;

-- Adicionar uma coluna na tabela de instâncias para a ligar a uma conta
-- ON DELETE CASCADE garante que, se uma conta for eliminada, todas as suas instâncias também o serão.
ALTER TABLE instances ADD COLUMN account_id INTEGER;
ALTER TABLE instances ADD CONSTRAINT fk_accounts FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;