require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/database');
const path = require('path');

// Importar rotas
console.log('Importing auth routes...');
const authRoutes = require('./routes/auth');
console.log('Importing modulos routes...');
const modulosRoutes = require('./routes/modulos');
console.log('Importing aplicacoes routes...');
const aplicacoesRoutes = require('./routes/aplicacoes');
console.log('Importing manuais routes...');
const manuaisRoutes = require('./routes/manuais');
console.log('Importing ranking routes...');
const rankingRoutes = require('./routes/ranking');
console.log('Importing lojas routes...');
const lojasRoutes = require('./routes/lojas');
console.log('Imports done.');

const app = express();
const PORT = process.env.PORT || 3001;
const frontendDistPath = path.resolve(__dirname, '../frontend-dist');

// Middlewares
app.use(cors());
app.use(express.json({ limit: '300mb' })); // Limite aumentado para 300MB
app.use(express.urlencoded({ extended: true, limit: '300mb' }));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/modulos', modulosRoutes);
app.use('/api/aplicacoes', aplicacoesRoutes);
app.use('/api/manuais', manuaisRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/lojas', lojasRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/manuais/api/auth', authRoutes);
app.use('/manuais/api/modulos', modulosRoutes);
app.use('/manuais/api/aplicacoes', aplicacoesRoutes);
app.use('/manuais/api/manuais', manuaisRoutes);
app.use('/manuais/api/ranking', rankingRoutes);
app.use('/manuais/api/lojas', lojasRoutes);
app.use('/manuais/uploads', express.static(path.join(__dirname, 'uploads')));

// Rota de health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Fort Manuais API está funcionando!' });
});

app.get('/manuais/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Fort Manuais API está funcionando!' });
});

app.get('/api/migrate-fix-pdf', async (req, res) => {
    try {
        await db.execute(`ALTER TABLE TIRF_MANUAIS ADD ARQUIVO_PDF VARCHAR2(255)`);
    } catch (e) { console.log('Erro col 1', e.message); }

    try {
        await db.execute(`ALTER TABLE TIRF_MANUAIS ADD TIPO_CONTEUDO VARCHAR2(10) DEFAULT 'HTML' CHECK (TIPO_CONTEUDO IN ('HTML', 'PDF'))`);
    } catch (e) { console.log('Erro col 2', e.message); }

    await db.execute('COMMIT');
    res.send('Migracao executada');
});

// Tratamento de erros global
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

app.use('/manuais', express.static(frontendDistPath));
app.get('/', (req, res) => res.redirect('/manuais/'));
app.get('/manuais', (req, res) => res.redirect('/manuais/'));
app.get('/manuais/*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Inicialização
async function startServer() {
    try {
        await db.initialize();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Servidor rodando na porta ${PORT}`);
            console.log(`📚 Fort Manuais de Processos - API`);
        });
    } catch (error) {
        console.error('Falha ao iniciar servidor:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Recebido SIGTERM, encerrando...');
    await db.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('Recebido SIGINT, encerrando...');
    await db.close();
    process.exit(0);
});

startServer();
