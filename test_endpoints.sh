#!/bin/bash

# Script para testar os novos endpoints de contatos e grupos
# Assumindo que você tem uma instância conectada

echo "=== Testando Endpoints de Contatos e Grupos ==="
echo ""

# Variáveis de configuração
BASE_URL="http://localhost:8080"
# Substitua pelo seu token JWT real
JWT_TOKEN="SEU_JWT_TOKEN_AQUI"
# Substitua pelo token da sua instância conectada
INSTANCE_TOKEN="SEU_INSTANCE_TOKEN_AQUI"

echo "1. Testando endpoint de contatos:"
echo "GET $BASE_URL/api/v1/user/contacts"
echo ""

curl -s -X GET \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "token: $INSTANCE_TOKEN" \
  "$BASE_URL/api/v1/user/contacts" | jq '.' 2>/dev/null || echo "Resposta (formato não-JSON):"
curl -s -X GET \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "token: $INSTANCE_TOKEN" \
  "$BASE_URL/api/v1/user/contacts"

echo ""
echo ""

echo "2. Testando endpoint de grupos:"
echo "GET $BASE_URL/api/v1/group/list"
echo ""

curl -s -X GET \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "token: $INSTANCE_TOKEN" \
  "$BASE_URL/api/v1/group/list" | jq '.' 2>/dev/null || echo "Resposta (formato não-JSON):"
curl -s -X GET \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "token: $INSTANCE_TOKEN" \
  "$BASE_URL/api/v1/group/list"

echo ""
echo ""

echo "=== Instruções para uso ==="
echo "1. Faça login na aplicação para obter o JWT_TOKEN"
echo "2. Crie uma instância e conecte ao WhatsApp para obter o INSTANCE_TOKEN"
echo "3. Substitua as variáveis JWT_TOKEN e INSTANCE_TOKEN no script"
echo "4. Execute: bash test_endpoints.sh"
echo ""
echo "=== Exemplo de resposta esperada ==="
echo ""
echo "Para contatos (/user/contacts):"
echo '{
  "code": 200,
  "data": {
    "5491122223333@s.whatsapp.net": {
      "BusinessName": "",
      "FirstName": "",
      "Found": true,
      "FullName": "",
      "PushName": "NomeDoContato 1"
    }
  }
}'
echo ""
echo "Para grupos (/group/list):"
echo '{
  "code": 200,
  "data": {
    "Groups": [
      {
        "JID": "120362023605733675@g.us",
        "Name": "Nome do Super Grupo",
        "OwnerJID": "5491155554444@s.whatsapp.net",
        "Participants": [
          {
            "JID": "5491155554444@s.whatsapp.net",
            "IsAdmin": true,
            "IsSuperAdmin": true
          }
        ]
      }
    ]
  },
  "success": true
}'
