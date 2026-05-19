import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { manualService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLoja } from '../context/LojaContext';
import { Trash2, RotateCcw, AlertTriangle, BookOpen } from 'lucide-react';

function Lixeira() {
    const { user } = useAuth();
    const { selectedLoja } = useLoja();
    const [manuais, setManuais] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLixeira();
    }, [selectedLoja]);

    const loadLixeira = async () => {
        try {
            const lojaAtiva = selectedLoja || user?.numeroLoja;
            const params = lojaAtiva ? { loja: lojaAtiva } : {};
            const response = await manualService.listarLixeira(params);
            setManuais(response.data);
        } catch (error) {
            console.error('Erro ao carregar lixeira:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRestaurar = async (id) => {
        try {
            const lojaAtiva = selectedLoja || user?.numeroLoja;
            const params = lojaAtiva ? { loja: lojaAtiva } : {};
            await manualService.restaurar(id, params);
            loadLixeira();
        } catch (error) {
            console.error('Erro ao restaurar:', error);
        }
    };

    const handleExcluirPermanente = async (id) => {
        if (window.confirm('ATENÇÃO: Esta ação não pode ser desfeita. Deseja excluir permanentemente?')) {
            try {
                const lojaAtiva = selectedLoja || user?.numeroLoja;
                const params = lojaAtiva ? { loja: lojaAtiva } : {};
                await manualService.excluirPermanente(id, params);
                loadLixeira();
            } catch (error) {
                console.error('Erro ao excluir:', error);
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
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

    return (
        <div className="page-content animate-fadeIn">
            <div className="container">
                {/* Header */}
                <header className="lixeira-header">
                    <div className="header-content">
                        <div className="lixeira-icon">
                            <Trash2 size={32} />
                        </div>
                        <div>
                            <h1 className="heading-1">Lixeira</h1>
                            <p className="lixeira-subtitle">
                                {manuais.length} item(ns) na lixeira
                            </p>
                        </div>
                    </div>
                </header>

                {/* Warning */}
                <div className="lixeira-warning">
                    <AlertTriangle size={20} />
                    <span>Itens excluídos permanentemente não podem ser recuperados.</span>
                </div>

                {/* Lista */}
                {manuais.length > 0 ? (
                    <div className="lixeira-list">
                        {manuais.map(manual => (
                            <div key={manual.ID_MANUAL} className="lixeira-item">
                                <div className="item-info">
                                    <h3 className="item-titulo">{manual.TITULO}</h3>
                                    <div className="item-meta">
                                        <span className="badge">{manual.NOME_MODULO}</span>
                                        <span className="badge">{manual.NOME_APLICACAO}</span>
                                        <span className="item-date">
                                            Excluído em {formatDate(manual.DATA_ATUALIZACAO)}
                                        </span>
                                    </div>
                                </div>
                                <div className="item-actions">
                                    <button
                                        onClick={() => handleRestaurar(manual.ID_MANUAL)}
                                        className="btn btn-secondary btn-sm"
                                        title="Restaurar"
                                    >
                                        <RotateCcw size={16} />
                                        Restaurar
                                    </button>
                                    <button
                                        onClick={() => handleExcluirPermanente(manual.ID_MANUAL)}
                                        className="btn btn-danger btn-sm"
                                        title="Excluir permanentemente"
                                    >
                                        <Trash2 size={16} />
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <BookOpen className="empty-state-icon" />
                        <h3 className="empty-state-title">Lixeira vazia</h3>
                        <p className="empty-state-description">
                            Não há manuais na lixeira.
                        </p>
                        <Link to="/" className="btn btn-secondary mt-4">
                            Voltar ao início
                        </Link>
                    </div>
                )}
            </div>

            <style>{`
                .lixeira-header {
                    margin-bottom: var(--space-6);
                }

                .header-content {
                    display: flex;
                    align-items: center;
                    gap: var(--space-5);
                }

                .lixeira-icon {
                    width: 70px;
                    height: 70px;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: var(--radius-xl);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--danger-color);
                }

                .lixeira-subtitle {
                    color: var(--text-muted);
                    margin-top: var(--space-2);
                }

                .lixeira-warning {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    padding: var(--space-4);
                    background: rgba(232, 93, 4, 0.05);
                    border: 1px solid rgba(232, 93, 4, 0.2);
                    border-radius: var(--radius-lg);
                    color: var(--accent-color);
                    font-size: var(--font-size-sm);
                    margin-bottom: var(--space-6);
                }

                .lixeira-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-4);
                }

                .lixeira-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--space-5);
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    gap: var(--space-6);
                    box-shadow: var(--shadow-sm);
                }

                .item-info {
                    flex: 1;
                }

                .item-titulo {
                    font-size: var(--font-size-lg);
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: var(--space-2);
                }

                .item-meta {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: var(--space-2);
                }

                .badge {
                    padding: var(--space-1) var(--space-2);
                    font-size: var(--font-size-xs);
                    background: var(--hover-bg);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-sm);
                    color: var(--text-muted);
                }

                .item-date {
                    color: var(--text-muted);
                    font-size: var(--font-size-xs);
                }

                .item-actions {
                    display: flex;
                    gap: var(--space-2);
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
                    border: 3px solid var(--border-color);
                    border-top-color: var(--accent-color);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .lixeira-item {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .item-actions {
                        width: 100%;
                        margin-top: var(--space-4);
                    }

                    .item-actions .btn {
                        flex: 1;
                    }
                }
            `}</style>
        </div>
    );
}

export default Lixeira;
