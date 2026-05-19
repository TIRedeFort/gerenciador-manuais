import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { manualService } from '../services/api';
import ManualCard from '../components/ManualCard';
import { Store, BookOpen, Search, TrendingUp, Clock } from 'lucide-react';

function LojaPage() {
    const { numero } = useParams();
    const { user, isLoja, isTI } = useAuth();
    const [topManuais, setTopManuais] = useState([]);
    const [recentManuais, setRecentManuais] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        loadManuais();
    }, []);

    const loadManuais = async () => {
        try {
            const params = { loja: numero };
            const [topRes, recentRes] = await Promise.all([
                manualService.topViews(10, params),
                manualService.recentes(10, params)
            ]);
            setTopManuais(topRes.data);
            setRecentManuais(recentRes.data);
        } catch (error) {
            console.error('Erro ao carregar manuais:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (searchTerm.length < 3) return;

        setSearching(true);
        try {
            const params = { loja: numero };
            const response = await manualService.buscar(searchTerm, params);
            setSearchResults(response.data);
        } catch (error) {
            console.error('Erro na busca:', error);
        } finally {
            setSearching(false);
        }
    };

    const clearSearch = () => {
        setSearchTerm('');
        setSearchResults([]);
    };

    // Verificar se usuário tem acesso
    const numeroLojaUsuario = user?.numeroLoja;
    const temAcesso = isTI || (isLoja && numeroLojaUsuario === numero);

    if (!temAcesso) {
        return (
            <div className="loja-page">
                <div className="access-denied">
                    <Store size={64} />
                    <h2>Acesso Negado</h2>
                    <p>Você não tem permissão para acessar esta loja.</p>
                    <Link to="/" className="btn btn-primary">Voltar ao Início</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="loja-page">
            {/* Header */}
            <header className="loja-header">
                <div className="loja-info">
                    <div className="loja-badge">
                        <Store size={32} />
                        <span className="loja-numero">Loja {numero}</span>
                    </div>
                    <h1 className="heading-1">Bem-vindo, {user?.nome}!</h1>
                    <p className="text-muted">Acesse os manuais e documentações disponíveis</p>
                </div>
            </header>

            {/* Search */}
            <section className="search-section">
                <form onSubmit={handleSearch} className="search-form">
                    <div className="search-input-wrapper">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Buscar manuais..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        {searchTerm && (
                            <button type="button" onClick={clearSearch} className="clear-btn">
                                ✕
                            </button>
                        )}
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={searchTerm.length < 3 || searching}>
                        {searching ? 'Buscando...' : 'Buscar'}
                    </button>
                </form>
            </section>

            {/* Search Results */}
            {searchResults.length > 0 && (
                <section className="results-section">
                    <div className="section-header">
                        <h2 className="heading-3">
                            <Search size={24} />
                            Resultados da Busca ({searchResults.length})
                        </h2>
                        <button onClick={clearSearch} className="btn btn-ghost">
                            Limpar busca
                        </button>
                    </div>
                    <div className="manuais-grid">
                        {searchResults.map(manual => (
                            <ManualCard key={manual.ID_MANUAL} manual={manual} showActions={false} />
                        ))}
                    </div>
                </section>
            )}

            {/* Content (quando não está buscando) */}
            {searchResults.length === 0 && (
                <>
                    {/* Top Views */}
                    <section className="manuais-section">
                        <div className="section-header">
                            <h2 className="heading-3">
                                <TrendingUp size={24} />
                                Manuais Mais Acessados
                            </h2>
                        </div>
                        {loading ? (
                            <div className="loading-container">
                                <div className="loading-spinner" />
                            </div>
                        ) : (
                            <div className="manuais-grid">
                                {topManuais.map(manual => (
                                    <ManualCard key={manual.ID_MANUAL} manual={manual} showActions={false} />
                                ))}
                                {topManuais.length === 0 && (
                                    <div className="empty-state">
                                        <BookOpen size={48} />
                                        <p>Nenhum manual disponível</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Recent */}
                    <section className="manuais-section">
                        <div className="section-header">
                            <h2 className="heading-3">
                                <Clock size={24} />
                                Atualizados Recentemente
                            </h2>
                        </div>
                        {loading ? (
                            <div className="loading-container">
                                <div className="loading-spinner" />
                            </div>
                        ) : (
                            <div className="manuais-grid">
                                {recentManuais.map(manual => (
                                    <ManualCard key={manual.ID_MANUAL} manual={manual} showActions={false} />
                                ))}
                                {recentManuais.length === 0 && (
                                    <div className="empty-state">
                                        <BookOpen size={48} />
                                        <p>Nenhum manual disponível</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </>
            )}

            <style>{`
                .loja-page {
                    padding-bottom: var(--space-8);
                }

                .loja-header {
                    margin-bottom: var(--space-8);
                    padding: var(--space-8);
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-xl);
                    box-shadow: var(--shadow-sm);
                }

                .loja-info {
                    text-align: center;
                }

                .loja-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: var(--space-3);
                    background: var(--accent-color);
                    color: white;
                    padding: var(--space-3) var(--space-5);
                    border-radius: var(--radius-lg);
                    margin-bottom: var(--space-4);
                }

                .loja-numero {
                    font-size: var(--font-size-lg);
                    font-weight: 700;
                }

                .loja-header h1 {
                    margin-bottom: var(--space-2);
                }

                .search-section {
                    margin-bottom: var(--space-8);
                }

                .search-form {
                    display: flex;
                    gap: var(--space-3);
                    max-width: 600px;
                    margin: 0 auto;
                }

                .search-input-wrapper {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    background: var(--bg-secondary);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-lg);
                    padding: 0 var(--space-4);
                }

                .search-input-wrapper svg {
                    color: var(--text-muted);
                }

                .search-input {
                    flex: 1;
                    background: none;
                    border: none;
                    padding: var(--space-3) 0;
                    color: var(--text-primary);
                    font-size: var(--font-size-base);
                }

                .search-input:focus {
                    outline: none;
                }

                .clear-btn {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: var(--space-1);
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--space-6);
                }

                .section-header h2 {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                }

                .manuais-section {
                    margin-bottom: var(--space-10);
                }

                .manuais-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: var(--space-6);
                }

                .results-section {
                    margin-bottom: var(--space-10);
                }

                .empty-state {
                    grid-column: 1 / -1;
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

                .access-denied {
                    text-align: center;
                    padding: var(--space-16);
                    color: var(--text-muted);
                }

                .access-denied svg {
                    margin-bottom: var(--space-6);
                    opacity: 0.5;
                }

                .access-denied h2 {
                    margin-bottom: var(--space-3);
                    color: var(--text-primary);
                }

                .access-denied p {
                    margin-bottom: var(--space-6);
                }

                @media (max-width: 768px) {
                    .search-form {
                        flex-direction: column;
                    }

                    .manuais-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}

export default LojaPage;
