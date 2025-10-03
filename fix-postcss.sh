#!/bin/bash

# Script para corrigir PostCSS config no Vite
# Uso: ./fix-postcss.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Corrigindo configuração PostCSS...${NC}\n"

cd frontend

# Opção 1: Renomear para .cjs (CommonJS)
if [ -f "postcss.config.js" ]; then
    echo -e "${YELLOW}Renomeando postcss.config.js para postcss.config.cjs...${NC}"
    mv postcss.config.js postcss.config.cjs
fi

if [ -f "tailwind.config.js" ]; then
    echo -e "${YELLOW}Renomeando tailwind.config.js para tailwind.config.cjs...${NC}"
    mv tailwind.config.js tailwind.config.cjs
fi

# Atualizar conteúdo do tailwind.config.cjs
cat > tailwind.config.cjs << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          50: '#e7f6ec',
          100: '#c3e9d2',
          200: '#9ddcb5',
          300: '#75ce98',
          400: '#56c383',
          500: '#25d366',
          600: '#1eb757',
          700: '#199547',
          800: '#137437',
          900: '#0d5227',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
EOF

echo -e "${GREEN}✅ PostCSS corrigido!${NC}"
echo -e "\n${YELLOW}Agora execute:${NC}"
echo -e "  npm start\n"