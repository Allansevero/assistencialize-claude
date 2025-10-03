# 🖥️ Guia noVNC - WhatsApp no Navegador

## O que mudou?

Agora o sistema usa **noVNC** que permite visualizar o WhatsApp Web **direto no navegador**, sem precisar instalar nenhum cliente VNC!

## 🎯 Benefícios

✅ **Zero instalação** - Funciona em qualquer navegador  
✅ **Mobile-friendly** - Use no celular sem apps extras  
✅ **Integrado** - Tudo dentro do seu web app  
✅ **Multiplataforma** - Windows, Mac, Linux, Android, iOS  
✅ **Seguro** - Conexão via WebSocket dentro do container

## 🚀 Como Usar

### 1. Build da Imagem Atualizada

```bash
cd docker-image
docker build -t whatsapp-vnc:latest .
```

**O que foi adicionado:**
- noVNC (cliente VNC via browser)
- websockify (proxy WebSocket)
- Python 3 (dependência do noVNC)

### 2. Instalar Dependência no Backend

```bash
cd backend
npm install http-proxy-middleware
npm install
```

### 3. Iniciar o Sistema

```bash
# Opção A: Docker Compose
docker-compose up -d

# Opção B: Manual
cd backend && npm start
cd frontend && npm start
```

### 4. Usar no Navegador

1. Acesse `http://localhost:3000`
2. Clique em **"Nova Conta"**
3. Aguarde 5-10 segundos
4. A tela do WhatsApp Web aparecerá **automaticamente no navegador**!
5. Escaneie o QR Code normalmente

## 📱 Usando no Mobile

### iPhone/iPad
1. Abra Safari e acesse `http://IP_DO_SERVIDOR:3000`
2. Clique em "Compartilhar" → "Adicionar à Tela de Início"
3. Agora você tem um app!

### Android
1. Abra Chrome e acesse `http://IP_DO_SERVIDOR:3000`
2. Menu (3 pontos) → "Adicionar à tela inicial"
3. Use como app nativo!

## 🔧 Arquitetura noVNC

```
Frontend (React)
    ↓
Backend Proxy (Node.js)
    ↓ WebSocket
noVNC no Container
    ↓ VNC Protocol
x11vnc (Servidor VNC)
    ↓
Chrome com WhatsApp Web
```

## 🎨 Controles do Viewer

- **Tela Cheia**: Botão maximize no canto superior direito
- **Fechar**: Botão X para voltar ao dashboard
- **Zoom**: noVNC ajusta automaticamente (resize=scale)
- **Qualidade**: Configurada em alta (quality=9)

## ⚙️ Configurações Avançadas

### Ajustar Qualidade da Imagem

No frontend, na função `connectVNC()`:

```javascript
// Qualidade máxima (mais lento)
src={`http://localhost:${port}/vnc.html?autoconnect=true&resize=scale&quality=9`}

// Qualidade média (balanceado)
src={`http://localhost:${port}/vnc.html?autoconnect=true&resize=scale&quality=6`}

// Qualidade baixa (mais rápido)
src={`http://localhost:${port}/vnc.html?autoconnect=true&resize=scale&quality=3`}
```

### Ajustar Compressão

```javascript
// Adicionar parâmetros de compressão
?autoconnect=true&resize=scale&quality=6&compression=2
```

### Personalizar Resolução

No `supervisord.conf`:

```ini
[program:xvfb]
# Resolução padrão: 1280x720
command=/usr/bin/Xvfb :99 -screen 0 1280x720x24

# Full HD: 1920x1080
command=/usr/bin/Xvfb :99 -screen 0 1920x1080x24

# Mobile: 768x1024
command=/usr/bin/Xvfb :99 -screen 0 768x1024x24
```

## 🐛 Troubleshooting

### "Failed to connect to server"

**Problema**: noVNC não consegue conectar

**Solução**:
```bash
# Verificar se porta 6080 está aberta
docker exec <container_id> netstat -tuln | grep 6080

# Verificar logs do noVNC
docker exec <container_id> tail -f /var/log/novnc.log

# Reiniciar noVNC
docker exec <container_id> supervisorctl restart novnc
```

### Tela Preta

**Problema**: Viewer conecta mas tela fica preta

**Solução**:
```bash
# Verificar Xvfb
docker exec <container_id> ps aux | grep Xvfb

# Reiniciar display
docker exec <container_id> supervisorctl restart xvfb
docker exec <container_id> supervisorctl restart chrome
```

### Lag ou Lentidão

**Problema**: Conexão lenta

**Soluções**:
1. Reduzir qualidade (quality=3)
2. Diminuir resolução (1024x768)
3. Aumentar compressão (compression=9)
4. Verificar CPU do servidor (`docker stats`)

### CORS Error

**Problema**: Erro de CORS no console

**Solução**: Verificar CORS no backend
```javascript
app.use(cors({
  origin: '*', // Em produção, especificar domínio
  credentials: true
}));
```

## 🔐 Segurança

### Em Desenvolvimento (Local)
- noVNC roda em HTTP (não criptografado)
- OK para testes locais

### Em Produção
1. **Use HTTPS**:
```nginx
# Nginx
location /vnc/ {
    proxy_pass http://localhost:6080/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

2. **Autenticação**:
```javascript
// Adicionar JWT ao backend
// Validar token antes de proxy noVNC
```

3. **Firewall**:
```bash
# Bloquear acesso direto às portas noVNC
sudo ufw deny 6080:7000/tcp
# Liberar apenas Nginx
sudo ufw allow 443/tcp
```

## 📊 Performance

### Uso de Recursos por Container

| Componente | CPU | RAM | Observação |
|------------|-----|-----|------------|
| Xvfb | ~5% | ~50MB | Display virtual |
| x11vnc | ~10% | ~30MB | Servidor VNC |
| noVNC | ~5% | ~20MB | Proxy WebSocket |
| Chrome | ~20% | ~300MB | WhatsApp Web |
| **Total** | ~40% | ~400MB | Por sessão |

### Capacidade Estimada

| Servidor | Sessões Simultâneas |
|----------|---------------------|
| 4GB RAM | ~8 contas |
| 8GB RAM | ~18 contas |
| 16GB RAM | ~38 contas |
| 32GB RAM | ~78 contas |

## 🎯 Otimizações Recomendadas

### 1. Usar Nginx para Cache
```nginx
proxy_cache_path /tmp/novnc_cache levels=1:2 keys_zone=novnc:10m;

location /vnc/ {
    proxy_cache novnc;
    proxy_cache_valid 200 1m;
    # ... resto da config
}
```

### 2. Compressão Gzip
```nginx
gzip on;
gzip_types application/javascript text/css;
```

### 3. Limitar Taxa de Frame
```javascript
// No container, limitar FPS do x11vnc
command=/usr/bin/x11vnc -display :99 -forever -shared -rfbport 5900 -rfbauth /tmp/vncpasswd -wait 100
// -wait 100 = ~10 FPS (mais leve)
// -wait 50 = ~20 FPS (balanceado)
// -wait 20 = ~50 FPS (fluido)
```

## 📖 Parâmetros noVNC Úteis

Adicionar na URL do iframe:

```
?autoconnect=true          # Conectar automaticamente
&resize=scale              # Ajustar tamanho
&quality=6                 # Qualidade JPEG (0-9)
&compression=2             # Compressão (0-9)
&show_dot=true            # Mostrar cursor
&view_only=false          # Permitir controle
&path=websockify          # Caminho do WebSocket
&password=senha           # Senha (não recomendado na URL)
```

## 🚀 Próximos Passos

1. ✅ Sistema funcionando com noVNC
2. 🔐 Adicionar autenticação
3. 📊 Implementar métricas de uso
4. 🎨 Customizar interface noVNC
5. 📱 PWA para instalação mobile
6. 🔔 Notificações de mensagens
7. 💾 Backup automático de sessões

## 🎉 Pronto!

Agora você tem um sistema completo de WhatsApp Multi-Sessão que funciona **100% no navegador**, sem precisar instalar nada no cliente!

Teste abrindo no celular e você verá que funciona perfeitamente! 📱✨