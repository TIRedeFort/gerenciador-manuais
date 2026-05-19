const express = require('express');
const router = express.Router();
const aplicacaoController = require('../controllers/aplicacaoController');
const auth = require('../middleware/auth');
const { authorizeTI } = require('../middleware/authorize');

// Rotas públicas (leitura)
router.get('/', aplicacaoController.listar);
router.get('/modulo/:moduloId', aplicacaoController.listarPorModulo);
router.get('/:id', aplicacaoController.buscarPorId);

// Rotas protegidas (apenas TI)
router.post('/', auth, authorizeTI, aplicacaoController.criar);
router.put('/:id', auth, authorizeTI, aplicacaoController.atualizar);
router.delete('/:id', auth, authorizeTI, aplicacaoController.excluir);

module.exports = router;
