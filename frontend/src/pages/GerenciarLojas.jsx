import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
    Plus, Edit, Trash2, Store, Save, X, ArrowLeft,
    ToggleLeft, ToggleRight, Users, ChevronDown, ChevronRight,
    Eye, EyeOff, Shield, Mail, User, Lock, Check, Search
} from 'lucide-react';

function PremiumSelect({ label, value, onChange, options, icon: Icon, placeholder = "Selecione...", showSearch = true }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const selectedOption = options.find(opt => opt.value == value);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    useEffect(() => {
        if (!isOpen) setSearchTerm("");
    }, [isOpen]);

    return (
        <div className="premium-select-container">
            <label className="premium-label">
                {Icon && <Icon size={14} className="label-icon" />}
                {label}
            </label>
            <div className={`premium-select-trigger ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(!isOpen)}>
                <div className="trigger-content">
                    {selectedOption ? (
                        <div className="selected-item-display">
                            {selectedOption.label.split(' - ').length > 1 ? (
                                <>
                                    <span className="badge-loja-mini">{selectedOption.label.split(' - ')[0]}</span>
                                    <span className="selected-text">{selectedOption.label.split(' - ')[1]}</span>
                                </>
                            ) : (
                                <span className="selected-text">{selectedOption.label}</span>
                            )}
                        </div>
                    ) : (
                        <span className="placeholder-text">{placeholder}</span>
                    )}
                </div>
                <ChevronDown size={18} className={`chevron-icon ${isOpen ? 'rotated' : ''}`} />
            </div>

            {isOpen && (
                <>
                    <div className="premium-select-overlay" onClick={() => setIsOpen(false)} />
                    <div className="premium-select-dropdown">
                        {showSearch && (
                            <div className="select-search-container">
                                <Search size={16} className="search-icon" />
                                <input
                                    type="text"
                                    className="select-search-input"
                                    placeholder="Pesquisar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                />
                            </div>
                        )}
                        <div className="options-list">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt) => (
                                    <div
                                        key={opt.value}
                                        className={`premium-option ${value == opt.value ? 'selected' : ''}`}
                                        onClick={() => {
                                            onChange(opt.value);
                                            setIsOpen(false);
                                        }}
                                    >
                                        <div className="option-info">
                                            {opt.label.split(' - ').length > 1 ? (
                                                <div className="loja-option-layout">
                                                    <span className="loja-number-badge">{opt.label.split(' - ')[0]}</span>
                                                    <span className="option-label">{opt.label.split(' - ')[1]}</span>
                                                </div>
                                            ) : (
                                                <span className="option-label">{opt.label}</span>
                                            )}
                                            {opt.sublabel && <span className="option-sublabel">{opt.sublabel}</span>}
                                        </div>
                                        {value == opt.value && <Check size={16} className="check-icon" />}
                                    </div>
                                ))
                            ) : (
                                <div className="no-options-found">Nenhum resultado encontrado</div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function GerenciarLojas() {
    const { isTI } = useAuth();
    const [lojas, setLojas] = useState([]);
    const [usuariosPorLoja, setUsuariosPorLoja] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showUserForm, setShowUserForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editingUserId, setEditingUserId] = useState(null);
    const [formData, setFormData] = useState({ numero_loja: '', nome_loja: '' });
    const [userFormData, setUserFormData] = useState({ nome: '', login: '', senha: '', id_loja: '', perfil: 'LEITOR' });
    const [saving, setSaving] = useState(false);
    const [expandedLojas, setExpandedLojas] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [activeTab, setActiveTab] = useState('lojas'); // 'lojas' ou 'usuarios'

    useEffect(() => {
        loadLojas();
        loadUsuariosPorLoja();
    }, []);

    const loadLojas = async () => {
        try {
            const response = await api.get('/lojas');
            setLojas(response.data);
        } catch (error) {
            console.error('Erro ao carregar lojas:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadUsuariosPorLoja = async () => {
        try {
            const response = await api.get('/lojas/usuarios');
            setUsuariosPorLoja(response.data);
        } catch (error) {
            console.error('Erro ao carregar usuários por loja:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingId) {
                await api.put(`/lojas/${editingId}`, formData);
            } else {
                await api.post('/lojas', formData);
            }
            loadLojas();
            resetForm();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert(error.response?.data?.error || 'Erro ao salvar loja');
        } finally {
            setSaving(false);
        }
    };

    const handleUserSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const selectedLoja = lojas.find(l => l.ID_LOJA == userFormData.id_loja);

            const payload = {
                ...userFormData
            };

            if (editingUserId) {
                await api.put(`/auth/usuarios/${editingUserId}`, payload);
            } else {
                await api.post('/auth/register', payload);
            }
            loadUsuariosPorLoja();
            resetUserForm();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert(error.response?.data?.error || 'Erro ao salvar usuário');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (loja) => {
        setEditingId(loja.ID_LOJA);
        setFormData({
            numero_loja: loja.NUMERO_LOJA,
            nome_loja: loja.NOME_LOJA
        });
        setShowForm(true);
    };

    const handleEditUser = (usuario, idLoja) => {
        setEditingUserId(usuario.id_usuario);
        setUserFormData({
            nome: usuario.nome,
            login: usuario.login,
            senha: '',
            id_loja: idLoja,
            perfil: usuario.perfil || 'LEITOR'
        });
        setShowUserForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Deseja excluir esta loja? Isso só é possível se não houver usuários vinculados.')) {
            try {
                await api.delete(`/lojas/${id}`);
                loadLojas();
            } catch (error) {
                alert(error.response?.data?.error || 'Erro ao excluir');
            }
        }
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm('Deseja excluir este usuário?')) {
            try {
                await api.delete(`/auth/usuarios/${id}`);
                loadUsuariosPorLoja();
            } catch (error) {
                alert(error.response?.data?.error || 'Erro ao excluir');
            }
        }
    };

    const handleToggleStatus = async (loja) => {
        try {
            await api.put(`/lojas/${loja.ID_LOJA}/toggle-status`);
            loadLojas();
            loadUsuariosPorLoja();
        } catch (error) {
            alert(error.response?.data?.error || 'Erro ao alterar status');
        }
    };

    const handleToggleUserStatus = async (usuario) => {
        try {
            await api.put(`/auth/usuarios/${usuario.id_usuario}/toggle-status`);
            loadUsuariosPorLoja();
        } catch (error) {
            alert(error.response?.data?.error || 'Erro ao alterar status');
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({ numero_loja: '', nome_loja: '' });
    };

    const resetUserForm = () => {
        setShowUserForm(false);
        setEditingUserId(null);
        setUserFormData({ nome: '', login: '', senha: '', id_loja: '', perfil: 'LEITOR' });
        setShowPassword(false);
    };

    const toggleExpandLoja = (idLoja) => {
        setExpandedLojas(prev => ({
            ...prev,
            [idLoja]: !prev[idLoja]
        }));
    };

    const openNewUserForm = (idLoja) => {
        setUserFormData({ nome: '', login: '', senha: '', id_loja: idLoja });
        setShowUserForm(true);
    };

    if (!isTI) {
        return (
            <div className="empty-state">
                <h2>Acesso Negado</h2>
                <p>Você não tem permissão para acessar esta página.</p>
            </div>
        );
    }

    return (
        <div className="gerenciar-lojas">
            <header className="page-header">
                <div className="header-content">
                    <Link to="/" className="btn btn-ghost">
                        <ArrowLeft size={20} />
                        Voltar
                    </Link>
                    <div>
                        <h1 className="heading-1">
                            <Store size={32} />
                            Gerenciar Lojas
                        </h1>
                        <p className="text-muted">Gerencie as lojas e seus usuários</p>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="tabs-container" style={{ marginBottom: '24px' }}>
                <button
                    className={`tab-btn ${activeTab === 'lojas' ? 'active' : ''}`}
                    onClick={() => setActiveTab('lojas')}
                >
                    <Store size={18} />
                    Lojas
                </button>
                <button
                    className={`tab-btn ${activeTab === 'usuarios' ? 'active' : ''}`}
                    onClick={() => setActiveTab('usuarios')}
                >
                    <Users size={18} />
                    Usuários por Loja
                </button>
            </div>

            {/* Tab Lojas */}
            {activeTab === 'lojas' && (
                <>
                    <div className="section-header">
                        <h2 className="heading-3">Lojas Cadastradas</h2>
                        <button onClick={() => setShowForm(true)} className="btn btn-primary">
                            <Plus size={20} />
                            Nova Loja
                        </button>
                    </div>

                    {showForm && (
                        <div className="modal-overlay" onClick={resetForm}>
                            <div className="modal-content" onClick={e => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>{editingId ? 'Editar Loja' : 'Nova Loja'}</h3>
                                    <button onClick={resetForm} className="btn-close">
                                        <X size={20} />
                                    </button>
                                </div>
                                <form onSubmit={handleSubmit} className="form-container">
                                    <div className="modal-body">
                                        <div className="form-group">
                                            <label>Número da Loja</label>
                                            <input
                                                type="text"
                                                value={formData.numero_loja}
                                                onChange={e => setFormData({ ...formData, numero_loja: e.target.value })}
                                                placeholder="Ex: 01, 02, 03..."
                                                required
                                                maxLength={10}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Nome da Loja</label>
                                            <input
                                                type="text"
                                                value={formData.nome_loja}
                                                onChange={e => setFormData({ ...formData, nome_loja: e.target.value })}
                                                placeholder="Ex: Loja 01 - Matriz"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" onClick={resetForm} className="btn btn-secondary">
                                            Cancelar
                                        </button>
                                        <button type="submit" className="btn btn-primary" disabled={saving}>
                                            <Save size={18} />
                                            {saving ? 'Salvando...' : 'Salvar'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="loading-container">
                            <div className="loading-spinner" />
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Número</th>
                                        <th>Nome</th>
                                        <th>Status</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lojas.map(loja => (
                                        <tr key={loja.ID_LOJA} className={loja.STATUS === 'INATIVO' ? 'inactive' : ''}>
                                            <td>
                                                <span className="loja-numero">{loja.NUMERO_LOJA}</span>
                                            </td>
                                            <td>{loja.NOME_LOJA}</td>
                                            <td>
                                                <span className={`status-badge ${loja.STATUS === 'ATIVO' ? 'active' : 'inactive'}`}>
                                                    {loja.STATUS}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        onClick={() => handleToggleStatus(loja)}
                                                        className={`btn btn-ghost ${loja.STATUS === 'ATIVO' ? '' : 'success'}`}
                                                        title={loja.STATUS === 'ATIVO' ? 'Desativar' : 'Ativar'}
                                                    >
                                                        {loja.STATUS === 'ATIVO' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                                    </button>
                                                    <button onClick={() => handleEdit(loja)} className="btn btn-ghost" title="Editar">
                                                        <Edit size={18} />
                                                    </button>
                                                    <button onClick={() => handleDelete(loja.ID_LOJA)} className="btn btn-ghost danger" title="Excluir">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {lojas.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="text-center text-muted">
                                                Nenhuma loja cadastrada
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Tab Usuários por Loja */}
            {activeTab === 'usuarios' && (
                <>
                    <div className="section-header">
                        <h2 className="heading-3">Usuários por Loja</h2>
                    </div>

                    {showUserForm && (
                        <div className="modal-overlay" onClick={resetUserForm}>
                            <div className="modal-content" onClick={e => e.stopPropagation()}>
                                <div className="modal-header-admin">
                                    <h3>{editingUserId ? 'Editar Usuário' : 'Novo Usuário de Loja'}</h3>
                                    <button onClick={resetUserForm} className="btn-close">
                                        <X size={20} />
                                    </button>
                                </div>
                                <form onSubmit={handleUserSubmit} className="form-container">
                                    <div className="modal-body">
                                        <div className="modal-form-grid">
                                            <div className="form-group">
                                                <label><User size={16} /> Nome</label>
                                                <div className="input-wrapper">
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        value={userFormData.nome}
                                                        onChange={e => setUserFormData({ ...userFormData, nome: e.target.value })}
                                                        placeholder="Nome completo"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label><Mail size={16} /> Login (Email)</label>
                                                <div className="input-wrapper">
                                                    <input
                                                        type="email"
                                                        className="form-input"
                                                        value={userFormData.login}
                                                        onChange={e => setUserFormData({ ...userFormData, login: e.target.value })}
                                                        placeholder="email@exemplo.com"
                                                        required
                                                        disabled={!!editingUserId}
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <PremiumSelect
                                                    label="Cargo/Perfil"
                                                    icon={Shield}
                                                    value={userFormData.perfil}
                                                    onChange={(val) => setUserFormData({ ...userFormData, perfil: val })}
                                                    options={[
                                                        { value: 'LEITOR', label: 'Leitor', sublabel: 'Apenas visualização' },
                                                        { value: 'COLABORADOR', label: 'Colaborador', sublabel: 'Cria e edita manuais' }
                                                    ]}
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label><Lock size={16} /> {editingUserId ? 'Nova Senha' : 'Senha'}</label>
                                                <div className="input-wrapper password-input">
                                                    <input
                                                        type={showPassword ? 'text' : 'password'}
                                                        className="form-input"
                                                        value={userFormData.senha}
                                                        onChange={e => setUserFormData({ ...userFormData, senha: e.target.value })}
                                                        placeholder={editingUserId ? "Deixe vazio para manter" : "******"}
                                                        required={!editingUserId}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="password-toggle"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                    >
                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="form-group full-width">
                                                <PremiumSelect
                                                    label="Loja de Destino"
                                                    icon={Store}
                                                    value={userFormData.id_loja}
                                                    onChange={(val) => setUserFormData({ ...userFormData, id_loja: val })}
                                                    placeholder="Selecione a loja..."
                                                    options={lojas.filter(l => l.STATUS === 'ATIVO').map(l => ({
                                                        value: l.ID_LOJA,
                                                        label: `${l.NUMERO_LOJA} - ${l.NOME_LOJA}`
                                                    }))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" onClick={resetUserForm} className="btn btn-secondary">
                                            Cancelar
                                        </button>
                                        <button type="submit" className="btn btn-primary" disabled={saving}>
                                            <Save size={18} />
                                            {saving ? 'Salvando...' : 'Salvar'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    <div className="lojas-usuarios-list">
                        {usuariosPorLoja.length === 0 ? (
                            <div className="empty-state">
                                <Users size={48} />
                                <p>Nenhum usuário de loja cadastrado</p>
                                <button
                                    onClick={() => setShowUserForm(true)}
                                    className="btn btn-primary"
                                    style={{ marginTop: '16px' }}
                                >
                                    <Plus size={20} />
                                    Criar Primeiro Usuário
                                </button>
                            </div>
                        ) : (
                            usuariosPorLoja.map(loja => (
                                <div key={loja.id_loja} className="loja-card">
                                    <div
                                        className="loja-card-header"
                                        onClick={() => toggleExpandLoja(loja.id_loja)}
                                    >
                                        <div className="loja-info">
                                            {expandedLojas[loja.id_loja] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                            <Store size={20} />
                                            <span className="loja-numero">{loja.numero_loja}</span>
                                            <span className="loja-nome">{loja.nome_loja}</span>
                                            <span className="usuarios-count">({loja.usuarios.length} usuário{loja.usuarios.length !== 1 ? 's' : ''})</span>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openNewUserForm(loja.id_loja); }}
                                            className="btn btn-ghost"
                                            title="Adicionar usuário"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>

                                    {expandedLojas[loja.id_loja] && (
                                        <div className="loja-usuarios">
                                            <table className="table compact">
                                                <thead>
                                                    <tr>
                                                        <th>Nome</th>
                                                        <th>Login</th>
                                                        <th>Perfil</th>
                                                        <th>Status</th>
                                                        <th>Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {loja.usuarios.map(usuario => (
                                                        <tr key={usuario.id_usuario} className={usuario.status === 'INATIVO' ? 'inactive' : ''}>
                                                            <td>{usuario.nome}</td>
                                                            <td>{usuario.login}</td>
                                                            <td>
                                                                <span className={`badge ${usuario.perfil === 'TI' ? 'badge-accent' : ''}`} style={{ fontSize: '0.7rem' }}>
                                                                    {usuario.perfil}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className={`status-badge ${usuario.status === 'ATIVO' ? 'active' : 'inactive'}`}>
                                                                    {usuario.status}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <div className="action-buttons">
                                                                    <button
                                                                        onClick={() => handleToggleUserStatus(usuario)}
                                                                        className={`btn btn-ghost ${usuario.status === 'ATIVO' ? '' : 'success'}`}
                                                                        title={usuario.status === 'ATIVO' ? 'Desativar' : 'Ativar'}
                                                                    >
                                                                        {usuario.status === 'ATIVO' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleEditUser(usuario, loja.id_loja)}
                                                                        className="btn btn-ghost"
                                                                        title="Editar"
                                                                    >
                                                                        <Edit size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteUser(usuario.id_usuario)}
                                                                        className="btn btn-ghost danger"
                                                                        title="Excluir"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {usuariosPorLoja.length > 0 && (
                        <div style={{ marginTop: '24px', textAlign: 'center' }}>
                            <button
                                onClick={() => setShowUserForm(true)}
                                className="btn btn-primary"
                            >
                                <Plus size={20} />
                                Novo Usuário de Loja
                            </button>
                        </div>
                    )}
                </>
            )}

            <style>{`
                .gerenciar-lojas {
                    padding-bottom: var(--space-8);
                }

                .page-header {
                    margin-bottom: var(--space-8);
                }

                .header-content {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-4);
                }

                .header-content h1 {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                }

                .tabs-container {
                    display: flex;
                    gap: var(--space-2);
                    border-bottom: 1px solid var(--glass-border);
                    padding-bottom: var(--space-2);
                }

                .tab-btn {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    padding: var(--space-3) var(--space-4);
                    background: transparent;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    border-radius: var(--radius-lg);
                    transition: all var(--transition-fast);
                }

                .tab-btn:hover {
                    background: var(--hover-bg);
                    color: var(--text-primary);
                }

                .tab-btn.active {
                    background: var(--accent-color);
                    color: white;
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--space-6);
                }

                .table-container {
                    background: var(--gradient-card);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-xl);
                    overflow: hidden;
                }

                .table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .table th,
                .table td {
                    padding: var(--space-4);
                    text-align: left;
                    border-bottom: 1px solid var(--glass-border);
                }

                .table th {
                    background: var(--bg-secondary);
                    font-weight: 600;
                    color: var(--text-secondary);
                    font-size: var(--font-size-sm);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .table tr.inactive {
                    opacity: 0.6;
                }

                .table.compact th,
                .table.compact td {
                    padding: var(--space-3);
                }

                .loja-numero {
                    background: var(--accent-color);
                    color: white;
                    padding: var(--space-1) var(--space-2);
                    border-radius: var(--radius-md);
                    font-weight: 600;
                    font-size: var(--font-size-sm);
                }

                .status-badge {
                    padding: var(--space-1) var(--space-2);
                    border-radius: var(--radius-md);
                    font-size: var(--font-size-xs);
                    font-weight: 600;
                }

                .status-badge.active {
                    background: rgba(16, 185, 129, 0.2);
                    color: #10B981;
                }

                .status-badge.inactive {
                    background: rgba(239, 68, 68, 0.2);
                    color: #EF4444;
                }

                .action-buttons {
                    display: flex;
                    gap: var(--space-1);
                }

                .btn.danger {
                    color: #EF4444;
                }

                .btn.success {
                    color: #10B981;
                }

                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(12px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    padding: var(--space-4);
                }

                .modal-content {
                    background: var(--bg-card);
                    border: 1px solid var(--glass-border);
                    border-radius: 16px;
                    box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.5);
                    width: 95%;
                    max-width: 520px;
                    max-height: 95vh;
                    min-height: 600px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden; /* Changed to hidden to respect radii */
                    animation: modalSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes modalSlideUp {
                    from { transform: translateY(40px) scale(0.95); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }

                .modal-header-admin {
                    background: linear-gradient(to right, var(--bg-secondary), var(--bg-card));
                    padding: var(--space-8);
                    border-bottom: 1px solid var(--glass-border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: relative;
                    border-top-left-radius: 16px;
                    border-top-right-radius: 16px;
                }

                .modal-header-admin::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 80px;
                    height: 3px;
                    background: var(--accent-gradient);
                }

                .btn-close {
                    background: var(--hover-bg);
                    border: 1px solid var(--glass-border);
                    color: var(--text-muted);
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .btn-close:hover {
                    background: var(--active-bg);
                    color: var(--accent-color);
                    border-color: var(--accent-color);
                    transform: rotate(90deg) scale(1.1);
                    box-shadow: 0 0 15px rgba(232, 93, 4, 0.2);
                }

                .modal-body {
                    padding: var(--space-8);
                    padding-bottom: 220px;
                    overflow-x: hidden;
                    overflow-y: auto;
                    flex: 1;
                }

                .modal-form-grid {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: var(--space-5);
                }

                .form-group {
                    width: 100%;
                }

                .form-group label {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    margin-bottom: var(--space-2);
                    font-weight: 600;
                    color: var(--text-secondary);
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .input-wrapper {
                    position: relative;
                }

                /* --- Premium Select --- */
                .premium-select-container {
                    position: relative;
                    width: 100%;
                }

                .premium-label {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    margin-bottom: var(--space-2);
                    font-weight: 600;
                    color: var(--text-secondary);
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .label-icon {
                    color: var(--accent-color);
                    opacity: 0.8;
                }

                .premium-select-trigger {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: var(--space-3) var(--space-4);
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    min-height: 48px;
                    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
                }

                .premium-select-trigger:hover {
                    border-color: var(--accent-color);
                    background: var(--bg-card);
                    transform: translateY(-1px);
                    box-shadow: var(--shadow-sm);
                }

                .selected-item-display {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                }

                .badge-loja-mini {
                    background: var(--accent-gradient);
                    color: white;
                    padding: 2px 8px;
                    border-radius: 6px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    box-shadow: 0 2px 4px rgba(232, 93, 4, 0.2);
                }

                .premium-select-trigger.active {
                    border-color: var(--accent-color);
                    background: var(--bg-card);
                    box-shadow: 0 0 0 4px var(--active-bg);
                }

                .select-search-container {
                    padding: var(--space-3);
                    border-bottom: 1px solid var(--glass-border);
                    position: sticky;
                    top: 0;
                    background: var(--bg-card);
                    z-index: 2;
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                }

                .search-icon {
                    color: var(--text-muted);
                }

                .select-search-input {
                    width: 100%;
                    background: transparent;
                    border: none;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                    outline: none;
                }

                .options-list {
                    max-height: 250px;
                    overflow-y: auto;
                }

                .loja-option-layout {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                }

                .loja-number-badge {
                    background: var(--hover-bg);
                    color: var(--accent-color);
                    padding: 2px 8px;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    border: 1px solid var(--border-color);
                    min-width: 40px;
                    text-align: center;
                }

                .no-options-found {
                    padding: var(--space-6);
                    text-align: center;
                    color: var(--text-muted);
                    font-size: 0.85rem;
                }

                .selected-text {
                    color: var(--text-primary);
                    font-weight: 500;
                    font-size: var(--font-size-base);
                }

                .placeholder-text {
                    color: var(--text-muted);
                    font-size: var(--font-size-base);
                }

                .chevron-icon {
                    color: var(--text-muted);
                    transition: transform 0.3s ease;
                }

                .chevron-icon.rotated {
                    transform: rotate(180deg);
                    color: var(--accent-color);
                }

                .premium-select-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 1001;
                }

                .premium-select-dropdown {
                    position: absolute;
                    top: calc(100% + 8px);
                    left: 0;
                    right: 0;
                    background: var(--bg-card);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-xl);
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
                    z-index: 1002;
                    overflow: hidden;
                    max-height: 350px;
                    display: flex;
                    flex-direction: column;
                    animation: dropdownFadeIn 0.2s cubic-bezier(0, 0, 0.2, 1);
                }

                @keyframes dropdownFadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .premium-option {
                    padding: var(--space-3) var(--space-4);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: pointer;
                    transition: all 0.2s;
                    border-bottom: 1px solid var(--glass-border);
                }

                .premium-option:last-child {
                    border-bottom: none;
                }

                .premium-option:hover {
                    background: var(--hover-bg);
                    padding-left: var(--space-5);
                }

                .premium-option.selected {
                    background: var(--active-bg);
                }

                .option-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .option-label {
                    color: var(--text-primary);
                    font-weight: 500;
                    font-size: 0.9rem;
                }

                .option-sublabel {
                    color: var(--text-muted);
                    font-size: 0.75rem;
                }

                .check-icon {
                    color: var(--accent-color);
                }

                .form-group input,
                .form-group select {
                    width: 100%;
                    padding: var(--space-3) var(--space-4);
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    color: var(--text-primary);
                    font-size: var(--font-size-base);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
                }

                .form-group select {
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 1rem center;
                    background-size: 1.1rem;
                    padding-right: 2.5rem;
                    cursor: pointer;
                }

                .form-group input:focus,
                .form-group select:focus {
                    outline: none;
                    border-color: var(--accent-color);
                    background: var(--bg-card);
                    box-shadow: 0 0 0 4px var(--active-bg), 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    transform: translateY(-2px);
                }

                .password-input {
                    position: relative;
                }

                .password-input input {
                    padding-right: 48px;
                }

                .password-toggle {
                    position: absolute;
                    right: 8px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .password-toggle:hover {
                    color: var(--accent-color);
                    background: var(--active-bg);
                }

                .modal-header .btn-close {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--glass-border);
                    color: var(--text-muted);
                    cursor: pointer;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all var(--transition-fast);
                }

                .modal-header .btn-close:hover {
                    background: var(--active-bg);
                    color: var(--accent-color);
                    transform: rotate(90deg) scale(1.1);
                    border-color: var(--accent-color);
                }

                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: var(--space-3);
                    padding: var(--space-4) var(--space-6);
                    background: var(--bg-secondary);
                    border-top: 1px solid var(--glass-border);
                    flex-shrink: 0;
                    border-bottom-left-radius: 16px;
                    border-bottom-right-radius: 16px;
                }


                .lojas-usuarios-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-4);
                }

                .loja-card {
                    background: var(--gradient-card);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-xl);
                    overflow: hidden;
                }

                .loja-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--space-4) var(--space-5);
                    cursor: pointer;
                    transition: background var(--transition-fast);
                }

                .loja-card-header:hover {
                    background: var(--hover-bg);
                }

                .loja-info {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                }

                .loja-nome {
                    font-weight: 500;
                }

                .usuarios-count {
                    color: var(--text-muted);
                    font-size: var(--font-size-sm);
                }

                .loja-usuarios {
                    border-top: 1px solid var(--glass-border);
                }

                .empty-state {
                    text-align: center;
                    padding: var(--space-12);
                    color: var(--text-muted);
                }

                .empty-state svg {
                    margin-bottom: var(--space-4);
                    opacity: 0.5;
                }

                .loading-container {
                    display: flex;
                    justify-content: center;
                    padding: var(--space-12);
                }

                @media (max-width: 768px) {
                    .header-content {
                        align-items: flex-start;
                    }

                    .tabs-container {
                        overflow-x: auto;
                        padding-bottom: var(--space-1);
                        white-space: nowrap;
                    }

                    .section-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: var(--space-4);
                    }

                    .modal-content {
                        width: 100%;
                        height: 100%;
                        max-height: 100vh;
                        min-height: 100vh;
                        border-radius: 0;
                        margin: 0;
                    }

                    .modal-header-admin,
                    .modal-content {
                        border-radius: 0;
                    }

                    .modal-body {
                        padding: var(--space-5);
                        padding-bottom: 250px;
                    }

                    .loja-card-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: var(--space-4);
                    }

                    .loja-info {
                        flex-wrap: wrap;
                    }

                    .table-container {
                        border-radius: var(--radius-lg);
                    }

                    .table th,
                    .table td {
                        padding: var(--space-3);
                        font-size: 0.85rem;
                    }

                    .action-buttons {
                        flex-wrap: wrap;
                    }

                    .form-actions {
                        padding: var(--space-4);
                        gap: var(--space-2);
                    }

                    .btn {
                        width: auto;
                    }
                }
            `}</style>
        </div>
    );
}

export default GerenciarLojas;
