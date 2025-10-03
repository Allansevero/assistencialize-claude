import React from 'react';
import { Box } from '@mui/material';
import Navbar from './Navbar'; // A sua Navbar existente

interface MainLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ sidebar, children }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#0b141a' }}>
      <Navbar />
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <Box
          sx={{
            width: '80px', // Largura da sidebar
            bgcolor: '#111b21',
            borderRight: '1px solid #374045',
            display: 'flex',
            flexDirection: 'column',
            p: 1,
          }}
        >
          {sidebar}
        </Box>

        {/* Área de Conteúdo Principal */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            overflowY: 'auto', // Permite scroll na área de conteúdo
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
