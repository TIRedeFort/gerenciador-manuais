const path = require('path');

const uploadsRoot = path.resolve(
    process.env.UPLOADS_DIR || process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads')
);

const publicUploadsPath = (process.env.PUBLIC_UPLOADS_PATH || '/manuais/uploads').replace(/\/+$/, '');

const getUploadDir = (kind) => path.join(uploadsRoot, kind);

const getPublicUploadUrl = (kind, filename) => `${publicUploadsPath}/${kind}/${filename}`;

const getDatabaseUploadPath = (kind, filename) => getPublicUploadUrl(kind, filename).replace(/^\/+/, '');

module.exports = {
    uploadsRoot,
    publicUploadsPath,
    getUploadDir,
    getPublicUploadUrl,
    getDatabaseUploadPath
};
