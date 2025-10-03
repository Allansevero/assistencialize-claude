#!/bin/bash

# Script para testar as funcionalidades de avatares, contatos e grupos
# Assumindo que você tem uma instância conectada

echo "=== Testando Funcionalidades do Assistencialize ==="
echo ""

# Variáveis de configuração
BASE_URL="http://localhost:8080"
JWT_TOKEN="SEU_JWT_TOKEN_AQUI"  # Substitua pelo seu token JWT
INSTANCE_TOKEN="SEU_INSTANCE_TOKEN_AQUI"  # Substitua pelo token da sua instância
INSTANCE_ID="SEU_INSTANCE_ID_AQUI"  # Substitua pelo ID da sua instância

echo "🔧 Configuração:"
echo "Base URL: $BASE_URL"
echo "JWT Token: ${JWT_TOKEN:0:20}..."
echo "Instance Token: ${INSTANCE_TOKEN:0:20}..."
echo "Instance ID: $INSTANCE_ID"
echo ""

# Função para testar endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local data="$4"
    
    echo "🧪 Testando: $name"
    echo "URL: $method $url"
    echo ""
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        response=$(curl -s -X "$method" \
            -H "Authorization: Bearer $JWT_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url")
    else
        response=$(curl -s -X "$method" \
            -H "Authorization: Bearer $JWT_TOKEN" \
            "$url")
    fi
    
    echo "Resposta:"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    echo ""
    echo "----------------------------------------"
    echo ""
}

# 1. Testar listagem de instâncias
echo "1️⃣ TESTANDO LISTAGEM DE INSTÂNCIAS"
test_endpoint "Listar Instâncias" "$BASE_URL/api/v1/instances"
echo ""

# 2. Testar status de uma instância específica
echo "2️⃣ TESTANDO STATUS DA INSTÂNCIA"
test_endpoint "Status da Instância" "$BASE_URL/api/v1/session/status" "POST" '{"token":"'$INSTANCE_TOKEN'"}'
echo ""

# 3. Testar busca de avatar
echo "3️⃣ TESTANDO BUSCA DE AVATAR"
echo "🧪 Testando: Buscar Avatar da Instância"
echo "URL: GET $BASE_URL/api/v1/instances/$INSTANCE_ID/avatar"
echo ""

# Teste do avatar (vai retornar imagem ou erro)
avatar_response=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "token: $INSTANCE_TOKEN" \
    "$BASE_URL/api/v1/instances/$INSTANCE_ID/avatar")

http_code=$(echo "$avatar_response" | grep "HTTP_CODE:" | cut -d: -f2)
response_body=$(echo "$avatar_response" | grep -v "HTTP_CODE:")

echo "Código HTTP: $http_code"
if [ "$http_code" = "200" ]; then
    echo "✅ Avatar encontrado! (Resposta é uma imagem)"
    echo "Tamanho da resposta: $(echo "$response_body" | wc -c) bytes"
elif [ "$http_code" = "404" ]; then
    echo "⚠️ Avatar não encontrado (instância pode não ter foto de perfil)"
else
    echo "❌ Erro ao buscar avatar"
    echo "Resposta: $response_body"
fi
echo ""
echo "----------------------------------------"
echo ""

# 4. Testar lista de contatos
echo "4️⃣ TESTANDO LISTA DE CONTATOS"
test_endpoint "Listar Contatos" "$BASE_URL/api/v1/user/contacts" "GET" "" \
    --header "token: $INSTANCE_TOKEN"
echo ""

# 5. Testar lista de grupos
echo "5️⃣ TESTANDO LISTA DE GRUPOS"
test_endpoint "Listar Grupos" "$BASE_URL/api/v1/group/list" "GET" "" \
    --header "token: $INSTANCE_TOKEN"
echo ""

echo "=== RESUMO DOS TESTES ==="
echo ""
echo "✅ Testes realizados:"
echo "   1. Listagem de instâncias"
echo "   2. Status da instância"
echo "   3. Busca de avatar"
echo "   4. Lista de contatos"
echo "   5. Lista de grupos"
echo ""
echo "📋 Para usar este script:"
echo "   1. Faça login na aplicação para obter o JWT_TOKEN"
echo "   2. Crie uma instância e conecte ao WhatsApp"
echo "   3. Obtenha o INSTANCE_TOKEN e INSTANCE_ID"
echo "   4. Substitua as variáveis no script"
echo "   5. Execute: bash test_features.sh"
echo ""
echo "🔍 Verificações importantes:"
echo "   - Instância deve estar conectada para testar contatos/grupos"
echo "   - Avatar só aparece se a instância tiver foto de perfil"
echo "   - Contatos só aparecem se a instância tiver contatos salvos"
echo "   - Grupos só aparecem se a instância participar de grupos"
