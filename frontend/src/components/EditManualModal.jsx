import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { manualService, aplicacaoService, moduloService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLoja } from '../context/LojaContext';
import RichTextEditor from './RichTextEditor';
import { Save, X, FileText, Upload, FileType, Paperclip } from 'lucide-react';

export default function EditManualModal({ manualId, initialAplicacaoId, initialModuloId, onClose, onSave }) {
    const { numero } = useParams();
    const isEditing = !!manualId;

    const { user } = useAuth();
    const { selectedLoja } = useLoja();

    // Determina a loja ativa:
    // 1. numero (URL parameter se estiver em rota de loja)
    // 2. selectedLoja (Contexto global selecionado no Dashboard)
    // 3. user.numeroLoja (Loja fixa do usuário logado)
    const lojaAtiva = numero || selectedLoja || user?.numeroLoja;

    const [formData, setFormData] = useState({
        titulo: '',
        descricao_card: '',
        id_aplicacao: initialAplicacaoId || '',
        conteudo_html: '',
        tipo_conteudo: 'HTML',
        arquivo_pdf: null
    });

    const [modulos, setModulos] = useState([]);
    const [aplicacoes, setAplicacoes] = useState([]);
    const [selectedModulo, setSelectedModulo] = useState(initialModuloId?.toString() || '');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Removendo ref desnecessária pois usamos label agora, mas mantendo para paste event se necessário
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadModulos();
        if (isEditing) {
            loadManual();
        }
        // Bloqueia scroll do body quando modal abre
        document.body.style.overflow = 'hidden';

        // Paste event listener
        const handlePaste = (e) => {
            if (formData.tipo_conteudo === 'PDF' && e.clipboardData && e.clipboardData.files.length > 0) {
                const file = e.clipboardData.files[0];
                setFormData(prev => ({ ...prev, arquivo_pdf: file }));
                e.preventDefault();
            }
        };
        window.addEventListener('paste', handlePaste);

        return () => {
            document.body.style.overflow = 'unset';
            document.body.style.overflow = 'auto';
            window.removeEventListener('paste', handlePaste);
        };
    }, [manualId, formData.tipo_conteudo, lojaAtiva]);

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
            // Note: buscarPorId signature is (id, countView, params)
            // We don't want to increment countView on edit load? Usually not.
            const response = await manualService.buscarPorId(manualId, false, getParams());
            const manual = response.data;

            setFormData({
                titulo: manual.TITULO || '',
                descricao_card: manual.DESCRICAO_CARD || '',
                id_aplicacao: manual.ID_APLICACAO?.toString() || '',
                conteudo_html: manual.CONTEUDO_HTML || '',
                tipo_conteudo: manual.TIPO_CONTEUDO || 'HTML',
                arquivo_pdf: null // Reset para novo upload se quiser
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
            const formDataToSend = new FormData();
            formDataToSend.append('titulo', formData.titulo);
            formDataToSend.append('descricao_card', formData.descricao_card || '');
            formDataToSend.append('id_aplicacao', parseInt(formData.id_aplicacao));
            formDataToSend.append('tipo_conteudo', formData.tipo_conteudo);

            if (lojaAtiva) {
                formDataToSend.append('loja', lojaAtiva);
            }

            if (formData.tipo_conteudo === 'HTML') {
                // Validação de conteúdo vazio
                const parser = new DOMParser();
                const doc = parser.parseFromString(formData.conteudo_html, 'text/html');
                const textContent = doc.body.textContent || "";
                const hasImages = doc.querySelector('img');

                if (!textContent.trim() && !hasImages) {
                    setError('O conteúdo do manual não pode estar vazio. Escreva algo ou adicione uma imagem.');
                    setSaving(false);
                    return;
                }

                // Verificar tamanho do conteúdo (limite de 50MB para garantir)
                const contentSize = new Blob([formData.conteudo_html]).size;
                const maxSize = 50 * 1024 * 1024; // 50MB

                if (contentSize > maxSize) {
                    setError('Muitas imagens ou imagem muito grande! O manual excede o limite de 50MB.');
                    setSaving(false);
                    return;
                }

                formDataToSend.append('conteudo_html', formData.conteudo_html);
            } else if (formData.tipo_conteudo === 'PDF') {
                // Validação de arquivo obrigatório na criação
                if (!formData.arquivo_pdf && !isEditing) {
                    setError('Por favor, selecione um arquivo para o manual.');
                    setSaving(false);
                    return;
                }

                if (formData.arquivo_pdf) {
                    // Verificar tamanho do arquivo (limite de 50MB)
                    if (formData.arquivo_pdf.size > 50 * 1024 * 1024) {
                        setError('Arquivo muito grande! O arquivo deve ter no máximo 50MB.');
                        setSaving(false);
                        return;
                    }
                    formDataToSend.append('arquivo_pdf', formData.arquivo_pdf);
                }
            }

            if (isEditing) {
                await manualService.atualizar(manualId, formDataToSend, { loja: lojaAtiva });
            } else {
                await manualService.criar(formDataToSend);
            }

            if (onSave) onSave();
            onClose();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            if (error.response?.status === 413) {
                setError('Muitas imagens ou imagem muito grande! Insira imagens de até 50MB!');
            } else {
                setError(error.response?.data?.error || 'Erro ao salvar manual');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Fechar ao clicar fora ou ESC
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return createPortal(
        <div className="modal-overlay animate-fadeIn" onClick={handleOverlayClick}>
            <div className="modal-content">
                <div className="modal-header">
                    <h2 className="heading-3 flex items-center gap-2">
                        <FileText size={20} />
                        {isEditing ? 'Editar Manual' : 'Novo Manual'}
                    </h2>
                    <button onClick={onClose} className="btn-close" title="Fechar">
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="modal-form">
                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Módulo *</label>
                                <select
                                    className="form-input form-select"
                                    value={selectedModulo}
                                    onChange={(e) => {
                                        setSelectedModulo(e.target.value);
                                        setFormData(prev => ({ ...prev, id_aplicacao: '' }));
                                    }}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {modulos.map(m => (
                                        <option key={m.ID_MODULO} value={m.ID_MODULO}>{m.NOME_MODULO}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Aplicação *</label>
                                <select
                                    className="form-input form-select"
                                    value={formData.id_aplicacao}
                                    onChange={(e) => handleChange('id_aplicacao', e.target.value)}
                                    required
                                    disabled={!selectedModulo}
                                >
                                    <option value="">Selecione...</option>
                                    {aplicacoes.map(a => (
                                        <option key={a.ID_APLICACAO} value={a.ID_APLICACAO}>{a.NOME_APLICACAO}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group highlight-box">
                            <label className="form-label block mb-2">Qual tipo de conteúdo?</label>
                            <div className="content-type-switch">
                                <button
                                    type="button"
                                    className={`switch-btn ${formData.tipo_conteudo === 'HTML' ? 'active' : ''}`}
                                    onClick={() => setFormData(prev => ({ ...prev, tipo_conteudo: 'HTML' }))}
                                >
                                    <FileText size={18} /> Editor de Texto
                                </button>
                                <button
                                    type="button"
                                    className={`switch-btn ${formData.tipo_conteudo === 'PDF' ? 'active' : ''}`}
                                    onClick={() => setFormData(prev => ({ ...prev, tipo_conteudo: 'PDF' }))}
                                >
                                    <Upload size={18} /> Enviar Arquivo (PDF, Imagem, Doc)
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Título *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.titulo}
                                onChange={(e) => handleChange('titulo', e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Descrição</label>
                            <textarea
                                className="form-input form-textarea"
                                value={formData.descricao_card}
                                onChange={(e) => handleChange('descricao_card', e.target.value)}
                                rows={2}
                                placeholder="Breve descrição que aparecerá no card..."
                            />
                        </div>

                        {formData.tipo_conteudo === 'HTML' ? (
                            <div className="form-group flex-grow">
                                <label className="form-label">Conteúdo do Manual</label>
                                <div className="editor-container">
                                    <RichTextEditor
                                        content={formData.conteudo_html}
                                        onChange={(html) => handleChange('conteudo_html', html)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="form-group upload-area">
                                <label className="form-label">Arquivo do Manual</label>

                                <div className="upload-container">
                                    <label className="upload-box">
                                        <input
                                            type="file"
                                            onChange={(e) => {
                                                console.log('Arquivo selecionado:', e.target.files[0]);
                                                setFormData(prev => ({ ...prev, arquivo_pdf: e.target.files[0] }));
                                            }}
                                            style={{ display: 'none' }}
                                        />

                                        <div className="upload-icon-circle">
                                            {formData.arquivo_pdf ? <FileText size={32} /> : <Upload size={32} />}
                                        </div>

                                        <div className="upload-text">
                                            {formData.arquivo_pdf ? (
                                                <>
                                                    <strong>{formData.arquivo_pdf.name}</strong>
                                                    <span>Clique para trocar o arquivo</span>
                                                </>
                                            ) : (
                                                <>
                                                    <strong>Clique para selecionar um arquivo</strong>
                                                    <span>ou cole (Ctrl+V) aqui</span>
                                                </>
                                            )}
                                        </div>

                                        <span className="btn btn-secondary btn-sm mt-2">
                                            Selecionar Arquivo
                                        </span>
                                    </label>

                                    {isEditing && !formData.arquivo_pdf && formData.tipo_conteudo === 'PDF' && (
                                        <div className="current-file-badge">
                                            <Paperclip size={14} />
                                            <span>Arquivo atual mantido</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="modal-footer">
                            <button type="button" onClick={onClose} className="btn btn-secondary">
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Salvando...' : (
                                    <>
                                        <Save size={18} />
                                        {isEditing ? 'Salvar alterações' : 'Criar manual'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <style>{`
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
                    z-index: 9999;
                    padding: var(--space-4);
                }

                .modal-content {
                    background: var(--bg-card);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-xl);
                    width: 100%;
                    max-width: 900px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: var(--shadow-lg);
                    position: relative;
                    animation: modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    overflow: hidden;
                }

                @keyframes modalSlideUp {
                    from { transform: translateY(30px) scale(0.98); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }

                .modal-header {
                    padding: var(--space-5) var(--space-8);
                    border-bottom: 3px solid var(--accent-color);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: linear-gradient(to right, var(--bg-secondary), var(--bg-card));
                    flex-shrink: 0;
                }

                .modal-header h2 {
                    color: var(--text-primary);
                    font-weight: 700;
                    letter-spacing: -0.5px;
                }

                .btn-close {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--glass-border);
                    color: var(--text-muted);
                    cursor: pointer;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all var(--transition-fast);
                }
                
                .btn-close:hover {
                    background: var(--danger-color);
                    color: white;
                    transform: rotate(90deg);
                    border-color: var(--danger-color);
                }

                .modal-form {
                    padding: var(--space-8);
                    overflow-y: auto;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-6);
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-6);
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-2);
                }

                .form-label {
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: var(--font-size-sm);
                    margin-bottom: 2px;
                }

                .form-input {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    padding: var(--space-3) var(--space-4);
                    color: var(--text-primary);
                    transition: all 0.2s ease;
                }

                .form-input:focus {
                    background: rgba(0, 0, 0, 0.2);
                    border-color: var(--accent-color);
                    box-shadow: 0 0 0 4px rgba(232, 93, 4, 0.15);
                    outline: none;
                }

                .highlight-box {
                    background: rgba(232, 93, 4, 0.03);
                    padding: var(--space-6);
                    border-radius: var(--radius-xl);
                    border: 1px dashed rgba(232, 93, 4, 0.3);
                }

                .content-type-switch {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-2);
                    background: var(--bg-secondary);
                    padding: var(--space-1);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                }

                .switch-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--space-2);
                    padding: var(--space-3);
                    border: none;
                    background: transparent;
                    color: var(--text-secondary);
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-weight: 600;
                }

                .switch-btn:hover:not(.active) {
                    background: rgba(255, 255, 255, 0.05);
                    color: var(--text-primary);
                }

                .switch-btn.active {
                    background: var(--accent-color);
                    color: white;
                    box-shadow: 0 4px 12px rgba(232, 93, 4, 0.3);
                }

                .editor-container {
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    background: rgba(0, 0, 0, 0.1);
                }

                .upload-box {
                    border: 2px dashed var(--glass-border);
                    border-radius: var(--radius-xl);
                    padding: var(--space-10);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: var(--space-4);
                    cursor: pointer;
                    background: rgba(0, 0, 0, 0.1);
                    transition: all 0.3s ease;
                    text-align: center;
                }

                .upload-box:hover {
                    border-color: var(--accent-color);
                    background: rgba(232, 93, 4, 0.05);
                    transform: translateY(-2px);
                }

                .upload-icon-circle {
                    background: var(--bg-card);
                    width: 70px;
                    height: 70px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    color: var(--accent-color);
                    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
                    border: 1px solid var(--glass-border);
                }

                .modal-footer {
                    padding: var(--space-5) var(--space-8);
                    border-top: 1px solid var(--glass-border);
                    display: flex;
                    justify-content: flex-end;
                    gap: var(--space-4);
                    background: var(--bg-secondary);
                    flex-shrink: 0;
                }

                .btn-primary {
                    background: var(--accent-color);
                    box-shadow: 0 4px 12px rgba(232, 93, 4, 0.3);
                    font-weight: 600;
                    padding: var(--space-3) var(--space-6);
                    border-radius: var(--radius-md);
                }

                .btn-primary:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(232, 93, 4, 0.4);
                }

                .btn-secondary {
                    background: transparent;
                    border: 1px solid var(--glass-border);
                    font-weight: 600;
                    padding: var(--space-3) var(--space-6);
                }

                .btn-secondary:hover {
                    background: rgba(255, 255, 255, 0.05);
                    border-color: var(--text-muted);
                }

                .error-message {
                    background: rgba(220, 38, 38, 0.1);
                    border-left: 4px solid var(--danger-color);
                    color: #ff6b6b;
                    padding: var(--space-4);
                    border-radius: var(--radius-md);
                    font-size: var(--font-size-sm);
                    font-weight: 500;
                    animation: shake 0.5s ease-in-out;
                }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }

                @media (max-width: 640px) {
                    .modal-overlay {
                        padding: 0;
                    }

                    .modal-content {
                        height: 100%;
                        max-height: 100vh;
                        border-radius: 0;
                    }

                    .modal-header {
                        padding: var(--space-4);
                    }

                    .modal-form {
                        padding: var(--space-5);
                    }

                    .form-row {
                        grid-template-columns: 1fr;
                        gap: var(--space-4);
                    }

                    .modal-footer {
                        padding: var(--space-4);
                    }
                }

            `}</style>
        </div>,
        document.body
    );
}
