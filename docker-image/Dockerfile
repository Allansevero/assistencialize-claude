FROM ubuntu:22.04

# Evitar prompts interativos
ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99

# Instalar dependências
RUN apt-get update && apt-get install -y \
    chromium-browser \
    xvfb \
    x11vnc \
    supervisor \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Criar diretório para dados do Chrome
RUN mkdir -p /data/chrome

# Configurar Supervisor para gerenciar processos
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Script de inicialização
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Expor porta VNC
EXPOSE 5900

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5900 || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]