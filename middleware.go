package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// jwtAuthentication é o nosso middleware para proteger rotas
func jwtAuthentication(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Obter o cabeçalho de autorização
        authHeader := r.Header.Get("Authorization")
        if authHeader == "" {
            RespondWithError(w, http.StatusUnauthorized, "Cabeçalho de autorização em falta")
            return
        }

        // O cabeçalho deve ter o formato "Bearer <token>"
        splitToken := strings.Split(authHeader, " ")
        if len(splitToken) != 2 || splitToken[0] != "Bearer" {
            RespondWithError(w, http.StatusUnauthorized, "Formato do cabeçalho de autorização inválido")
            return
        }

        tokenString := splitToken[1]
        jwtKey := []byte(os.Getenv("JWT_SECRET"))

        // Validar o token
        token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
            return jwtKey, nil
        })

        if err != nil || !token.Valid {
            RespondWithError(w, http.StatusUnauthorized, "Token inválido")
            return
        }

        // Extrair os dados (claims) do token
        claims, ok := token.Claims.(jwt.MapClaims)
        if !ok {
            RespondWithError(w, http.StatusUnauthorized, "Token inválido")
            return
        }

        // Extrair o ID da conta e convertê-lo para um inteiro
        accountIDFloat, ok := claims["account_id"].(float64)
        if !ok {
            fmt.Printf("Erro: account_id não encontrado no token ou tipo incorreto. Claims: %v\n", claims)
            RespondWithError(w, http.StatusUnauthorized, "Dados do token inválidos")
            return
        }
        accountID := int(accountIDFloat)
        
        fmt.Printf("Middleware JWT: account_id extraído: %d\n", accountID)

        // Adicionar o ID da conta ao contexto do pedido para uso posterior
        ctx := context.WithValue(r.Context(), "account_id", accountID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
