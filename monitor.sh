#!/bin/bash

# Script de Monitoramento para WhatsApp Manager
# Uso: ./monitor.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       WhatsApp Manager - Dashboard de Monitoramento       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Função para verificar serviço
check_service() {
    local name=$1
    local url=$2
    
    if curl -f -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} $name está ${GREEN}ONLINE${NC}"
        return 0
    else
        echo -e "${RED}❌${NC} $name está ${RED}OFFLINE${NC}"
        return 1
    fi
}

# Status dos Serviços Principais
echo -e "${YELLOW}📊 Status dos Serviços:${NC}"
echo "─────────────────────────────────────────────────────"
check_service "Backend API      " "http://localhost:3001/api/status"
check_service "Frontend Web     " "http://localhost:3000"
echo ""

# Containers WhatsApp
echo -e "${YELLOW}📱 Containers WhatsApp Ativos:${NC}"
echo "─────────────────────────────────────────────────────"
WHATSAPP_CONTAINERS=$(docker ps --filter "name=whatsapp-" --format "{{.Names}}" | wc -l)
echo -e "   Total: ${GREEN}$WHATSAPP_CONTAINERS${NC} sessões ativas"
echo ""

if [ $WHATSAPP_CONTAINERS -gt 0 ]; then
    docker ps --filter "name=whatsapp-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -6
    if [ $WHATSAPP_CONTAINERS -gt 5 ]; then
        echo "   ... e mais $(($WHATSAPP_CONTAINERS - 5)) containers"
    fi
fi
echo ""

# Uso de Recursos
echo -e "${YELLOW}💾 Uso de Recursos:${NC}"
echo "─────────────────────────────────────────────────────"

# CPU e Memória do sistema
echo -e "Sistema:"
FREE_OUTPUT=$(free -h | awk 'NR==2{printf "   RAM: %s/%s (%.0f%%)\n", $3, $2, $3*100/$2}')
echo "$FREE_OUTPUT"

CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
echo -e "   CPU: ${CPU_USAGE}% em uso"
echo ""

# Docker Stats (últimos 3 containers WhatsApp)
if [ $WHATSAPP_CONTAINERS -gt 0 ]; then
    echo -e "Containers (Top 3):"
    docker stats --no-stream --format "   {{.Name}}: CPU {{.CPUPerc}} | RAM {{.MemUsage}}" \
        $(docker ps --filter "name=whatsapp-" --format "{{.ID}}" | head -3)
fi
echo ""

# Espaço em Disco
echo -e "${YELLOW}💿 Espaço em Disco:${NC}"
echo "─────────────────────────────────────────────────────"
df -h / | awk 'NR==2{printf "   Root: %s/%s (%s usado)\n", $3, $2, $5}'

# Docker disk usage
DOCKER_SIZE=$(docker system df --format "{{.Size}}" 2>/dev/null | head -1)
echo -e "   Docker: ${DOCKER_SIZE:-N/A}"
echo ""

# Logs Recentes
echo -e "${YELLOW}📝 Logs Recentes (Backend):${NC}"
echo "─────────────────────────────────────────────────────"
docker-compose logs --tail=5 backend 2>/dev/null || echo "   Nenhum log disponível"
echo ""

# Portas VNC em Uso
echo -e "${YELLOW}🔌 Portas VNC Ativas:${NC}"
echo "─────────────────────────────────────────────────────"
VNC_PORTS=$(docker ps --filter "name=whatsapp-" --format "{{.Ports}}" | grep -o "5[0-9][0-9][0-9]" | sort -u)
if [ -z "$VNC_PORTS" ]; then
    echo "   Nenhuma porta VNC ativa"
else
    echo "$VNC_PORTS" | while read port; do
        echo "   → Porta $port"
    done
fi
echo ""

# Alertas
echo -e "${YELLOW}⚠️  Alertas:${NC}"
echo "─────────────────────────────────────────────────────"

# Check memory
MEM_PERCENT=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEM_PERCENT -gt 80 ]; then
    echo -e "   ${RED}• Memória acima de 80%: $MEM_PERCENT%${NC}"
fi

# Check CPU
CPU_INT=${CPU_USAGE%.*}
if [ $CPU_INT -gt 80 ]; then
    echo -e "   ${RED}• CPU acima de 80%: $CPU_USAGE%${NC}"
fi

# Check disk
DISK_PERCENT=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
if [ $DISK_PERCENT -gt 80 ]; then
    echo -e "   ${RED}• Disco acima de 80%: $DISK_PERCENT%${NC}"
fi

# Check containers
if [ $WHATSAPP_CONTAINERS -gt 20 ]; then
    echo -e "   ${YELLOW}• Muitos containers ativos: $WHATSAPP_CONTAINERS${NC}"
fi

# Se nenhum alerta
if [ $MEM_PERCENT -lt 80 ] && [ $CPU_INT -lt 80 ] && [ $DISK_PERCENT -lt 80 ]; then
    echo -e "   ${GREEN}✅ Nenhum alerta no momento${NC}"
fi
echo ""

# Comandos Úteis
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      Comandos Úteis                        ║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║${NC}  watch -n 2 ./monitor.sh       ${BLUE}│${NC} Atualizar a cada 2s      ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  docker-compose logs -f        ${BLUE}│${NC} Ver logs ao vivo         ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  docker stats                  ${BLUE}│${NC} Monitorar recursos       ${BLUE}║${NC}"
echo -e "${BLUE}║${NC}  docker ps                     ${BLUE}│${NC} Listar containers        ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Atualizado em: $(date '+%Y-%m-%d %H:%M:%S')"