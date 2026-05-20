import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { manualService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLoja } from '../context/LojaContext';
import EditManualModal from '../components/EditManualModal';
import { ArrowLeft, Eye, Calendar, User, Edit, ChevronRight, Download, Copy, Check } from 'lucide-react';

function ManualView() {
    const { id, numero } = useParams();
    const { isTI, canCreateManual, user } = useAuth();
    const { selectedLoja } = useLoja();
    const [manual, setManual] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [copyMessage, setCopyMessage] = useState('');
    const [duplicateMessage, setDuplicateMessage] = useState('');
    const [isDuplicated, setIsDuplicated] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const viewCounted = useRef(false);
    const contentRef = useRef(null);
    const navigate = useNavigate();

    const loadManual = async () => {
        try {
            // Só incrementa view na primeira chamada
            const incrementView = !viewCounted.current;
            if (incrementView) {
                viewCounted.current = true;
            }

            const lojaAtiva = numero || selectedLoja || user?.numeroLoja;
            const params = lojaAtiva ? { loja: lojaAtiva } : {};
            const response = await manualService.buscarPorId(id, incrementView, params);
            setManual(response.data);
        } catch (error) {
            console.error('Erro ao carregar manual:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadManual();
    }, [id, numero, selectedLoja, user]);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    const resolveUploadUrl = (filePath) => {
        if (!filePath) return '';
        if (/^(https?:|blob:|data:)/i.test(filePath)) return filePath;
        if (filePath.startsWith('/manuais/uploads/')) return filePath;
        if (filePath.startsWith('/uploads/')) return `/manuais${filePath}`;
        if (filePath.startsWith('manuais/uploads/')) return `/${filePath}`;
        if (filePath.startsWith('uploads/')) return `/manuais/${filePath}`;
        return filePath.startsWith('/') ? filePath : `/${filePath}`;
    };

    const normalizeUploadUrlsInHtml = (html) => {
        if (!html) return '';
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        doc.querySelectorAll('img').forEach((img) => {
            const src = img.getAttribute('src') || '';

            if (src.startsWith('blob:')) {
                img.remove();
                return;
            }

            img.setAttribute('src', resolveUploadUrl(src));
        });

        doc.querySelectorAll('a').forEach((link) => {
            const href = link.getAttribute('href') || '';
            if (href.startsWith('/uploads/') || href.startsWith('uploads/')) {
                link.setAttribute('href', resolveUploadUrl(href));
            }
        });

        return doc.body.innerHTML;
    };

    const handleCopyContent = async () => {
        if (!contentRef.current || manual?.TIPO_CONTEUDO === 'PDF') return;

        try {
            // Tenta obter o texto do conteúdo de diferentes formas
            const text = contentRef.current.innerText ||
                contentRef.current.textContent ||
                '';

            if (!text.trim()) {
                setCopyMessage('Nenhum conteúdo para copiar');
                setTimeout(() => setCopyMessage(''), 2000);
                return;
            }

            // Tenta usar a API moderna de clipboard
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                setIsCopied(true);
                setCopyMessage('Conteúdo copiado!');
            } else {
                // Fallback para navegadores mais antigos
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                    document.execCommand('copy');
                    setIsCopied(true);
                    setCopyMessage('Conteúdo copiado!');
                } catch (err) {
                    throw new Error('Falha ao copiar');
                } finally {
                    document.body.removeChild(textArea);
                }
            }
        } catch (err) {
            console.error('Erro ao copiar conteúdo:', err);
            setCopyMessage('Não foi possível copiar');
        }

        setTimeout(() => {
            setCopyMessage('');
            setIsCopied(false);
        }, 2000);
    };

    const handleDuplicateToTraining = async () => {
        if (!manual) return;

        try {
            await manualService.duplicarParaTreinamentos(manual.ID_MANUAL);
            setDuplicateMessage('Manual duplicado para Treinamentos');
            setIsDuplicated(true);
        } catch (error) {
            console.error('Erro ao duplicar manual:', error);
            const errorMsg = error.response?.data?.error || 'Não foi possível duplicar';
            setDuplicateMessage(errorMsg);
        }

        setTimeout(() => setDuplicateMessage(''), 3000);
    };

    if (loading) {
        return (
            <div className="page-content">
                <div className="container">
                    <div className="manual-view-skeleton">
                        <div className="skeleton" style={{ height: '24px', width: '200px', marginBottom: '24px' }} />
                        <div className="skeleton" style={{ height: '48px', width: '80%', marginBottom: '16px' }} />
                        <div className="skeleton" style={{ height: '20px', width: '60%', marginBottom: '32px' }} />
                        <div className="skeleton" style={{ height: '400px', width: '100%' }} />
                    </div>
                </div>
            </div>
        );
    }

    if (!manual) {
        return (
            <div className="page-content">
                <div className="container">
                    <div className="empty-state">
                        <h2>Manual não encontrado</h2>
                        <Link to={numero ? `/loja/${numero}` : '/'} className="btn btn-primary">
                            Voltar ao início
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content animate-fadeIn">
            <div className="container">
                <article className="manual-view">
                    {/* Breadcrumb */}
                    <nav className="breadcrumb">
                        <Link to={numero ? `/loja/${numero}` : '/'}>Início</Link>
                        <ChevronRight size={16} />
                        <Link to={numero ? `/loja/${numero}/modulo/${manual.ID_MODULO}` : `/modulo/${manual.ID_MODULO}`}>{manual.NOME_MODULO}</Link>
                        <ChevronRight size={16} />
                        <Link to={numero ? `/loja/${numero}/aplicacao/${manual.ID_APLICACAO}` : `/aplicacao/${manual.ID_APLICACAO}`}>{manual.NOME_APLICACAO}</Link>
                    </nav>

                    {/* Header */}
                    <header className="manual-header">
                        <div className="manual-badges">
                            <span className="badge badge-module">{manual.NOME_MODULO}</span>
                            <span className="badge badge-app">{manual.NOME_APLICACAO}</span>
                        </div>

                        <h1 className="manual-title">{manual.TITULO}</h1>

                        {manual.DESCRICAO_CARD && (
                            <p className="manual-description">{manual.DESCRICAO_CARD}</p>
                        )}

                        <div className="manual-meta">
                            <span className="meta-item">
                                <User size={16} />
                                Criado por: {manual.AUTOR}
                            </span>

                            <span className="meta-item">
                                <Calendar size={16} />
                                Criado em: {formatDate(manual.DATA_CRIACAO)}
                            </span>

                            <span className="meta-item">
                                <Eye size={16} />
                                {manual.QTD_VIEWS} visualizações
                            </span>

                            {isTI && manual.ULTIMO_ACESSO && (
                                <span className="meta-item">
                                    <User size={16} />
                                    Último acesso: {manual.ULTIMO_ACESSO}
                                </span>
                            )}

                            {manual.EDITOR && (
                                <span className="meta-item text-muted" style={{ width: '100%', fontSize: '0.9em' }}>
                                    <Edit size={14} />
                                    Editado por: {manual.EDITOR} em {formatDate(manual.DATA_ATUALIZACAO)}
                                </span>
                            )}
                        </div>
                        <div className="manual-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                            {canCreateManual && (
                                <button
                                    onClick={handleDuplicateToTraining}
                                    className="btn btn-ghost"
                                    disabled={isDuplicated}
                                    style={{ opacity: isDuplicated ? 0.5 : 1, cursor: isDuplicated ? 'not-allowed' : 'pointer' }}
                                >
                                    <Copy size={18} />
                                    {isDuplicated ? 'Já duplicado' : 'Duplicar p/ Treinamentos'}
                                </button>
                            )}
                            {canCreateManual && (user?.id === manual?.ID_AUTOR || isTI) && (
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="btn btn-secondary"
                                >
                                    <Edit size={18} />
                                    Editar manual
                                </button>
                            )}
                            {(duplicateMessage || copyMessage) && (
                                <span className="text-muted" style={{ alignSelf: 'center' }}>
                                    {duplicateMessage || copyMessage}
                                </span>
                            )}
                        </div>
                    </header>

                    {/* Content */}
                    {manual.TIPO_CONTEUDO === 'PDF' && manual.ARQUIVO_PDF ? (
                        <div className="manual-content file-container">
                            {(() => {
                                const fileUrl = resolveUploadUrl(manual.ARQUIVO_PDF);
                                const ext = manual.ARQUIVO_PDF.split('.').pop().toLowerCase();
                                const isPdf = ext === 'pdf';
                                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);

                                if (isPdf) {
                                    return (
                                        <iframe
                                            src={fileUrl}
                                            title={manual.TITULO}
                                            width="100%"
                                            height="800px"
                                            style={{ border: 'none', borderRadius: '8px' }}
                                        />
                                    );
                                } else if (isImage) {
                                    return (
                                        <div className="flex justify-center">
                                            <img
                                                src={fileUrl}
                                                alt={manual.TITULO}
                                                style={{ maxWidth: '100%', maxHeight: '800px', borderRadius: '8px' }}
                                            />
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div className="download-card">
                                            <div className="download-icon">
                                                <Download size={48} />
                                            </div>
                                            <div className="download-info">
                                                <h3>Arquivo disponível para download</h3>
                                                <p>{manual.ARQUIVO_PDF.split('/').pop()}</p>
                                                <a
                                                    href={fileUrl}
                                                    download
                                                    className="btn btn-primary"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <Download size={18} />
                                                    Baixar Arquivo
                                                </a>
                                            </div>
                                        </div>
                                    );
                                }
                            })()}
                        </div>
                    ) : (
                        <div className="manual-content copy-container">
                            <button
                                type="button"
                                onClick={handleCopyContent}
                                className={`copy-icon-btn ${isCopied ? 'copied' : ''}`}
                                title={isCopied ? 'Copiado!' : 'Copiar todo o conteúdo'}
                                aria-label="Copiar todo o conteúdo"
                            >
                                {isCopied ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                            <div
                                ref={contentRef}
                                className="manual-content-body"
                                dangerouslySetInnerHTML={{ __html: normalizeUploadUrlsInHtml(manual.CONTEUDO_HTML) }}
                            />
                        </div>
                    )}

                    {/* Footer */}
                    <footer className="manual-footer">
                        <button onClick={() => navigate(-1)} className="btn btn-ghost">
                            <ArrowLeft size={18} />
                            Voltar
                        </button>
                    </footer>
                </article>

                {showEditModal && (
                    <EditManualModal
                        manualId={manual.ID_MANUAL}
                        onClose={() => setShowEditModal(false)}
                        onSave={() => {
                            setShowEditModal(false);
                            loadManual();
                        }}
                    />
                )}
            </div>

            <style>{`
                .manual-view {
                    width: 100%;
                    max-width: 1400px;
                    margin: 0;
                }

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
                    transition: color var(--transition-fast);
                }

                .breadcrumb a:hover {
                    color: var(--accent-color);
                }

                .manual-header {
                    margin-bottom: var(--space-8);
                    padding-bottom: var(--space-8);
                    border-bottom: 1px solid var(--border-color);
                }

                .manual-badges {
                    display: flex;
                    gap: var(--space-2);
                    margin-bottom: var(--space-4);
                }

                .badge {
                    padding: var(--space-1) var(--space-3);
                    font-size: var(--font-size-xs);
                    font-weight: 500;
                    border-radius: var(--radius-sm);
                }

                .badge-module {
                    background: var(--active-bg);
                    color: var(--accent-color);
                    border: 1px solid rgba(232, 93, 4, 0.2);
                }

                .badge-app {
                    background: var(--hover-bg);
                    color: var(--text-secondary);
                    border: 1px solid var(--border-color);
                }

                .manual-title {
                    font-size: var(--font-size-4xl);
                    font-weight: 800;
                    line-height: 1.2;
                    color: var(--text-primary);
                    margin-bottom: var(--space-4);
                }

                .manual-description {
                    font-size: var(--font-size-lg);
                    color: var(--text-secondary);
                    line-height: 1.7;
                    margin-bottom: var(--space-6);
                }

                .manual-meta {
                    display: flex;
                    flex-wrap: wrap;
                    column-gap: var(--space-6);
                    row-gap: var(--space-2);
                    margin-bottom: var(--space-6);
                }

                .meta-item {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    color: var(--text-muted);
                    font-size: var(--font-size-sm);
                }

                .meta-author-group {
                    display: flex;
                    flex-direction: column;
                }

                .manual-content {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-xl);
                    padding: var(--space-8);
                    line-height: 1.8;
                    font-size: var(--font-size-base);
                    box-shadow: var(--shadow-sm);
                }

                .copy-container {
                    position: relative;
                }

                .copy-icon-btn {
                    position: absolute;
                    top: var(--space-3);
                    right: var(--space-3);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 1px solid var(--glass-border);
                    background: rgba(15, 23, 42, 0.3);
                    color: var(--text-secondary);
                    backdrop-filter: blur(8px);
                    transition: all var(--transition-fast);
                    box-shadow: var(--shadow-sm);
                }

                .copy-icon-btn:hover {
                    color: var(--primary-400);
                    border-color: rgba(59, 130, 246, 0.4);
                    background: rgba(15, 23, 42, 0.5);
                }

                .copy-icon-btn.copied {
                    color: #10B981;
                    border-color: rgba(16, 185, 129, 0.4);
                    background: rgba(16, 185, 129, 0.1);
                }

                .copy-icon-btn:active {
                    transform: scale(0.97);
                }

                .manual-content-body {
                    width: 100%;
                }

                .manual-content h1,
                .manual-content h2,
                .manual-content h3 {
                    margin-top: var(--space-8);
                    margin-bottom: var(--space-4);
                    color: var(--text-primary);
                }

                .manual-content h1 { font-size: var(--font-size-2xl); }
                .manual-content h2 { font-size: var(--font-size-xl); }
                .manual-content h3 { font-size: var(--font-size-lg); }

                .manual-content p {
                    margin-bottom: var(--space-4);
                    color: var(--text-secondary);
                }

                .manual-content ul,
                .manual-content ol {
                    margin-bottom: var(--space-4);
                    padding-left: var(--space-6);
                    color: var(--text-secondary);
                }

                .manual-content li {
                    margin-bottom: var(--space-2);
                }

                .manual-content img {
                    max-width: 100%;
                    height: auto;
                    border-radius: var(--radius-lg);
                    margin: var(--space-6) 0;
                    box-shadow: var(--shadow-lg);
                }

                .manual-content blockquote {
                    border-left: 4px solid var(--primary-500);
                    padding-left: var(--space-4);
                    margin: var(--space-6) 0;
                    color: var(--text-muted);
                    font-style: italic;
                }

                .manual-content a {
                    color: var(--primary-400);
                    text-decoration: underline;
                }

                .manual-content code {
                    background: var(--bg-dark);
                    padding: var(--space-1) var(--space-2);
                    border-radius: var(--radius-sm);
                    font-family: monospace;
                    font-size: 0.9em;
                }

                .manual-content pre {
                    background: var(--bg-dark);
                    padding: var(--space-4);
                    border-radius: var(--radius-lg);
                    overflow-x: auto;
                    margin: var(--space-4) 0;
                }

                .manual-footer {
                    margin-top: var(--space-8);
                    padding-top: var(--space-6);
                    border-top: 1px solid var(--glass-border);
                }

                .manual-view-skeleton {
                    max-width: 900px;
                    margin: 0 auto;
                }

                @media (max-width: 768px) {
                    .manual-title {
                        font-size: var(--font-size-2xl);
                    }

                    .manual-content {
                        padding: var(--space-5);
                    }

                    .download-card {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: var(--space-10);
                        background: var(--bg-secondary);
                        border-radius: var(--radius-lg);
                        text-align: center;
                        border: 1px solid var(--border-color);
                        margin: var(--space-4) 0;
                    }

                    .download-icon {
                        color: var(--primary-400);
                        margin-bottom: var(--space-4);
                        background: rgba(59, 130, 246, 0.1);
                        padding: var(--space-4);
                        border-radius: 50%;
                    }

                    .download-info h3 {
                        margin-bottom: var(--space-2);
                    }
                    
                    .download-info p {
                        margin-bottom: var(--space-6);
                        color: var(--text-muted);
                    }
                }
            `}</style>
        </div>
    );
}

export default ManualView;
