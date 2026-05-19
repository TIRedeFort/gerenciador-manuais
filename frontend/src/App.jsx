import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LojaProvider } from './context/LojaContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ModuloPage from './pages/ModuloPage';
import AplicacaoPage from './pages/AplicacaoPage';
import ManualView from './pages/ManualView';
import ManualEditor from './pages/ManualEditor';
import Lixeira from './pages/Lixeira';
import BuscarPage from './pages/BuscarPage';
import GerenciarModulos from './pages/GerenciarModulos';
import GerenciarAplicacoes from './pages/GerenciarAplicacoes';
import GerenciarUsuarios from './pages/GerenciarUsuarios';
import GerenciarLojas from './pages/GerenciarLojas';
import AlterarSenha from './pages/AlterarSenha';
import RankingPage from './pages/RankingPage';
import LojaPage from './pages/LojaPage';

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="container">
          {children}
        </div>
      </main>
    </div>
  );
}

// Componente que verifica se está logado
function RequireAuth({ children }) {
  const { isAuthenticated, loading, primeiroLogin } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen" style={{ height: '100vh' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirecionar para alteração de senha no primeiro login
  if (primeiroLogin && window.location.pathname !== '/alterar-senha') {
    return <Navigate to="/alterar-senha" replace />;
  }

  return children;
}

function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <ThemeProvider>
      <AuthProvider>
        <LojaProvider>
          <Router basename={basename}>
            <Routes>
              {/* Login - única rota pública */}
              <Route path="/login" element={<Login />} />

            {/* Todas as outras rotas exigem login */}
            <Route path="/" element={
              <RequireAuth>
                <AppLayout><Dashboard /></AppLayout>
              </RequireAuth>
            } />
            <Route path="/modulo/:id" element={
              <RequireAuth>
                <AppLayout><ModuloPage /></AppLayout>
              </RequireAuth>
            } />
            <Route path="/aplicacao/:id" element={
              <RequireAuth>
                <AppLayout><AplicacaoPage /></AppLayout>
              </RequireAuth>
            } />
            <Route path="/manual/:id" element={
              <RequireAuth>
                <AppLayout><ManualView /></AppLayout>
              </RequireAuth>
            } />
            <Route path="/buscar" element={
              <RequireAuth>
                <AppLayout><BuscarPage /></AppLayout>
              </RequireAuth>
            } />
            <Route path="/ranking" element={
              <RequireAuth>
                <AppLayout><RankingPage /></AppLayout>
              </RequireAuth>
            } />
            <Route path="/alterar-senha" element={
              <RequireAuth>
                <AlterarSenha />
              </RequireAuth>
            } />

            {/* Rotas protegidas (criação de manuais - TI e Colaboradores) */}
            <Route path="/editor" element={
              <RequireAuth>
                <ProtectedRoute requireManualCreation>
                  <AppLayout><ManualEditor /></AppLayout>
                </ProtectedRoute>
              </RequireAuth>
            } />
            <Route path="/editor/:id" element={
              <RequireAuth>
                <ProtectedRoute requireManualCreation>
                  <AppLayout><ManualEditor /></AppLayout>
                </ProtectedRoute>
              </RequireAuth>
            } />
            <Route path="/lixeira" element={
              <RequireAuth>
                <ProtectedRoute requireTI>
                  <AppLayout><Lixeira /></AppLayout>
                </ProtectedRoute>
              </RequireAuth>
            } />
            <Route path="/gerenciar/modulos" element={
              <RequireAuth>
                <ProtectedRoute requireTI>
                  <AppLayout><GerenciarModulos /></AppLayout>
                </ProtectedRoute>
              </RequireAuth>
            } />
            <Route path="/gerenciar/aplicacoes/:moduloId" element={
              <RequireAuth>
                <ProtectedRoute requireTI>
                  <AppLayout><GerenciarAplicacoes /></AppLayout>
                </ProtectedRoute>
              </RequireAuth>
            } />
            <Route path="/gerenciar/usuarios" element={
              <RequireAuth>
                <ProtectedRoute requireTI>
                  <AppLayout><GerenciarUsuarios /></AppLayout>
                </ProtectedRoute>
              </RequireAuth>
            } />
            <Route path="/gerenciar/lojas" element={
              <RequireAuth>
                <ProtectedRoute requireTI>
                  <AppLayout><GerenciarLojas /></AppLayout>
                </ProtectedRoute>
              </RequireAuth>
            } />

            {/* Rotas para lojas */}
            <Route path="/loja/:numero" element={
              <RequireAuth>
                <AppLayout><LojaPage /></AppLayout>
              </RequireAuth>
            } />

            {/* Rotas de módulo/aplicação/manual dentro do contexto de loja */}
            <Route path="/loja/:numero/modulo/:id" element={
              <RequireAuth>
                <AppLayout><ModuloPage /></AppLayout>
              </RequireAuth>
            } />
            <Route path="/loja/:numero/aplicacao/:id" element={
              <RequireAuth>
                <AppLayout><AplicacaoPage /></AppLayout>
              </RequireAuth>
            } />
            <Route path="/loja/:numero/manual/:id" element={
              <RequireAuth>
                <AppLayout><ManualView /></AppLayout>
              </RequireAuth>
            } />

            {/* Redireciona qualquer rota desconhecida para login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
        </LojaProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
