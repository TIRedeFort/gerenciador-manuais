const express = require('express');
const router = express.Router();
const lojaController = require('../controllers/lojaController');
const auth = require('../middleware/auth');
const { authorizeTI } = require('../middleware/authorize');

// Todas as rotas exigem autenticação
router.use(auth);

// CRUD de Lojas

// CRUD de Lojas
// CRUD de Lojas
router.get('/', lojaController.listar);
router.get('/usuarios', authorizeTI, lojaController.listarTodosUsuariosLojas);
router.get('/:id', lojaController.buscarPorId);
router.get('/numero/:numero', lojaController.buscarPorNumero);
router.post('/', authorizeTI, lojaController.criar);
router.put('/:id', authorizeTI, lojaController.atualizar);
router.put('/:id/toggle-status', authorizeTI, lojaController.toggleStatus);
router.delete('/:id', authorizeTI, lojaController.excluir);

// Usuários de uma loja específica
router.get('/:id/usuarios', authorizeTI, lojaController.listarUsuarios);

module.exports = router;
