const express = require('express');
const router = express.Router();
const manualController = require('../controllers/manualController');
const auth = require('../middleware/auth');

const { authorizeTI, authorizeAuthor } = require('../middleware/authorize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuração do Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/pdfs';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 300 * 1024 * 1024 } // 300MB limit
});

// Configuração do Multer para Imagens
const storageImages = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/images';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadImages = multer({
    storage: storageImages,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for images
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas!'));
        }
    }
});

// Rotas protegidas (leitura)
router.get('/', auth, manualController.listar);
router.get('/top-views', auth, manualController.topViews);
router.get('/recentes', auth, manualController.recentes);
router.get('/count', auth, manualController.contar); // Adicionado autenticação
router.get('/buscar', auth, manualController.buscar);
router.get('/aplicacao/:aplicacaoId', auth, manualController.listarPorAplicacao);
router.get('/:id', auth, manualController.buscarPorId);

// Rota de Upload de Imagem (Rich Text Editor) - Autenticada
router.post('/upload-imagem', auth, uploadImages.single('imagem'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhuma imagem enviada' });
        }
        // Retorna a URL completa ou relativa da imagem
        const imageUrl = `/uploads/images/${req.file.filename}`;
        res.json({ url: imageUrl });
    } catch (error) {
        console.error('Erro no upload de imagem:', error);
        res.status(500).json({ error: 'Erro ao fazer upload da imagem' });
    }
});

// Rotas protegidas (qualquer usuário autenticado pode criar/editar)
router.post('/:id/duplicar-treinamentos', auth, manualController.duplicarParaTreinamentos);
router.post('/', auth, upload.single('arquivo_pdf'), manualController.criar);
router.put('/:id', auth, upload.single('arquivo_pdf'), authorizeAuthor, manualController.atualizar);

// Exclusão de manuais (apenas TI)
router.delete('/:id', auth, authorizeTI, manualController.excluir);

// Lixeira (apenas TI)
router.get('/lixeira/listar', auth, authorizeTI, manualController.listarLixeira);
router.put('/lixeira/restaurar/:id', auth, authorizeTI, manualController.restaurar);
router.delete('/lixeira/:id', auth, authorizeTI, manualController.excluirPermanente);

module.exports = router;

