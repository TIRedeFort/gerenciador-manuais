import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { moduloService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
    Plus, Edit, Trash2, Settings,
    ShoppingCart, DollarSign, Truck, FileText, Calculator, Monitor,
    Save, X
} from 'lucide-react';

const iconOptions = [
    { value: 'ShoppingCart', label: 'Carrinho', icon: ShoppingCart },
    { value: 'DollarSign', label: 'Financeiro', icon: DollarSign },
    { value: 'Truck', label: 'Logística', icon: Truck },
    { value: 'FileText', label: 'Documento', icon: FileText },
    { value: 'Calculator', label: 'Calculadora', icon: Calculator },
    { value: 'Monitor', label: 'Monitor', icon: Monitor },
];

const iconMap = {
    'ShoppingCart': ShoppingCart,
    'DollarSign': DollarSign,
    'Truck': Truck,
    'FileText': FileText,
    'Calculator': Calculator,
    'Monitor': Monitor
};

function GerenciarModulos() {
    const { isTI } = useAuth();
    const [modulos, setModulos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ nome_modulo: '', icone: 'FileText' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadModulos();
    }, []);

    const loadModulos = async () => {
        try {
            const response = await moduloService.listar();
            setModulos(response.data);
        } catch (error) {
            console.error('Erro ao carregar módulos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingId) {
                await moduloService.atualizar(editingId, formData);
            } else {
                await moduloService.criar(formData);
            }
            loadModulos();
            resetForm();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert(error.response?.data?.error || 'Erro ao salvar módulo');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (modulo) => {
        setEditingId(modulo.ID_MODULO);
        setFormData({ nome_modulo: modulo.NOME_MODULO, icone: modulo.ICONE || 'FileText' });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Deseja excluir este módulo?')) {
            try {
                await moduloService.excluir(id);
                loadModulos();
            } catch (error) {
                alert(error.response?.data?.error || 'Erro ao excluir');
            }
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({ nome_modulo: '', icone: 'FileText' });
    };

    const getIcon = (iconName) => {
        const Icon = iconMap[iconName] || FileText;
        return <Icon size={24} />;
    };

    if (!isTI) {
        return (
            <div className="page-content">
                <div className="container">
                    <div className="empty-state">
                        <h2>Acesso Negado</h2>
                        <p>Apenas usuários TI podem gerenciar módulos.</p>
                        <Link to="/" className="btn btn-primary">Voltar ao início</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content animate-fadeIn">
            <div className="container">
                <header className="admin-header">
                    <div className="header-content">
                        <Settings size={32} className="header-icon" />
                        <div>
                            <h1 className="heading-2">Gerenciar Módulos</h1>
                            <p className="text-muted">Adicione, edite ou remova módulos do sistema</p>
                        </div>
                    </div>
                    <button onClick={() => setShowForm(true)} className="btn btn-primary">
                        <Plus size={18} />
                        Novo Módulo
                    </button>
                </header>

                {/* Form Modal */}
                {showForm && (
                    <div className="modal-overlay animate-fadeIn" onClick={(e) => e.target === e.currentTarget && resetForm()}>
                        <div className="modal-content admin-form-card">
                            <form onSubmit={handleSubmit} className="admin-form">
                                <h3>{editingId ? 'Editar Módulo' : 'Novo Módulo'}</h3>

                                <div className="admin-form-content">
                                    <div className="form-group">
                                        <label className="form-label">Nome do Módulo *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.nome_modulo}
                                            onChange={(e) => setFormData({ ...formData, nome_modulo: e.target.value })}
                                            placeholder="Ex: Comercial, Financeiro..."
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Ícone</label>
                                        <div className="icon-selector">
                                            {iconOptions.map(opt => {
                                                const IconComp = opt.icon;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        className={`icon-option ${formData.icone === opt.value ? 'selected' : ''}`}
                                                        onClick={() => setFormData({ ...formData, icone: opt.value })}
                                                        title={opt.label}
                                                    >
                                                        <IconComp size={24} />
                                                    </button>
                                                );
                                            })}
                                        </div>
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
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Lista */}
                {loading ? (
                    <div className="loading-screen">
                        <div className="loading-spinner" />
                    </div>
                ) : (
                    <div className="admin-list">
                        {modulos.map(modulo => (
                            <div key={modulo.ID_MODULO} className="admin-item">
                                <div className="item-icon">
                                    {getIcon(modulo.ICONE)}
                                </div>
                                <div className="item-info">
                                    <h4>{modulo.NOME_MODULO}</h4>
                                    <Link to={`/gerenciar/aplicacoes/${modulo.ID_MODULO}`} className="item-link">
                                        Gerenciar aplicações →
                                    </Link>
                                </div>
                                <div className="item-actions">
                                    <button onClick={() => handleEdit(modulo)} className="btn btn-ghost" title="Editar">
                                        <Edit size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(modulo.ID_MODULO)} className="btn btn-ghost danger" title="Excluir">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {modulos.length === 0 && (
                            <div className="empty-state">
                                <p>Nenhum módulo cadastrado.</p>
                            </div>
                        )}
                    </div>
                )}
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

                .header-icon {
                    color: var(--primary-400);
                }

                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: var(--space-4);
                }

                .modal-content {
                    width: 100%;
                    max-width: 500px;
                    animation: modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    background: var(--bg-card);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-xl);
                    overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
                    display: flex;
                    flex-direction: column;
                }

                @keyframes modalSlideUp {
                    from { transform: translateY(30px) scale(0.98); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }

                .admin-form {
                    display: flex;
                    flex-direction: column;
                }

                .admin-form h3 {
                    padding: var(--space-5) var(--space-6);
                    margin-bottom: 0;
                    background: linear-gradient(to right, var(--bg-secondary), var(--bg-card));
                    border-bottom: 3px solid var(--accent-color);
                    color: var(--text-primary);
                    font-size: var(--font-size-lg);
                    font-weight: 700;
                }

                .admin-form-content {
                    padding: var(--space-6);
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-4);
                }

                .icon-selector {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
                    gap: var(--space-3);
                    padding: var(--space-4);
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--glass-border);
                }

                .icon-option {
                    aspect-ratio: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-card);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-lg);
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .icon-option:hover {
                    border-color: var(--accent-color);
                    color: var(--accent-color);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }

                .icon-option.selected {
                    background: var(--accent-color);
                    border-color: var(--accent-color);
                    color: white;
                    box-shadow: 0 4px 12px rgba(232, 93, 4, 0.3);
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

                @media (max-width: 640px) {
                    .modal-content {
                        padding: var(--space-4);
                        width: 95%;
                    }
                    .admin-item {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: var(--space-3);
                    }
                    .item-actions {
                        width: 100%;
                        justify-content: flex-end;
                        margin-top: var(--space-2);
                        border-top: 1px solid var(--glass-border);
                        padding-top: var(--space-2);
                    }
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
                    color: var(--primary-400);
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

export default GerenciarModulos;
