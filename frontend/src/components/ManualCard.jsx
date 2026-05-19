import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, Calendar, Edit, Trash2, ArrowRight } from 'lucide-react';
import EditManualModal from './EditManualModal';

function ManualCard({ manual, onDelete, onSave, showActions = true }) {
    const { isTI, canCreateManual, user } = useAuth();
    const { numero } = useParams(); // Obtém o número da loja se estiver em rota de loja

    const [isHovered, setIsHovered] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const handleDelete = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onDelete) {
            onDelete(manual.ID_MANUAL);
        }
    };

    // Verificar se o usuário pode editar o manual
    const canEditManual = canCreateManual && (user?.id === manual?.ID_AUTOR || isTI);

    // Determina o link correto (com ou sem contexto de loja)
    const linkDestino = numero
        ? `/loja/${numero}/manual/${manual.ID_MANUAL}`
        : `/manual/${manual.ID_MANUAL}`;

    return (
        <article
            className={`manual-card ${isHovered ? 'hovered' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header Row: Badges + Actions (Flexbox ensures space is reserved) */}
            <div className="card-header-row">
                <div className="card-badges">
                    {manual.NOME_MODULO && (
                        <span className="badge badge-module">{manual.NOME_MODULO}</span>
                    )}
                    {manual.NOME_APLICACAO && (
                        <span className="badge badge-app">{manual.NOME_APLICACAO}</span>
                    )}
                </div>

                {(canEditManual || isTI) && showActions && (
                    <div className="card-actions">
                        {canEditManual && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowEditModal(true);
                                }}
                                className="action-btn edit"
                                title="Editar"
                            >
                                <Edit size={16} />
                            </button>
                        )}
                        {isTI && (
                            <button
                                onClick={handleDelete}
                                className="action-btn delete"
                                title="Excluir"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="card-content">
                <h3 className="card-title">{manual.TITULO}</h3>

                {manual.DESCRICAO_CARD && (
                    <p className="card-description">{manual.DESCRICAO_CARD}</p>
                )}
            </div>

            {/* Footer */}
            <div className="card-footer">
                <div className="card-meta">
                    <span className="meta-item">
                        <Eye size={14} />
                        {manual.QTD_VIEWS || 0} views
                    </span>
                    {manual.DATA_ATUALIZACAO && (
                        <span className="meta-item">
                            <Calendar size={14} />
                            {formatDate(manual.DATA_ATUALIZACAO)}
                        </span>
                    )}
                </div>

                <span className="card-cta">
                    Ler manual <ArrowRight size={16} />
                </span>
            </div>

            {/* Overlay Link - Covers the entire card but sits below buttons */}
            <Link to={linkDestino} className="card-overlay-link" />

            {showEditModal && (
                <EditManualModal
                    manualId={manual.ID_MANUAL}
                    onClose={() => setShowEditModal(false)}
                    onSave={() => {
                        setShowEditModal(false);
                        if (onSave) onSave();
                        else window.location.reload();
                    }}
                />
            )}

            <style>{`
                .manual-card {
                    position: relative;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-xl);
                    transition: all var(--transition-base);
                    display: flex;
                    flex-direction: column;
                    padding: var(--space-5);
                    height: 100%;
                    box-shadow: var(--shadow-sm);
                }

                .manual-card:hover,
                .manual-card.hovered {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-lg);
                    border-color: var(--accent-color);
                }

                /* Header Row Layout */
                .card-header-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: var(--space-4);
                    min-height: 32px;
                    z-index: 5;
                    position: relative;
                }

                .card-badges {
                    display: flex;
                    flex-wrap: wrap;
                    gap: var(--space-2);
                    padding-right: var(--space-2);
                    align-items: center;
                }

                .card-actions {
                    display: flex;
                    gap: var(--space-2);
                    flex-shrink: 0;
                    margin-left: auto;
                }

                /* Content Layout */
                .card-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .card-overlay-link {
                    position: absolute;
                    inset: 0;
                    z-index: 1;
                    cursor: pointer;
                }

                /* Badges */
                .badge {
                    padding: 4px 10px;
                    font-size: var(--font-size-xs);
                    font-weight: 600;
                    border-radius: var(--radius-md);
                    white-space: nowrap;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .badge-module {
                    background: rgba(232, 93, 4, 0.1);
                    color: var(--accent-color);
                    border: 1px solid rgba(232, 93, 4, 0.15);
                }

                .badge-app {
                    background: var(--hover-bg);
                    color: var(--text-secondary);
                    border: 1px solid var(--border-color);
                }

                /* Buttons */
                .action-btn {
                    width: 34px;
                    height: 34px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    background: var(--bg-card);
                    color: var(--text-secondary);
                    position: relative;
                    z-index: 10;
                }

                .action-btn:hover {
                    border-color: var(--accent-color);
                    color: var(--accent-color);
                    background: var(--active-bg);
                    transform: scale(1.1);
                }

                .action-btn.delete:hover {
                    border-color: var(--danger-color);
                    color: var(--danger-color);
                    background: rgba(220, 38, 38, 0.05);
                }

                .card-title {
                    font-size: var(--font-size-lg);
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: var(--space-2);
                    line-height: 1.4;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    pointer-events: none;
                }

                .card-description {
                    color: var(--text-secondary);
                    font-size: var(--font-size-sm);
                    line-height: 1.6;
                    flex: 1;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    margin-bottom: var(--space-6);
                    pointer-events: none;
                }

                .card-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: var(--space-4);
                    border-top: 1px solid var(--border-color);
                    gap: var(--space-3);
                    position: relative;
                    z-index: 2;
                    pointer-events: none;
                }

                .card-meta {
                    display: flex;
                    gap: var(--space-4);
                    flex: 1;
                }

                .card-cta {
                    display: flex;
                    align-items: center;
                    gap: var(--space-1);
                    color: var(--accent-color);
                    font-size: var(--font-size-sm);
                    font-weight: 700;
                    transition: all var(--transition-fast);
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                .manual-card:hover .card-cta {
                    gap: var(--space-2);
                    color: var(--accent-red);
                }

                .meta-item {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    color: var(--text-muted);
                    font-size: var(--font-size-xs);
                    font-weight: 500;
                }

                .meta-item svg {
                    opacity: 0.7;
                }


                /* Ensure the card content doesn't overflow */
                .card-title, .card-description {
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                }

                @media (max-width: 350px) {
                    .manual-card {
                        padding: var(--space-3);
                    }
                    .card-footer {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: var(--space-2);
                    }
                    .card-cta {
                        margin-left: 0;
                        width: 100%;
                        justify-content: flex-end;
                    }
                }

            `}</style>
        </article>
    );
}

export default ManualCard;
