import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { moduloService, aplicacaoService } from '../services/api';
import { useLoja } from '../context/LojaContext';
import { useAuth } from '../context/AuthContext';
import {
    ShoppingCart, DollarSign, Truck, FileText, Calculator, Monitor,
    ChevronRight, Folder, Search
} from 'lucide-react';

const iconMap = {
    'ShoppingCart': ShoppingCart,
    'DollarSign': DollarSign,
    'Truck': Truck,
    'FileText': FileText,
    'Calculator': Calculator,
    'Monitor': Monitor
};

function ModuloPage() {
    const { id, numero } = useParams();
    const { selectedLoja } = useLoja();
    const { user } = useAuth();
    const [modulo, setModulo] = useState(null);
    const [aplicacoes, setAplicacoes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id, numero, selectedLoja]);

    const loadData = async () => {
        try {
            // Usar numero da URL (se vier de LojaPage) ou selectedLoja do contexto
            const lojaAtiva = numero || selectedLoja || user?.numeroLoja;
            const params = lojaAtiva ? { loja: lojaAtiva } : {};
            const [moduloRes, appsRes] = await Promise.all([
                moduloService.buscarPorId(id), // Modulo usually not store specific in metadata but we can pass params if needed. Modulo listing uses params. buscarPorId might need it if fetching from store table.
                aplicacaoService.listarPorModulo(id, params)
            ]);
            setModulo(moduloRes.data);
            setAplicacoes(appsRes.data);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    // ... (getIcon implementation)

    const getIcon = (iconName) => {
        const Icon = iconMap[iconName] || FileText;
        return <Icon size={32} />;
    };

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

    if (!modulo) {
        return (
            <div className="page-content">
                <div className="container">
                    <div className="empty-state">
                        <h2>Módulo não encontrado</h2>
                        <Link to={numero ? `/loja/${numero}` : '/'} className="btn btn-primary">Voltar ao início</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content animate-fadeIn">
            <div className="container">
                {/* Breadcrumb */}
                <nav className="breadcrumb">
                    <Link to={numero ? `/loja/${numero}` : '/'}>Início</Link>
                    <ChevronRight size={16} />
                    <span>{modulo.NOME_MODULO}</span>
                </nav>

                {/* Header */}
                <header className="modulo-header">
                    <div className="modulo-icon">
                        {getIcon(modulo.ICONE)}
                    </div>
                    <div>
                        <h1 className="heading-1">{modulo.NOME_MODULO}</h1>
                        <p className="modulo-subtitle">
                            {aplicacoes.length} aplicação(ões) disponível(is)
                        </p>
                    </div>
                </header>

                {/* Search Bar */}
                <div className="search-bar-container">
                    <div className="search-input-wrapper">
                        <Search className="search-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar aplicações..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                </div>

                {/* Aplicações */}
                <section className="aplicacoes-section">
                    <h2 className="heading-3">Aplicações</h2>

                    {aplicacoes.filter(app =>
                        app.NOME_APLICACAO.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length > 0 ? (
                        <div className="aplicacoes-grid">
                            {aplicacoes
                                .filter(app => app.NOME_APLICACAO.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map(app => (
                                    <Link
                                        key={app.ID_APLICACAO}
                                        to={numero ? `/loja/${numero}/aplicacao/${app.ID_APLICACAO}` : `/aplicacao/${app.ID_APLICACAO}`}
                                        className="aplicacao-card"
                                    >
                                        <Folder size={24} className="aplicacao-icon" />
                                        <span className="aplicacao-nome">{app.NOME_APLICACAO}</span>
                                        <ChevronRight size={20} className="aplicacao-arrow" />
                                    </Link>
                                ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <Folder className="empty-state-icon" />
                            <h3 className="empty-state-title">
                                {searchTerm ? 'Nenhuma aplicação encontrada' : 'Nenhuma aplicação'}
                            </h3>
                            <p className="empty-state-description">
                                {searchTerm
                                    ? `Não encontramos aplicações com o termo "${searchTerm}"`
                                    : 'Este módulo ainda não possui aplicações cadastradas.'}
                            </p>
                        </div>
                    )}
                </section>
            </div>

            <style>{`
                .breadcrumb {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    margin-bottom: var(--space-6);
                    color: var(--text-muted);
                    font-size: var(--font-size-sm);
                }

                .breadcrumb a {
                    color: var(--text-secondary);
                    text-decoration: none;
                }

                .breadcrumb a:hover {
                    color: var(--accent-color);
                }

                .modulo-header {
                    display: flex;
                    align-items: center;
                    gap: var(--space-6);
                    margin-bottom: var(--space-10);
                }

                .modulo-icon {
                    width: 80px;
                    height: 80px;
                    background: var(--accent-gradient);
                    border-radius: var(--radius-xl);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    box-shadow: var(--shadow-md);
                }

                .modulo-subtitle {
                    color: var(--text-muted);
                    margin-top: var(--space-2);
                }

                .search-bar-container {
                    margin-bottom: var(--space-10);
                }

                .search-input-wrapper {
                    position: relative;
                    max-width: 400px;
                }

                .search-icon {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                    pointer-events: none;
                }

                .search-input {
                    width: 100%;
                    padding: 12px 16px 12px 42px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    color: var(--text-primary);
                    font-size: 1rem;
                    transition: all 0.2s;
                }

                .search-input:focus {
                    border-color: var(--accent-color);
                    box-shadow: 0 0 0 3px var(--active-bg);
                    outline: none;
                }

                .aplicacoes-section {
                    margin-top: var(--space-8);
                }

                .aplicacoes-section .heading-3 {
                    margin-bottom: var(--space-6);
                }

                .aplicacoes-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: var(--space-4);
                }

                .aplicacao-card {
                    display: flex;
                    align-items: center;
                    gap: var(--space-4);
                    padding: var(--space-5);
                    background: var(--gradient-card);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-lg);
                    text-decoration: none;
                    transition: all var(--transition-base);
                }

                .aplicacao-card:hover {
                    transform: translateY(-2px);
                    border-color: var(--primary-500);
                    box-shadow: var(--shadow-lg);
                }

                .aplicacao-icon {
                    color: var(--primary-400);
                }

                .aplicacao-nome {
                    flex: 1;
                    color: var(--text-primary);
                    font-weight: 500;
                }

                .aplicacao-arrow {
                    color: var(--text-muted);
                    transition: transform var(--transition-fast);
                }

                .aplicacao-card:hover .aplicacao-arrow {
                    transform: translateX(4px);
                    color: var(--primary-400);
                }

                .loading-screen {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 60vh;
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
            `}</style>
        </div>
    );
}

export default ModuloPage;
