import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (loginCredential, senha) => {
        try {
            const response = await authService.login(loginCredential, senha);
            const { token, user: userData } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'Erro ao fazer login'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setShowTimeoutModal(false);
    };

    const updateUser = (updatedUser) => {
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
    };

    // Auto-logout por inatividade
    const [showTimeoutModal, setShowTimeoutModal] = useState(false);
    const [countdown, setCountdown] = useState(60);

    // Refs para manter valores entre renderizações sem disparar re-renders ou efeitos
    const lastActivityRef = useRef(Date.now());
    const isModalOpenRef = useRef(false);

    // Atualiza o ref quando o estado muda para que o interval veja o valor atual
    useEffect(() => {
        isModalOpenRef.current = showTimeoutModal;
    }, [showTimeoutModal]);

    useEffect(() => {
        if (!user) return;

        // Inicializa o tempo ao montar/logar
        lastActivityRef.current = Date.now();

        // Configuração FINAL:
        const WARNING_MS = 3540000; // 59 minutos
        const TIMEOUT_MS = 3600000; // 60 minutos

        // Configuração para TESTE RÁPIDO (Manter comentado):
        // const WARNING_MS = 10000;
        // const TIMEOUT_MS = 20000;

        const CHECK_INTERVAL_MS = 1000;

        const updateActivity = () => {
            // Só atualiza lastActivity se o modal NÃO estiver aberto
            if (!isModalOpenRef.current) {
                lastActivityRef.current = Date.now();
            }
        };

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach(event => window.addEventListener(event, updateActivity));

        const intervalId = setInterval(() => {
            const now = Date.now();
            const timeElapsed = now - lastActivityRef.current;

            if (timeElapsed > TIMEOUT_MS) {
                setShowTimeoutModal(false); // Fecha modal se estiver aberto
                logout();
            } else if (timeElapsed > WARNING_MS) {
                // Se já passou do tempo de aviso...
                if (!isModalOpenRef.current) {
                    // Abre o modal se não estiver aberto
                    setShowTimeoutModal(true);
                }
                // Atualiza countdown
                const remaining = Math.ceil((TIMEOUT_MS - timeElapsed) / 1000);
                setCountdown(remaining > 0 ? remaining : 0);
            } else {
                // Se o tempo é menor que o warning (provavelmente usuário interagiu)
                if (isModalOpenRef.current) {
                    // Fecha o modal se estiver aberto
                    setShowTimeoutModal(false);
                }
            }
        }, CHECK_INTERVAL_MS);

        return () => {
            events.forEach(event => window.removeEventListener(event, updateActivity));
            clearInterval(intervalId);
        };
    }, [user]); // Rodar efeito se usuário mudar (login/logout)

    const handleContinueSession = () => {
        // Ao clicar em continuar, fechamos o modal
        setShowTimeoutModal(false);
        // E atualizamos a atividade manualmente para garantir
        lastActivityRef.current = Date.now();
    };

    const isAuthenticated = !!user;
    const isTI = user?.perfil === 'TI';
    const isColaborador = user?.perfil === 'COLABORADOR';
    const isLoja = user?.perfil?.startsWith('LOJA');
    const hasLojaRestriction = user?.lojasPermitidas && user.lojasPermitidas.length > 0;
    // Colaborador só pode criar/editar se tiver lojas atribuídas
    const canCreateManual = user?.perfil === 'TI' || (user?.perfil === 'COLABORADOR' && hasLojaRestriction);
    const primeiroLogin = user?.primeiroLogin === true;

    // Extract store number from profile (e.g., LOJA02 -> 02) or use existing property
    const numeroLoja = user?.numeroLoja || (isLoja ? user.perfil.replace('LOJA', '') : null);

    const value = {
        user,
        loading,
        login,
        logout,
        updateUser,
        isAuthenticated,
        isTI,
        isColaborador,
        isLoja,
        canCreateManual,
        primeiroLogin,
        numeroLoja,
        hasLojaRestriction
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
            {showTimeoutModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(4px)'
                }}>
                    <div className="card" style={{ maxWidth: '400px', width: '90%', animate: 'zoomIn 0.3s ease' }}>
                        <div style={{ textAlign: 'center', padding: '1rem' }}>
                            <h2 className="heading-3" style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Sessão Expirando</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                Sua sessão será encerrada em <strong style={{ color: 'var(--accent-color)', fontSize: '1.2em' }}>{countdown}</strong> segundos por inatividade.
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button
                                    onClick={logout}
                                    className="btn btn-secondary"
                                >
                                    Sair agora
                                </button>
                                <button
                                    onClick={handleContinueSession}
                                    className="btn btn-primary"
                                >
                                    Continuar logado
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser usado dentro de AuthProvider');
    }
    return context;
}
