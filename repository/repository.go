package repository

import (
	"database/sql"
	"time"

	"github.com/jmoiron/sqlx"
)

// Repository é a interface que define as operações da base de dados.
type Repository struct {
	db *sqlx.DB
}

// NewRepository cria uma nova instância do Repository.
func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

// User representa uma instância do WhatsApp na base de dados.
type User struct {
	ID         int          `db:"id" json:"id"`
	Name       string       `db:"name" json:"name"`
	Token      string       `db:"token" json:"token"`
	Webhook    string       `db:"webhook" json:"webhook"`
	Jid        string       `db:"jid" json:"jid"`
	Qrcode     string       `db:"qrcode" json:"qrcode"`
	Connected  sql.NullBool `db:"connected" json:"connected"`
	Expiration sql.NullInt64 `db:"expiration" json:"expiration"`
	Events     string       `db:"events" json:"events"`
}

// Account representa uma conta de cliente (email/senha).
type Account struct {
	ID           int       `db:"id"`
	Email        string    `db:"email"`
	PasswordHash string    `db:"password_hash"`
	CreatedAt    time.Time `db:"created_at"`
}

// CreateAccount insere uma nova conta na base de dados.
func (r *Repository) CreateAccount(email, passwordHash string) (int, error) {
	query := `INSERT INTO accounts (email, password_hash) VALUES ($1, $2) RETURNING id`
	var accountID int
	err := r.db.QueryRow(query, email, passwordHash).Scan(&accountID)
	if err != nil {
		return 0, err
	}
	return accountID, nil
}

// GetAccountByEmail busca uma conta pelo seu endereço de e-mail.
func (r *Repository) GetAccountByEmail(email string) (*Account, error) {
	var acc Account
	query := `SELECT id, email, password_hash, created_at FROM accounts WHERE email=$1`
	err := r.db.Get(&acc, query, email)
	if err != nil {
		return nil, err
	}
	return &acc, nil
}

// GetInstancesByAccountID retorna todas as instâncias associadas a uma conta específica.
func (r *Repository) GetInstancesByAccountID(accountID int) ([]User, error) {
	var users []User
	query := "SELECT id, name, token, webhook, jid, qrcode, connected, expiration, events FROM instances WHERE account_id=$1"
	err := r.db.Select(&users, query, accountID)
	if err != nil {
		return nil, err
	}
	return users, nil
}

// GetInstanceByIDAndAccountID busca uma instância específica, mas apenas se pertencer à conta fornecida.
func (r *Repository) GetInstanceByIDAndAccountID(instanceID, accountID int) (*User, error) {
	var user User
	query := "SELECT id, name, token, webhook, jid, qrcode, connected, expiration, events FROM instances WHERE id=$1 AND account_id=$2"
	err := r.db.Get(&user, query, instanceID, accountID)
	if err != nil {
		return nil, err // Retorna erro se não encontrar ou se houver outro erro
	}
	return &user, nil
}