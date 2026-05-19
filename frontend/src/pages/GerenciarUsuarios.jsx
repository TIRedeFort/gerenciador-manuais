import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { lojaService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, Users, Store, Save, X, Eye, EyeOff, ArrowLeft, ToggleLeft, ToggleRight, Search } from 'lucide-react';

function GerenciarUsuarios() {
    const { isTI } = useAuth();
    const [usuarios, setUsuarios] = useState([]);
    const [lojas, setLojas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ nome: '', login: '', senha: '', perfil: 'LEITOR', lojas_ids: [] });
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [storeSearch, setStoreSearch] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLojaFilter, setSelectedLojaFilter] = useState('ALL');

    useEffect(() => {
        loadUsuarios();
        loadLojas();
    }, []);

    const loadLojas = async () => {
        try {
            const response = await lojaService.listar();
            setLojas(response.data);
        } catch (error) {
            console.error('Erro ao carregar lojas:', error);
        }
    };

    const loadUsuarios = async () => {
        try {
            const response = await api.get('/auth/usuarios');
            setUsuarios(response.data);
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingId) {
                await api.put(`/auth/usuarios/${editingId}`, formData);
            } else {
                await api.post('/auth/register', formData);
            }
            loadUsuarios();
            resetForm();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert(error.response?.data?.error || 'Erro ao salvar usuário');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (usuario) => {
        setEditingId(usuario.ID_USUARIO);
        // Converter lojas_ids de string para array se necessário
        const lojasIds = usuario.LOJAS_IDS ?
            (typeof usuario.LOJAS_IDS === 'string' ? usuario.LOJAS_IDS.split(',').map(Number) : usuario.LOJAS_IDS)
            : (usuario.ID_LOJA ? [usuario.ID_LOJA] : []);

        setFormData({
            nome: usuario.NOME,
            login: usuario.LOGIN,
            senha: '',
            perfil: usuario.PERFIL,
            lojas_ids: lojasIds
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Deseja excluir este usuário?')) {
            try {
                const response = await api.delete(`/auth/usuarios/${id}`);
                if (response.data.message) {
                    // Exibe mensagem caso tenha sido inativado ou excluído com sucesso
                    alert(response.data.message);
                }
                loadUsuarios();
            } catch (error) {
                alert(error.response?.data?.error || 'Erro ao excluir');
            }
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({ nome: '', login: '', senha: '', perfil: 'LEITOR', lojas_ids: [] });
        setShowPassword(false);
        setStoreSearch('');
    };

    const handleToggleStatus = async (usuario) => {
        if (usuario.LOGIN === 'ti.cd@rfcentral.com.br') {
            alert('O usuário Administrador TI não pode ser desativado');
            return;
        }
        try {
            await api.put(`/auth/usuarios/${usuario.ID_USUARIO}/toggle-status`);
            loadUsuarios();
        } catch (error) {
            alert(error.response?.data?.error || 'Erro ao alterar status');
        }
    };

    if (!isTI) {
        return (
            <div className="empty-state">
                <h2>Acesso Negado</h2>
                <p>Apenas usuários TI podem gerenciar usuários.</p>
                <Link to="/" className="btn btn-primary">Voltar ao início</Link>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <Link to="/gerenciar/modulos" className="btn btn-ghost mb-4">
                <ArrowLeft size={18} />
                Voltar
            </Link>

            <header className="section-header">
                <div className="flex items-center gap-4">
                    <div className="icon-box">
                        <Users size={24} />
                    </div>
                    <div>
                        <h1 className="heading-2">Gerenciar Usuários</h1>
                        <p className="text-muted">Crie ou edite usuários do sistema</p>
                    </div>
                </div>
                <button onClick={() => setShowForm(true)} className="btn btn-primary">
                    <Plus size={18} />
                    Novo Usuário
                </button>
            </header>

            {/* Form Modal */}
            {showForm && (
                <div className="modal-overlay animate-fadeIn" onClick={(e) => e.target === e.currentTarget && resetForm()}>
                    <div className="modal-content">
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                            <div className="modal-header-admin">
                                <h3 className="heading-3">
                                    {editingId ? 'Editar Usuário' : 'Novo Usuário'}
                                </h3>
                                <button type="button" onClick={resetForm} className="btn-close" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="modal-body">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="form-label">Nome *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.nome}
                                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                            placeholder="Nome completo"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Login *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.login}
                                            onChange={(e) => setFormData({ ...formData, login: e.target.value.toLowerCase() })}
                                            placeholder="Login de acesso"
                                            required
                                            disabled={!!editingId}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            {editingId ? 'Nova Senha (vazio para manter)' : 'Senha *'}
                                        </label>
                                        <div className="password-input">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                className="form-input"
                                                value={formData.senha}
                                                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                                                placeholder="••••••••"
                                                required={!editingId}
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

                                    <div className="form-group">
                                        <label className="form-label">Perfil *</label>
                                        <select
                                            className="form-input form-select"
                                            value={formData.perfil}
                                            onChange={(e) => setFormData({ ...formData, perfil: e.target.value })}
                                        >
                                            <option value="LEITOR">LEITOR (Apenas visualização)</option>
                                            <option value="COLABORADOR">COLABORADOR (Cria e edita manuais)</option>
                                            <option value="TI">TI (Administrador)</option>
                                        </select>
                                    </div>

                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">Lojas Permitidas (Opcional)</label>

                                        <div className="store-selector-box">
                                            <div className="store-search-wrapper" style={{ marginBottom: '12px', position: 'relative' }}>
                                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                <input
                                                    type="text"
                                                    placeholder="Pesquisar loja por nome ou número..."
                                                    className="form-input"
                                                    style={{ paddingLeft: '38px', width: '100%' }}
                                                    value={storeSearch}
                                                    onChange={(e) => setStoreSearch(e.target.value)}
                                                />
                                            </div>

                                            <div className="store-list-container">
                                                {/* Opção Todas */}
                                                <div className="checkbox-wrapper-65" style={{
                                                    padding: '0.5rem',
                                                    borderRadius: '4px',
                                                    marginBottom: '2px',
                                                    borderBottom: '1px solid var(--glass-border)',
                                                    backgroundColor: (lojas.filter(l => l.STATUS === 'ATIVO' && String(l.NUMERO_LOJA) !== '33').length > 0 &&
                                                        lojas.filter(l => l.STATUS === 'ATIVO' && String(l.NUMERO_LOJA) !== '33').every(l => formData.lojas_ids.includes(l.ID_LOJA)))
                                                        ? 'rgba(232, 93, 4, 0.1)' : 'transparent'
                                                }}>
                                                    <label htmlFor="checkbox-all" style={{ display: 'flex', alignItems: 'center', width: '100%', fontWeight: '600' }}>
                                                        <input
                                                            type="checkbox"
                                                            id="checkbox-all"
                                                            checked={lojas.filter(l => l.STATUS === 'ATIVO' && String(l.NUMERO_LOJA) !== '33').length > 0 &&
                                                                lojas.filter(l => l.STATUS === 'ATIVO' && String(l.NUMERO_LOJA) !== '33').every(l => formData.lojas_ids.includes(l.ID_LOJA))}
                                                            onChange={(e) => {
                                                                const activeLojasNoCD = lojas.filter(l => l.STATUS === 'ATIVO' && String(l.NUMERO_LOJA) !== '33');
                                                                const idsNoCD = activeLojasNoCD.map(l => l.ID_LOJA);

                                                                if (e.target.checked) {
                                                                    const newIds = new Set(formData.lojas_ids);
                                                                    idsNoCD.forEach(id => newIds.add(id));
                                                                    setFormData({
                                                                        ...formData,
                                                                        lojas_ids: Array.from(newIds)
                                                                    });
                                                                } else {
                                                                    setFormData({
                                                                        ...formData,
                                                                        lojas_ids: formData.lojas_ids.filter(id => !idsNoCD.includes(id))
                                                                    });
                                                                }
                                                            }}
                                                        />
                                                        <span className="cbx">
                                                            <svg width="12px" height="11px" viewBox="0 0 12 11">
                                                                <polyline points="1 6.29411765 4.5 10 11 1"></polyline>
                                                            </svg>
                                                        </span>
                                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginLeft: '10px' }}>
                                                            Todas (exceto CD)
                                                        </span>
                                                    </label>
                                                </div>
                                                {lojas
                                                    .filter(l => l.STATUS === 'ATIVO')
                                                    .filter(l => {
                                                        if (!storeSearch) return true;
                                                        const searchLower = storeSearch.toLowerCase();
                                                        const nome = l.NOME_LOJA.toLowerCase();
                                                        const numero = l.NUMERO_LOJA.toString();
                                                        return nome.includes(searchLower) || numero.includes(searchLower);
                                                    })
                                                    .map(loja => (
                                                        <div key={loja.ID_LOJA} className="checkbox-wrapper-65" style={{
                                                            padding: '0.4rem 0.5rem',
                                                            borderRadius: '4px',
                                                            transition: 'background 0.2s',
                                                            backgroundColor: formData.lojas_ids.includes(loja.ID_LOJA) ? 'rgba(232, 93, 4, 0.1)' : 'transparent'
                                                        }}>
                                                            <label htmlFor={`checkbox-${loja.ID_LOJA}`} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    id={`checkbox-${loja.ID_LOJA}`}
                                                                    checked={formData.lojas_ids.includes(loja.ID_LOJA)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setFormData({
                                                                                ...formData,
                                                                                lojas_ids: [...formData.lojas_ids, loja.ID_LOJA]
                                                                            });
                                                                        } else {
                                                                            setFormData({
                                                                                ...formData,
                                                                                lojas_ids: formData.lojas_ids.filter(id => id !== loja.ID_LOJA)
                                                                            });
                                                                        }
                                                                    }}
                                                                />
                                                                <span className="cbx">
                                                                    <svg width="12px" height="11px" viewBox="0 0 12 11">
                                                                        <polyline points="1 6.29411765 4.5 10 11 1"></polyline>
                                                                    </svg>
                                                                </span>
                                                                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginLeft: '10px' }}>
                                                                    {loja.NOME_LOJA.match(/^Loja\s+\d+/i)
                                                                        ? loja.NOME_LOJA
                                                                        : `Loja ${loja.NUMERO_LOJA} - ${loja.NOME_LOJA}`}
                                                                </span>
                                                            </label>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                        <small className="text-muted mt-3 block" style={{ lineHeight: '1.4' }}>
                                            <strong>Protip:</strong> Usuários <strong>TI</strong> têm acesso total. <strong>Colaboradores</strong> precisam de lojas atribuídas para publicar conteúdos nelas.
                                        </small>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer-admin">
                                <button type="button" onClick={resetForm} className="btn btn-secondary">
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    <Save size={18} />
                                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    </div>

                </div>
            )}

            {/* Filters Bar */}
            <div className="filters-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou login..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="management-layout">
                {/* Sidebar Lojas */}
                <aside className="lojas-sidebar">
                    <button
                        className={`sidebar-item ${selectedLojaFilter === 'ALL' ? 'active' : ''}`}
                        onClick={() => setSelectedLojaFilter('ALL')}
                    >
                        <Users size={18} />
                        Todos os Usuários
                    </button>

                    <div className="sidebar-divider">Lojas</div>

                    <div className="sidebar-scroll">
                        {lojas.map(loja => (
                            <button
                                key={loja.ID_LOJA}
                                className={`sidebar-item ${selectedLojaFilter === loja.ID_LOJA ? 'active' : ''}`}
                                onClick={() => setSelectedLojaFilter(loja.ID_LOJA)}
                            >
                                <Store size={18} />
                                <span>{String(loja.NUMERO_LOJA).padStart(2, '0')} - {loja.NOME_LOJA}</span>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Lista de Usuários */}
                <div className="user-list-container">
                    {loading ? (
                        <div className="loading-screen">
                            <div className="loading-spinner" />
                        </div>
                    ) : (
                        <div className="user-list">
                            {usuarios
                                .filter(u => {
                                    // Filtro de Loja
                                    if (selectedLojaFilter === 'ALL') return true;
                                    const userStores = u.LOJAS_IDS ? String(u.LOJAS_IDS).split(',') : [];
                                    return userStores.includes(String(selectedLojaFilter));
                                })
                                .filter(u => {
                                    // Filtro de Busca
                                    if (!searchTerm) return true;
                                    const search = searchTerm.toLowerCase();
                                    return u.NOME.toLowerCase().includes(search) ||
                                        u.LOGIN.toLowerCase().includes(search);
                                })
                                .map(usuario => (
                                    <div key={usuario.ID_USUARIO} className={`card user-item ${usuario.STATUS === 'INATIVO' ? 'user-inactive' : ''}`}>
                                        <div className="user-avatar">
                                            {usuario.NOME.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="user-info">
                                            <h4>{usuario.NOME}</h4>
                                            <span className="text-muted">@{usuario.LOGIN}</span>
                                            {usuario.LOJAS_NOMES && usuario.LOJAS_NOMES.length > 0 && (
                                                <div className="mt-1" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                    {(() => {
                                                        const activeRetailStores = lojas.filter(l => l.STATUS === 'ATIVO' && String(l.NUMERO_LOJA) !== '33');
                                                        const userStores = usuario.LOJAS_IDS ? usuario.LOJAS_IDS.split(',') : [];
                                                        const hasAllRetail = activeRetailStores.length > 0 && activeRetailStores.every(l => userStores.includes(String(l.ID_LOJA)));
                                                        const hasCD = userStores.some(id => {
                                                            const store = lojas.find(l => String(l.ID_LOJA) === String(id));
                                                            return store && String(store.NUMERO_LOJA) === '33';
                                                        });

                                                        if (hasAllRetail) {
                                                            return (
                                                                <>
                                                                    <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                                                                        Todas
                                                                    </span>
                                                                    {hasCD && (
                                                                        <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                                                                            CD
                                                                        </span>
                                                                    )}
                                                                </>
                                                            );
                                                        }

                                                        return usuario.LOJAS_NOMES.split(',').map((loja, idx) => (
                                                            <span key={idx} className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                                                                {loja.trim()}
                                                            </span>
                                                        ));
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                        <span className={`badge ${usuario.PERFIL === 'TI' ? 'badge-accent' : ''}`}>
                                            {usuario.PERFIL}
                                        </span>
                                        <span className={`badge ${usuario.STATUS === 'ATIVO' ? 'badge-success' : 'badge-danger'}`}>
                                            {usuario.STATUS || 'ATIVO'}
                                        </span>
                                        <div className="user-actions">
                                            <button
                                                onClick={() => handleToggleStatus(usuario)}
                                                className={`btn btn-ghost ${usuario.STATUS === 'ATIVO' ? '' : 'success'}`}
                                                title={usuario.STATUS === 'ATIVO' ? 'Desativar' : 'Ativar'}
                                                disabled={usuario.LOGIN === 'ti.cd@rfcentral.com.br'}
                                            >
                                                {usuario.STATUS === 'ATIVO' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                            </button>
                                            <button onClick={() => handleEdit(usuario)} className="btn btn-ghost" title="Editar">
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(usuario.ID_USUARIO)}
                                                className="btn btn-ghost danger"
                                                title="Excluir"
                                                disabled={usuario.LOGIN === 'ti.cd@rfcentral.com.br'}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            {usuarios.length === 0 && (
                                <div className="empty-state">
                                    <p>Nenhum usuário cadastrado.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .icon-box {
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--accent-gradient);
                    border-radius: var(--radius-lg);
                    color: white;
                }

                .filters-bar {
                    margin-bottom: var(--space-6);
                    display: flex;
                    gap: var(--space-4);
                }

                .search-box {
                    position: relative;
                    flex: 1;
                    max-width: 400px;
                }

                .search-box svg {
                    position: absolute;
                    left: var(--space-3);
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                    pointer-events: none;
                }

                .search-box input {
                    width: 100%;
                    padding: var(--space-3) var(--space-3) var(--space-3) var(--space-10);
                    background: var(--bg-secondary);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-lg);
                    color: var(--text-primary);
                    font-size: var(--font-size-base);
                }

                .management-layout {
                    display: grid;
                    grid-template-columns: 280px 1fr;
                    gap: var(--space-6);
                    align-items: flex-start;
                }

                .lojas-sidebar {
                    background: var(--bg-card);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-xl);
                    padding: var(--space-3);
                    position: sticky;
                    top: var(--space-4);
                    max-height: calc(100vh - 150px);
                    display: flex;
                    flex-direction: column;
                }

                .sidebar-divider {
                    font-size: var(--font-size-xs);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: var(--text-muted);
                    font-weight: 700;
                    margin: var(--space-4) var(--space-2) var(--space-2);
                    padding-top: var(--space-4);
                    border-top: 1px solid var(--glass-border);
                }

                .sidebar-scroll {
                    overflow-y: auto;
                    flex: 1;
                }

                .sidebar-item {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    width: 100%;
                    padding: var(--space-3) var(--space-4);
                    background: transparent;
                    border: none;
                    color: var(--text-secondary);
                    border-radius: var(--radius-lg);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: left;
                    font-weight: 500;
                }

                .sidebar-item:hover {
                    background: var(--hover-bg);
                    color: var(--text-primary);
                }

                .sidebar-item.active {
                    background: var(--accent-gradient);
                    color: white;
                    box-shadow: 0 4px 12px rgba(232, 93, 4, 0.3);
                }

                .user-list-container {
                    flex: 1;
                }

                .password-input {
                    position: relative;
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
                    padding: var(--space-1);
                }

                .password-toggle:hover {
                    color: var(--text-primary);
                }

                .user-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3);
                }

                .user-item {
                    display: flex;
                    align-items: center;
                    gap: var(--space-4);
                    padding: var(--space-4);
                }

                .user-avatar {
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--accent-gradient);
                    border-radius: 50%;
                    color: white;
                    font-weight: 600;
                    font-size: var(--font-size-lg);
                }

                .user-info {
                    flex: 1;
                }

                .user-info h4 {
                    font-weight: 500;
                    margin-bottom: 2px;
                }

                .user-actions {
                    display: flex;
                    gap: var(--space-1);
                }

                .btn-ghost.danger:hover {
                    color: var(--danger-color);
                }

                .btn-ghost.success:hover {
                    color: var(--success-color, #10b981);
                }

                .badge-success {
                    background: rgba(16, 185, 129, 0.15);
                    color: #10b981;
                    border: 1px solid rgba(16, 185, 129, 0.3);
                }

                .badge-danger {
                    background: rgba(239, 68, 68, 0.15);
                    color: var(--danger-color);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                }

                .user-inactive {
                    opacity: 0.6;
                }

                .user-actions button:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                }

                .justify-end {
                    justify-content: flex-end;
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
                    background: var(--bg-card);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-xl);
                    box-shadow: var(--shadow-lg);
                    width: 100%;
                    max-width: 650px;
                    animation: modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                }

                @keyframes modalSlideUp {
                    from { transform: translateY(30px) scale(0.98); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }

                .modal-header-admin {
                    padding: var(--space-5) var(--space-6);
                    background: linear-gradient(to right, var(--bg-secondary), var(--bg-card));
                    border-bottom: 3px solid var(--accent-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .modal-header-admin h3 {
                    margin: 0;
                    color: var(--text-primary);
                    font-weight: 700;
                }

                .modal-body {
                    padding: var(--space-6);
                    overflow-y: auto;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-5);
                }

                .store-selector-box {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: var(--space-4);
                }

                .store-list-container {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    max-height: 200px;
                    overflow-y: auto;
                    padding: var(--space-2);
                    background: var(--bg-card);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-md);
                }

                .modal-footer-admin {
                    padding: var(--space-4) var(--space-6);
                    background: var(--bg-secondary);
                    border-top: 1px solid var(--glass-border);
                    display: flex;
                    justify-content: flex-end;
                    gap: var(--space-3);
                    flex-shrink: 0;
                }


                @media (max-width: 768px) {
                    .grid-cols-2 {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 640px) {
                    .modal-content {
                        padding: var(--space-4);
                        width: 95%;
                    }
                    
                    .user-item {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: var(--space-3);
                    }

                    .user-info {
                        width: 100%;
                    }

                    .user-actions {
                        width: 100%;
                        justify-content: flex-end;
                        margin-top: var(--space-2);
                        border-top: 1px solid var(--glass-border);
                        padding-top: var(--space-2);
                    }

                    .badge {
                        align-self: flex-start;
                    }
                }

                .store-item-label:hover {
                    background-color: var(--bg-secondary) !important;
                }

                /* Checkbox Customizado 65 */
                .checkbox-wrapper-65 *,
                .checkbox-wrapper-65 ::after,
                .checkbox-wrapper-65 ::before {
                    box-sizing: border-box;
                }
                .checkbox-wrapper-65 .cbx {
                    position: relative;
                    display: block;
                    float: left;
                    width: 18px;
                    height: 18px;
                    border-radius: 4px;
                    background-color: var(--glass-border);
                    background-image: linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0));
                    box-shadow: inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(0,0,0,0.15);
                    transition: all 0.15s ease;
                    flex-shrink: 0;
                }
                .checkbox-wrapper-65 .cbx svg {
                    position: absolute;
                    top: 3.5px;
                    left: 3px;
                    fill: none;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                    stroke: white;
                    stroke-width: 2;
                    stroke-dasharray: 17;
                    stroke-dashoffset: 17;
                    transform: translate3d(0, 0, 0);
                }
                .checkbox-wrapper-65 {
                    user-select: none;
                }
                .checkbox-wrapper-65 label {
                    display: inline-block;
                    cursor: pointer;
                }
                .checkbox-wrapper-65 input[type="checkbox"] {
                    display: none;
                    visibility: hidden;
                }
                .checkbox-wrapper-65 input[type="checkbox"]:checked + .cbx {
                    background-color: var(--accent-color);
                    background-image: linear-gradient(var(--accent-color), var(--accent-color));
                }
                .checkbox-wrapper-65 input[type="checkbox"]:checked + .cbx svg {
                    stroke-dashoffset: 0;
                    transition: all 0.15s ease;
                }
            `}</style>
        </div>
    );
}

export default GerenciarUsuarios;
