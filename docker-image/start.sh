#!/bin/bash

# Criar senha VNC (padrão: whatsapp123)
mkdir -p /tmp
x11vnc -storepasswd ${VNC_PASSWORD:-whatsapp123} /tmp/vncpasswd

# Criar diretórios de log
mkdir -p /var/log/supervisor

# Iniciar supervisord
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf