import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { manualService, aplicacaoService, moduloService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLoja } from '../context/LojaContext';
import RichTextEditor from '../components/RichTextEditor';
import { Save, ArrowLeft, FileText } from 'lucide-react';

function ManualEditor() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const aplicacaoIdFromUrl = searchParams.get('aplicacaoId');
    const navigate = useNavigate();
    const isEditing = !!id;

    const { user } = useAuth();
    const { selectedLoja } = useLoja();

    // Determina a loja ativa (selecionada ou do usuário)
    const lojaAtiva = selectedLoja || user?.numeroLoja;

    const [formData, setFormData] = useState({
        titulo: '',
        descricao_card: '',
        id_aplicacao: '',
        conteudo_html: ''
    });

    const [modulos, setModulos] = useState([]);
    const [aplicacoes, setAplicacoes] = useState([]);
    const [selectedModulo, setSelectedModulo] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [preloaded, setPreloaded] = useState(false);

    useEffect(() => {
        loadModulos();
        if (isEditing) {
            loadManual();
        }
    }, [id, lojaAtiva]); // Recarrega se loja mudar (embora reload de página seja comum ao mudar loja)

    // Pré-carregar aplicação quando vier da URL
    useEffect(() => {
        if (aplicacaoIdFromUrl && modulos.length > 0 && !preloaded && !isEditing) {
            preloadAplicacao();
        }
    }, [aplicacaoIdFromUrl, modulos, preloaded, isEditing, lojaAtiva]);

    useEffect(() => {
        if (selectedModulo) {
            loadAplicacoes(selectedModulo);
        } else {
            setAplicacoes([]);
        }
    }, [selectedModulo, lojaAtiva]);

    const getParams = () => {
        return lojaAtiva ? { loja: lojaAtiva } : {};
    };

    const loadModulos = async () => {
        try {
            const response = await moduloService.listar(getParams());
            setModulos(response.data);
        } catch (error) {
            console.error('Erro ao carregar módulos:', error);
        }
    };

    const preloadAplicacao = async () => {
        try {
            const response = await aplicacaoService.buscarPorId(aplicacaoIdFromUrl, getParams());
            const app = response.data;
            if (app) {
                setSelectedModulo(app.ID_MODULO?.toString() || '');
                setFormData(prev => ({ ...prev, id_aplicacao: aplicacaoIdFromUrl }));
                setPreloaded(true);
            }
        } catch (error) {
            console.error('Erro ao pré-carregar aplicação:', error);
        }
    };

    const loadAplicacoes = async (moduloId) => {
        try {
            const response = await aplicacaoService.listarPorModulo(moduloId, getParams());
            setAplicacoes(response.data);
        } catch (error) {
            console.error('Erro ao carregar aplicações:', error);
        }
    };

    const loadManual = async () => {
        setLoading(true);
        try {
            // Passa countView=false para não contar visualização ao editar
            const response = await manualService.buscarPorId(id, false, getParams());
            const manual = response.data;

            setFormData({
                titulo: manual.TITULO || '',
                descricao_card: manual.DESCRICAO_CARD || '',
                id_aplicacao: manual.ID_APLICACAO?.toString() || '',
                conteudo_html: manual.CONTEUDO_HTML || ''
            });

            setSelectedModulo(manual.ID_MODULO?.toString() || '');
        } catch (error) {
            console.error('Erro ao carregar manual:', error);
            setError('Erro ao carregar manual');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            const data = {
                titulo: formData.titulo,
                descricao_card: formData.descricao_card,
                id_aplicacao: parseInt(formData.id_aplicacao),
                conteudo_html: formData.conteudo_html,
                loja: lojaAtiva // Importante: enviar a loja para o backend saber onde salvar
            };

            if (isEditing) {
                await manualService.atualizar(id, data);
            } else {
                await manualService.criar(data);
            }

            navigate('/');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            setError(error.response?.data?.error || 'Erro ao salvar manual');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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
                <div className="editor-page">
                    {/* Header */}
                    <div className="editor-header">
                        <Link to="/" className="btn btn-ghost">
                            <ArrowLeft size={20} />
                            Voltar
                        </Link>
                        <h1 className="heading-2">
                            <FileText size={24} />
                            {isEditing ? 'Editar Manual' : 'Novo Manual'}
                        </h1>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="editor-form">
                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label" htmlFor="modulo">
                                    Módulo *
                                </label>
                                <select
                                    id="modulo"
                                    className="form-input form-select"
                                    value={selectedModulo}
                                    onChange={(e) => {
                                        setSelectedModulo(e.target.value);
                                        setFormData(prev => ({ ...prev, id_aplicacao: '' }));
                                    }}
                                    required
                                >
                                    <option value="">Selecione um módulo</option>
                                    {modulos.map(m => (
                                        <option key={m.ID_MODULO} value={m.ID_MODULO}>
                                            {m.NOME_MODULO}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="aplicacao">
                                    Aplicação *
                                </label>
                                <select
                                    id="aplicacao"
                                    className="form-input form-select"
                                    value={formData.id_aplicacao}
                                    onChange={(e) => handleChange('id_aplicacao', e.target.value)}
                                    required
                                    disabled={!selectedModulo}
                                >
                                    <option value="">Selecione uma aplicação</option>
                                    {aplicacoes.map(a => (
                                        <option key={a.ID_APLICACAO} value={a.ID_APLICACAO}>
                                            {a.NOME_APLICACAO}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="titulo">
                                Título do Manual *
                            </label>
                            <input
                                type="text"
                                id="titulo"
                                className="form-input"
                                value={formData.titulo}
                                onChange={(e) => handleChange('titulo', e.target.value)}
                                placeholder="Ex: Como cadastrar um novo produto"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="descricao">
                                Descrição para o Card
                            </label>
                            <textarea
                                id="descricao"
                                className="form-input form-textarea"
                                value={formData.descricao_card}
                                onChange={(e) => handleChange('descricao_card', e.target.value)}
                                placeholder="Breve resumo do que este manual ensina..."
                                rows={3}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Conteúdo do Manual
                            </label>
                            <RichTextEditor
                                content={formData.conteudo_html}
                                onChange={(html) => handleChange('conteudo_html', html)}
                            />
                            <p className="form-hint">
                                Dica: Você pode colar imagens diretamente (Ctrl+V) ou usar o botão de imagem.
                            </p>
                        </div>

                        <div className="form-actions">
                            <Link to="/" className="btn btn-secondary">
                                Cancelar
                            </Link>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving}
                            >
                                {saving ? (
                                    'Salvando...'
                                ) : (
                                    <>
                                        <Save size={18} />
                                        {isEditing ? 'Salvar alterações' : 'Criar manual'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <style>{`
                .editor-page {
                    max-width: 900px;
                    margin: 0 auto;
                }

                .editor-header {
                    display: flex;
                    align-items: center;
                    gap: var(--space-4);
                    margin-bottom: var(--space-8);
                }

                .editor-header .heading-2 {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                }

                .editor-form {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-xl);
                    padding: var(--space-8);
                    box-shadow: var(--shadow-sm);
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-4);
                }

                .error-message {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    color: var(--danger-color);
                    padding: var(--space-3) var(--space-4);
                    border-radius: var(--radius-lg);
                    font-size: var(--font-size-sm);
                    margin-bottom: var(--space-5);
                }

                .form-hint {
                    color: var(--text-muted);
                    font-size: var(--font-size-xs);
                    margin-top: var(--space-2);
                }

                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: var(--space-3);
                    margin-top: var(--space-6);
                    padding-top: var(--space-6);
                    border-top: 1px solid var(--border-color);
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

                @media (max-width: 640px) {
                    .form-row {
                        grid-template-columns: 1fr;
                    }

                    .editor-form {
                        padding: var(--space-5);
                    }
                }
            `}</style>
        </div>
    );
}

export default ManualEditor;
