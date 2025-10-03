# 🚀 Quick Start - WhatsApp Manager

Guia rápido para colocar o sistema no ar em **5 minutos**.

## ⚡ Instalação Rápida

### 1️⃣ Clone ou crie a estrutura

```bash
mkdir whatsapp-manager && cd whatsapp-manager
mkdir -p docker-image backend frontend
```

### 2️⃣ Crie os arquivos fornecidos

Copie todos os arquivos dos artifacts para suas respectivas pastas:

```
whatsapp-manager/
├── docker-image/
│   ├── Dockerfile
│   ├── supervisord.conf
│   └── start.sh
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env (copiar de .env.example)
├── frontend/
│   ├── src/
│   │   └── App.jsx
│   └── package.json
├── docker-compose.yml
├── deploy.sh
├── monitor.sh
└── README.md
```

### 3️⃣ Build da imagem Docker

```bash
cd docker-image
docker build -t whatsapp-vnc:latest .
cd ..
```

**Tempo estimado:** 3-5 minutos

### 4️⃣ Instalar dependências

```bash
# Backend
cd backend
npm install
cd ..

# Frontend  
cd frontend
npm install
cd ..
```

**Tempo estimado:** 1-2 minutos

### 5️⃣ Iniciar o sistema

```bash
# Opção A: Script automatizado (recomendado)
chmod +x deploy.sh monitor.sh
./deploy.sh development

# Opção B: Docker Compose
docker-compose up -d

# Opção C: Manual
cd backend && npm start &
cd frontend && npm start &
```

### 6️⃣ Acessar a aplicação

Abra no navegador:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/api/status

## 📱 Usando o Sistema

### Criar primeira sessão WhatsApp

1. Clique em **"Nova Conta"**
2. Aguarde 10-15 segundos (container iniciando)
3. Clique em **"Conectar"**
4. Siga as instruções para conectar via VNC

### Opções de acesso VNC

**Desktop (Recomendado):**
```bash
# Instalar VNC Viewer
# Windows/Mac: https://www.realvnc.com/download/viewer/
# Linux: sudo apt install tigervnc-viewer

# Conectar
vncviewer localhost:5900
```

**Mobile:**
```bash
# Baixe "VNC Viewer" na App Store/Play Store
# Conecte em: IP_DO_SERVIDOR:5900
```

**Browser (noVNC):**
```bash
# Necessita configuração adicional do noVNC
# Ver seção "Configuração Avançada" no README
```

## 🎯 Comandos Essenciais

### Monitoramento

```bash
# Dashboard completo
./monitor.sh

# Atualizar automaticamente a cada 2s
watch -n 2 ./monitor.sh

# Ver logs ao vivo
docker-compose logs -f

# Status dos containers
docker ps | grep whatsapp
```

### Gerenciamento

```bash
# Reiniciar tudo
docker-compose restart

# Parar tudo
docker-compose down

# Ver recursos usados
docker stats

# Limpar containers parados
docker container prune -f
```

### Troubleshooting rápido

```bash
# Container não inicia
docker logs <container_id>

# Remover todos containers WhatsApp
docker rm -f $(docker ps -a | grep whatsapp | awk '{print $1}')

# Reconstruir imagem
cd docker-image && docker build -t whatsapp-vnc:latest . && cd ..

# Verificar portas em uso
netstat -tuln | grep 59
```

## ⚙️ Configurações Importantes

### Limites de Recursos (backend/server.js)

```javascript
// Ajustar conforme seu servidor
Memory: 512 * 1024 * 1024,  // 512MB por container
NanoCpus: 1000000000        // 1 CPU por container
```

### Capacidade por Servidor

| RAM   | vCPU | Contas Simultâneas |
|-------|------|--------------------|
| 4GB   | 2    | ~5-8 contas        |
| 8GB   | 4    | ~10-15 contas      |
| 16GB  | 8    | ~25-30 contas      |
| 32GB  | 16   | ~50-60 contas      |

### Variáveis de Ambiente (.env)

```bash
# Importantes para produção
MAX_SESSIONS_PER_USER=5
CONTAINER_MEMORY_LIMIT=512
SESSION_TIMEOUT_HOURS=24
AUTO_CLEANUP_ENABLED=true
```

## 🔐 Segurança Básica

### 1. Firewall (Ubuntu/Debian)

```bash
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Para desenvolvimento apenas
sudo ufw allow 3000:3001/tcp
```

### 2. Alterar Senha VNC

No `docker-image/start.sh`:
```bash
VNC_PASSWORD=${VNC_PASSWORD:-sua_senha_segura_aqui}
```

### 3. Acesso Remoto Seguro

```bash
# Via SSH Tunnel (recomendado)
ssh -L 5900:localhost:5900 usuario@seu-servidor.com

# Via VPN
# Configure WireGuard ou OpenVPN
```

## 📊 Checklist Pós-Instalação

- [ ] Sistema inicia sem erros
- [ ] Backend responde em http://localhost:3001/api/status
- [ ] Frontend carrega em http://localhost:3000
- [ ] Consegue criar nova sessão
- [ ] Container WhatsApp inicia corretamente
- [ ] VNC conecta e mostra Chrome
- [ ] WhatsApp Web carrega no container
- [ ] Consegue escanear QR Code
- [ ] Monitor.sh exibe informações corretas

## 🐛 Problemas Comuns

### "Cannot connect to Docker daemon"
```bash
# Verificar se Docker está rodando
sudo systemctl start docker
sudo systemctl enable docker

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
# Fazer logout e login novamente
```

### "Port already in use"
```bash
# Encontrar processo usando a porta
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :5900

# Matar processo
sudo kill -9 <PID>
```

### "Container exits immediately"
```bash
# Ver logs detalhados
docker logs <container_id>

# Modo interativo para debug
docker run -it whatsapp-vnc:latest /bin/bash
```

### "WhatsApp Web not loading"
```bash
# Verificar internet no container
docker exec <container_id> ping -c 3 google.com

# Ver logs do Chrome
docker exec <container_id> cat /var/log/chrome.log

# Reiniciar container
docker restart <container_id>
```

### "VNC screen is black"
```bash
# Verificar Xvfb
docker exec <container_id> ps aux | grep Xvfb

# Reiniciar display
docker exec <container_id> supervisorctl restart xvfb
docker exec <container_id> supervisorctl restart chrome
```

## 🎓 Próximos Passos

### Para Desenvolvimento
1. ✅ Sistema funcionando localmente
2. 📖 Ler README.md completo
3. 🔧 Customizar interface frontend
4. 🔐 Implementar autenticação de usuários
5. 💾 Adicionar PostgreSQL para persistência

### Para Produção
1. 🌐 Configurar domínio e DNS
2. 🔒 Setup SSL/TLS com Let's Encrypt
3. 🛡️ Configurar Nginx como reverse proxy
4. 📊 Setup de monitoramento (Grafana/Prometheus)
5. 💾 Implementar backup automatizado
6. 🔄 Configurar CI/CD
7. 📈 Testar capacidade e performance

## 📚 Recursos Adicionais

### Documentação
- [Docker Docs](https://docs.docker.com)
- [VNC Protocol](https://en.wikipedia.org/wiki/Virtual_Network_Computing)
- [WhatsApp Web](https://web.whatsapp.com)

### Ferramentas Úteis
- **Portainer**: UI para gerenciar Docker
- **Watchtower**: Auto-update de containers
- **Netdata**: Monitoramento em tempo real
- **Duplicati**: Backup automatizado

### Performance
```bash
# Otimizar Docker
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Limpar cache periodicamente
docker system prune -af --volumes

# Monitorar performance
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

## 💡 Dicas Pro

### 1. Automatizar limpeza de sessões antigas
```bash
# Adicionar no crontab
# Limpar sessões com mais de 24h
0 */6 * * * docker ps -a --filter "name=whatsapp-" --format "{{.ID}}" | xargs -r docker rm -f
```

### 2. Backup automático de dados
```bash
# Script de backup diário
#!/bin/bash
BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR
docker ps --filter "name=whatsapp-" -q | while read id; do
    docker cp $id:/data/chrome $BACKUP_DIR/$id
done
```

### 3. Monitoramento via webhook
```javascript
// Adicionar no backend para notificar eventos
const notifyWebhook = async (event, data) => {
  await fetch('https://seu-webhook.com', {
    method: 'POST',
    body: JSON.stringify({ event, data, timestamp: new Date() })
  });
};
```

### 4. Load balancing
```bash
# Para muitas sessões, distribua em múltiplos servidores
# Configure HAProxy ou Nginx upstream
```

## 🎉 Pronto!

Você agora tem um sistema funcional de gerenciamento multi-sessão do WhatsApp!

**Tempo total de setup:** ~10-15 minutos

### Próxima Sessão
1. Abra http://localhost:3000
2. Clique em "Nova Conta"
3. Conecte via VNC
4. Escaneie QR Code do WhatsApp
5. Comece a usar!

---

**Precisa de ajuda?**
- 📖 Leia o README.md completo
- 🐛 Verifique a seção de Troubleshooting
- 💬 Abra uma issue no repositório
- 📧 Entre em contato com a comunidade

**Boa sorte! 🚀**