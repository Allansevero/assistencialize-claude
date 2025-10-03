# Implementação de Avatares das Instâncias WhatsApp

## Visão Geral

Este documento explica como foi implementada a funcionalidade de exibição de avatares das instâncias WhatsApp conectadas no frontend.

## Problema Identificado

O frontend não estava fazendo as chamadas necessárias para buscar os avatares das instâncias conectadas. A API retornava o `jid` (identificador único do WhatsApp) de cada instância, mas não a URL da imagem do perfil.

## Solução Implementada

### 1. Backend - Endpoint de Avatar

Foi implementado o endpoint `/api/v1/instances/{id}/avatar` que:

- **Autentica** o usuário via JWT
- **Valida** se a instância pertence ao usuário autenticado
- **Verifica** se a instância está conectada e tem JID
- **Busca** a foto de perfil real do WhatsApp usando `whatsmeow.GetProfilePictureInfo()`
- **Faz proxy** da imagem, baixando e retornando diretamente
- **Define headers** apropriados (`Content-Type: image/jpeg`, `Cache-Control`)

```go
func (s *server) GetInstanceAvatar(w http.ResponseWriter, r *http.Request) {
    // Autenticação e validação
    // Busca da instância
    // Verificação de conectividade
    // Download da imagem do WhatsApp
    // Stream da imagem para o frontend
}
```

### 2. Frontend - Busca e Exibição de Avatares

#### Estado para Avatares
```typescript
const [avatars, setAvatars] = useState<{ [jid: string]: string }>({});
```

#### Função de Busca
```typescript
const fetchAvatars = async (instanceList: Instance[]) => {
  for (const instance of instanceList) {
    if (instance.connected && instance.jid) {
      try {
        const response = await apiClient.get(
          `/instances/${instance.id}/avatar`,
          {
            headers: { 'Authorization': `Bearer ${token}`, 'token': instance.token },
            responseType: 'blob' // Importante para imagens
          }
        );
        
        const avatarUrl = URL.createObjectURL(response.data);
        setAvatars(prev => ({ ...prev, [instance.jid]: avatarUrl }));
      } catch (error) {
        console.error(`Falha ao buscar avatar:`, error);
      }
    }
  }
};
```

#### Exibição na Tabela
```typescript
<TableCell>
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {avatars[instance.jid] ? (
      <Box
        component="img"
        src={avatars[instance.jid]}
        alt={`Avatar de ${instance.name}`}
        sx={{ width: 40, height: 40, borderRadius: '50%' }}
        onError={(e) => { /* Fallback para ícone do WhatsApp */ }}
      />
    ) : (
      <Box sx={{ /* Fallback com ícone ou inicial */ }}>
        {instance.connected ? <WhatsAppIcon /> : <Typography>{instance.name[0]}</Typography>}
      </Box>
    )}
  </Box>
</TableCell>
```

### 3. Gerenciamento de Memória

Para evitar vazamentos de memória, os URLs dos blobs são limpos:

```typescript
useEffect(() => {
  return () => {
    Object.values(avatars).forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  };
}, [avatars]);
```

## Fluxo Completo

1. **Usuário acessa** a página de instâncias
2. **Frontend busca** lista de instâncias via `/admin/users`
3. **Para cada instância conectada** com JID:
   - Chama `/instances/{id}/avatar`
   - Backend valida e busca foto do WhatsApp
   - Frontend recebe blob da imagem
   - Cria URL do blob e armazena no estado
4. **Tabela renderiza** avatares ou fallbacks
5. **Cleanup** libera URLs quando necessário

## Benefícios

- ✅ **Avatares reais** do WhatsApp exibidos
- ✅ **Segurança** - validação de propriedade da instância
- ✅ **Performance** - cache de 1 hora no backend
- ✅ **Fallbacks** - ícones quando avatar não disponível
- ✅ **Gerenciamento de memória** - limpeza de URLs
- ✅ **UX melhorada** - identificação visual das instâncias

## Endpoints Utilizados

- `GET /api/v1/instances/{id}/avatar` - Buscar avatar da instância
- `GET /admin/users` - Listar instâncias do usuário
- `GET /session/status` - Verificar status de conexão

## Configurações Importantes

- **responseType: 'blob'** no axios para lidar com imagens
- **Headers de autenticação** (JWT + token da instância)
- **Cache-Control** no backend para performance
- **onError handlers** para fallbacks no frontend
