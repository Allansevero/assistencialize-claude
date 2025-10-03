package main

import (
	"net/http"
	"os"
	"path/filepath"
)

func (s *server) routes() {
	ex, err := os.Executable()
	if err != nil {
		panic(err)
	}
	exPath := filepath.Dir(ex)

    // --- Rotas Públicas ---
    // Rotas de Autenticação (não precisam de token)
    authRouter := s.router.PathPrefix("/auth").Subrouter()
    authRouter.HandleFunc("/register", s.RegisterAccount).Methods("POST")
    authRouter.HandleFunc("/login", s.LoginAccount).Methods("POST")

    // Rota pública para validação de token de admin (se necessário)
    s.router.HandleFunc("/api/validate-token", s.ValidateToken).Methods("GET")


    // --- Rotas Protegidas por Admin Token ---
    adminRouter := s.router.PathPrefix("/admin").Subrouter()
    adminRouter.Use(s.authadmin)
    // O resto das rotas de admin pode ficar
    adminRouter.HandleFunc("/users/{id}", s.EditUser).Methods("PUT")
    adminRouter.HandleFunc("/users/{id}", s.DeleteUser).Methods("DELETE")


    // --- Rotas de API Protegidas por JWT de Utilizador ---
    // Todas as rotas abaixo exigirão um token JWT de um utilizador autenticado
    apiRouter := s.router.PathPrefix("/api/v1").Subrouter()
    apiRouter.Use(jwtAuthentication)

    // Rotas de instâncias
    apiRouter.HandleFunc("/instances", s.ListUsers).Methods("GET")
    apiRouter.HandleFunc("/instances", s.AddUser).Methods("POST")

    apiRouter.HandleFunc("/session/connect", s.Connect()).Methods("POST")
    apiRouter.HandleFunc("/session/disconnect", s.Disconnect()).Methods("POST")
    apiRouter.HandleFunc("/session/logout", s.Logout()).Methods("POST")
    apiRouter.HandleFunc("/session/status", s.GetStatus()).Methods("GET")
	apiRouter.HandleFunc("/session/qr", s.GetQR()).Methods("GET")
	apiRouter.HandleFunc("/session/pairphone", s.PairPhone()).Methods("POST")
	apiRouter.HandleFunc("/instances/{id:[0-9]+}/avatar", s.GetInstanceAvatar).Methods("GET")

	// Endpoints de contatos e grupos
	apiRouter.HandleFunc("/user/contacts", s.GetContacts()).Methods("GET")
	apiRouter.HandleFunc("/group/list", s.GetGroups()).Methods("GET")

	apiRouter.HandleFunc("/webhook", s.SetWebhook()).Methods("POST")
    apiRouter.HandleFunc("/webhook", s.GetWebhook()).Methods("GET")
    apiRouter.HandleFunc("/webhook", s.DeleteWebhook()).Methods("DELETE")
    apiRouter.HandleFunc("/webhook/update", s.UpdateWebhook()).Methods("PUT")
    apiRouter.HandleFunc("/session/proxy", s.SetProxy()).Methods("POST")

    apiRouter.HandleFunc("/chat/send/text", s.SendMessage()).Methods("POST")
    apiRouter.HandleFunc("/chat/send/image", s.SendImage()).Methods("POST")
    // Adicione aqui o resto das suas rotas de API, usando apiRouter.HandleFunc(...)


	// Rota para arquivos estáticos deve ser a última
	s.router.PathPrefix("/").Handler(http.FileServer(http.Dir(exPath + "/static/")))
}