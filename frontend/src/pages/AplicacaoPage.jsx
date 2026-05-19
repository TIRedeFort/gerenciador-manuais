import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { aplicacaoService, manualService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLoja } from '../context/LojaContext';
import ManualCard from '../components/ManualCard';
import EditManualModal from '../components/EditManualModal';
import { ChevronRight, Folder, Plus, BookOpen, Search } from 'lucide-react';

function AplicacaoPage() {
    const { id, numero } = useParams();
    const { isTI, canCreateManual, user } = useAuth();
    const { selectedLoja } = useLoja();
    const [aplicacao, setAplicacao] = useState(null);
    const [manuais, setManuais] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        loadData();
    }, [id, numero, selectedLoja]);

    const loadData = async () => {
        try {
            // Usar numero da URL (se vier de LojaPage) ou selectedLoja do contexto
            const lojaAtiva = numero || selectedLoja || user?.numeroLoja;
            const params = lojaAtiva ? { loja: lojaAtiva } : {};
            const [appRes, manuaisRes] = await Promise.all([
                aplicacaoService.buscarPorId(id, params),
                manualService.listarPorAplicacao(id, params)
            ]);
            setAplicacao(appRes.data);
            setManuais(manuaisRes.data);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (manualId) => {
        if (window.confirm('Deseja enviar este manual para a lixeira?')) {
            try {
                // TODO: Delete needs store context? Generally delete is by ID, but if table changes...
                // manualService.excluir uses ID. If IDs are unique across tables (identity), it's fine.
                // But wait, identities are unique PER TABLE. 
                // So Manual ID 1 might exist in multiple tables?
                // Yes, Identity is per table.
                // So manualService.excluir needs to know the store too!
                // I need to update manualService.excluir and backend controller to support store param.
                const lojaAtiva = numero || selectedLoja || user?.numeroLoja;
                const params = lojaAtiva ? { loja: lojaAtiva } : {};
                await manualService.excluir(manualId, params);
                // API service doesn't support params in delete yet? I should check.
                // I updated manualService.excluir(id) in api.js but not to take params?
                // Let's check api.js again.
                // It was `excluir: (id) => api.delete(/manuais/${id})`.
                // I need to update it to `excluir: (id, params) => ...`.

                loadData();
            } catch (error) {
                console.error('Erro ao excluir:', error);
            }
        }
    };

    // ...

    // Helper for generating links with store context
    const getLink = (path) => {
        return numero ? `/loja/${numero}${path}` : path;
    };

    if (loading) {
        // ... (unchanged)
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

    if (!aplicacao) {
        return (
            <div className="page-content">
                <div className="container">
                    <div className="empty-state-wrapper">
                        <div className="empty-state-content">
                            <h2 className="empty-state-title">Aplicação não encontrada</h2>
                            <Link to={numero ? `/loja/${numero}` : '/'} className="btn btn-primary mt-4">
                                Voltar ao início
                            </Link>
                        </div>
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
                    {/* Modulo Page link needs store context too? We didn't create /loja/:num/modulo/:id route yet.
                        But sidebar loads modules.
                        If I click modulo in breadcrumb, where should it go?
                        Usually ModuloPage lists applications. 
                        We don't have a /loja/:num/modulo/:id route in App.jsx yet.
                        Maybe I should add it? Or maybe just link to home for now.
                        ModuloPage is existing? Yes. `path="/modulo/:id"`.
                        I should probably duplicate it for store context.
                    */}
                    <Link to={numero ? `/loja/${numero}/modulo/${aplicacao.ID_MODULO}` : `/modulo/${aplicacao.ID_MODULO}`}>{aplicacao.NOME_MODULO}</Link>
                    <ChevronRight size={16} />
                    <span>{aplicacao.NOME_APLICACAO}</span>
                </nav>

                {/* Header */}
                <header className="aplicacao-header">
                    <div className="header-background-glow" />
                    <div className="header-content">
                        <div className="aplicacao-icon-wrapper">
                            <div className="aplicacao-icon">
                                <Folder size={32} />
                            </div>
                        </div>
                        <div className="header-text">
                            <div className="header-badges">
                                <span className="badge-modulo">{aplicacao.NOME_MODULO}</span>
                            </div>
                            <h1 className="heading-1">{aplicacao.NOME_APLICACAO}</h1>
                            <p className="aplicacao-count">
                                <span className="count-badge">{manuais.length}</span> manual(is) disponível(is)
                            </p>
                        </div>
                    </div>

                    {canCreateManual && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="btn btn-primary btn-glow"
                        >
                            <Plus size={18} />
                            Novo Manual
                        </button>
                    )}
                </header>

                {/* Search Bar */}
                <div className="search-bar-container">
                    <div className="search-input-wrapper">
                        <Search className="search-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar manuais..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                </div>

                {/* Manuais */}
                <section className="manuais-section">
                    {manuais.filter(m => m.TITULO.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? (
                        <div className="grid grid-cols-4">
                            {manuais
                                .filter(m => m.TITULO.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map(manual => (
                                    <ManualCard
                                        key={manual.ID_MANUAL}
                                        manual={manual}
                                        onDelete={handleDelete}
                                        onSave={loadData}
                                    />
                                ))}
                        </div>
                    ) : (
                        <div className="empty-state-wrapper">
                            <div className="empty-state-content">
                                <div className="icon-container">
                                    <div className="icon-pulse" />
                                    <BookOpen className="empty-state-icon" strokeWidth={1.5} />
                                </div>
                                <h3 className="empty-state-title">
                                    {searchTerm ? 'Nenhum manual encontrado' : 'Nenhum manual ainda'}
                                </h3>
                                <p className="empty-state-description">
                                    {searchTerm
                                        ? `Não encontramos manuais com o termo "${searchTerm}"`
                                        : 'Esta aplicação ainda não possui manuais cadastrados.\nComece criando o primeiro manual agora mesmo.'}
                                </p>
                                {isTI && !searchTerm && (
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="btn btn-primary btn-lg btn-super-glow mt-6"
                                    >
                                        <div className="btn-icon-bg">
                                            <Plus size={20} />
                                        </div>
                                        Criar primeiro manual
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </section>

                {showCreateModal && (
                    <EditManualModal
                        initialAplicacaoId={id}
                        initialModuloId={aplicacao.ID_MODULO}
                        onClose={() => setShowCreateModal(false)}
                        onSave={() => {
                            setShowCreateModal(false);
                            loadData();
                        }}
                    />
                )}
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

                .aplicacao-header {
                    position: relative;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--space-8);
                    padding: var(--space-6) var(--space-8);
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-xl);
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                }

                .header-background-glow {
                    position: absolute;
                    top: -50%;
                    left: -10%;
                    width: 50%;
                    height: 200%;
                    background: radial-gradient(circle, rgba(232, 93, 4, 0.05) 0%, transparent 70%);
                    pointer-events: none;
                }

                .header-content {
                    display: flex;
                    align-items: center;
                    gap: var(--space-6);
                    position: relative;
                    z-index: 1;
                }

                .aplicacao-icon {
                    width: 64px;
                    height: 64px;
                    background: linear-gradient(135deg, #E85D04, #F48C06);
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    box-shadow: 0 8px 16px rgba(232, 93, 4, 0.2);
                    transition: transform 0.3s ease;
                }

                .aplicacao-header:hover .aplicacao-icon {
                    transform: scale(1.05) rotate(-3deg);
                }

                .badge-modulo {
                    display: inline-block;
                    padding: 4px 12px;
                    background: rgba(232, 93, 4, 0.1);
                    color: #E85D04;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                    margin-bottom: var(--space-2);
                    border: 1px solid rgba(232, 93, 4, 0.2);
                }

                .heading-1 {
                    font-size: 2rem;
                    margin-bottom: var(--space-1);
                    letter-spacing: -0.5px;
                    background: linear-gradient(to right, var(--text-primary), var(--text-secondary));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .aplicacao-count {
                    color: var(--text-muted);
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                }

                .count-badge {
                    background: var(--bg-secondary);
                    padding: 2px 8px;
                    border-radius: 12px;
                    color: var(--text-primary);
                    font-weight: 600;
                    font-size: 0.8rem;
                }

                .btn-glow {
                    box-shadow: 0 4px 14px 0 rgba(232, 93, 4, 0.3);
                }
                
                .btn-glow:hover {
                    box-shadow: 0 6px 20px 0 rgba(232, 93, 4, 0.4);
                    transform: translateY(-1px);
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
                    box-shadow: 0 0 0 2px rgba(232, 93, 4, 0.1);
                    outline: none;
                }

                /* Empty State Premium Styling */
                .empty-state-wrapper {
                    display: flex;
                    justify-content: center;
                    padding: var(--space-16) 0;
                }

                .empty-state-content {
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    max-width: 400px;
                }

                .icon-container {
                    position: relative;
                    margin-bottom: var(--space-8);
                    width: 120px;
                    height: 120px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .empty-state-icon {
                    width: 64px;
                    height: 64px;
                    color: var(--text-muted);
                    z-index: 2;
                    opacity: 0.8;
                }

                .icon-pulse {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background: radial-gradient(circle, rgba(232, 93, 4, 0.1) 0%, transparent 70%);
                    border-radius: 50%;
                    animation: pulse-glow 3s infinite ease-in-out;
                }

                @keyframes pulse-glow {
                    0% { transform: scale(0.8); opacity: 0.5; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                    100% { transform: scale(0.8); opacity: 0.5; }
                }

                .empty-state-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: var(--space-3);
                }

                .empty-state-description {
                    color: var(--text-muted);
                    line-height: 1.6;
                    font-size: 1rem;
                    margin-bottom: var(--space-2);
                }

                /* Super CTA Button */
                .btn-super-glow {
                    background: linear-gradient(135deg, #E85D04, #F48C06);
                    border: none;
                    box-shadow: 0 10px 25px -5px rgba(232, 93, 4, 0.5), 0 8px 10px -6px rgba(232, 93, 4, 0.1);
                    padding: 16px 32px;
                    font-size: 1.1rem;
                    gap: 12px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                    border-radius: 50px; /* Pill shape */
                }

                .btn-super-glow:hover {
                    transform: translateY(-2px) scale(1.02);
                    box-shadow: 0 20px 25px -5px rgba(232, 93, 4, 0.6), 0 10px 10px -5px rgba(232, 93, 4, 0.2);
                    background: linear-gradient(135deg, #ff6b0a, #ff9b1f);
                }

                .btn-super-glow:active {
                    transform: translateY(0) scale(0.98);
                }

                .btn-icon-bg {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
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
                    border-top-color: var(--accent-color);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .aplicacao-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: var(--space-4);
                    }
                    
                    .header-content {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .btn-super-glow {
                        width: 100%;
                        justify-content: center;
                    }
                }
            `}</style>
        </div>
    );
}

export default AplicacaoPage;
