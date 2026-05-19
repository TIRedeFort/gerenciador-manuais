import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import api from '../services/api';

function AlterarSenha() {
    const navigate = useNavigate();
    const { user, logout, updateUser } = useAuth();
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (novaSenha.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        if (novaSenha !== confirmarSenha) {
            setError('As senhas não coincidem');
            return;
        }

        setLoading(true);
        try {
            await api.put('/auth/alterar-senha', { novaSenha });

            // Atualizar usuário para não mostrar mais a tela de primeiro login
            if (updateUser) {
                updateUser({ ...user, primeiroLogin: false });
            }

            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao alterar senha');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="alterar-senha-page">
            <div className="alterar-senha-container">
                <div className="alterar-senha-card">
                    <div className="card-icon">
                        <KeyRound size={40} />
                    </div>

                    <h1>Cadastrar Nova Senha</h1>
                    <p className="subtitle">
                        Este é seu primeiro acesso. Por favor, cadastre uma nova senha para continuar.
                    </p>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="novaSenha">Nova Senha</label>
                            <div className="input-wrapper">
                                <Lock className="input-icon" size={20} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="novaSenha"
                                    value={novaSenha}
                                    onChange={(e) => setNovaSenha(e.target.value)}
                                    placeholder="Digite sua nova senha"
                                    required
                                    minLength={6}
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

                        <div className="form-group">
                            <label htmlFor="confirmarSenha">Confirmar Senha</label>
                            <div className="input-wrapper">
                                <Lock className="input-icon" size={20} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="confirmarSenha"
                                    value={confirmarSenha}
                                    onChange={(e) => setConfirmarSenha(e.target.value)}
                                    placeholder="Confirme sua nova senha"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-full"
                            disabled={loading}
                        >
                            {loading ? 'Salvando...' : 'Salvar Nova Senha'}
                        </button>
                    </form>
                </div>
            </div>

            <style>{`
                .alterar-senha-page {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-primary);
                    padding: var(--space-4);
                }

                .alterar-senha-container {
                    width: 100%;
                    max-width: 420px;
                }

                .alterar-senha-card {
                    background: var(--gradient-card);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-xl);
                    padding: var(--space-8);
                    text-align: center;
                }

                .card-icon {
                    width: 80px;
                    height: 80px;
                    background: var(--accent-gradient);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    margin: 0 auto var(--space-6);
                }

                .alterar-senha-card h1 {
                    font-size: var(--font-size-2xl);
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: var(--space-2);
                }

                .subtitle {
                    color: var(--text-secondary);
                    margin-bottom: var(--space-6);
                    line-height: 1.6;
                }

                .error-message {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    color: var(--danger-color);
                    padding: var(--space-3) var(--space-4);
                    border-radius: var(--radius-md);
                    font-size: var(--font-size-sm);
                    margin-bottom: var(--space-4);
                }

                .form-group {
                    margin-bottom: var(--space-5);
                    text-align: left;
                }

                .form-group label {
                    display: block;
                    font-size: var(--font-size-sm);
                    font-weight: 500;
                    color: var(--text-secondary);
                    margin-bottom: var(--space-2);
                }

                .input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .input-icon {
                    position: absolute;
                    left: var(--space-3);
                    color: var(--text-muted);
                }

                .input-wrapper input {
                    width: 100%;
                    padding: var(--space-3) var(--space-10);
                    padding-right: var(--space-10);
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    color: var(--text-primary);
                    font-size: var(--font-size-base);
                    transition: border-color var(--transition-fast);
                }

                .input-wrapper input:focus {
                    outline: none;
                    border-color: var(--accent-color);
                }

                .password-toggle {
                    position: absolute;
                    right: var(--space-3);
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: var(--space-1);
                }

                .password-toggle:hover {
                    color: var(--text-primary);
                }

                .w-full {
                    width: 100%;
                }
            `}</style>
        </div>
    );
}

export default AlterarSenha;
