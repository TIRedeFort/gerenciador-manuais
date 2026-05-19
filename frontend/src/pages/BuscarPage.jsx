import { useState, useEffect } from 'react'; // Refreshed

import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { manualService, moduloService, aplicacaoService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLoja } from '../context/LojaContext';
import ManualCard from '../components/ManualCard';
import { Search, ArrowLeft, Filter } from 'lucide-react';

function BuscarPage() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const moduloParam = searchParams.get('modulo') || '';
    const aplicacaoParam = searchParams.get('aplicacao') || '';
    const navigate = useNavigate();
    const { isTI, user } = useAuth();
    const { selectedLoja } = useLoja();
    const [resultados, setResultados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(query);
    const [modulos, setModulos] = useState([]);
    const [aplicacoes, setAplicacoes] = useState([]);
    const [selectedModulo, setSelectedModulo] = useState(moduloParam);
    const [selectedAplicacao, setSelectedAplicacao] = useState(aplicacaoParam);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        setSearchTerm(query);
        setSelectedModulo(moduloParam);
        setSelectedAplicacao(aplicacaoParam);
    }, [query, moduloParam, aplicacaoParam]);

    useEffect(() => {
        loadFilters();
    }, [selectedLoja]);

    useEffect(() => {
        buscar();
    }, [query, moduloParam, aplicacaoParam, selectedLoja]);

    const loadFilters = async () => {
        try {
            const lojaAtiva = selectedLoja || user?.numeroLoja;
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

    const buscar = async () => {
        setLoading(true);
        try {
            const lojaAtiva = selectedLoja || user?.numeroLoja;
            const params = lojaAtiva ? { loja: lojaAtiva } : {};

            let response;
            if (!query || query.length < 3) {
                // Se não tiver query ou for curta, lista todos os manuais
                response = await manualService.listar(params);
            } else {
                response = await manualService.buscar(query, params);
            }

            let filtered = response.data;

            // Aplicar filtro de módulo
            if (moduloParam) {
                filtered = filtered.filter(m => m.ID_MODULO == moduloParam);
            }

            // Aplicar filtro de aplicação
            if (aplicacaoParam) {
                filtered = filtered.filter(m => m.ID_APLICACAO == aplicacaoParam);
            }

            setResultados(filtered);
        } catch (error) {
            console.error('Erro na busca:', error);
        } finally {
            setLoading(false);
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

    const handleDelete = async (id) => {
        if (window.confirm('Deseja enviar este manual para a lixeira?')) {
            try {
                const lojaAtiva = selectedLoja || user?.numeroLoja;
                const params = lojaAtiva ? { loja: lojaAtiva } : {};
                await manualService.excluir(id, params);
                buscar();
            } catch (error) {
                console.error('Erro ao excluir:', error);
                alert('Erro ao excluir: ' + (error.response?.data?.error || error.message));
            }
        }
    };

    return (
        <div className="page-content animate-fadeIn">
            <div className="container">
                <Link to="/" className="btn btn-ghost mb-4">
                    <ArrowLeft size={18} />
                    Voltar
                </Link>

                <header className="buscar-header">
                    <div className="header-title">
                        <Search size={32} className="header-icon" />
                        <div>
                            <h1 className="heading-2">
                                {query ? `Resultados para "${query}"` : 'Todos os manuais'}
                            </h1>
                            <p className="text-muted">
                                {loading ? 'Buscando...' : `${resultados.length} resultado(s) encontrado(s)`}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSearch} className="search-bar-container">
                        <div className="search-input-wrapper">
                            <Search size={18} className="search-input-icon" />
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
                                <label className="filter-label">
                                    <span>Módulo</span>
                                    <select
                                        className="search-filter"
                                        value={selectedModulo}
                                        onChange={handleModuloChange}
                                    >
                                        <option value="">Selecione um módulo</option>
                                        {modulos.map(mod => (
                                            <option key={mod.ID_MODULO} value={mod.ID_MODULO}>
                                                {mod.NOME_MODULO}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="filter-label">
                                    <span>Aplicação</span>
                                    <select
                                        className="search-filter"
                                        value={selectedAplicacao}
                                        onChange={(e) => setSelectedAplicacao(e.target.value)}
                                        disabled={!selectedModulo}
                                    >
                                        <option value="">Todas as aplicações</option>
                                        {getAplicacoesPorModulo().map(app => (
                                            <option key={app.ID_APLICACAO} value={app.ID_APLICACAO}>
                                                {app.NOME_APLICACAO}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <button type="button" onClick={(e) => handleSearch(e)} className="btn btn-primary" style={{ width: '100%' }}>
                                    Aplicar Filtros
                                </button>
                            </div>
                        </div>
                    )}
                </header>

                {loading ? (
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
                ) : resultados.length > 0 ? (
                    <div className="grid grid-cols-4">
                        {resultados.map(manual => (
                            <ManualCard
                                key={manual.ID_MANUAL}
                                manual={manual}
                                onDelete={handleDelete}
                                onSave={buscar}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <Search className="empty-state-icon" />
                        <h3 className="empty-state-title">Nenhum resultado</h3>
                        <p className="empty-state-description">
                            Não encontramos manuais para "{query}".
                        </p>
                    </div>
                )}
            </div>

            <style>{`
                .buscar-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: var(--space-5);
                    margin-bottom: var(--space-8);
                    flex-wrap: wrap;
                }

                .header-title {
                    display: flex;
                    align-items: center;
                    gap: var(--space-4);
                }

                .header-icon {
                    color: var(--primary-400);
                }

                .search-bar-container {
                    display: flex;
                    gap: var(--space-2);
                    align-items: center;
                    position: relative;
                    margin-bottom: var(--space-4);
                }

                .search-input-wrapper {
                    position: relative;
                    flex: 1;
                    max-width: 400px;
                }

                .search-input-icon {
                    position: absolute;
                    left: var(--space-3);
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                    pointer-events: none;
                }

                .search-input {
                    width: 100%;
                    padding: var(--space-3) var(--space-4) var(--space-3) var(--space-10);
                    border: 1px solid var(--border-color);
                    background: var(--bg-card);
                    border-radius: var(--radius-lg);
                    color: var(--text-primary);
                    transition: all var(--transition-fast);
                    font-size: var(--font-size-base);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }

                .search-input:focus {
                    border-color: var(--accent-color);
                    outline: none;
                    box-shadow: 0 0 0 3px var(--active-bg);
                }

                .btn-filter-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                    background: var(--bg-card);
                    color: var(--text-secondary);
                    transition: all var(--transition-fast);
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }

                .btn-filter-icon:hover {
                    color: var(--accent-color);
                    border-color: var(--accent-color);
                    background: var(--active-bg);
                }

                .filter-panel {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    min-width: 300px;
                    margin-bottom: var(--space-6);
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
                    border-bottom: 1px solid var(--border-color);
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
                    border: 1px solid var(--border-color);
                    background: var(--bg-secondary);
                    border-radius: var(--radius-md);
                    color: var(--text-primary);
                    transition: all var(--transition-fast);
                    font-size: var(--font-size-base);
                    cursor: pointer;
                }

                .search-filter:focus {
                    border-color: var(--accent-color);
                    outline: none;
                    box-shadow: 0 0 0 2px var(--active-bg);
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

                @media (max-width: 640px) {
                    .buscar-header {
                        flex-direction: column;
                        align-items: stretch;
                        gap: var(--space-4);
                    }
                    .search-input-wrapper {
                        width: 100%;
                    }
                    .search-bar-container {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .search-bar-container button,
                    .search-input-wrapper {
                        width: 100%;
                        max-width: none;
                    }
                    .btn-filter-icon {
                        width: 100%;
                    }
                    .filter-panel {
                        min-width: auto;
                    }
                }
            `}</style>
        </div>
    );
}

export default BuscarPage;
