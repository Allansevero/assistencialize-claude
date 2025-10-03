#!/bin/bash

# Script de Deploy para WhatsApp Manager
# Uso: ./deploy.sh [production|development]

set -e

ENV=${1:-development}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 Iniciando deploy em modo: $ENV"
echo "📅 Timestamp: $TIMESTAMP"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Verificar se Docker está rodando
log "Verificando Docker..."
if ! docker info > /dev/null 2>&1; then
    error "Docker não está rodando. Inicie o Docker primeiro."
fi

# Verificar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose não está instalado."
fi

# Backup de containers existentes
log "Fazendo backup de containers ativos..."
BACKUP_DIR="./backups/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

docker ps -a --filter "name=whatsapp" --format "{{.ID}}" | while read container_id; do
    if [ ! -z "$container_id" ]; then
        log "Salvando logs do container $container_id"
        docker logs "$container_id" > "$BACKUP_DIR/container_${container_id}.log" 2>&1 || true
    fi
done

# Parar containers existentes
log "Parando containers WhatsApp ativos..."
docker ps -a --filter "name=whatsapp" --format "{{.ID}}" | xargs -r docker stop || true
docker ps -a --filter "name=whatsapp" --format "{{.ID}}" | xargs -r docker rm || true

# Build da imagem Docker
log "Construindo imagem Docker whatsapp-vnc..."
cd docker-image
docker build -t whatsapp-vnc:latest . || error "Falha ao construir imagem Docker"
docker tag whatsapp-vnc:latest whatsapp-vnc:$TIMESTAMP
cd ..

log "✅ Imagem construída: whatsapp-vnc:latest (tagged como $TIMESTAMP)"

# Instalar dependências do backend
log "Instalando dependências do backend..."
cd backend
if [ ! -f ".env" ]; then
    warning ".env não encontrado no backend. Copiando de .env.example..."
    cp .env.example .env
fi
npm install --production || error "Falha ao instalar dependências do backend"
cd ..

# Instalar dependências do frontend
log "Instalando dependências do frontend..."
cd frontend
npm install || error "Falha ao instalar dependências do frontend"

if [ "$ENV" == "production" ]; then
    log "Construindo build de produção do frontend..."
    npm run build || error "Falha ao construir frontend"
fi
cd ..

# Configurar ambiente
if [ "$ENV" == "production" ]; then
    log "Configurando ambiente de produção..."
    
    # Verificar se certificados SSL existem
    if [ ! -f "/etc/letsencrypt/live/seu-dominio.com/fullchain.pem" ]; then
        warning "Certificados SSL não encontrados. Configure Let's Encrypt antes de continuar."
    fi
    
    # Copiar configuração Nginx
    if [ -f "nginx.conf" ]; then
        sudo cp nginx.conf /etc/nginx/sites-available/whatsapp-manager
        sudo ln -sf /etc/nginx/sites-available/whatsapp-manager /etc/nginx/sites-enabled/
        sudo nginx -t && sudo systemctl reload nginx
        log "✅ Nginx configurado"
    fi
fi

# Iniciar serviços
log "Iniciando serviços com Docker Compose..."
if [ "$ENV" == "production" ]; then
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
else
    docker-compose up -d
fi

# Aguardar serviços ficarem prontos
log "Aguardando serviços iniciarem..."
sleep 10

# Verificar saúde dos serviços
log "Verificando saúde dos serviços..."

# Check Backend
if curl -f http://localhost:3001/api/status > /dev/null 2>&1; then
    log "✅ Backend está rodando"
else
    warning "⚠️  Backend pode não estar respondendo corretamente"
fi

# Check Frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    log "✅ Frontend está rodando"
else
    warning "⚠️  Frontend pode não estar respondendo corretamente"
fi

# Limpar imagens antigas
log "Limpando imagens Docker antigas..."
docker image prune -f

# Mostrar status
log "Status dos containers:"
docker-compose ps

# Informações finais
echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Deploy concluído com sucesso!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📍 Acessos:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "📊 Monitoramento:"
echo "   docker-compose logs -f          # Ver logs ao vivo"
echo "   docker-compose ps               # Status dos serviços"
echo "   docker stats                     # Uso de recursos"
echo ""
echo "🔧 Comandos úteis:"
echo "   docker-compose restart          # Reiniciar serviços"
echo "   docker-compose down             # Parar tudo"
echo "   ./deploy.sh production          # Deploy em produção"
echo ""
echo "💾 Backup salvo em: $BACKUP_DIR"
echo ""
echo "════════════════════════════════════════════════════════════"

# Se for produção, mostrar checklist
if [ "$ENV" == "production" ]; then
    echo ""
    echo "⚠️  CHECKLIST DE PRODUÇÃO:"
    echo "   [ ] SSL/TLS configurado"
    echo "   [ ] Firewall configurado"
    echo "   [ ] Backup automatizado ativo"
    echo "   [ ] Monitoramento configurado"
    echo "   [ ] Variáveis de ambiente de produção setadas"
    echo "   [ ] DNS apontando corretamente"
    echo ""
fi