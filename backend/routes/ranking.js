const express = require('express');
const router = express.Router();
const rankingController = require('../controllers/rankingController');
const auth = require('../middleware/auth');

// Rotas protegidas (requerem autenticação)
router.get('/', auth, rankingController.listarRanking);
router.get('/:userId', auth, rankingController.listarManuaisUsuario);

module.exports = router;
