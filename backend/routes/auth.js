const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { authorizeTI } = require('../middleware/authorize');

// Rotas públicas
router.post('/login', authController.login);

// Rota para criar primeiro usuário (depois pode remover ou proteger)
router.post('/register', authController.register);

// Rota protegida
router.get('/profile', auth, authController.getProfile);

// Criar usuário TI (apenas TI pode)
router.post('/register/ti', auth, authorizeTI, authController.register);

// Gerenciamento de usuários (apenas TI)
router.get('/usuarios', auth, authorizeTI, authController.listarUsuarios);
router.put('/usuarios/:id', auth, authorizeTI, authController.atualizarUsuario);
router.put('/usuarios/:id/toggle-status', auth, authorizeTI, authController.toggleStatusUsuario);
router.delete('/usuarios/:id', auth, authorizeTI, authController.excluirUsuario);

// Alterar senha (primeiro login ou redefinição)
router.put('/alterar-senha', auth, authController.alterarSenha);

module.exports = router;

