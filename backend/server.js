// server.js
const express = require('express');
const Docker = require('dockerode');
const cors = require('cors');
const net = require('net');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const docker = new Docker({ 
  socketPath: '/home/grupoteaser/.docker/desktop/docker.sock' 
});

app.use(cors());
app.use(express.json());

// Armazenar sessões ativas (em produção, usar banco de dados)
const sessions = new Map();

// Testar conexão com Docker
async function testDockerConnection() {
  try {
    const images = await docker.listImages();
    console.log('✅ Docker conectado com sucesso!');
    console.log(`📦 ${images.length} imagens disponíveis`);
    
    const whatsappImage = images.find(img => 
      img.RepoTags && img.RepoTags.some(tag => tag.includes('whatsapp-vnc'))
    );
    
    if (whatsappImage) {
      console.log('✅ Imagem whatsapp-vnc encontrada:', whatsappImage.RepoTags);
    } else {
      console.error('❌ ERRO: Imagem whatsapp-vnc não encontrada!');
      console.error('Execute: cd docker-image && docker build -t whatsapp-vnc:latest .');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro ao conectar no Docker:', error.message);
    console.error('Certifique-se que o Docker Desktop está rodando');
    process.exit(1);
  }
}

// Função para encontrar porta disponível
async function findAvailablePort(startPort = 6080) {
  return new Promise((resolve, reject) => {
    const port = startPort;
    const testServer = net.createServer();
    
    testServer.listen(port, () => {
      testServer.once('close', () => resolve(port));
      testServer.close();
    });
    
    testServer.on('error', () => {
      resolve(findAvailablePort(port + 1));
    });
  });
}

// Criar nova sessão WhatsApp
app.post('/api/sessions', async (req, res) => {
  try {
    const { userId, accountName } = req.body;
    const sessionId = `whatsapp-${userId}-${Date.now()}`;
    
    // Encontrar porta disponível para noVNC
    const novncPort = await findAvailablePort(6080);
    
    // Criar container
    const container = await docker.createContainer({
      Image: 'whatsapp-vnc:latest',
      name: sessionId,
      Env: [`VNC_PASSWORD=secure${Math.random().toString(36).substr(2, 9)}`],
      HostConfig: {
        PortBindings: {
          '6080/tcp': [{ HostPort: novncPort.toString() }]
        },
        AutoRemove: true,
        Memory: 512 * 1024 * 1024, // 512MB
        NanoCpus: 1000000000 // 1 CPU
      }
    });

    await container.start();

    // Armazenar sessão
    sessions.set(sessionId, {
      containerId: container.id,
      userId,
      accountName,
      novncPort,
      createdAt: new Date(),
      status: 'running'
    });

    res.json({
      success: true,
      sessionId,
      novncPort,
      novncUrl: `http://localhost:${novncPort}/vnc.html?autoconnect=true&resize=scale`
    });

  } catch (error) {
    console.error('Erro ao criar sessão:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Proxy WebSocket para noVNC
app.use('/vnc/:sessionId', (req, res, next) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada' });
  }

  const proxy = createProxyMiddleware({
    target: `http://localhost:${session.novncPort}`,
    changeOrigin: true,
    ws: true,
    pathRewrite: {
      [`^/vnc/${sessionId}`]: ''
    }
  });

  return proxy(req, res, next);
});

// Listar sessões do usuário
app.get('/api/sessions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userSessions = Array.from(sessions.entries())
      .filter(([_, session]) => session.userId === userId)
      .map(([sessionId, session]) => ({
        sessionId,
        ...session
      }));

    res.json({ success: true, sessions: userSessions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Parar sessão
app.delete('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Sessão não encontrada' });
    }

    const container = docker.getContainer(session.containerId);
    await container.stop();
    
    sessions.delete(sessionId);

    res.json({ success: true, message: 'Sessão encerrada' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Status do sistema
app.get('/api/status', async (req, res) => {
  try {
    const containers = await docker.listContainers();
    const whatsappContainers = containers.filter(c => 
      c.Names.some(name => name.includes('whatsapp'))
    );

    res.json({
      success: true,
      activeSessions: sessions.size,
      activeContainers: whatsappContainers.length,
      containers: whatsappContainers
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Limpar sessões órfãs ao iniciar
async function cleanupOrphanSessions() {
  try {
    const containers = await docker.listContainers({ all: true });
    const whatsappContainers = containers.filter(c => 
      c.Names.some(name => name.includes('whatsapp'))
    );

    for (const containerInfo of whatsappContainers) {
      const container = docker.getContainer(containerInfo.Id);
      try {
        await container.stop();
        await container.remove();
      } catch (err) {
        console.log('Container já parado:', containerInfo.Id);
      }
    }
    console.log('Limpeza de containers órfãos concluída');
  } catch (error) {
    console.error('Erro na limpeza:', error);
  }
}

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, async () => {
  await testDockerConnection();
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  await cleanupOrphanSessions();
  console.log('✅ Sistema pronto para criar sessões WhatsApp');
});

// Habilitar WebSocket upgrade para proxy noVNC
server.on('upgrade', (req, socket, head) => {
  const sessionId = req.url.split('/')[2];
  const session = sessions.get(sessionId);
  
  if (session) {
    const proxy = createProxyMiddleware({
      target: `http://localhost:${session.novncPort}`,
      ws: true
    });
    proxy.upgrade(req, socket, head);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Encerrando servidor...');
  for (const [sessionId, session] of sessions.entries()) {
    try {
      const container = docker.getContainer(session.containerId);
      await container.stop();
    } catch (err) {
      console.error(`Erro ao parar container ${sessionId}:`, err);
    }
  }
  process.exit(0);
});