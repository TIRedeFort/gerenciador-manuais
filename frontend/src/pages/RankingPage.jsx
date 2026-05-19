import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, User, BookOpen, X, ChevronDown, ChevronRight, FileText, Store, Folder } from 'lucide-react';
import { rankingService } from '../services/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLoja } from '../context/LojaContext';
import './RankingPage.css';

function RankingPage() {
    const { user } = useAuth();
    const { selectedLoja } = useLoja();
    const [ranking, setRanking] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userManuais, setUserManuais] = useState(null);
    const [loadingModal, setLoadingModal] = useState(false);
    const [expandedModulos, setExpandedModulos] = useState({});

    useEffect(() => {
        loadRanking();
    }, [user, selectedLoja]);

    const loadRanking = async () => {
        try {
            setLoading(true);
            // Usar selectedLoja do contexto ou numeroLoja do usuário
            const lojaAtiva = selectedLoja || user?.numeroLoja;
            const params = lojaAtiva ? { loja: lojaAtiva } : {};
            const response = await rankingService.listar(params);
            setRanking(response.data);
        } catch (error) {
            console.error('Erro ao carregar ranking:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUserClick = async (userItem) => {
        try {
            setSelectedUser(userItem);
            setLoadingModal(true);
            // Usar selectedLoja do contexto ou numeroLoja do usuário
            const lojaAtiva = selectedLoja || user?.numeroLoja;
            const params = lojaAtiva ? { loja: lojaAtiva } : {};
            const response = await rankingService.listarManuaisUsuario(userItem.ID_USUARIO, params);
            setUserManuais(response.data);
            setExpandedModulos({});
        } catch (error) {
            console.error('Erro ao carregar manuais do usuário:', error);
        } finally {
            setLoadingModal(false);
        }
    };

    const closeModal = () => {
        setSelectedUser(null);
        setUserManuais(null);
        setExpandedModulos({});
    };

    const toggleModulo = (moduloId) => {
        setExpandedModulos(prev => ({
            ...prev,
            [moduloId]: !prev[moduloId]
        }));
    };

    const getRankIcon = (position) => {
        if (position === 1) return (
            <div className="rank-medal-wrapper gold">
                <Medal className="rank-icon" />
            </div>
        );
        if (position === 2) return (
            <div className="rank-medal-wrapper silver">
                <Medal className="rank-icon" />
            </div>
        );
        if (position === 3) return (
            <div className="rank-medal-wrapper bronze">
                <Medal className="rank-icon" />
            </div>
        );
        return <span className="rank-number">{position}º</span>;
    };

    const getRankClass = (position) => {
        if (position === 1) return 'rank-card gold';
        if (position === 2) return 'rank-card silver';
        if (position === 3) return 'rank-card bronze';
        return 'rank-card';
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div className="ranking-page">
            <div className="page-header">
                <h1>
                    <Trophy size={32} />
                    Ranking de Criadores
                </h1>
                <p className="page-subtitle">
                    Usuários com maior contribuição de manuais na plataforma
                </p>
            </div>

            {ranking.length === 0 ? (
                <div className="empty-state">
                    <BookOpen size={64} />
                    <h3>Nenhum manual criado ainda</h3>
                    <p>Seja o primeiro a contribuir com a plataforma!</p>
                </div>
            ) : (
                <div className="ranking-grid">
                    {ranking.map((user, index) => (
                        <div
                            key={user.ID_USUARIO}
                            className={getRankClass(index + 1)}
                            onClick={() => handleUserClick(user)}
                        >
                            <div className="rank-position">
                                {getRankIcon(index + 1)}
                            </div>
                            <div className="rank-info">
                                <div className="user-avatar">
                                    <User size={32} />
                                </div>
                                <div className="user-details">
                                    <h3>{user.NOME}</h3>
                                    <span className="user-perfil">{user.PERFIL}</span>
                                </div>
                            </div>
                            <div className="rank-stats">
                                <div className="stat">
                                    <BookOpen size={20} />
                                    <span className="stat-value">{user.TOTAL_MANUAIS}</span>
                                    <span className="stat-label">
                                        {user.TOTAL_MANUAIS === 1 ? 'Manual' : 'Manuais'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Manuais do Usuário */}
            {selectedUser && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-content">
                                <div className="modal-user-profile">
                                    <div className="modal-user-avatar">
                                        <User size={28} />
                                    </div>
                                    <div className="modal-user-text">
                                        <h2>{selectedUser.NOME}</h2>
                                        <div className="modal-user-badges">
                                            <span className="profile-badge">{selectedUser.PERFIL}</span>
                                            <span className="count-badge">
                                                <BookOpen size={12} />
                                                {selectedUser.TOTAL_MANUAIS} contribuições
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={closeModal} aria-label="Fechar">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            {loadingModal ? (
                                <div className="modal-loading">
                                    <div className="loading-spinner" />
                                </div>
                            ) : userManuais && userManuais.modulos.length > 0 ? (
                                <div className="user-content-tree">
                                    {userManuais.modulos.map((modulo, index) => (
                                        <div
                                            key={modulo.id}
                                            className="tree-section"
                                            style={{ animationDelay: `${index * 0.05}s` }}
                                        >
                                            <div
                                                className={`tree-header ${expandedModulos[modulo.id] ? 'active' : ''}`}
                                                onClick={() => toggleModulo(modulo.id)}
                                            >
                                                <div className="header-main">
                                                    <div className="icon-box">
                                                        <Folder size={18} />
                                                    </div>
                                                    <span className="title">{modulo.nome}</span>
                                                </div>
                                                <div className="header-meta">
                                                    <span className="badge">
                                                        {modulo.aplicacoes.reduce((acc, app) => acc + app.manuais.length, 0)}
                                                    </span>
                                                    <ChevronDown size={16} className={`chevron ${expandedModulos[modulo.id] ? 'rotated' : ''}`} />
                                                </div>
                                            </div>

                                            {expandedModulos[modulo.id] && (
                                                <div className="tree-content">
                                                    {modulo.aplicacoes.map((aplicacao) => (
                                                        <div key={aplicacao.id} className="app-sub-section">
                                                            <div className="app-label">
                                                                <div className="dot"></div>
                                                                <span>{aplicacao.nome}</span>
                                                            </div>
                                                            <div className="manual-grid">
                                                                {aplicacao.manuais.map((manual) => (
                                                                    <Link
                                                                        key={manual.id}
                                                                        to={`/manual/${manual.id}`}
                                                                        className="mini-manual-card"
                                                                        onClick={closeModal}
                                                                    >
                                                                        <div className="card-icon">
                                                                            <FileText size={16} />
                                                                        </div>
                                                                        <div className="card-info">
                                                                            <h6>{manual.titulo}</h6>
                                                                            {manual.descricao && <p>{manual.descricao}</p>}
                                                                        </div>
                                                                        <ChevronRight size={14} className="arrow" />
                                                                    </Link>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state-modal">
                                    <div className="empty-state-icon">
                                        <BookOpen size={56} />
                                    </div>
                                    <h3>Nenhum manual encontrado</h3>
                                    <p>Este usuário ainda não criou nenhum manual</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RankingPage;
