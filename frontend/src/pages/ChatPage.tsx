import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Alert,
  Box,
  IconButton,
  Chip,
  Divider,
  Paper,
  InputBase,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Search as SearchIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import apiClient from '../api/axiosConfig';

// Interfaces para os dados que vamos receber
interface Contact {
  PushName: string;
  BusinessName: string;
  FirstName: string;
  Found: boolean;
  FullName: string;
}

interface Group {
  JID: string;
  Name: string;
  OwnerJID: string;
  Participants: Array<{
    JID: string;
    IsAdmin: boolean;
    IsSuperAdmin: boolean;
  }>;
}

interface Conversation {
  id: string;
  type: 'contact' | 'group';
  name: string;
  jid: string;
  avatar?: string;
  participants?: number;
  isAdmin?: boolean;
}

const ChatPage: React.FC = () => {
  const { instanceToken } = useParams<{ instanceToken: string }>();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [instanceInfo, setInstanceInfo] = useState<{ name: string; jid: string } | null>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!instanceToken) return;

      setLoading(true);
      try {
        // 1. Buscar informações da instância primeiro
        const instancesResponse = await apiClient.get('/api/v1/instances');
        const instance = instancesResponse.data.instances?.find((inst: any) => inst.token === instanceToken);
        
        if (instance) {
          setInstanceInfo({ name: instance.name, jid: instance.jid });
        }

        // 2. Buscar contatos (conversas individuais)
        const contactsResponse = await apiClient.get('/api/v1/user/contacts', {
          headers: { token: instanceToken },
        });

        const contactsData = contactsResponse.data.data || {};
        const contactsArray: Conversation[] = Object.entries(contactsData).map(([jid, contact]: [string, any]) => ({
          id: jid,
          type: 'contact' as const,
          name: contact.PushName || contact.FullName || contact.FirstName || 'Contato sem nome',
          jid: jid,
        }));

        // 3. Buscar grupos
        const groupsResponse = await apiClient.get('/api/v1/group/list', {
          headers: { token: instanceToken },
        });

        const groupsArray: Conversation[] = (groupsResponse.data.data?.Groups || []).map((group: Group) => ({
          id: group.JID,
          type: 'group' as const,
          name: group.Name || 'Grupo sem nome',
          jid: group.JID,
          participants: group.Participants.length,
          isAdmin: group.Participants.some(p => p.JID === instance?.jid && p.IsAdmin),
        }));

        // 4. Combinar e ordenar as conversas
        const allConversations = [...contactsArray, ...groupsArray].sort((a, b) => 
          a.name.localeCompare(b.name, 'pt-BR')
        );
        
        setConversations(allConversations);
        setFilteredConversations(allConversations);
        setError(null);
      } catch (err: any) {
        console.error('Erro ao buscar conversas:', err);
        setError('Falha ao buscar a lista de conversas. Verifique se a instância está conectada.');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [instanceToken]);

  // Filtrar conversas baseado no termo de busca
  useEffect(() => {
    if (!searchTerm) {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv =>
        conv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.jid.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [searchTerm, conversations]);

  const handleBackClick = () => {
    navigate('/instances');
  };

  const getAvatarForConversation = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      return (
        <Avatar sx={{ bgcolor: '#00a884', width: 48, height: 48 }}>
          <GroupIcon />
        </Avatar>
      );
    } else {
      return (
        <Avatar sx={{ bgcolor: '#374045', width: 48, height: 48 }}>
          <PersonIcon />
        </Avatar>
      );
    }
  };

  const getConversationSubtitle = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      const participantsText = conversation.participants 
        ? `${conversation.participants} participante${conversation.participants > 1 ? 's' : ''}`
        : 'Grupo';
      return `${participantsText} • ${conversation.jid}`;
    } else {
      return conversation.jid;
    }
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          bgcolor: '#111b21'
        }}
      >
        <CircularProgress sx={{ color: '#00a884' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ bgcolor: '#111b21', minHeight: '100vh', p: 3 }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={handleBackClick} sx={{ color: '#e9edef', mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" sx={{ color: '#e9edef' }}>
              Conversas
            </Typography>
          </Box>
          <Alert severity="error" sx={{ bgcolor: '#202c33', color: '#e9edef' }}>
            {error}
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#111b21', minHeight: '100vh' }}>
      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={handleBackClick} sx={{ color: '#e9edef', mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <WhatsAppIcon sx={{ color: '#00a884', mr: 1.5 }} />
            <Box>
              <Typography variant="h4" sx={{ color: '#e9edef', fontWeight: 500 }}>
                Conversas
              </Typography>
              {instanceInfo && (
                <Typography variant="body2" sx={{ color: '#8696a0' }}>
                  {instanceInfo.name} • {instanceInfo.jid}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        {/* Barra de busca */}
        <Paper
          component="form"
          sx={{
            p: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            mb: 3,
            bgcolor: '#202c33',
            border: '1px solid #374045',
            '&:hover': {
              borderColor: '#00a884',
            },
          }}
        >
          <SearchIcon sx={{ m: '10px', color: '#8696a0' }} />
          <InputBase
            sx={{ ml: 1, flex: 1, color: '#e9edef' }}
            placeholder="Buscar conversas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Paper>

        {/* Estatísticas */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Chip
            label={`${conversations.filter(c => c.type === 'contact').length} Contatos`}
            sx={{ 
              bgcolor: '#202c33', 
              color: '#e9edef',
              border: '1px solid #374045'
            }}
          />
          <Chip
            label={`${conversations.filter(c => c.type === 'group').length} Grupos`}
            sx={{ 
              bgcolor: '#202c33', 
              color: '#e9edef',
              border: '1px solid #374045'
            }}
          />
          <Chip
            label={`${filteredConversations.length} Total`}
            sx={{ 
              bgcolor: '#00a884', 
              color: '#fff'
            }}
          />
        </Box>

        {/* Lista de conversas */}
        <Paper sx={{ bgcolor: '#202c33', borderRadius: 2 }}>
          {filteredConversations.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ color: '#8696a0', mb: 1 }}>
                {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa disponível'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#8696a0' }}>
                {searchTerm 
                  ? 'Tente outro termo de busca' 
                  : 'Conecte-se ao WhatsApp para ver suas conversas'
                }
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {filteredConversations.map((conversation, index) => (
                <React.Fragment key={conversation.id}>
                  <ListItem
                    sx={{
                      py: 2,
                      px: 3,
                      '&:hover': {
                        bgcolor: 'rgba(134, 150, 160, 0.05)',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      {getAvatarForConversation(conversation)}
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              color: '#e9edef',
                              fontWeight: 500,
                              flex: 1,
                            }}
                          >
                            {conversation.name}
                          </Typography>
                          {conversation.type === 'group' && conversation.isAdmin && (
                            <Chip
                              label="Admin"
                              size="small"
                              sx={{
                                bgcolor: '#00a884',
                                color: '#fff',
                                fontSize: '0.7rem',
                                height: 20,
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#8696a0',
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                          }}
                        >
                          {getConversationSubtitle(conversation)}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < filteredConversations.length - 1 && (
                    <Divider sx={{ bgcolor: '#374045' }} />
                  )}
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default ChatPage;
