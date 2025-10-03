# 🚀 Assistencialize - WhatsApp API

Sistema completo de API para WhatsApp com interface moderna, autenticação JWT e gerenciamento multi-usuário.

## ✨ Funcionalidades

### 🔐 Autenticação Segura
- Sistema de registro e login com JWT
- Hash de senhas com bcrypt
- Middleware de proteção para todas as rotas

### 📱 Múltiplas Instâncias WhatsApp
- Cada usuário pode ter múltiplas instâncias WhatsApp
- Gerenciamento individual por instância
- Conexão automática de instâncias existentes

### 🖼️ Interface Moderna
- Dashboard intuitivo com sidebar
- Avatar real do usuário WhatsApp
- QR Code em modal para conexão
- Layout responsivo com Material-UI

### 🛡️ Segurança Total
- Validação de propriedade de instâncias
- Proxy de avatar para proteção
- Autenticação JWT em todas as operações

## 🏗️ Arquitetura

### Backend (Go)
- **Framework**: Gorilla Mux
- **Database**: PostgreSQL com migrações
- **Auth**: JWT + bcrypt
- **WhatsApp**: whatsmeow library
- **Migrations**: golang-migrate

### Frontend (React + TypeScript)
- **UI**: Material-UI
- **State**: Context API
- **HTTP**: Axios com interceptors
- **Routing**: React Router

## 🚀 Instalação

### Pré-requisitos
- Go 1.19+
- Node.js 16+
- PostgreSQL 12+

### Backend
```bash
# Instalar dependências
go mod tidy

# Configurar banco de dados
cp .env.exemplo .env
# Editar .env com suas configurações

# Executar migrações
go run main.go

# Iniciar servidor
./wuzapi -admintoken=SEU_TOKEN
```

### Frontend
```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm start
```

## 📊 API Endpoints

### Autenticação
- `POST /auth/register` - Registrar nova conta
- `POST /auth/login` - Login com email/password

### Instâncias
- `GET /api/v1/instances` - Listar instâncias do usuário
- `POST /api/v1/instances` - Criar nova instância
- `GET /api/v1/instances/{id}/avatar` - Avatar da instância

### WhatsApp
- `POST /api/v1/session/connect` - Conectar instância
- `GET /api/v1/session/qr` - Obter QR code
- `GET /api/v1/session/status` - Status da conexão

### Contatos e Grupos
- `GET /api/v1/user/contacts` - Listar contatos da instância
- `GET /api/v1/group/list` - Listar grupos da instância

## 🔧 Configuração

### Variáveis de Ambiente
```env
# Database
DATABASE_URL=postgres://user:password@localhost:5432/wuzapi

# JWT
JWT_SECRET=seu_jwt_secret_super_seguro

# Admin
ADMIN_TOKEN=seu_admin_token
```

## 📱 Uso

1. **Registrar conta** em `/register`
2. **Fazer login** em `/login`
3. **Criar instância** no dashboard
4. **Conectar WhatsApp** escaneando QR code
5. **Gerenciar instâncias** na sidebar

## 🛠️ Desenvolvimento

### Estrutura do Projeto
```
wuzapi/
├── backend/           # Go - API e lógica de negócio
├── frontend/          # React - Interface do usuário
├── migrations/        # PostgreSQL - Schema do banco
├── static/           # Arquivos estáticos
└── repository/       # Camada de dados
```

### Scripts Úteis
```bash
# Compilar backend
go build .

# Executar migrações
go run main.go

# Desenvolvimento frontend
cd frontend && npm start

# Build frontend
cd frontend && npm run build
```

## 📋 Exemplos de Uso da API

### Listar Contatos
```bash
curl -X GET \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -H "token: TOKEN_DA_INSTANCIA" \
  http://localhost:8080/api/v1/user/contacts
```

**Resposta:**
```json
{
  "code": 200,
  "data": {
    "5491122223333@s.whatsapp.net": {
      "BusinessName": "",
      "FirstName": "",
      "Found": true,
      "FullName": "",
      "PushName": "NomeDoContato"
    }
  }
}
```

### Listar Grupos
```bash
curl -X GET \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -H "token: TOKEN_DA_INSTANCIA" \
  http://localhost:8080/api/v1/group/list
```

**Resposta:**
```json
{
  "code": 200,
  "data": {
    "Groups": [
      {
        "JID": "120362023605733675@g.us",
        "Name": "Nome do Grupo",
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
}
```

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para suporte, entre em contato através do email: grupoteaser@assistencialize.com

---

**Desenvolvido com ❤️ pelo Grupo Teaser**
