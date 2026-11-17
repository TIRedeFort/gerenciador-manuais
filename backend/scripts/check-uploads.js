const fs = require('node:fs');
const path = require('node:path');

function uploadPath(value, document = false) {
    if (!value) return null;
    let source = String(value).trim().replace(/\\/g, '/').replace(/&amp;/g, '&');
    if (/^(data:|blob:)/i.test(source)) return null;
    if (/^https?:\/\//i.test(source)) {
        try { source = new URL(source).pathname; } catch { return null; }
    }
    source = source.split(/[?#]/, 1)[0];
    if (document) source = `uploads/pdfs/${source.split('/').pop()}`;
    const match = source.match(/(?:^|\/)uploads\/(images|pdfs)\/([^/]+)$/i);
    if (!match) return null;
    let filename;
    try { filename = decodeURIComponent(match[2]); } catch { return null; }
    if (!filename || filename === '.' || filename === '..' || /[/\\\x00-\x1f]/.test(filename)) return null;
    return `${match[1].toLowerCase()}/${filename}`;
}

function collectReferences(html, document) {
    const files = new Set();
    const unresolved = new Set();
    const add = (value, isDocument = false) => {
        const relative = uploadPath(value, isDocument);
        if (relative) files.add(relative);
        else if (value && (/^(blob:)/i.test(value) || /(?:^|\/)uploads\//i.test(value) || isDocument)) unresolved.add(value);
    };
    if (document) add(document, true);
    const content = String(html || '');
    for (const match of content.matchAll(/\b(?:src|href|poster|data-src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
        add(match[1] ?? match[2] ?? match[3]);
    }
    for (const match of content.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/gi)) add(match[1]);
    for (const match of content.matchAll(/\bsrcset\s*=\s*["']([^"']*)["']/gi)) {
        for (const candidate of match[1].split(',')) add(candidate.trim().split(/\s+/, 1)[0]);
    }
    return { files: [...files], unresolved: [...unresolved] };
}

function inspectFiles(root, references) {
    return references.map(reference => {
        const absolute = path.resolve(root, reference.file);
        if (!absolute.startsWith(path.resolve(root) + path.sep)) throw new Error('Unsafe upload path');
        try {
            const stat = fs.statSync(absolute);
            return { ...reference, state: stat.isFile() && stat.size > 0 ? 'available' : 'empty-or-not-file' };
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
            return { ...reference, state: 'missing' };
        }
    });
}

async function main() {
    require('dotenv').config();
    const oracle = require('oracledb');
    const { uploadsRoot } = require('../config/uploadPaths');
    if (process.env.ORACLE_CLIENT_PATH) oracle.initOracleClient({ libDir: process.env.ORACLE_CLIENT_PATH });
    const connection = await oracle.getConnection({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectString: process.env.DB_CONNECTION_STRING
    });
    try {
        connection.callTimeout = 30000;
        await connection.execute('SET TRANSACTION READ ONLY');
        const columns = await connection.execute(
            "SELECT TABLE_NAME, COLUMN_NAME FROM USER_TAB_COLUMNS WHERE TABLE_NAME LIKE 'TIRF_MANUAIS%' AND COLUMN_NAME IN ('CONTEUDO_HTML', 'ARQUIVO_PDF')",
            [], { outFormat: oracle.OUT_FORMAT_OBJECT }
        );
        const tables = new Map();
        for (const row of columns.rows) {
            if (!/^TIRF_MANUAIS(?:_LOJA\d{2})?$/.test(row.TABLE_NAME)) continue;
            if (!tables.has(row.TABLE_NAME)) tables.set(row.TABLE_NAME, new Set());
            tables.get(row.TABLE_NAME).add(row.COLUMN_NAME);
        }
        const references = new Map();
        const unresolved = [];
        let manuals = 0;
        for (const [table, names] of tables) {
            const result = await connection.execute(
                `SELECT ID_MANUAL, TITULO, ${names.has('CONTEUDO_HTML') ? 'CONTEUDO_HTML' : 'NULL AS CONTEUDO_HTML'}, ${names.has('ARQUIVO_PDF') ? 'ARQUIVO_PDF' : 'NULL AS ARQUIVO_PDF'} FROM ${table}`,
                [], { outFormat: oracle.OUT_FORMAT_OBJECT, fetchInfo: { CONTEUDO_HTML: { type: oracle.STRING } } }
            );
            manuals += result.rows.length;
            for (const manual of result.rows) {
                const usage = { table, id: manual.ID_MANUAL, title: manual.TITULO };
                const collected = collectReferences(manual.CONTEUDO_HTML, manual.ARQUIVO_PDF);
                for (const file of collected.files) {
                    if (!references.has(file)) references.set(file, { file, manuals: [] });
                    references.get(file).manuals.push(usage);
                }
                for (const value of collected.unresolved) unresolved.push({ ...usage, value });
            }
        }
        const checked = inspectFiles(uploadsRoot, [...references.values()]);
        const missing = checked.filter(reference => reference.state !== 'available');
        process.stdout.write(JSON.stringify({ checkedAt: new Date().toISOString(), tables: tables.size, manuals, files: checked.length, missing, unresolved }, null, 2) + '\n');
        if (missing.length || unresolved.length) process.exitCode = 2;
    } finally {
        await connection.close();
    }
}

if (require.main === module) main().catch(error => {
    console.error('Upload integrity check failed:', error.code || 'CHECK_FAILED');
    process.exitCode = 1;
});

module.exports = { uploadPath, collectReferences, inspectFiles };
