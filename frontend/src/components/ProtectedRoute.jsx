import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, requireTI = false, requireManualCreation = false }) {
    const { isAuthenticated, isTI, canCreateManual, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <style>{`
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

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requireTI && !isTI) {
        return <Navigate to="/" replace />;
    }

    if (requireManualCreation && !canCreateManual) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedRoute;
