const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        const parts = authHeader.split(' ');

        if (parts.length !== 2) {
            return res.status(401).json({ error: 'Token mal formatado' });
        }

        const [scheme, token] = parts;

        if (!/^Bearer$/i.test(scheme)) {
            return res.status(401).json({ error: 'Token mal formatado' });
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ error: 'Token inválido' });
            }

            req.userId = decoded.id;
            req.userPerfil = decoded.perfil;
            req.userNome = decoded.nome;
            req.userIdLoja = decoded.idLoja || null;
            req.userNumeroLoja = decoded.numeroLoja || null;

            return next();
        });
    } catch (error) {
        return res.status(401).json({ error: 'Erro na autenticação' });
    }
};

module.exports = auth;
