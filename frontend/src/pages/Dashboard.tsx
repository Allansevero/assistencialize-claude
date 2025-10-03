import React, { useEffect, useState } from 'react';
import {
    Box, IconButton, Tooltip, Avatar, CircularProgress, Typography, Dialog,
    DialogTitle, DialogContent, TextField, DialogActions, Button
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { v4 as uuidv4 } from 'uuid';
import MainLayout from '../components/MainLayout';
import apiClient from '../api/axiosConfig';
import InstanceDetail from '../components/InstanceDetail'; // <-- IMPORTAÇÃO NOVA

interface Instance {
  id: number;
  name: string;
  token: string;
  connected: boolean;
  jid?: string;
}

const Dashboard: React.FC = () => {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');

    const fetchInstances = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/v1/instances');
      const fetchedInstances = response.data.instances || [];
      setInstances(fetchedInstances);

      // Atualiza os dados da instância selecionada, se houver
      if (selectedInstance) {
        const updatedInstance = fetchedInstances.find((inst: Instance) => inst.id === selectedInstance.id);
        if(updatedInstance) {
            setSelectedInstance(updatedInstance);
        }
      }

      return fetchedInstances;
      } catch (error) {
        console.error('Erro ao buscar instâncias:', error);
      return [];
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchInstances();
  }, []);

  const handleOpenCreateDialog = () => {
    setNewInstanceName('');
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  const handleConfirmCreateInstance = async () => {
    if (!newInstanceName) return;
    try {
      const newInstanceData = {
        name: newInstanceName,
        token: uuidv4(),
        webhook: "",
        events: "All",
      };
      
      const response = await apiClient.post('/api/v1/instances', newInstanceData);
      const newInstanceId = response.data.id;
      
      handleCloseCreateDialog();
      
      // Buscar a lista atualizada de instâncias
      const updatedInstances = await fetchInstances();
      
      // Selecionar automaticamente a nova instância criada
      const newInstance = updatedInstances.find((inst: Instance) => inst.id === newInstanceId);
      if (newInstance) {
        setSelectedInstance(newInstance);
      }
      
    } catch (error) {
      console.error('Erro ao criar instância:', error);
    }
  };

  const handleSelectInstance = (instance: Instance) => {
    // Se a instância já estiver selecionada, deselecione-a
    if (selectedInstance && selectedInstance.id === instance.id) {
      setSelectedInstance(null);
    } else {
      setSelectedInstance(instance);
    }
  };

  const SidebarContent = (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {loading ? (
            <CircularProgress sx={{ display: 'block', margin: '20px auto' }} />
          ) : (
            instances.map((instance) => (
              <Tooltip title={instance.name} placement="right" key={instance.id}>
                <IconButton
                  onClick={() => handleSelectInstance(instance)}
            sx={{ 
                    mb: 1,
                    bgcolor: selectedInstance?.id === instance.id ? '#00a884' : 'transparent',
                    '&:hover': { bgcolor: '#202c33' }
                  }}
                >
                  {instance.connected ? (
                    <Avatar 
                      sx={{ width: 48, height: 48 }}
                      src={`http://localhost:8080/api/v1/instances/${instance.id}/avatar`}
                      onError={(e) => {
                        // Fallback para ícone do WhatsApp se não conseguir carregar o avatar
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div style="width: 48px; height: 48px; background-color: #00a884; border-radius: 50%; display: flex; align-items: center; justify-content: center;"><svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/></svg></div>';
                        }
                      }}
                    />
                  ) : (
                    <Avatar sx={{ width: 48, height: 48, bgcolor: '#374045' }}>
                      {instance.name.charAt(0).toUpperCase()}
                    </Avatar>
                  )}
                </IconButton>
              </Tooltip>
            ))
          )}
        </Box>
        <Tooltip title="Criar Nova Instância" placement="right">
          <IconButton
            onClick={handleOpenCreateDialog}
            sx={{ 
              width: 48,
              height: 48,
              bgcolor: '#202c33',
              color: '#00a884',
              mt: 'auto',
              '&:hover': { bgcolor: '#374045' }
            }}
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
    </Box>
  );

  return (
    <>
      <MainLayout sidebar={SidebarContent}>
        {/* O CONTEÚDO PRINCIPAL AGORA É O NOSSO NOVO COMPONENTE */}
        <InstanceDetail instance={selectedInstance} onUpdate={fetchInstances} />
      </MainLayout>

      {/* Diálogo para Criar Nova Instância */}
      <Dialog open={createDialogOpen} onClose={handleCloseCreateDialog}>
        <DialogTitle>Criar Nova Instância</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Nome da Instância"
            type="text"
            fullWidth
            variant="standard"
            value={newInstanceName}
            onChange={(e) => setNewInstanceName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancelar</Button>
          <Button onClick={handleConfirmCreateInstance}>Criar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Dashboard;