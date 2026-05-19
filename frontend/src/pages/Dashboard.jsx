import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { manualService, moduloService, aplicacaoService, lojaService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLoja } from '../context/LojaContext';
import ManualCard from '../components/ManualCard';
import EditManualModal from '../components/EditManualModal';
import { TrendingUp, Clock, Plus, BookOpen, Search, Filter, Store, ChevronDown, Check, Folder, Box } from 'lucide-react';

function Dashboard() {
    const { isTI, canCreateManual, user, isColaborador } = useAuth();
    const { selectedLoja, setSelectedLoja } = useLoja();
    const navigate = useNavigate();
    const [topViews, setTopViews] = useState([]);
    const [recentes, setRecentes] = useState([]);
    const [totalManuais, setTotalManuais] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [modulos, setModulos] = useState([]);
    const [aplicacoes, setAplicacoes] = useState([]);
    const [selectedModulo, setSelectedModulo] = useState('');
    const [selectedAplicacao, setSelectedAplicacao] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
    const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false);
    const [appDropdownOpen, setAppDropdownOpen] = useState(false);

    const [lojasDisponiveis, setLojasDisponiveis] = useState([]);

    useEffect(() => {
        // Inicializar loja selecionada quando o usuário logar
        if (user && !selectedLoja && user.numeroLoja && !user.lojasPermitidas) {
            // Fallback apenas para usuarios antigos sem lojasPermitidas
            setSelectedLoja(user.numeroLoja);
        }
        loadData();
        loadFilters();
        calcularLojasDisponiveis();
    }, [user]);

    useEffect(() => {
        // Recarregar dados quando a loja selecionada mudar
        loadData();
    }, [selectedLoja]);

    useEffect(() => {
        // Recarregar filtros quando a loja selecionada mudar
        loadFilters();
    }, [selectedLoja]);

    const calcularLojasDisponiveis = async () => {
        try {
            const response = await lojaService.listar();
            const todasLojas = response.data;
            const excluded = [4, 22, 34, 38, 43, 45];

            const sortStores = (a, b) => {
                // CD (33) deve aparecer sempre em primeiro
                if (parseInt(a.numero) === 33) return -1;
                if (parseInt(b.numero) === 33) return 1;
                return parseInt(a.numero) - parseInt(b.numero);
            };

            let stores = todasLojas
                .filter(l => l.STATUS === 'ATIVO' && !excluded.includes(parseInt(l.NUMERO_LOJA)))
                .map(l => ({
                    numero: l.NUMERO_LOJA,
                    nome: l.NOME_LOJA
                }))
                .sort(sortStores);

            // Filtrar baseado no perfil e lojas permitidas
            if (!isTI && user?.lojasPermitidas && user.lojasPermitidas.length > 0) {
                // Usuário (incluindo Colaborador) vê apenas lojas permitidas
                const numerosPermitidos = user.lojasPermitidas.map(l => l.numeroLoja);
                const lojasPermitidas = stores.filter(s => numerosPermitidos.includes(s.numero));
                // Já esta ordenado pois 'stores' ja foi ordenado, mas o filter mantem a ordem
                setLojasDisponiveis(lojasPermitidas);

                // Se o usuário não tem loja selecionada OU a loja selecionada não é permitida
                if (lojasPermitidas.length > 0) {
                    const isSelectedValid = selectedLoja && lojasPermitidas.some(l => l.numero === selectedLoja);

                    if (!selectedLoja || !isSelectedValid) {
                        setSelectedLoja(lojasPermitidas[0].numero);
                    }
                }
            } else if (isTI) {
                // Apenas TI sem lojas específicas vê todas
                setLojasDisponiveis(stores);
                // Para TI também, se não tiver loja selecionada validade
                if (stores.length > 0) {
                    const isSelectedValid = selectedLoja && stores.some(l => l.numero === selectedLoja);

                    if (!selectedLoja || !isSelectedValid) {
                        setSelectedLoja(stores[0].numero);
                    }
                }
            } else if (user?.perfil?.startsWith('LOJA')) {
                // Fallback: Usuário de loja vê apenas sua loja (compatibilidade)
                const myStoreNum = user.perfil.replace('LOJA', '');
                const myStore = stores.find(s => s.numero === myStoreNum);
                setLojasDisponiveis(myStore ? [myStore] : []);
                if (myStore && !selectedLoja) {
                    setSelectedLoja(myStore.numero);
                }
            } else {
                // Sem permissões de loja
                setLojasDisponiveis([]);
            }
        } catch (error) {
            console.error('Erro ao carregar lojas disponíveis:', error);
            setLojasDisponiveis([]);
        }
    };

    const loadData = async () => {
        try {
            // Usar a loja selecionada ou a do usuário
            const lojaAtiva = selectedLoja || user?.numeroLoja;

            // Validação de segurança para evitar erro 500 na race condition
            if (lojaAtiva && user?.lojasPermitidas && user.lojasPermitidas.length > 0) {
                const numerosPermitidos = user.lojasPermitidas.map(l => String(l.numeroLoja));
                if (!numerosPermitidos.includes(String(lojaAtiva))) {
                    console.warn(`Loja ativa ${lojaAtiva} não permitida, aguardando correção automática...`);
                    return;
                }
            }

            const params = lojaAtiva ? { loja: lojaAtiva } : {};

            const [topRes, recentRes, countRes] = await Promise.all([
                manualService.topViews(4, params),
                manualService.recentes(4, params),
                manualService.contar(params)
            ]);
            setTopViews(topRes.data);
            setRecentes(recentRes.data);
            setTotalManuais(countRes.data.count);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadFilters = async () => {
        try {
            // Usar a loja selecionada ou a do usuário
            const lojaAtiva = selectedLoja || user?.numeroLoja;

            // Validação de segurança
            if (lojaAtiva && user?.lojasPermitidas && user.lojasPermitidas.length > 0) {
                const numerosPermitidos = user.lojasPermitidas.map(l => String(l.numeroLoja));
                if (!numerosPermitidos.includes(String(lojaAtiva))) {
                    return;
                }
            }

            const params = lojaAtiva ? { loja: lojaAtiva } : {};

            const [modulosRes, aplicacoesRes] = await Promise.all([
                moduloService.listar(params),
                aplicacaoService.listar(params)
            ]);
            setModulos(modulosRes.data);
            setAplicacoes(aplicacoesRes.data);
        } catch (error) {
            console.error('Erro ao carregar filtros:', error);
        }
    };

    const handleModuloChange = (e) => {
        setSelectedModulo(e.target.value);
        // Reset aplicação quando módulo muda
        setSelectedAplicacao('');
    };

    const getAplicacoesPorModulo = () => {
        if (!selectedModulo) return [];
        return aplicacoes.filter(app => app.ID_MODULO == selectedModulo);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Deseja enviar este manual para a lixeira?')) {
            try {
                const lojaAtiva = selectedLoja || user?.numeroLoja;
                // Importante passar o parametro loja para saber em qual tabela deletar
                await manualService.excluir(id, lojaAtiva ? { loja: lojaAtiva } : {});
                loadData();
            } catch (error) {
                console.error('Erro ao excluir:', error);
                alert('Erro ao excluir manual: ' + (error.response?.data?.error || error.message));
            }
        }
    };

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        const params = new URLSearchParams();
        if (searchTerm.trim()) params.set('q', searchTerm);
        if (selectedModulo) params.set('modulo', selectedModulo);
        if (selectedAplicacao) params.set('aplicacao', selectedAplicacao);
        navigate(`/buscar?${params.toString()}`);
    };

    if (loading) {
        return (
            <div className="page-content">
                <div className="container">
                    <div className="loading-grid">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="skeleton-card">
                                <div className="skeleton" style={{ height: '20px', width: '60%', marginBottom: '12px' }} />
                                <div className="skeleton" style={{ height: '24px', width: '90%', marginBottom: '8px' }} />
                                <div className="skeleton" style={{ height: '60px', width: '100%', marginBottom: '16px' }} />
                                <div className="skeleton" style={{ height: '16px', width: '40%' }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content animate-fadeIn">
            <div className="container">
                {/* Hero Section */}
                <section className="hero-section">
                    <div className="hero-content">
                        <h1 className="heading-1">Manuais de Processos</h1>
                        <p className="hero-description">
                            Consulte os manuais operacionais e técnicos do ERP Consinco.
                            Todo o conhecimento do setor de TI em um só lugar.
                        </p>

                        {/* Search Bar */}
                        <form onSubmit={handleSearch} className="hero-search">
                            <div className="search-input-wrapper">
                                <Search size={20} className="search-input-icon" />
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Pesquisar manuais..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setShowFilters(!showFilters);
                                }}
                                className="btn-filter-icon"
                                title="Abrir filtros"
                            >
                                <Filter size={20} />
                            </button>
                            <button type="submit" className="btn btn-primary">
                                <Search size={18} />
                                Buscar
                            </button>
                        </form>

                        {/* Filter Panel */}
                        {showFilters && (
                            <div className="filter-panel">
                                <div className="filter-header">
                                    <h3>Filtros</h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowFilters(false)}
                                        className="btn-close"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="filter-content">
                                    <div className="filter-label">
                                        <span>Módulo</span>
                                        <div className="custom-select-container" style={{ width: '100%' }}>
                                            <button
                                                type="button"
                                                className={`custom-select-trigger ${moduleDropdownOpen ? 'active' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setModuleDropdownOpen(!moduleDropdownOpen);
                                                    setAppDropdownOpen(false);
                                                }}
                                            >
                                                <div className="trigger-content">
                                                    <div className="trigger-icon-wrapper">
                                                        <Folder size={18} />
                                                    </div>
                                                    <span className="trigger-text">
                                                        {selectedModulo
                                                            ? modulos.find(m => m.ID_MODULO == selectedModulo)?.NOME_MODULO
                                                            : 'Selecione um módulo...'}
                                                    </span>
                                                </div>
                                                <ChevronDown size={16} className={`trigger-chevron ${moduleDropdownOpen ? 'rotate' : ''}`} />
                                            </button>

                                            {moduleDropdownOpen && (
                                                <>
                                                    <div className="dropdown-backdrop" onClick={(e) => {
                                                        e.stopPropagation();
                                                        setModuleDropdownOpen(false);
                                                    }} />
                                                    <div className="custom-dropdown-menu filter-dropdown-menu animate-fadeIn">
                                                        <div className="dropdown-options">
                                                            <button
                                                                className={`dropdown-option ${!selectedModulo ? 'selected' : ''}`}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setSelectedModulo('');
                                                                    setModuleDropdownOpen(false);
                                                                }}
                                                            >
                                                                <span>Todos os módulos</span>
                                                                {!selectedModulo && <Check size={16} className="check-icon" />}
                                                            </button>
                                                            {modulos.map(mod => (
                                                                <button
                                                                    key={mod.ID_MODULO}
                                                                    className={`dropdown-option ${selectedModulo == mod.ID_MODULO ? 'selected' : ''}`}
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        handleModuloChange({ target: { value: mod.ID_MODULO } });
                                                                        setModuleDropdownOpen(false);
                                                                    }}
                                                                >
                                                                    <span>{mod.NOME_MODULO}</span>
                                                                    {selectedModulo == mod.ID_MODULO && <Check size={16} className="check-icon" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="filter-label">
                                        <span>Aplicação</span>
                                        <div className="custom-select-container" style={{ width: '100%' }}>
                                            <button
                                                type="button"
                                                className={`custom-select-trigger ${appDropdownOpen ? 'active' : ''}`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (!selectedModulo) return;
                                                    setAppDropdownOpen(!appDropdownOpen);
                                                    setModuleDropdownOpen(false);
                                                }}
                                                disabled={!selectedModulo}
                                            >
                                                <div className="trigger-content">
                                                    <div className="trigger-icon-wrapper">
                                                        <Box size={18} />
                                                    </div>
                                                    <span className="trigger-text">
                                                        {selectedAplicacao
                                                            ? aplicacoes.find(a => a.ID_APLICACAO == selectedAplicacao)?.NOME_APLICACAO
                                                            : 'Todas as aplicações'}
                                                    </span>
                                                </div>
                                                <ChevronDown size={16} className={`trigger-chevron ${appDropdownOpen ? 'rotate' : ''}`} />
                                            </button>

                                            {appDropdownOpen && (
                                                <>
                                                    <div className="dropdown-backdrop" onClick={(e) => {
                                                        e.stopPropagation();
                                                        setAppDropdownOpen(false);
                                                    }} />
                                                    <div className="custom-dropdown-menu filter-dropdown-menu animate-fadeIn">
                                                        <div className="dropdown-options">
                                                            <button
                                                                className={`dropdown-option ${!selectedAplicacao ? 'selected' : ''}`}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setSelectedAplicacao('');
                                                                    setAppDropdownOpen(false);
                                                                }}
                                                            >
                                                                <span>Todas as aplicações</span>
                                                                {!selectedAplicacao && <Check size={16} className="check-icon" />}
                                                            </button>
                                                            {getAplicacoesPorModulo().map(app => (
                                                                <button
                                                                    key={app.ID_APLICACAO}
                                                                    className={`dropdown-option ${selectedAplicacao == app.ID_APLICACAO ? 'selected' : ''}`}
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setSelectedAplicacao(app.ID_APLICACAO);
                                                                        setAppDropdownOpen(false);
                                                                    }}
                                                                >
                                                                    <span>{app.NOME_APLICACAO}</span>
                                                                    {selectedAplicacao == app.ID_APLICACAO && <Check size={16} className="check-icon" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <button type="button" onClick={(e) => handleSearch(e)} className="btn btn-primary" style={{ width: '100%' }}>
                                        Aplicar Filtros
                                    </button>
                                </div>
                            </div>
                        )}

                        {canCreateManual && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="btn btn-secondary btn-lg"
                                style={{ marginTop: 'var(--space-4)' }}
                            >
                                <Plus size={20} />
                                Criar novo manual
                            </button>
                        )}
                    </div>
                    <div className="hero-stats">
                        {/* Seletor de Loja Customizado */}
                        {lojasDisponiveis.length > 0 && (
                            <div className="store-selector-wrapper">
                                <div className="custom-select-container">
                                    <button
                                        className={`custom-select-trigger ${storeDropdownOpen ? 'active' : ''}`}
                                        onClick={(e) => {
                                            if (lojasDisponiveis.length <= 1) return;
                                            e.stopPropagation();
                                            setStoreDropdownOpen(!storeDropdownOpen);
                                        }}
                                        disabled={lojasDisponiveis.length <= 1}
                                    >
                                        <div className="trigger-content">
                                            <div className="trigger-icon-wrapper">
                                                <Store size={18} />
                                            </div>
                                            <span className="trigger-text">
                                                {selectedLoja
                                                    ? (parseInt(selectedLoja) === 33 ? 'CD' : (lojasDisponiveis.find(l => parseInt(l.numero) === parseInt(selectedLoja))?.nome || `Loja ${selectedLoja}`))
                                                    : 'Selecione uma loja...'}
                                            </span>
                                        </div>
                                        {lojasDisponiveis.length > 1 && (
                                            <ChevronDown size={16} className={`trigger-chevron ${storeDropdownOpen ? 'rotate' : ''}`} />
                                        )}
                                    </button>

                                    {storeDropdownOpen && (
                                        <div className="custom-dropdown-menu animate-fadeIn">
                                            <div className="dropdown-options">
                                                {lojasDisponiveis.map(loja => (
                                                    <button
                                                        key={loja.numero}
                                                        className={`dropdown-option ${loja.numero === selectedLoja ? 'selected' : ''}`}
                                                        onClick={() => {
                                                            setSelectedLoja(loja.numero);
                                                            setStoreDropdownOpen(false);
                                                        }}
                                                    >
                                                        <span>{loja.nome}</span>
                                                        {loja.numero === selectedLoja && <Check size={16} className="check-icon" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* Backdrop to close click outside */}
                                {storeDropdownOpen && (
                                    <div className="dropdown-backdrop" onClick={() => setStoreDropdownOpen(false)} />
                                )}
                            </div>
                        )}

                        <div className="stat-card">
                            <BookOpen size={24} />
                            <span className="stat-number">
                                {totalManuais}
                            </span>
                            <span className="stat-label">Manuais</span>
                        </div>
                    </div>
                </section>

                {/* Top Views */}
                <section className="section">
                    <div className="section-header">
                        <div className="section-title-group">
                            <TrendingUp className="section-icon" size={24} />
                            <h2 className="heading-2">Mais Visualizados</h2>
                        </div>
                        <Link to="/buscar" className="btn btn-secondary btn-sm">
                            Ver todos
                        </Link>
                    </div>

                    {topViews.length > 0 ? (
                        <div className="grid grid-cols-4">
                            {topViews.map(manual => (
                                <ManualCard
                                    key={manual.ID_MANUAL}
                                    manual={manual}
                                    onDelete={handleDelete}
                                    onSave={loadData}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <BookOpen className="empty-state-icon" />
                            <h3 className="empty-state-title">Nenhum manual ainda</h3>
                            <p className="empty-state-description">
                                Os manuais mais visualizados aparecerão aqui.
                            </p>
                        </div>
                    )}
                </section>

                {/* Recentes */}
                <section className="section">
                    <div className="section-header">
                        <div className="section-title-group">
                            <Clock className="section-icon" size={24} />
                            <h2 className="heading-2">Adicionados Recentemente</h2>
                        </div>
                    </div>

                    {recentes.length > 0 ? (
                        <div className="grid grid-cols-4">
                            {recentes.map(manual => (
                                <ManualCard
                                    key={manual.ID_MANUAL}
                                    manual={manual}
                                    onDelete={handleDelete}
                                    onSave={loadData}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <Clock className="empty-state-icon" />
                            <h3 className="empty-state-title">Nenhum manual recente</h3>
                            <p className="empty-state-description">
                                Os manuais mais recentes aparecerão aqui.
                            </p>
                        </div>
                    )}
                </section>

                {
                    showCreateModal && (
                        <EditManualModal
                            onClose={() => setShowCreateModal(false)}
                            onSave={() => {
                                setShowCreateModal(false);
                                loadData();
                            }}
                        />
                    )
                }
            </div >

            <style>{`
                .hero-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--space-12) 0;
                    gap: var(--space-8);
                }

                .hero-content {
                    max-width: 600px;
                }

                .hero-description {
                    color: var(--text-secondary);
                    font-size: var(--font-size-lg);
                    margin: var(--space-4) 0 var(--space-6);
                    line-height: 1.7;
                }

                .hero-search {
                    display: flex;
                    gap: var(--space-3);
                    align-items: center;
                    width: 100%;
                    max-width: 600px;
                    margin-bottom: var(--space-4);
                    position: relative;
                }

                .search-input-wrapper {
                    position: relative;
                    flex: 1;
                }

                .search-input-icon {
                    position: absolute;
                    left: var(--space-4);
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                    pointer-events: none;
                }

                .search-input {
                    width: 100%;
                    padding: var(--space-4) var(--space-4) var(--space-4) var(--space-12);
                    border: 1px solid var(--glass-border);
                    background: var(--gradient-card);
                    border-radius: var(--radius-lg);
                    color: var(--text-primary);
                    transition: all var(--transition-fast);
                    font-size: var(--font-size-lg);
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }

                .search-input:focus {
                    border-color: var(--accent-color);
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(232, 93, 4, 0.1), 0 4px 6px rgba(0,0,0,0.1);
                }

                .search-input::placeholder {
                    color: var(--text-muted);
                }

                .btn-filter-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 44px;
                    height: 44px;
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--glass-border);
                    background: var(--gradient-card);
                    color: var(--text-secondary);
                    transition: all var(--transition-fast);
                    cursor: pointer;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }

                .btn-filter-icon:hover {
                    color: var(--accent-color);
                    border-color: rgba(232, 93, 4, 0.4);
                    background: var(--bg-secondary);
                }

                .filter-panel {
                    background: var(--gradient-card);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-lg);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                    min-width: 300px;
                    margin-top: var(--space-2);
                    animation: slideDown 0.3s ease;
                }

                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .filter-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--space-4);
                    border-bottom: 1px solid var(--glass-border);
                }

                .filter-header h3 {
                    margin: 0;
                    font-size: var(--font-size-lg);
                    color: var(--text-primary);
                }

                .btn-close {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    font-size: 24px;
                    cursor: pointer;
                    transition: color var(--transition-fast);
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .btn-close:hover {
                    color: var(--text-primary);
                }

                .filter-content {
                    padding: var(--space-4);
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-4);
                }

                .filter-label {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-2);
                    color: var(--text-secondary);
                    font-size: var(--font-size-sm);
                    font-weight: 500;
                }

                .search-filter {
                    padding: var(--space-3) var(--space-3);
                    border: 1px solid var(--glass-border);
                    background: var(--bg-card);
                    border-radius: var(--radius-md);
                    color: var(--text-primary);
                    transition: all var(--transition-fast);
                    font-size: var(--font-size-base);
                    cursor: pointer;
                }

                .search-filter:focus {
                    border-color: var(--accent-color);
                    outline: none;
                    box-shadow: 0 0 0 2px rgba(232, 93, 4, 0.1);
                }

                .search-filter option {
                    background: var(--bg-primary);
                    color: var(--text-primary);
                }

                .search-filter:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .search-filter:disabled option {
                    opacity: 1;
                }

                .hero-stats {
                    display: flex;
                    flex-direction: column; /* Stack vertically to put selector above stats */
                    gap: var(--space-4);
                    align-items: flex-end; /* Align right */
                    min-width: 250px;
                }

                .store-selector-wrapper {
                    position: relative;
                    z-index: 50;
                }

                .custom-select-container {
                    position: relative;
                    min-width: 220px;
                }

                .custom-select-trigger {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                    padding: var(--space-3) var(--space-4);
                    border-radius: var(--radius-xl);
                    font-size: var(--font-size-sm);
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    backdrop-filter: blur(12px);
                    
                    /* Default (Dark) */
                    background: rgba(30, 41, 59, 0.7);
                    border: 1px solid rgba(148, 163, 184, 0.1);
                    color: var(--text-primary);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                }

                /* Light Mode Override */
                :root[data-theme="light"] .custom-select-trigger {
                    background: rgba(255, 255, 255, 0.8);
                    border: 1px solid var(--border-color);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                }

                .custom-select-trigger:hover:not(:disabled) {
                    transform: translateY(-1px);
                    /* Default (Dark) */
                    background: rgba(30, 41, 59, 0.9);
                    border-color: rgba(148, 163, 184, 0.2);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                }

                :root[data-theme="light"] .custom-select-trigger:hover:not(:disabled) {
                    background: #ffffff;
                    border-color: var(--accent-color);
                    box-shadow: 0 8px 16px rgba(232, 93, 4, 0.15);
                }

                .custom-select-trigger.active {
                    /* Default (Dark) */
                    background: rgba(30, 41, 59, 1);
                    border-color: var(--accent-color);
                    box-shadow: 0 0 0 2px rgba(232, 93, 4, 0.2);
                }

                :root[data-theme="light"] .custom-select-trigger.active {
                    background: #ffffff;
                    border-color: var(--accent-color);
                    box-shadow: 0 0 0 2px rgba(232, 93, 4, 0.15);
                }

                .custom-select-trigger:disabled {
                    opacity: 0.7;
                    cursor: default;
                    border-style: dashed;
                }

                .trigger-content {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                }

                .trigger-icon-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    background: var(--accent-gradient);
                    border-radius: var(--radius-lg);
                    color: white;
                    box-shadow: 0 2px 4px rgba(232, 93, 4, 0.3);
                }

                .trigger-text {
                    font-weight: 600;
                    letter-spacing: 0.01em;
                }

                .trigger-chevron {
                    color: var(--text-muted);
                    transition: transform 0.3s ease;
                }

                .trigger-chevron.rotate {
                    transform: rotate(180deg);
                    color: var(--accent-color);
                }

                .custom-dropdown-menu {
                    position: absolute;
                    top: calc(100% + 8px);
                    right: 0;
                    width: 280px;
                    max-height: 400px;
                    padding: var(--space-2);
                    overflow-y: auto;
                    backdrop-filter: blur(20px);
                    z-index: 100;
                    animation: dropdownSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    border-radius: var(--radius-xl);

                    /* Default (Dark) */
                    background: rgba(15, 23, 42, 0.95);
                    border: 1px solid rgba(148, 163, 184, 0.1);
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
                }

                .filter-dropdown-menu {
                    right: auto;
                    left: 0;
                    width: 100%;
                }

                :root[data-theme="light"] .custom-dropdown-menu {
                    background: rgba(255, 255, 255, 0.95);
                    border: 1px solid var(--border-color);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                }

                @keyframes dropdownSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px) scale(0.98);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                .dropdown-options {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .dropdown-option {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: var(--space-3) var(--space-4);
                    background: transparent;
                    border: none;
                    border-radius: var(--radius-lg);
                    color: var(--text-secondary);
                    font-size: var(--font-size-sm);
                    font-weight: 500;
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .dropdown-option:hover {
                    padding-left: var(--space-5);
                    /* Default (Dark) */
                    background: rgba(255, 255, 255, 0.05);
                    color: var(--text-primary);
                }

                :root[data-theme="light"] .dropdown-option:hover {
                    background: rgba(0, 0, 0, 0.04);
                }

                .dropdown-option.selected {
                    background: rgba(232, 93, 4, 0.15);
                    color: var(--accent-color);
                    font-weight: 600;
                }

                .check-icon {
                    color: var(--accent-color);
                }

                .dropdown-backdrop {
                    position: fixed;
                    inset: 0;
                    z-index: 40;
                    cursor: default;
                }

                /* Scrollbar styling for dropdown */
                .custom-dropdown-menu::-webkit-scrollbar {
                    width: 6px;
                }

                .custom-dropdown-menu::-webkit-scrollbar-track {
                    background: transparent;
                }

                .custom-dropdown-menu::-webkit-scrollbar-thumb {
                    background: rgba(148, 163, 184, 0.2);
                    border-radius: 20px;
                }

                .custom-dropdown-menu::-webkit-scrollbar-thumb:hover {
                    background: rgba(148, 163, 184, 0.4);
                }


                .stat-card {
                    background: var(--gradient-card);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-xl);
                    padding: var(--space-6);
                    text-align: center;
                    min-width: 140px;
                }

                .stat-card svg {
                    color: var(--primary-400);
                    margin-bottom: var(--space-2);
                }

                .stat-number {
                    display: block;
                    font-size: var(--font-size-3xl);
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .stat-label {
                    color: var(--text-muted);
                    font-size: var(--font-size-sm);
                }

                .section {
                    margin-bottom: var(--space-12);
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--space-6);
                }

                .section-title-group {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                }

                .section-icon {
                    color: var(--primary-400);
                }

                .loading-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: var(--space-6);
                }

                .skeleton-card {
                    background: var(--gradient-card);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-xl);
                    padding: var(--space-6);
                }

                @media (max-width: 768px) {
                    .hero-section {
                        flex-direction: column;
                        text-align: center;
                    }

                    .hero-content {
                        max-width: 100%;
                    }

                    .hero-search {
                        flex-direction: column;
                        align-items: stretch;
                        max-width: 100%;
                    }

                    .btn-filter-icon {
                        width: 100%;
                    }

                    .filter-panel {
                        position: static;
                        margin-top: var(--space-3);
                    }

                    .hero-stats {
                        width: 100%;
                        justify-content: center;
                        align-items: center; 
                    }
                    
                    .hero-stats .store-selector-wrapper {
                        max-width: 100%;
                        width: 100%;
                    }

                    .custom-select-container {
                        min-width: 0;
                        width: 100%;
                    }

                    .custom-dropdown-menu {
                        width: 100%;
                        right: 0;
                        left: 0;
                    }
                }
            `}</style>
        </div >
    );
}

export default Dashboard;
