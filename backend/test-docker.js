const Docker = require('dockerode');
const docker = new Docker();

async function test() {
  try {
    const images = await docker.listImages();
    console.log('✅ Docker conectado!');
    console.log('Imagens:', images.map(i => i.RepoTags).flat());
    
    const whatsapp = images.find(i => i.RepoTags?.includes('whatsapp-vnc:latest'));
    if (whatsapp) {
      console.log('✅ Imagem whatsapp-vnc:latest encontrada!');
    } else {
      console.log('❌ Imagem whatsapp-vnc:latest NÃO encontrada');
    }
  } catch (error) {
    console.error('❌ Erro ao conectar no Docker:', error.message);
  }
}

test();