import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Eye, EyeOff, LogIn, Sun, Moon } from 'lucide-react';

function Login() {
    const [login, setLogin] = useState('');
    const [senha, setSenha] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login: authLogin } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await authLogin(login, senha);

        if (result.success) {
            // Verificar se o usuário logado retornou userData com número da loja
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const userData = JSON.parse(storedUser);
                if (userData.perfil === 'LOJA' && userData.numeroLoja) {
                    // Redirecionar para a página da loja
                    navigate(`/loja/${userData.numeroLoja}`);
                } else {
                    navigate('/');
                }
            } else {
                navigate('/');
            }
        } else {
            setError(result.error);
        }

        setLoading(false);
    };

    return (
        <div className="login-page">
            {/* Theme Toggle */}
            <button className="theme-toggle-corner" onClick={toggleTheme} title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}>
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="login-container">
                <div className="login-card">
                    {/* Logo */}
                    <div className="login-header">
                        <img src="/fort-logo.png" alt="Fort" className="login-logo-img" />
                        <h1 className="login-title">Fort Supermercados</h1>
                        <p className="login-subtitle">Manuais de Processos</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="login-form">
                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label" htmlFor="login">
                                Login
                            </label>
                            <input
                                type="text"
                                id="login"
                                className="form-input"
                                value={login}
                                onChange={(e) => setLogin(e.target.value.toLowerCase())}
                                placeholder="Digite seu login"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="senha">
                                Senha
                            </label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="senha"
                                    className="form-input"
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    placeholder="Digite sua senha"
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-full"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="loading-dots">Entrando</span>
                            ) : (
                                <>
                                    <LogIn size={20} />
                                    Entrar
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Background decoration */}
                <div className="login-decoration">
                    <div className="decoration-circle circle-1" />
                    <div className="decoration-circle circle-2" />
                    <div className="decoration-circle circle-3" />
                </div>
            </div>

            <style>{`
                .login-page {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: var(--space-4);
                    position: relative;
                }

                .theme-toggle-corner {
                    position: absolute;
                    top: var(--space-4);
                    right: var(--space-4);
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    padding: var(--space-3);
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .theme-toggle-corner:hover {
                    color: var(--accent-color);
                    border-color: var(--accent-color);
                }

                .login-container {
                    position: relative;
                    width: 100%;
                    max-width: 440px;
                }

                .login-card {
                    background: var(--gradient-card);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-2xl);
                    padding: var(--space-10);
                    backdrop-filter: blur(20px);
                    position: relative;
                    z-index: 1;
                }

                .login-header {
                    text-align: center;
                    margin-bottom: var(--space-8);
                }

                .login-logo-img {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto var(--space-4);
                    object-fit: contain;
                }

                .login-title {
                    font-size: var(--font-size-2xl);
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: var(--space-1);
                }

                .login-subtitle {
                    color: var(--text-muted);
                    font-size: var(--font-size-sm);
                }

                .login-form {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-5);
                }

                .error-message {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    color: var(--danger-500);
                    padding: var(--space-3) var(--space-4);
                    border-radius: var(--radius-lg);
                    font-size: var(--font-size-sm);
                    text-align: center;
                }

                .password-input-wrapper {
                    position: relative;
                }

                .password-input-wrapper .form-input {
                    padding-right: var(--space-12);
                }

                .password-toggle {
                    position: absolute;
                    right: var(--space-3);
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: var(--space-2);
                    display: flex;
                    transition: color var(--transition-fast);
                }

                .password-toggle:hover {
                    color: var(--text-primary);
                }

                .loading-dots::after {
                    content: '';
                    animation: dots 1.5s infinite;
                }

                @keyframes dots {
                    0%, 20% { content: '.'; }
                    40% { content: '..'; }
                    60%, 100% { content: '...'; }
                }

                .login-footer {
                    margin-top: var(--space-6);
                    text-align: center;
                }

                .back-link {
                    color: var(--text-muted);
                    font-size: var(--font-size-sm);
                    text-decoration: none;
                    transition: color var(--transition-fast);
                }

                .back-link:hover {
                    color: var(--primary-400);
                }

                .login-decoration {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                    pointer-events: none;
                }

                .decoration-circle {
                    position: absolute;
                    border-radius: 50%;
                    background: var(--gradient-primary);
                    opacity: 0.1;
                    filter: blur(60px);
                }

                .circle-1 {
                    width: 300px;
                    height: 300px;
                    top: -100px;
                    right: -100px;
                }

                .circle-2 {
                    width: 200px;
                    height: 200px;
                    bottom: -50px;
                    left: -80px;
                }

                .circle-3 {
                    width: 150px;
                    height: 150px;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    opacity: 0.05;
                }
            `}</style>
        </div>
    );
}

export default Login;
