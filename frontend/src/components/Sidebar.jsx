import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { moduloService, aplicacaoService } from '../services/api';
import { useLoja } from '../context/LojaContext';
import {
    ShoppingCart, DollarSign, Truck, FileText, Calculator, Monitor,
    ChevronRight, ChevronDown, Home, Settings, Trash2, LogOut, User,
    Sun, Moon, Menu, X, Search, Users, LayoutDashboard, ClipboardList,
    Package, Headphones, Shield, Globe, Building, Wrench, Trophy, Store
} from 'lucide-react';

const iconMap = {
    'ShoppingCart': ShoppingCart,
    'DollarSign': DollarSign,
    'Truck': Truck,
    'FileText': FileText,
    'Calculator': Calculator,
    'Monitor': Monitor,
    'Search': Search,
    'LayoutDashboard': LayoutDashboard,
    'ClipboardList': ClipboardList,
    'Package': Package,
    'Headphones': Headphones,
    'Shield': Shield,
    'Globe': Globe,
    'Building': Building,
    'Wrench': Wrench
};

function Sidebar() {
    const { user, logout, isAuthenticated, isTI } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { selectedLoja } = useLoja();
    const location = useLocation();
    const navigate = useNavigate();

    const [modulos, setModulos] = useState([]);
    const [aplicacoesPorModulo, setAplicacoesPorModulo] = useState({});
    const [expandedModulo, setExpandedModulo] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);

    const getStoreFromUrl = () => {
        const match = location.pathname.match(/\/loja\/(\d+)/);
        return match ? match[1] : null;
    };

    const activeStoreId = getStoreFromUrl() || selectedLoja;

    useEffect(() => {
        // Reload modules when store changes (or defaults back to global)
        loadModulos(activeStoreId);
        // Reset expanded state and cache when store context changes
        setAplicacoesPorModulo({});
        setExpandedModulo(null);
    }, [location.pathname, selectedLoja]);

    const loadModulos = async (storeId) => {
        try {
            // Pass storeId only if it exists
            const params = storeId ? { loja: storeId } : {};
            const response = await moduloService.listar(params);
            setModulos(response.data);
        } catch (error) {
            console.error('Erro ao carregar módulos:', error);
        }
    };

    const loadAplicacoes = async (moduloId) => {
        if (aplicacoesPorModulo[moduloId]) return;

        try {
            const params = activeStoreId ? { loja: activeStoreId } : {};
            const response = await aplicacaoService.listarPorModulo(moduloId, params);
            setAplicacoesPorModulo(prev => ({
                ...prev,
                [moduloId]: response.data
            }));
        } catch (error) {
            console.error('Erro ao carregar aplicações:', error);
        }
    };

    const handleModuloClick = (moduloId) => {
        if (expandedModulo === moduloId) {
            setExpandedModulo(null);
        } else {
            setExpandedModulo(moduloId);
            loadAplicacoes(moduloId);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getIcon = (iconName) => {
        const Icon = iconMap[iconName] || FileText;
        return <Icon size={18} />;
    };

    const closeMobile = () => setMobileOpen(false);

    return (
        <>
            {/* Mobile Header */}
            <header className="mobile-header">
                <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
                    {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
                <Link to="/" className="mobile-logo">
                    <img src="/fort-logo.png" alt="Fort" className="logo-img-mobile" />
                    <span>Fort Manuais</span>
                </Link>
                <button className="theme-toggle-mobile" onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </header>

            {/* Overlay */}
            {mobileOpen && <div className="sidebar-overlay" onClick={closeMobile} />}

            {/* Sidebar */}
            <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
                {/* Logo */}
                <div className="sidebar-header">
                    <Link to="/" className="sidebar-logo" onClick={closeMobile}>
                        <img src="/fort-logo.png" alt="Fort" className="logo-img" />
                        <div className="logo-text">
                            <span className="logo-title">Fort</span>
                            <span className="logo-subtitle">Manuais de Processos</span>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    <Link
                        to="/"
                        className={`sidebar-link ${location.pathname === '/' ? 'active' : ''}`}
                        onClick={closeMobile}
                    >
                        <Home size={18} />
                        <span>Home</span>
                    </Link>

                    <Link
                        to="/ranking"
                        className={`sidebar-link ${location.pathname === '/ranking' ? 'active' : ''}`}
                        onClick={closeMobile}
                    >
                        <Trophy size={18} />
                        <span>Ranking</span>
                    </Link>

                    {/* Módulos */}
                    <div className="sidebar-section">
                        <span className="sidebar-section-title">Módulos</span>
                        {modulos.map(modulo => (
                            <div key={modulo.ID_MODULO} className="sidebar-module">
                                <button
                                    className={`sidebar-link ${expandedModulo === modulo.ID_MODULO ? 'expanded' : ''}`}
                                    onClick={() => handleModuloClick(modulo.ID_MODULO)}
                                >
                                    {getIcon(modulo.ICONE)}
                                    <span>{modulo.NOME_MODULO}</span>
                                    <ChevronRight
                                        size={16}
                                        className={`chevron ${expandedModulo === modulo.ID_MODULO ? 'rotate' : ''}`}
                                    />
                                </button>

                                {expandedModulo === modulo.ID_MODULO && (
                                    <div className="sidebar-submenu">
                                        {aplicacoesPorModulo[modulo.ID_MODULO]?.map(app => (
                                            <Link
                                                key={app.ID_APLICACAO}
                                                to={activeStoreId
                                                    ? `/loja/${activeStoreId}/aplicacao/${app.ID_APLICACAO}`
                                                    : `/aplicacao/${app.ID_APLICACAO}`}
                                                className="sidebar-sublink"
                                                onClick={closeMobile}
                                            >
                                                {app.NOME_APLICACAO}
                                            </Link>
                                        ))}
                                        {!aplicacoesPorModulo[modulo.ID_MODULO]?.length && (
                                            <span className="sidebar-empty">Nenhuma aplicação</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Admin (TI only) */}
                    {isTI && (
                        <div className="sidebar-section">
                            <span className="sidebar-section-title">Administração</span>
                            <Link
                                to="/gerenciar/modulos"
                                className={`sidebar-link ${location.pathname === '/gerenciar/modulos' ? 'active' : ''}`}
                                onClick={closeMobile}
                            >
                                <Settings size={18} />
                                <span>Gerenciar Módulos</span>
                            </Link>
                            <Link
                                to="/gerenciar/usuarios"
                                className={`sidebar-link ${location.pathname === '/gerenciar/usuarios' ? 'active' : ''}`}
                                onClick={closeMobile}
                            >
                                <Users size={18} />
                                <span>Gerenciar Usuários</span>
                            </Link>
                            <Link
                                to="/gerenciar/lojas"
                                className={`sidebar-link ${location.pathname === '/gerenciar/lojas' ? 'active' : ''}`}
                                onClick={closeMobile}
                            >
                                <Store size={18} />
                                <span>Gerenciar Lojas</span>
                            </Link>
                            <Link
                                to="/lixeira"
                                className={`sidebar-link ${location.pathname === '/lixeira' ? 'active' : ''}`}
                                onClick={closeMobile}
                            >
                                <Trash2 size={18} />
                                <span>Lixeira</span>
                            </Link>
                        </div>
                    )}
                </nav>

                {/* Footer */}
                <div className="sidebar-footer">
                    <button className="theme-toggle" onClick={toggleTheme}>
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
                    </button>

                    {isAuthenticated ? (
                        <div className="user-section">
                            <div className="user-info">
                                <div className="user-avatar">
                                    <User size={16} />
                                </div>
                                <div className="user-details">
                                    <span className="user-name">{user?.nome}</span>
                                    <span className="user-role">{user?.perfil}</span>
                                </div>
                            </div>
                            <button className="logout-btn" onClick={handleLogout} title="Sair">
                                <LogOut size={18} />
                            </button>
                        </div>
                    ) : (
                        <Link to="/login" className="login-btn" onClick={closeMobile}>
                            Entrar
                        </Link>
                    )}
                </div>
            </aside>

            <style>{`
                .mobile-header {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 60px;
                    background: var(--sidebar-bg);
                    border-bottom: 1px solid var(--border-color);
                    padding: 0 var(--space-4);
                    align-items: center;
                    justify-content: space-between;
                    z-index: 100;
                }

                .mobile-toggle {
                    background: none;
                    border: none;
                    color: var(--text-primary);
                    cursor: pointer;
                    padding: var(--space-2);
                }

                .mobile-logo {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    text-decoration: none;
                    color: var(--text-primary);
                    font-weight: 600;
                }

                .theme-toggle-mobile {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    padding: var(--space-2);
                }

                .sidebar-overlay {
                    display: none;
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 998;
                }

                .sidebar {
                    position: fixed;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 260px;
                    background: #0a1414;
                    border-right: 1px solid #1a2a2a;
                    display: flex;
                    flex-direction: column;
                    z-index: 999;
                    overflow: hidden;
                    --sidebar-text: #ffffff;
                    --sidebar-text-secondary: #a0b0b0;
                    --sidebar-text-muted: #607070;
                    --sidebar-border: #2a4a4a;
                    --sidebar-hover: rgba(255, 255, 255, 0.05);
                    --sidebar-active: rgba(232, 93, 4, 0.15);
                }

                .sidebar-header {
                    padding: var(--space-5);
                    border-bottom: 1px solid var(--border-color);
                }

                .sidebar-logo {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    text-decoration: none;
                }

                .logo-img {
                    width: 40px;
                    height: 40px;
                    object-fit: contain;
                }

                .logo-img-mobile {
                    width: 32px;
                    height: 32px;
                    object-fit: contain;
                }

                .logo-text {
                    display: flex;
                    flex-direction: column;
                }

                .logo-title {
                    font-size: var(--font-size-lg);
                    font-weight: 700;
                    color: var(--sidebar-text);
                    line-height: 1.1;
                }

                .logo-subtitle {
                    font-size: var(--font-size-xs);
                    color: var(--sidebar-text-muted);
                }

                .sidebar-nav {
                    flex: 1;
                    overflow-y: auto;
                    padding: var(--space-3);
                }

                .sidebar-section {
                    margin-top: var(--space-4);
                }

                .sidebar-section-title {
                    display: block;
                    padding: var(--space-2) var(--space-3);
                    font-size: var(--font-size-xs);
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--sidebar-text-muted);
                }

                .sidebar-link {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    padding: var(--space-3);
                    color: var(--sidebar-text-secondary);
                    text-decoration: none;
                    font-size: var(--font-size-sm);
                    border-radius: var(--radius-md);
                    transition: all var(--transition-fast);
                    background: none;
                    border: none;
                    width: 100%;
                    text-align: left;
                    cursor: pointer;
                }

                .sidebar-link:hover {
                    background: var(--sidebar-hover);
                    color: var(--sidebar-text);
                }

                .sidebar-link.active {
                    background: var(--sidebar-active);
                    color: var(--accent-color);
                }

                .sidebar-link .chevron {
                    margin-left: auto;
                    transition: transform var(--transition-fast);
                }

                .sidebar-link .chevron.rotate {
                    transform: rotate(90deg);
                }

                .sidebar-submenu {
                    margin-left: var(--space-6);
                    border-left: 1px solid var(--border-color);
                    padding-left: var(--space-3);
                }

                .sidebar-sublink {
                    display: block;
                    padding: var(--space-2) var(--space-3);
                    color: var(--sidebar-text-secondary);
                    text-decoration: none;
                    font-size: var(--font-size-sm);
                    border-radius: var(--radius-sm);
                    transition: all var(--transition-fast);
                }

                .sidebar-sublink:hover {
                    background: var(--sidebar-hover);
                    color: var(--accent-color);
                }

                .sidebar-empty {
                    display: block;
                    padding: var(--space-2) var(--space-3);
                    color: var(--sidebar-text-muted);
                    font-size: var(--font-size-xs);
                    font-style: italic;
                }

                .sidebar-footer {
                    padding: var(--space-4);
                    border-top: 1px solid var(--sidebar-border);
                }

                .theme-toggle {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    width: 100%;
                    padding: var(--space-3);
                    background: var(--sidebar-hover);
                    border: none;
                    border-radius: var(--radius-md);
                    color: var(--sidebar-text-secondary);
                    font-size: var(--font-size-sm);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    margin-bottom: var(--space-3);
                }

                .theme-toggle:hover {
                    background: var(--sidebar-active);
                    color: var(--accent-color);
                }

                .user-section {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    padding: var(--space-2);
                    background: var(--sidebar-hover);
                    border-radius: var(--radius-md);
                }

                .user-info {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    flex: 1;
                }

                .user-avatar {
                    width: 32px;
                    height: 32px;
                    background: var(--accent-gradient);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }

                .user-details {
                    display: flex;
                    flex-direction: column;
                }

                .user-name {
                    font-size: var(--font-size-sm);
                    font-weight: 500;
                    color: var(--sidebar-text);
                    max-width: 120px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .user-role {
                    font-size: var(--font-size-xs);
                    color: var(--accent-color);
                }

                .logout-btn {
                    background: none;
                    border: none;
                    color: var(--sidebar-text-muted);
                    cursor: pointer;
                    padding: var(--space-2);
                    border-radius: var(--radius-md);
                    transition: all var(--transition-fast);
                }

                .logout-btn:hover {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--danger-color);
                }

                .login-btn {
                    display: block;
                    text-align: center;
                    padding: var(--space-3);
                    background: var(--accent-gradient);
                    color: white;
                    text-decoration: none;
                    border-radius: var(--radius-md);
                    font-weight: 500;
                    transition: opacity var(--transition-fast);
                }

                .login-btn:hover {
                    opacity: 0.9;
                }

                @media (max-width: 1024px) {
                    .mobile-header {
                        display: flex;
                    }

                    .sidebar-overlay {
                        display: block;
                    }

                    .sidebar {
                        transform: translateX(-100%);
                        transition: transform var(--transition-base);
                    }

                    .sidebar.open {
                        transform: translateX(0);
                    }
                }
            `}</style>
        </>
    );
}

export default Sidebar;
