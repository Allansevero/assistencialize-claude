import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, RefreshCw, Monitor, X, Maximize2, Minimize2 } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

export default function WhatsAppManager() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [userId] = useState('user-demo');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadSessions = async () => {
    try {
      const res = await fetch(`${API_URL}/sessions/${userId}`);
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Erro ao carregar sessões:', error);
    }
  };

  const createSession = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          accountName: `Conta ${sessions.length + 1}`
        })
      });
      const data = await res.json();
      
      if (data.success) {
        await loadSessions();
        setTimeout(() => {
          const newSession = sessions.find(s => s.sessionId === data.sessionId) || data;
          connectVNC(newSession);
        }, 3000);
      }
    } catch (error) {
      alert('❌ Erro ao criar sessão: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId) => {
    if (!window.confirm('Deseja realmente encerrar esta sessão?')) return;
    
    try {
      await fetch(`${API_URL}/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      
      if (activeSession?.sessionId === sessionId) {
        setActiveSession(null);
      }
      
      await loadSessions();
    } catch (error) {
      alert('Erro ao deletar sessão: ' + error.message);
    }
  };

  const connectVNC = (session) => {
    setActiveSession(session);
    setIsFullscreen(false);
  };

  const disconnectVNC = () => {
    setActiveSession(null);
    setIsFullscreen(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <Monitor className="w-7 h-7 text-white" />
                </div>
                WhatsApp Multi-Sessão
              </h1>
              <p className="text-gray-600 mt-2">Gerencie múltiplas contas do WhatsApp Web diretamente no navegador</p>
            </div>
            <button
              onClick={createSession}
              disabled={loading}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Nova Conta
                </>
              )}
            </button>
          </div>
        </div>

        {activeSession && (
          <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 ${isFullscreen ? 'p-0' : ''}`}>
            <div className={`bg-white rounded-2xl shadow-2xl overflow-hidden ${isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl h-5/6'}`}>
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Monitor className="w-6 h-6 text-white" />
                  <div>
                    <h3 className="text-white font-semibold text-lg">{activeSession.accountName}</h3>
                    <p className="text-green-100 text-sm">Porta: {activeSession.novncPort}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={toggleFullscreen} className="p-2 hover:bg-green-600 rounded-lg transition-colors">
                    {isFullscreen ? <Minimize2 className="w-5 h-5 text-white" /> : <Maximize2 className="w-5 h-5 text-white" />}
                  </button>
                  <button onClick={disconnectVNC} className="p-2 hover:bg-red-500 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
              <div className={`bg-gray-900 ${isFullscreen ? 'h-[calc(100vh-64px)]' : 'h-full'}`}>
                <iframe
                  ref={iframeRef}
                  src={`http://localhost:${activeSession.novncPort}/vnc.html?autoconnect=true&resize=scale&quality=9`}
                  className="w-full h-full border-0"
                  title={`WhatsApp ${activeSession.accountName}`}
                />
              </div>
            </div>
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Monitor className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Nenhuma sessão ativa</h3>
            <p className="text-gray-600 mb-6">Clique em "Nova Conta" para adicionar sua primeira conta do WhatsApp</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <div key={session.sessionId} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
                  <h3 className="text-white font-semibold text-lg">{session.accountName}</h3>
                  <p className="text-green-100 text-sm">Porta noVNC: {session.novncPort}</p>
                </div>
                <div className="p-4">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-600">Status: Ativa</span>
                    </div>
                    <p className="text-xs text-gray-500">Criada em: {new Date(session.createdAt).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => connectVNC(session)} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2">
                      <Monitor className="w-4 h-4" />
                      Abrir
                    </button>
                    <button onClick={() => deleteSession(session.sessionId)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Como usar
          </h3>
          <ol className="space-y-2 text-sm text-blue-800">
            <li><strong>1.</strong> Clique em "Nova Conta" para criar uma sessão</li>
            <li><strong>2.</strong> Aguarde 5-10 segundos enquanto o container inicia</li>
            <li><strong>3.</strong> O WhatsApp Web abrirá automaticamente no navegador</li>
            <li><strong>4.</strong> Escaneie o QR Code com seu celular normalmente</li>
            <li><strong>5.</strong> Use o botão de tela cheia para melhor experiência</li>
          </ol>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{sessions.length}</div>
            <div className="text-sm text-gray-600">Sessões Ativas</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">
              {sessions.length > 0 ? Math.round(sessions.reduce((sum, s) => sum + (s.novncPort || 0), 0) / sessions.length) : 0}
            </div>
            <div className="text-sm text-gray-600">Porta Média</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">{(sessions.length * 512).toFixed(0)}MB</div>
            <div className="text-sm text-gray-600">RAM Estimada</div>
          </div>
        </div>

        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>💡 Dica: Use o botão de tela cheia para melhor visualização no mobile</p>
          <p className="mt-1">🔒 Todas as conexões são locais e seguras</p>
        </div>
      </div>
    </div>
  );
}
