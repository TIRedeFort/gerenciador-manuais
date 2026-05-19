import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api'
});

// Interceptor para adicionar token JWT
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor para tratar erros
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            // Não redirecionar se já está na página de login
            if (!window.location.pathname.includes('/login')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth
export const authService = {
    login: (login, senha) => api.post('/auth/login', { login, senha }),
    register: (data) => api.post('/auth/register', data),
    getProfile: () => api.get('/auth/profile')
};

// Módulos
export const moduloService = {
    listar: (params) => api.get('/modulos', { params }),
    buscarPorId: (id, params) => api.get(`/modulos/${id}`, { params }),
    criar: (data) => api.post('/modulos', data),
    atualizar: (id, data) => api.put(`/modulos/${id}`, data),
    excluir: (id) => api.delete(`/modulos/${id}`)
};

// Aplicações
export const aplicacaoService = {
    listar: (params) => api.get('/aplicacoes', { params }),
    listarPorModulo: (moduloId, params) => api.get(`/aplicacoes/modulo/${moduloId}`, { params }),
    buscarPorId: (id, params) => api.get(`/aplicacoes/${id}`, { params }),
    criar: (data) => api.post('/aplicacoes', data),
    atualizar: (id, data) => api.put(`/aplicacoes/${id}`, data),
    excluir: (id) => api.delete(`/aplicacoes/${id}`)
};

// Manuais
export const manualService = {
    listar: (params) => api.get('/manuais', { params }),
    listarPorAplicacao: (aplicacaoId, params) => api.get(`/manuais/aplicacao/${aplicacaoId}`, { params }),
    topViews: (limit = 10, params) => api.get(`/manuais/top-views?limit=${limit}`, { params }),
    recentes: (limit = 10, params) => api.get(`/manuais/recentes?limit=${limit}`, { params }),
    contar: (params) => api.get('/manuais/count', { params }), // Novo método de contagem
    buscar: (q, params) => api.get(`/manuais/buscar?q=${encodeURIComponent(q)}`, { params }),
    buscarPorId: (id, countView = true, params) => api.get(`/manuais/${id}?countView=${countView}`, { params }),
    criar: (data) => api.post('/manuais', data),
    atualizar: (id, data, params) => api.put(`/manuais/${id}`, data, { params }),
    excluir: (id, params) => api.delete(`/manuais/${id}`, { params }),
    uploadImagem: (data) => api.post('/manuais/upload-imagem', data),
    duplicarParaTreinamentos: (id) => api.post(`/manuais/${id}/duplicar-treinamentos`),
    // Lixeira
    listarLixeira: (params) => api.get('/manuais/lixeira/listar', { params }),
    restaurar: (id, params) => api.put(`/manuais/lixeira/restaurar/${id}`, null, { params }),
    excluirPermanente: (id, params) => api.delete(`/manuais/lixeira/${id}`, { params })
};

// Usuários
export const usuarioService = {
    listar: () => api.get('/auth/usuarios'),
    atualizar: (id, data) => api.put(`/auth/usuarios/${id}`, data),
    toggleStatus: (id) => api.put(`/auth/usuarios/${id}/toggle-status`),
    excluir: (id) => api.delete(`/auth/usuarios/${id}`)
};

// Ranking
export const rankingService = {
    listar: (params) => api.get('/ranking', { params }),
    listarManuaisUsuario: (userId, params) => api.get(`/ranking/${userId}`, { params })
};

// Lojas
export const lojaService = {
    listar: () => api.get('/lojas'),
    buscarPorId: (id) => api.get(`/lojas/${id}`),
    buscarPorNumero: (numero) => api.get(`/lojas/numero/${numero}`),
    criar: (data) => api.post('/lojas', data),
    atualizar: (id, data) => api.put(`/lojas/${id}`, data),
    toggleStatus: (id) => api.put(`/lojas/${id}/toggle-status`),
    excluir: (id) => api.delete(`/lojas/${id}`),
    listarUsuarios: (id) => api.get(`/lojas/${id}/usuarios`),
    listarTodosUsuarios: () => api.get('/lojas/usuarios')
};

export default api;
