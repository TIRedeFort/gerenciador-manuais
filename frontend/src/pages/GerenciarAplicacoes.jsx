import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { aplicacaoService, moduloService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, Folder, ArrowLeft, Save, X } from 'lucide-react';

function GerenciarAplicacoes() {
    const { moduloId } = useParams();
    const { isTI } = useAuth();
    const [modulo, setModulo] = useState(null);
    const [aplicacoes, setAplicacoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ nome_aplicacao: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [moduloId]);

    const loadData = async () => {
        try {
            const [moduloRes, appsRes] = await Promise.all([
                moduloService.buscarPorId(moduloId),
                aplicacaoService.listarPorModulo(moduloId)
            ]);
            setModulo(moduloRes.data);
            setAplicacoes(appsRes.data);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = { ...formData, id_modulo: parseInt(moduloId) };
            if (editingId) {
                await aplicacaoService.atualizar(editingId, data);
            } else {
                await aplicacaoService.criar(data);
            }
            loadData();
            resetForm();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert(error.response?.data?.error || 'Erro ao salvar aplicação');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (app) => {
        setEditingId(app.ID_APLICACAO);
        setFormData({ nome_aplicacao: app.NOME_APLICACAO });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Deseja excluir esta aplicação?')) {
            try {
                await aplicacaoService.excluir(id);
                loadData();
            } catch (error) {
                alert(error.response?.data?.error || 'Erro ao excluir');
            }
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({ nome_aplicacao: '' });
    };

    if (!isTI) {
        return (
            <div className="page-content">
                <div className="container">
                    <div className="empty-state">
                        <h2>Acesso Negado</h2>
                        <p>Apenas usuários TI podem gerenciar aplicações.</p>
                        <Link to="/" className="btn btn-primary">Voltar ao início</Link>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="page-content">
                <div className="container">
                    <div className="loading-screen">
                        <div className="loading-spinner" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content animate-fadeIn">
            <div className="container">
                <Link to="/gerenciar/modulos" className="btn btn-ghost mb-4">
                    <ArrowLeft size={18} />
                    Voltar para Módulos
                </Link>

                <header className="admin-header">
                    <div className="header-content">
                        <div className="header-icon-box">
                            <Folder size={28} />
                        </div>
                        <div>
                            <p className="header-subtitle">{modulo?.NOME_MODULO}</p>
                            <h1 className="heading-2">Gerenciar Aplicações</h1>
                        </div>
                    </div>
                    <button onClick={() => setShowForm(true)} className="btn btn-primary">
                        <Plus size={18} />
                        Nova Aplicação
                    </button>
                </header>

                {/* Form */}
                {showForm && (
                    <div className="admin-form-card">
                        <form onSubmit={handleSubmit} className="admin-form">
                            <h3>{editingId ? 'Editar Aplicação' : 'Nova Aplicação'}</h3>

                            <div className="form-group">
                                <label className="form-label">Nome da Aplicação *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.nome_aplicacao}
                                    onChange={(e) => setFormData({ ...formData, nome_aplicacao: e.target.value })}
                                    placeholder="Ex: Cadastro de Produtos, Contas a Pagar..."
                                    required
                                />
                            </div>

                            <div className="form-actions">
                                <button type="button" onClick={resetForm} className="btn btn-secondary">
                                    <X size={18} />
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    <Save size={18} />
                                    {saving ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Lista */}
                <div className="admin-list">
                    {aplicacoes.map(app => (
                        <div key={app.ID_APLICACAO} className="admin-item">
                            <div className="item-icon">
                                <Folder size={24} />
                            </div>
                            <div className="item-info">
                                <h4>{app.NOME_APLICACAO}</h4>
                                <Link to={`/aplicacao/${app.ID_APLICACAO}`} className="item-link">
                                    Ver manuais →
                                </Link>
                            </div>
                            <div className="item-actions">
                                <button onClick={() => handleEdit(app)} className="btn btn-ghost" title="Editar">
                                    <Edit size={18} />
                                </button>
                                <button onClick={() => handleDelete(app.ID_APLICACAO)} className="btn btn-ghost danger" title="Excluir">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {aplicacoes.length === 0 && (
                        <div className="empty-state">
                            <Folder className="empty-state-icon" />
                            <h3 className="empty-state-title">Nenhuma aplicação</h3>
                            <p className="empty-state-description">
                                Adicione a primeira aplicação para este módulo.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .admin-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--space-8);
                    gap: var(--space-4);
                }

                .header-content {
                    display: flex;
                    align-items: center;
                    gap: var(--space-4);
                }

                .header-icon-box {
                    width: 56px;
                    height: 56px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--gradient-primary);
                    border-radius: var(--radius-xl);
                    color: white;
                }

                .header-subtitle {
                    color: var(--accent-color);
                    font-size: var(--font-size-sm);
                    font-weight: 500;
                    margin-bottom: var(--space-1);
                }

                .admin-form-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-xl);
                    padding: var(--space-6);
                    margin-bottom: var(--space-6);
                    box-shadow: var(--shadow-sm);
                }

                .admin-form h3 {
                    margin-bottom: var(--space-5);
                    color: var(--text-primary);
                }

                .form-actions {
                    display: flex;
                    gap: var(--space-3);
                    justify-content: flex-end;
                    margin-top: var(--space-5);
                }

                .admin-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3);
                }

                .admin-item {
                    display: flex;
                    align-items: center;
                    gap: var(--space-4);
                    padding: var(--space-4) var(--space-5);
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    transition: all var(--transition-fast);
                    box-shadow: var(--shadow-sm);
                }

                .admin-item:hover {
                    border-color: var(--accent-color);
                    transform: translateX(4px);
                    box-shadow: var(--shadow-md);
                }

                .item-icon {
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--active-bg);
                    border-radius: var(--radius-lg);
                    color: var(--accent-color);
                }

                .item-info {
                    flex: 1;
                }

                .item-info h4 {
                    color: var(--text-primary);
                    font-weight: 600;
                    margin-bottom: var(--space-1);
                }

                .item-link {
                    font-size: var(--font-size-sm);
                    color: var(--accent-color);
                }

                .item-actions {
                    display: flex;
                    gap: var(--space-1);
                }

                .btn-ghost.danger:hover {
                    color: var(--danger-500);
                }

                .loading-screen {
                    display: flex;
                    justify-content: center;
                    padding: var(--space-16);
                }

                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid var(--glass-border);
                    border-top-color: var(--primary-500);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 640px) {
                    .admin-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                }
            `}</style>
        </div>
    );
}

export default GerenciarAplicacoes;
