import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress, Paper } from '@mui/material';
import apiClient from '../api/axiosConfig';

interface Instance {
  id: number;
  name: string;
  token: string;
  connected: boolean;
}

interface InstanceDetailProps {
  instance: Instance | null;
  onUpdate: () => void; // Função para atualizar a lista de instâncias
}

const InstanceDetail: React.FC<InstanceDetailProps> = ({ instance, onUpdate }) => {
  const [qrCode, setQrCode] = useState<string>('');
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  // Limpa o QR code quando a instância selecionada muda
  useEffect(() => {
    setQrCode('');
  }, [instance]);

  const handleConnect = async () => {
    if (!instance) return;
    setIsLoadingQr(true);
    setQrCode('');
    try {
      // 1. Inicia a conexão
      await apiClient.post('/api/v1/session/connect', null, {
        headers: { token: instance.token }
      });

      // 2. Começa a pedir o QR code
      // Em uma aplicação real, usaríamos WebSockets, mas por enquanto, vamos pedir algumas vezes.
      const interval = setInterval(async () => {
        try {
          const response = await apiClient.get('/api/v1/session/qr', {
            headers: { token: instance.token }
          });
          if (response.data.QRCode) {
            setQrCode(response.data.QRCode);
            setIsLoadingQr(false);
            clearInterval(interval);
            // Inicia a verificação de status
            checkStatusLoop();
          }
        } catch (error) {
          console.error('Erro ao buscar QR code:', error);
        }
        }, 3000); // Pede a cada 3 segundos (reduzido de 2 para 3)

    } catch (error) {
      console.error('Erro ao conectar instância:', error);
      setIsLoadingQr(false);
    }
  };

  const checkStatusLoop = () => {
    const statusInterval = setInterval(async () => {
        if(!instance) {
            clearInterval(statusInterval);
            return;
        }
        try {
            const statusResponse = await apiClient.get('/api/v1/session/status', {
                headers: { token: instance.token }
            });
            if(statusResponse.data.LoggedIn){
                console.log("Conectado com sucesso!");
                onUpdate(); // Chama a função para atualizar o dashboard
                setQrCode('');
                clearInterval(statusInterval);
            }
        } catch(e){
            console.error("Erro ao verificar status", e);
            clearInterval(statusInterval); // Para o polling em caso de erro
        }
    }, 5000); // Verifica a cada 5 segundos (reduzido de 3 para 5)
  }


  if (!instance) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h4" sx={{ color: '#e9edef' }}>
          Bem-vindo!
        </Typography>
        <Typography sx={{ color: '#8696a0' }}>
          Selecione uma instância na barra lateral para começar ou crie uma nova no botão '+'.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, bgcolor: '#202c33', color: '#e9edef' }}>
      <Typography variant="h5" gutterBottom>
        {instance.name}
      </Typography>
      <Typography variant="body1" sx={{ color: instance.connected ? '#00a884' : '#ea4335' }}>
        Status: {instance.connected ? 'Conectado' : 'Desconectado'}
      </Typography>

      <Box sx={{ mt: 3 }}>
        {!instance.connected && !qrCode && (
          <Button variant="contained" onClick={handleConnect} disabled={isLoadingQr}>
            {isLoadingQr ? <CircularProgress size={24} /> : 'Conectar e Obter QR Code'}
          </Button>
        )}

        {qrCode && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography>Leia o QR Code com o seu WhatsApp:</Typography>
            <img src={qrCode} alt="QR Code" style={{ width: '250px', height: '250px', marginTop: '10px' }} />
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default InstanceDetail;
