# 🧪 Guia de Teste - Funcionalidades do Assistencialize

## 📋 Funcionalidades para Testar

### 1. **Avatares das Instâncias** ✅ Implementado
### 2. **Lista de Contatos** ✅ Implementado  
### 3. **Lista de Grupos** ✅ Implementado

---

## 🚀 Como Testar

### **Passo 1: Preparar o Ambiente**

1. **Certifique-se que o servidor está rodando:**
   ```bash
   cd /home/grupoteaser/assistencialize/wuzapi
   ./wuzapi -admintoken=H4Zbhw72PBKdTIgS
   ```

2. **Acesse o frontend:**
   ```bash
   cd frontend
   npm start
   ```

### **Passo 2: Fazer Login e Obter Tokens**

1. **Acesse:** `http://localhost:3000`
2. **Faça login** com suas credenciais
3. **Abra o DevTools** (F12) → Console
4. **Execute no console:**
   ```javascript
   // Obter JWT Token
   const jwtToken = localStorage.getItem('authToken');
   console.log('JWT Token:', jwtToken);
   ```

### **Passo 3: Criar e Conectar uma Instância**

1. **No frontend, crie uma nova instância**
2. **Conecte a instância** ao WhatsApp (escaneie o QR code)
3. **No console do DevTools, execute:**
   ```javascript
   // Listar instâncias para obter o token
   fetch('/api/v1/instances', {
     headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
   })
   .then(r => r.json())
   .then(data => {
     console.log('Instâncias:', data);
     const instance = data.instances[0]; // Primeira instância
     console.log('Instance Token:', instance.token);
     console.log('Instance ID:', instance.id);
   });
   ```

---

## 🧪 Testes Específicos

### **Teste 1: Avatares**

**No console do navegador:**
```javascript
// Testar busca de avatar
const instanceId = 1; // Substitua pelo ID da sua instância
const instanceToken = 'seu_token_aqui'; // Substitua pelo token

fetch(`/api/v1/instances/${instanceId}/avatar`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'token': instanceToken
  }
})
.then(response => {
  console.log('Status:', response.status);
  if (response.ok) {
    console.log('✅ Avatar encontrado!');
    // A resposta é uma imagem (blob)
    return response.blob();
  } else {
    console.log('❌ Avatar não encontrado');
    return response.text();
  }
})
.then(data => {
  if (data instanceof Blob) {
    console.log('Tamanho da imagem:', data.size, 'bytes');
    // Criar URL para visualizar
    const url = URL.createObjectURL(data);
    console.log('URL do avatar:', url);
    // Abrir em nova aba para ver a imagem
    window.open(url);
  } else {
    console.log('Erro:', data);
  }
});
```

### **Teste 2: Lista de Contatos**

```javascript
// Testar lista de contatos
fetch('/api/v1/user/contacts', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'token': instanceToken
  }
})
.then(response => response.json())
.then(data => {
  console.log('📞 Contatos:', data);
  
  if (data.code === 200 && data.data) {
    const contacts = Object.keys(data.data);
    console.log(`✅ Encontrados ${contacts.length} contatos:`);
    contacts.forEach(jid => {
      const contact = data.data[jid];
      console.log(`- ${contact.PushName || 'Sem nome'} (${jid})`);
    });
  } else {
    console.log('❌ Nenhum contato encontrado ou erro:', data);
  }
});
```

### **Teste 3: Lista de Grupos**

```javascript
// Testar lista de grupos
fetch('/api/v1/group/list', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'token': instanceToken
  }
})
.then(response => response.json())
.then(data => {
  console.log('👥 Grupos:', data);
  
  if (data.code === 200 && data.data && data.data.Groups) {
    const groups = data.data.Groups;
    console.log(`✅ Encontrados ${groups.length} grupos:`);
    groups.forEach(group => {
      console.log(`- ${group.Name} (${group.JID})`);
      console.log(`  Participantes: ${group.Participants.length}`);
    });
  } else {
    console.log('❌ Nenhum grupo encontrado ou erro:', data);
  }
});
```

---

## 🎯 Testes no Frontend

### **Verificar Avatares na Tabela**

1. **Acesse a página de instâncias** no frontend
2. **Verifique se a coluna "Avatar" aparece**
3. **Para instâncias conectadas:**
   - ✅ Deve mostrar avatar real se disponível
   - ✅ Deve mostrar ícone do WhatsApp se não tiver avatar
4. **Para instâncias desconectadas:**
   - ✅ Deve mostrar inicial do nome

### **Verificar Console para Logs**

No DevTools → Console, você deve ver:
```
✅ Buscando avatares para instâncias conectadas...
✅ Avatar encontrado para instância X
⚠️ Falha ao buscar avatar para instância Y: [erro]
```

---

## 🐛 Troubleshooting

### **Problemas Comuns:**

1. **"Token inválido"**
   - ✅ Faça login novamente
   - ✅ Verifique se o JWT token está correto

2. **"Instância não encontrada"**
   - ✅ Verifique se o instance_id está correto
   - ✅ Confirme que a instância pertence ao usuário

3. **"Cliente WhatsApp não disponível"**
   - ✅ Certifique-se que a instância está conectada
   - ✅ Reinicie o servidor se necessário

4. **"Avatar não encontrado"**
   - ✅ Normal - nem todas as contas têm foto de perfil
   - ✅ Teste com uma conta que você sabe que tem foto

5. **"Nenhum contato/grupo encontrado"**
   - ✅ Normal se a conta não tem contatos salvos
   - ✅ Teste com uma conta que tem contatos/grupos

---

## 📊 Resultados Esperados

### **✅ Sucesso:**
- Avatares aparecem na tabela de instâncias
- Contatos são listados com nomes e JIDs
- Grupos são listados com nomes e participantes
- Logs mostram informações de debug

### **⚠️ Limitações Normais:**
- Nem todas as contas têm foto de perfil
- Contatos só aparecem se salvos na agenda
- Grupos só aparecem se a instância participar

---

## 🎉 Próximos Passos

Após testar, você pode:
1. **Implementar mais endpoints** da API WhatsApp
2. **Melhorar a UI** com mais funcionalidades
3. **Adicionar testes automatizados**
4. **Implementar notificações em tempo real**

**Boa sorte com os testes! 🚀**
