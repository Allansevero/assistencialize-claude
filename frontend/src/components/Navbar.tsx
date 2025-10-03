import React, { useContext } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import LogoutIcon from '@mui/icons-material/Logout';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

const Navbar: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    auth?.logout();
    navigate('/login');
  };

  if (!auth?.isAuthenticated) {
    return null;
  }

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: '#202c33',
        borderBottom: '1px solid',
        borderColor: '#374045',
      }}
    >
      <Container
        maxWidth={false}
        sx={{
          maxWidth: { lg: '1200px', xl: '1400px' }
        }}
      >
        <Toolbar disableGutters>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
            <WhatsAppIcon sx={{ color: '#00a884', mr: 1.5, fontSize: '28px' }} />
            <Typography
              variant="h6"
              noWrap
              sx={{
                color: '#e9edef',
                fontWeight: 500,
                letterSpacing: '.5px',
                textDecoration: 'none',
              }}
            >
              Assistencialize
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Button
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            sx={{
              color: '#8696a0',
              '&:hover': {
                color: '#ea4335',
              },
            }}
          >
            Sair
          </Button>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;