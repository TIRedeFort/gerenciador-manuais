import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { moduloService } from '../services/api';
import {
    ShoppingCart,
    DollarSign,
    Truck,
    FileText,
    Calculator,
    Monitor,
    Menu,
    X,
    LogOut,
    User,
    Trash2,
    Home,
    Search,
    ChevronDown,
    Settings
} from 'lucide-react';

// Mapa de ícones
const iconMap = {
    'ShoppingCart': ShoppingCart,
    'DollarSign': DollarSign,
    'Truck': Truck,
    'FileText': FileText,
    'Calculator': Calculator,
    'Monitor': Monitor
};

function Navbar() {
    const { user, logout, isAuthenticated, isTI } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [modulos, setModulos] = useState([]);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadModulos();
    }, []);

    const loadModulos = async () => {
        try {
            const response = await moduloService.listar();
            setModulos(response.data);
        } catch (error) {
            console.error('Erro ao carregar módulos:', error);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim().length >= 3) {
            navigate(`/buscar?q=${encodeURIComponent(searchQuery)}`);
            setSearchQuery('');
        }
    };

    const getIcon = (iconName) => {
        const Icon = iconMap[iconName] || FileText;
        return <Icon size={18} />;
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                {/* Logo */}
                <Link to="/" className="navbar-logo">
                    <div className="logo-icon">
                        <FileText size={28} />
                    </div>
                    <div className="logo-text">
                        <span className="logo-title">Fort Supermercados</span>
                        <span className="logo-subtitle">Manuais de Processos</span>
                    </div>
                </Link>

                {/* Desktop Menu */}
                <div className="navbar-menu">
                    <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
                        <Home size={18} />
                        <span>Início</span>
                    </Link>

                    {/* Dropdown de Módulos */}
                    <div
                        className="nav-dropdown"
                        onMouseEnter={() => setActiveDropdown('modulos')}
                        onMouseLeave={() => setActiveDropdown(null)}
                    >
                        <button className="nav-link dropdown-trigger">
                            <Menu size={18} />
                            <span>Módulos</span>
                            <ChevronDown size={16} className={activeDropdown === 'modulos' ? 'rotate' : ''} />
                        </button>

                        {activeDropdown === 'modulos' && (
                            <div className="dropdown-menu">
                                {modulos.map(modulo => (
                                    <Link
                                        key={modulo.ID_MODULO}
                                        to={`/modulo/${modulo.ID_MODULO}`}
                                        className="dropdown-item"
                                    >
                                        {getIcon(modulo.ICONE)}
                                        <span>{modulo.NOME_MODULO}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Busca */}
                    <form onSubmit={handleSearch} className="navbar-search">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar manuais..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                    </form>
                </div>

                {/* User Menu */}
                <div className="navbar-user">
                    {isAuthenticated ? (
                        <>
                            {isTI && (
                                <>
                                    <Link to="/gerenciar/modulos" className="nav-link">
                                        <Settings size={18} />
                                        <span>Gerenciar</span>
                                    </Link>
                                    <Link to="/lixeira" className="nav-link">
                                        <Trash2 size={18} />
                                        <span>Lixeira</span>
                                    </Link>
                                </>
                            )}
                            <div
                                className="nav-dropdown"
                                onMouseEnter={() => setActiveDropdown('user')}
                                onMouseLeave={() => setActiveDropdown(null)}
                            >
                                <button className="user-menu-trigger">
                                    <div className="user-avatar">
                                        <User size={18} />
                                    </div>
                                    <span className="user-name">{user?.nome}</span>
                                    <span className={`user-badge ${isTI ? 'badge-ti' : ''}`}>
                                        {user?.perfil === 'LOJA33' || user?.perfil?.includes('Loja 33') ? 'CD' : user?.perfil}
                                    </span>
                                </button>

                                {activeDropdown === 'user' && (
                                    <div className="dropdown-menu dropdown-right">
                                        <button onClick={handleLogout} className="dropdown-item danger">
                                            <LogOut size={18} />
                                            <span>Sair</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <Link to="/login" className="btn btn-primary btn-sm">
                            Entrar
                        </Link>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button
                        className="mobile-menu-toggle"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="mobile-menu">
                    <Link to="/" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                        <Home size={20} />
                        <span>Início</span>
                    </Link>

                    <div className="mobile-nav-section">
                        <span className="mobile-nav-title">Módulos</span>
                        {modulos.map(modulo => (
                            <Link
                                key={modulo.ID_MODULO}
                                to={`/modulo/${modulo.ID_MODULO}`}
                                className="mobile-nav-link"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {getIcon(modulo.ICONE)}
                                <span>{modulo.NOME_MODULO}</span>
                            </Link>
                        ))}
                    </div>

                    {isTI && (
                        <>
                            <Link to="/gerenciar/modulos" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                                <Settings size={20} />
                                <span>Gerenciar Módulos</span>
                            </Link>
                            <Link to="/lixeira" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                                <Trash2 size={20} />
                                <span>Lixeira</span>
                            </Link>
                        </>
                    )}

                    {isAuthenticated && (
                        <button onClick={handleLogout} className="mobile-nav-link danger">
                            <LogOut size={20} />
                            <span>Sair</span>
                        </button>
                    )}
                </div>
            )}

            <style>{`
                .navbar {
                    position: sticky;
                    top: 0;
                    z-index: 100;
                    background: rgba(15, 23, 42, 0.95);
                    border-bottom: 1px solid var(--glass-border);
                    backdrop-filter: blur(20px);
                }

                .navbar-container {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 0 var(--space-6);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    height: 70px;
                }

                .navbar-logo {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    text-decoration: none;
                }

                .logo-icon {
                    width: 44px;
                    height: 44px;
                    background: var(--gradient-primary);
                    border-radius: var(--radius-lg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }

                .logo-text {
                    display: flex;
                    flex-direction: column;
                }

                .logo-title {
                    font-weight: 700;
                    font-size: var(--font-size-lg);
                    color: var(--text-primary);
                    line-height: 1.2;
                }

                .logo-subtitle {
                    font-size: var(--font-size-xs);
                    color: var(--text-muted);
                }

                .navbar-menu {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                }

                .nav-link {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    padding: var(--space-2) var(--space-4);
                    color: var(--text-secondary);
                    text-decoration: none;
                    font-size: var(--font-size-sm);
                    font-weight: 500;
                    border-radius: var(--radius-lg);
                    transition: all var(--transition-fast);
                    background: none;
                    border: none;
                    cursor: pointer;
                }

                .nav-link:hover, .nav-link.active {
                    color: var(--text-primary);
                    background: var(--glass-bg);
                }

                .nav-dropdown {
                    position: relative;
                }

                .dropdown-trigger {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                }

                .dropdown-trigger .rotate {
                    transform: rotate(180deg);
                }

                .dropdown-menu {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    margin-top: var(--space-2);
                    min-width: 220px;
                    background: var(--bg-dark-secondary);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-lg);
                    padding: var(--space-2);
                    box-shadow: var(--shadow-xl);
                    animation: fadeIn var(--transition-fast);
                }

                .dropdown-right {
                    left: auto;
                    right: 0;
                }

                .dropdown-item {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    padding: var(--space-3) var(--space-4);
                    color: var(--text-secondary);
                    text-decoration: none;
                    font-size: var(--font-size-sm);
                    border-radius: var(--radius-md);
                    transition: all var(--transition-fast);
                    background: none;
                    border: none;
                    cursor: pointer;
                    width: 100%;
                    text-align: left;
                }

                .dropdown-item:hover {
                    background: var(--glass-bg);
                    color: var(--text-primary);
                }

                .dropdown-item.danger:hover {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--danger-500);
                }

                .navbar-search {
                    position: relative;
                    margin-left: var(--space-4);
                }

                .search-icon {
                    position: absolute;
                    left: var(--space-3);
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                }

                .search-input {
                    width: 250px;
                    padding: var(--space-2) var(--space-4) var(--space-2) var(--space-10);
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-full);
                    color: var(--text-primary);
                    font-size: var(--font-size-sm);
                    transition: all var(--transition-fast);
                }

                .search-input:focus {
                    outline: none;
                    border-color: var(--primary-500);
                    width: 300px;
                }

                .navbar-user {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                }

                .user-menu-trigger {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    padding: var(--space-2);
                    background: var(--glass-bg);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-full);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }

                .user-menu-trigger:hover {
                    border-color: var(--primary-500);
                }

                .user-avatar {
                    width: 32px;
                    height: 32px;
                    background: var(--gradient-primary);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }

                .user-name {
                    color: var(--text-primary);
                    font-size: var(--font-size-sm);
                    font-weight: 500;
                    max-width: 120px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .user-badge {
                    padding: var(--space-1) var(--space-2);
                    font-size: var(--font-size-xs);
                    font-weight: 500;
                    border-radius: var(--radius-sm);
                    background: var(--glass-bg);
                    color: var(--text-muted);
                }

                .user-badge.badge-ti {
                    background: rgba(59, 130, 246, 0.2);
                    color: var(--primary-400);
                }

                .mobile-menu-toggle {
                    display: none;
                    background: none;
                    border: none;
                    color: var(--text-primary);
                    cursor: pointer;
                    padding: var(--space-2);
                }

                .mobile-menu {
                    display: none;
                    padding: var(--space-4) var(--space-6);
                    border-top: 1px solid var(--glass-border);
                }

                .mobile-nav-link {
                    display: flex;
                    align-items: center;
                    gap: var(--space-3);
                    padding: var(--space-3) var(--space-4);
                    color: var(--text-secondary);
                    text-decoration: none;
                    font-size: var(--font-size-base);
                    border-radius: var(--radius-md);
                    background: none;
                    border: none;
                    width: 100%;
                    text-align: left;
                    cursor: pointer;
                }

                .mobile-nav-link:hover {
                    background: var(--glass-bg);
                    color: var(--text-primary);
                }

                .mobile-nav-link.danger {
                    color: var(--danger-500);
                }

                .mobile-nav-section {
                    margin: var(--space-4) 0;
                    padding-top: var(--space-4);
                    border-top: 1px solid var(--glass-border);
                }

                .mobile-nav-title {
                    display: block;
                    padding: var(--space-2) var(--space-4);
                    color: var(--text-muted);
                    font-size: var(--font-size-xs);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                @media (max-width: 1024px) {
                    .navbar-menu {
                        display: none;
                    }

                    .navbar-user .nav-link,
                    .navbar-user .nav-dropdown {
                        display: none;
                    }

                    .mobile-menu-toggle {
                        display: block;
                    }

                    .mobile-menu {
                        display: block;
                    }
                }

                @media (max-width: 640px) {
                    .logo-text {
                        display: none;
                    }
                }
            `}</style>
        </nav>
    );
}

export default Navbar;
