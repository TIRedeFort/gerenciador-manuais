const express = require('express');
const router = express.Router();
const moduloController = require('../controllers/moduloController');
const auth = require('../middleware/auth');
const { authorizeTI } = require('../middleware/authorize');

// Rotas públicas (leitura)
router.get('/', moduloController.listar);
router.get('/:id', moduloController.buscarPorId);

// Rotas protegidas (apenas TI)
router.post('/', auth, authorizeTI, moduloController.criar);
router.put('/:id', auth, authorizeTI, moduloController.atualizar);
router.delete('/:id', auth, authorizeTI, moduloController.excluir);

module.exports = router;
