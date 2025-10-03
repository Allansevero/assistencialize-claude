package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/mux"
	"github.com/lib/pq"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/types"
	"golang.org/x/crypto/bcrypt"
	"wuzapi/repository"
)

type Values struct {
	m map[string]string
}

func (v Values) Get(key string) string {
	return v.m[key]
}

type User struct {
	ID        int    `db:"id" json:"id"`
	Name      string `db:"name" json:"name"`
	Token     string `db:"token" json:"token"`
	Webhook   string `db:"webhook" json:"webhook"`
	Jid       string `db:"jid" json:"jid"`
	Qrcode    string `db:"qrcode" json:"qrcode"`
	Connected int    `db:"connected" json:"connected"`
	Expiration int   `db:"expiration" json:"expiration"`
	Events    string `db:"events" json:"events"`
}

// --- FUNÇÕES DE AUTENTICAÇÃO ---

func (s *server) authadmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			RespondWithError(w, http.StatusUnauthorized, "Token não fornecido")
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		if token != *adminToken {
			RespondWithError(w, http.StatusUnauthorized, "Token inválido")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// --- HANDLERS DE AUTENTICAÇÃO DE CONTA ---

func (s *server) RegisterAccount(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Payload inválido")
				return
			}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(payload.Password), bcrypt.DefaultCost)
			if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Falha ao encriptar a palavra-passe")
				return
			}

	_, err = s.repository.CreateAccount(payload.Email, string(hashedPassword))
		if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			RespondWithError(w, http.StatusConflict, "O e-mail já está em uso")
			return
		}
		RespondWithError(w, http.StatusInternalServerError, "Não foi possível criar a conta")
			return
	}

	RespondWithJSON(w, http.StatusCreated, map[string]string{"message": "Conta criada com sucesso"})
}

func (s *server) LoginAccount(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Payload inválido")
			return
		}

	acc, err := s.repository.GetAccountByEmail(payload.Email)
				if err != nil {
		RespondWithError(w, http.StatusUnauthorized, "Credenciais inválidas")
				return
	}

	err = bcrypt.CompareHashAndPassword([]byte(acc.PasswordHash), []byte(payload.Password))
		if err != nil {
		RespondWithError(w, http.StatusUnauthorized, "Credenciais inválidas")
			return
		}

	// Criar o token JWT
	jwtKey := []byte(os.Getenv("JWT_SECRET"))
	claims := jwt.MapClaims{
		"account_id": acc.ID,
		"email":      acc.Email,
		"exp":        time.Now().Add(time.Hour * 72).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
		if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Falha ao gerar o token")
			return
		}

	RespondWithJSON(w, http.StatusOK, map[string]string{"token": tokenString})
}

// --- FUNÇÕES DE RESPOSTA (AS NOVAS) ---

func RespondWithError(w http.ResponseWriter, code int, message string) {
	RespondWithJSON(w, code, map[string]string{"error": message})
}

func RespondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, err := json.Marshal(payload)
		if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Erro interno ao gerar JSON"))
			return
		}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}

// --- OUTROS HANDLERS (EXEMPLO DE CORREÇÃO) ---

func (s *server) GetStatus() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		accountID := r.Context().Value("account_id")
		if accountID == nil {
			RespondWithError(w, http.StatusUnauthorized, "Token inválido")
			return
		}

		// Obter o token da instância do header
		instanceToken := r.Header.Get("token")
		if instanceToken == "" {
			RespondWithError(w, http.StatusBadRequest, "Token da instância não fornecido")
			return
		}

		// Buscar a instância pelo token e account_id
		var instance repository.User
		err := s.db.Get(&instance, "SELECT id FROM instances WHERE token=$1 AND account_id=$2", instanceToken, accountID.(int))
		if err != nil {
			RespondWithError(w, http.StatusNotFound, "Instância não encontrada")
			return
		}

		userID := instance.ID

		// Se o cliente não existe, inicializa ele
		if clientPointer[userID] == nil {
			fmt.Printf("ClientPointer[%d] é nil para Status, inicializando cliente...\n", userID)
			
			// Buscar informações completas da instância
			var fullInstance repository.User
			err = s.db.Get(&fullInstance, "SELECT id, token, events FROM instances WHERE id=$1", userID)
			if err != nil {
				fmt.Printf("Erro ao buscar instância completa para Status: %v\n", err)
				RespondWithError(w, http.StatusInternalServerError, "Erro ao inicializar cliente")
				return
			}
			
			// Inicializar o cliente WhatsApp
			go s.startClient(fullInstance.ID, "", fullInstance.Token, []string{fullInstance.Events})
			
			// Aguardar um pouco para o cliente ser inicializado
			time.Sleep(2 * time.Second)
			
			// Verificar novamente se o cliente foi inicializado
			if clientPointer[userID] == nil {
				fmt.Printf("Falha ao inicializar ClientPointer[%d] para Status\n", userID)
				RespondWithError(w, http.StatusInternalServerError, "Falha ao inicializar cliente WhatsApp")
				return
			}
		}

		isConnected := clientPointer[userID].IsConnected()
		isLoggedIn := clientPointer[userID].IsLoggedIn()

		response := map[string]interface{}{
			"Connected": isConnected,
			"LoggedIn":  isLoggedIn,
		}

		RespondWithJSON(w, http.StatusOK, response)
	}
}

// GetInstanceAvatar busca o avatar de uma instância e o transmite como imagem.
func (s *server) GetInstanceAvatar(w http.ResponseWriter, r *http.Request) {
	// Obter o account_id do utilizador autenticado a partir do contexto do JWT
	accountID, ok := r.Context().Value("account_id").(int)
	if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Não foi possível identificar a conta do utilizador")
		return
	}

	// Obter o ID da instância a partir do URL (ex: /instances/5/avatar)
	vars := mux.Vars(r)
	instanceID, err := strconv.Atoi(vars["id"])
	if err != nil {
		RespondWithError(w, http.StatusBadRequest, "ID da instância inválido")
		return
	}

	// Usar a nossa função de segurança para verificar se o utilizador é dono da instância
	instance, err := s.repository.GetInstanceByIDAndAccountID(instanceID, accountID)
	if err != nil {
		RespondWithError(w, http.StatusNotFound, "Instância não encontrada ou não pertence a si")
		return
	}

	// Verificar se a instância tem um JID (se está ou já esteve conectada)
	if instance.Jid == "" {
		http.NotFound(w, r)
		return
	}

	// Verificar se o cliente WhatsApp está disponível
	if clientPointer[instance.ID] == nil {
		http.NotFound(w, r)
		return
	}

	// Converter string JID para types.JID
	jid, err := types.ParseJID(instance.Jid)
	if err != nil {
		http.Error(w, "JID da instância é inválido", http.StatusInternalServerError)
		return
	}

	// Buscar a informação da foto de perfil
	pic, err := clientPointer[instance.ID].GetProfilePictureInfo(jid, &whatsmeow.GetProfilePictureParams{
		Preview: false,
	})

	if err != nil || pic == nil || pic.URL == "" {
		// Se não encontrar, retorna 404
		http.NotFound(w, r)
		return
	}

	// Descarregar a imagem do URL fornecido pelo WhatsApp
	resp, err := http.Get(pic.URL)
	if err != nil {
		http.Error(w, "Não foi possível descarregar o avatar", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Definir o tipo de conteúdo e transmitir a imagem
	w.Header().Set("Content-Type", "image/jpeg")
	w.Header().Set("Cache-Control", "public, max-age=3600") // Cache de 1 hora
	w.WriteHeader(http.StatusOK)
	io.Copy(w, resp.Body)
}

func (s *server) GetContacts() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		accountID := r.Context().Value("account_id")
		if accountID == nil {
			RespondWithError(w, http.StatusUnauthorized, "Token inválido")
			return
		}

		// Obter o token da instância do header
		instanceToken := r.Header.Get("token")
		if instanceToken == "" {
			RespondWithError(w, http.StatusBadRequest, "Token da instância não fornecido")
			return
		}

		// Buscar a instância pelo token e account_id
		var instance repository.User
		err := s.db.Get(&instance, "SELECT id FROM instances WHERE token=$1 AND account_id=$2", instanceToken, accountID.(int))
		if err != nil {
			RespondWithError(w, http.StatusNotFound, "Instância não encontrada")
			return
		}

		userID := instance.ID

		// Se o cliente não existe, inicializa ele
		if clientPointer[userID] == nil {
			fmt.Printf("ClientPointer[%d] é nil para Contatos, inicializando cliente...\n", userID)
			
			// Buscar informações completas da instância
			var fullInstance repository.User
			err = s.db.Get(&fullInstance, "SELECT id, token, events FROM instances WHERE id=$1", userID)
			if err != nil {
				fmt.Printf("Erro ao buscar instância completa para Contatos: %v\n", err)
				RespondWithError(w, http.StatusInternalServerError, "Erro ao inicializar cliente")
				return
			}
			
			// Inicializar o cliente WhatsApp
			go s.startClient(fullInstance.ID, "", fullInstance.Token, []string{fullInstance.Events})
			
			// Aguardar um pouco para o cliente ser inicializado
			time.Sleep(2 * time.Second)
			
			// Verificar novamente se o cliente foi inicializado
			if clientPointer[userID] == nil {
				fmt.Printf("Falha ao inicializar ClientPointer[%d] para Contatos\n", userID)
				RespondWithError(w, http.StatusInternalServerError, "Falha ao inicializar cliente WhatsApp")
				return
			}
		}

		// Verificar se está conectado
		if !clientPointer[userID].IsConnected() {
			RespondWithError(w, http.StatusBadRequest, "Instância não está conectada")
			return
		}

		// Obter contatos do WhatsApp usando Store
		contacts, err := clientPointer[userID].Store.Contacts.GetAllContacts(context.Background())
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Erro ao buscar contatos")
			return
		}
		
		// Formatar contatos para o formato esperado
		formattedContacts := make(map[string]interface{})
		for jid, contact := range contacts {
			formattedContacts[jid.String()] = map[string]interface{}{
				"BusinessName": contact.BusinessName,
				"FirstName":    contact.FirstName,
				"Found":        true, // Se está no store, foi encontrado
				"FullName":     contact.FullName,
				"PushName":     contact.PushName,
			}
		}

		RespondWithJSON(w, http.StatusOK, map[string]interface{}{
			"code": 200,
			"data": formattedContacts,
		})
	}
}

func (s *server) GetGroups() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		accountID := r.Context().Value("account_id")
		if accountID == nil {
			RespondWithError(w, http.StatusUnauthorized, "Token inválido")
			return
		}

		// Obter o token da instância do header
		instanceToken := r.Header.Get("token")
		if instanceToken == "" {
			RespondWithError(w, http.StatusBadRequest, "Token da instância não fornecido")
			return
		}

		// Buscar a instância pelo token e account_id
		var instance repository.User
		err := s.db.Get(&instance, "SELECT id FROM instances WHERE token=$1 AND account_id=$2", instanceToken, accountID.(int))
		if err != nil {
			RespondWithError(w, http.StatusNotFound, "Instância não encontrada")
			return
		}

		userID := instance.ID

		// Se o cliente não existe, inicializa ele
		if clientPointer[userID] == nil {
			fmt.Printf("ClientPointer[%d] é nil para Grupos, inicializando cliente...\n", userID)
			
			// Buscar informações completas da instância
			var fullInstance repository.User
			err = s.db.Get(&fullInstance, "SELECT id, token, events FROM instances WHERE id=$1", userID)
			if err != nil {
				fmt.Printf("Erro ao buscar instância completa para Grupos: %v\n", err)
				RespondWithError(w, http.StatusInternalServerError, "Erro ao inicializar cliente")
				return
			}
			
			// Inicializar o cliente WhatsApp
			go s.startClient(fullInstance.ID, "", fullInstance.Token, []string{fullInstance.Events})
			
			// Aguardar um pouco para o cliente ser inicializado
			time.Sleep(2 * time.Second)
			
			// Verificar novamente se o cliente foi inicializado
			if clientPointer[userID] == nil {
				fmt.Printf("Falha ao inicializar ClientPointer[%d] para Grupos\n", userID)
				RespondWithError(w, http.StatusInternalServerError, "Falha ao inicializar cliente WhatsApp")
				return
			}
		}

		// Verificar se está conectado
		if !clientPointer[userID].IsConnected() {
			RespondWithError(w, http.StatusBadRequest, "Instância não está conectada")
			return
		}

		// Obter grupos do WhatsApp usando Store
		groups, err := clientPointer[userID].GetJoinedGroups(context.Background())
		if err != nil {
			RespondWithError(w, http.StatusInternalServerError, "Erro ao buscar grupos")
			return
		}

		// Formatar grupos para o formato esperado
		var formattedGroups []map[string]interface{}
		for _, group := range groups {
			// Obter participantes do grupo
			participants := make([]map[string]interface{}, 0)
			for _, participant := range group.Participants {
				participants = append(participants, map[string]interface{}{
					"JID":          participant.JID.String(),
					"IsAdmin":      participant.IsAdmin,
					"IsSuperAdmin": participant.IsSuperAdmin,
				})
			}

			formattedGroups = append(formattedGroups, map[string]interface{}{
				"JID":          group.JID.String(),
				"Name":         group.Name,
				"OwnerJID":     group.OwnerJID.String(),
				"Participants": participants,
			})
		}

		RespondWithJSON(w, http.StatusOK, map[string]interface{}{
			"code": 200,
			"data": map[string]interface{}{
				"Groups": formattedGroups,
			},
			"success": true,
		})
	}
}

// --- HANDLERS ADMIN ---

func (s *server) ValidateToken(w http.ResponseWriter, r *http.Request) {
	RespondWithJSON(w, http.StatusOK, map[string]bool{"valid": true})
}

// ListUsers foi refatorado para getInstances e agora é multi-utilizador
func (s *server) ListUsers(w http.ResponseWriter, r *http.Request) {
	// ADICIONADO: Verificação de segurança para depuração
	if s.repository == nil {
		RespondWithError(w, http.StatusInternalServerError, "Erro crítico: O repositório não foi inicializado no servidor.")
			return
		}

	accountID, ok := r.Context().Value("account_id").(int)
		if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Não foi possível identificar a conta do utilizador")
			return
		}

	// Log para debug
	fmt.Printf("Buscando instâncias para account_id: %d\n", accountID)
	
	instances, err := s.repository.GetInstancesByAccountID(accountID)
	if err != nil {
		// Adicionado log para ver o erro da base de dados no terminal
		fmt.Printf("Erro ao buscar instâncias no repositório: %v\n", err)
		fmt.Printf("Tipo do erro: %T\n", err)
		RespondWithError(w, http.StatusInternalServerError, "Erro ao buscar instâncias na base de dados")
		return
	}
	
	fmt.Printf("Instâncias encontradas: %d\n", len(instances))

	if instances == nil {
		instances = []repository.User{}
	}

	// Converter para formato compatível com frontend
	var frontendInstances []map[string]interface{}
	for _, instance := range instances {
		frontendInstance := map[string]interface{}{
			"id":         instance.ID,
			"name":       instance.Name,
			"token":      instance.Token,
			"webhook":    instance.Webhook,
			"jid":        instance.Jid,
			"qrcode":     instance.Qrcode,
			"connected":  instance.Connected.Valid && instance.Connected.Bool,
			"expiration": instance.Expiration.Int64,
			"events":     instance.Events,
		}
		frontendInstances = append(frontendInstances, frontendInstance)
	}

	RespondWithJSON(w, http.StatusOK, map[string]interface{}{"instances": frontendInstances})
}

// initializeExistingInstances inicializa clientes WhatsApp para instâncias existentes
func (s *server) initializeExistingInstances() {
	fmt.Println("Inicializando instâncias existentes...")
	
	var instances []repository.User
	err := s.db.Select(&instances, "SELECT id, token, events FROM instances")
	if err != nil {
		fmt.Printf("Erro ao buscar instâncias existentes: %v\n", err)
		return
	}

	initializedCount := 0
	for _, instance := range instances {
		if clientPointer[instance.ID] == nil {
			fmt.Printf("Inicializando cliente para instância ID: %d\n", instance.ID)
			go s.startClient(instance.ID, "", instance.Token, []string{instance.Events})
			initializedCount++
		} else {
			fmt.Printf("Cliente já existe para instância ID: %d\n", instance.ID)
		}
	}
	
	fmt.Printf("Inicialização concluída. %d instâncias processadas, %d novas inicializadas.\n", len(instances), initializedCount)
}

func (s *server) AddUser(w http.ResponseWriter, r *http.Request) {
	// Obter account_id do contexto (injetado pelo middleware JWT)
	accountID, ok := r.Context().Value("account_id").(int)
		if !ok {
		RespondWithError(w, http.StatusUnauthorized, "Não foi possível identificar a conta do utilizador")
			return
		}

	var user struct {
		Name    string `json:"name"`
		Token   string `json:"token"`
		Webhook string `json:"webhook"`
		Events  string `json:"events"`
	}
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Payload incompleto")
		return
	}

	// Adicionar a nova instância à base de dados, associando-a à conta
	query := "INSERT INTO instances (name, token, webhook, events, account_id) VALUES ($1, $2, $3, $4, $5) RETURNING id"
	var id int
	err := s.db.QueryRow(query, user.Name, user.Token, user.Webhook, user.Events, accountID).Scan(&id)
	if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Problema ao aceder à BD")
		return
	}

	// Inicializar o cliente WhatsApp para a nova instância
	fmt.Printf("Inicializando cliente WhatsApp para instância ID: %d\n", id)
	go s.startClient(id, "", user.Token, []string{"All"})

	RespondWithJSON(w, http.StatusCreated, map[string]interface{}{"id": id})
}

func (s *server) EditUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID := vars["id"]

	var user struct {
		Name       string `json:"name"`
		Token      string `json:"token"`
		Webhook    string `json:"webhook"`
		Expiration int    `json:"expiration"`
		Events     string `json:"events"`
		ProxyURL   string `json:"proxy_url"`
	}

	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		RespondWithError(w, http.StatusBadRequest, "Payload inválido")
		return
	}

	var count int
	err := s.db.Get(&count, "SELECT COUNT(*) FROM instances WHERE token = $1 AND id != $2", user.Token, userID)
		if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Erro ao verificar token")
			return
		}
	if count > 0 {
		RespondWithError(w, http.StatusConflict, "Token já existe")
			return
		}

	query := "UPDATE instances SET name = $1, token = $2, webhook = $3, expiration = $4, events = $5, proxy_url = $6 WHERE id = $7"
	result, err := s.db.Exec(query, user.Name, user.Token, user.Webhook, user.Expiration, user.Events, user.ProxyURL, userID)
		if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Erro ao atualizar utilizador")
			return
		}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		RespondWithError(w, http.StatusNotFound, "Utilizador não encontrado")
		return
	}

	RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Utilizador atualizado com sucesso"})
}

func (s *server) DeleteUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userID := vars["id"]

	result, err := s.db.Exec("DELETE FROM instances WHERE id = $1", userID)
		if err != nil {
		RespondWithError(w, http.StatusInternalServerError, "Erro ao eliminar utilizador")
			return
		}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		RespondWithError(w, http.StatusNotFound, "Utilizador não encontrado")
			return
		}

	RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Utilizador eliminado com sucesso"})
}

// --- HANDLERS DE SESSÃO ---

func (s *server) Connect() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		accountID := r.Context().Value("account_id")
		if accountID == nil {
			RespondWithError(w, http.StatusUnauthorized, "Token inválido")
			return
		}

		// Obter o token da instância do header
		instanceToken := r.Header.Get("token")
		if instanceToken == "" {
			RespondWithError(w, http.StatusBadRequest, "Token da instância não fornecido")
			return
		}

		fmt.Printf("Connect: account_id=%d, instance_token=%s\n", accountID.(int), instanceToken)

		// Buscar a instância pelo token e account_id
		var instance repository.User
		err := s.db.Get(&instance, "SELECT id FROM instances WHERE token=$1 AND account_id=$2", instanceToken, accountID.(int))
		if err != nil {
			fmt.Printf("Erro ao buscar instância: %v\n", err)
			RespondWithError(w, http.StatusNotFound, "Instância não encontrada")
			return
		}

		userID := instance.ID

		// Se o cliente não existe, inicializa ele
		if clientPointer[userID] == nil {
			fmt.Printf("ClientPointer[%d] é nil, inicializando cliente...\n", userID)
			
			// Buscar informações completas da instância
			var fullInstance repository.User
			err = s.db.Get(&fullInstance, "SELECT id, token, events FROM instances WHERE id=$1", userID)
			if err != nil {
				fmt.Printf("Erro ao buscar instância completa: %v\n", err)
				RespondWithError(w, http.StatusInternalServerError, "Erro ao inicializar cliente")
				return
			}
			
			// Inicializar o cliente WhatsApp
			go s.startClient(fullInstance.ID, "", fullInstance.Token, []string{fullInstance.Events})
			
			// Aguardar um pouco para o cliente ser inicializado
			time.Sleep(2 * time.Second)
			
			// Verificar novamente se o cliente foi inicializado
			if clientPointer[userID] == nil {
				fmt.Printf("Falha ao inicializar ClientPointer[%d]\n", userID)
				RespondWithError(w, http.StatusInternalServerError, "Falha ao inicializar cliente WhatsApp")
				return
			}
		}

		// Verificar se já está conectado
		if clientPointer[userID].IsConnected() {
			fmt.Printf("Cliente já está conectado para instância ID: %d\n", userID)
			RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Já está conectado"})
			return
		}

		err = clientPointer[userID].Connect()
		if err != nil {
			fmt.Printf("Erro ao conectar: %v\n", err)
			// Se já estiver conectado, não é um erro crítico
			if strings.Contains(err.Error(), "already connected") {
				RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Já está conectado"})
				return
			}
			RespondWithError(w, http.StatusInternalServerError, "Erro ao conectar")
			return
		}

		RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Conectado com sucesso"})
	}
}

func (s *server) Disconnect() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		accountID := r.Context().Value("account_id")
		if accountID == nil {
			RespondWithError(w, http.StatusUnauthorized, "Token inválido")
			return
		}

		userID := accountID.(int)

		if clientPointer[userID] == nil {
			RespondWithError(w, http.StatusInternalServerError, "Sessão não encontrada")
			return
		}

		clientPointer[userID].Disconnect()
		RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Desconectado com sucesso"})
	}
}

func (s *server) Logout() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		accountID := r.Context().Value("account_id")
		if accountID == nil {
			RespondWithError(w, http.StatusUnauthorized, "Token inválido")
			return
		}

		userID := accountID.(int)

		if clientPointer[userID] == nil {
			RespondWithError(w, http.StatusInternalServerError, "Sessão não encontrada")
			return
		}

		clientPointer[userID].Logout(context.Background())
		RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Logout realizado com sucesso"})
	}
}

func (s *server) GetQR() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		accountID := r.Context().Value("account_id")
		if accountID == nil {
			RespondWithError(w, http.StatusUnauthorized, "Token inválido")
			return
		}

		// Obter o token da instância do header
		instanceToken := r.Header.Get("token")
		if instanceToken == "" {
			RespondWithError(w, http.StatusBadRequest, "Token da instância não fornecido")
			return
		}

		fmt.Printf("GetQR: account_id=%d, instance_token=%s\n", accountID.(int), instanceToken)

		// Buscar a instância pelo token e account_id
		var instance repository.User
		err := s.db.Get(&instance, "SELECT id, qrcode FROM instances WHERE token=$1 AND account_id=$2", instanceToken, accountID.(int))
		if err != nil {
			fmt.Printf("Erro ao buscar instância para QR: %v\n", err)
			RespondWithError(w, http.StatusNotFound, "Instância não encontrada")
			return
		}

		userID := instance.ID

		// Se o cliente não existe, inicializa ele
		if clientPointer[userID] == nil {
			fmt.Printf("ClientPointer[%d] é nil para QR, inicializando cliente...\n", userID)
			
			// Buscar informações completas da instância
			var fullInstance repository.User
			err = s.db.Get(&fullInstance, "SELECT id, token, events FROM instances WHERE id=$1", userID)
			if err != nil {
				fmt.Printf("Erro ao buscar instância completa para QR: %v\n", err)
				RespondWithError(w, http.StatusInternalServerError, "Erro ao inicializar cliente")
				return
			}
			
			// Inicializar o cliente WhatsApp
			go s.startClient(fullInstance.ID, "", fullInstance.Token, []string{fullInstance.Events})
			
			// Aguardar um pouco para o cliente ser inicializado
			time.Sleep(2 * time.Second)
			
			// Verificar novamente se o cliente foi inicializado
			if clientPointer[userID] == nil {
				fmt.Printf("Falha ao inicializar ClientPointer[%d] para QR\n", userID)
				RespondWithError(w, http.StatusInternalServerError, "Falha ao inicializar cliente WhatsApp")
				return
			}
		}

		// Buscar QR code da base de dados
		var qrcode string
		err = s.db.Get(&qrcode, "SELECT qrcode FROM instances WHERE id=$1", userID)
		if err != nil {
			fmt.Printf("Erro ao buscar QR code: %v\n", err)
			RespondWithError(w, http.StatusInternalServerError, "Erro ao buscar QR code")
			return
		}

		if qrcode == "" {
			RespondWithJSON(w, http.StatusOK, map[string]interface{}{"QRCode": nil})
			return
		}

		RespondWithJSON(w, http.StatusOK, map[string]interface{}{"QRCode": qrcode})
	}
}

func (s *server) PairPhone() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		accountID := r.Context().Value("account_id")
		if accountID == nil {
			RespondWithError(w, http.StatusUnauthorized, "Token inválido")
			return
		}

		userID := accountID.(int)

		if clientPointer[userID] == nil {
			RespondWithError(w, http.StatusInternalServerError, "Sessão não encontrada")
			return
		}

		// Implementar lógica para emparelhar telefone
		RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Telefone emparelhado"})
	}
}

// --- HANDLERS DE WEBHOOK ---

func (s *server) SetWebhook() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Webhook definido"})
	}
}

func (s *server) GetWebhook() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		RespondWithJSON(w, http.StatusOK, map[string]string{"webhook": "webhook_url"})
	}
}

func (s *server) DeleteWebhook() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Webhook eliminado"})
	}
}

func (s *server) UpdateWebhook() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Webhook atualizado"})
	}
}

func (s *server) SetProxy() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Proxy definido"})
	}
}

// --- HANDLERS DE MENSAGENS ---

func (s *server) SendMessage() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Mensagem enviada"})
	}
}

func (s *server) SendImage() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Imagem enviada"})
	}
}
