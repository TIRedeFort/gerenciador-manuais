const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { uploadPath, collectReferences, inspectFiles } = require('../scripts/check-uploads');

test('maps current, legacy and encoded upload URLs without traversal', () => {
    assert.equal(uploadPath('/manuais/uploads/images/tecla%20PDV.png?v=1'), 'images/tecla PDV.png');
    assert.equal(uploadPath('https://app.fortsupermercados.com.br/uploads/images/test.png'), 'images/test.png');
    assert.equal(uploadPath('uploads\\pdfs\\manual.pdf', true), 'pdfs/manual.pdf');
    assert.equal(uploadPath('/uploads/images/%2e%2e'), null);
    assert.equal(uploadPath('/uploads/images/%2fetc%2fpasswd'), null);
    assert.equal(uploadPath('/uploads/images/%5csecret'), null);
    assert.equal(uploadPath('/uploads/images/%00.png'), null);
});

test('collects image, document, attachment, CSS and srcset references once', () => {
    const result = collectReferences('<img src="/uploads/images/a.png"><img src="/uploads/images/a.png"><a href="/manuais/uploads/pdfs/a.doc">Documento</a><div style="background:url(/uploads/images/b.png)"></div><img srcset="/uploads/images/c.png 1x, /uploads/images/d.png 2x">', 'uploads/pdfs/manual.pdf');
    assert.deepEqual(result.files.sort(), ['images/a.png', 'images/b.png', 'images/c.png', 'images/d.png', 'pdfs/a.doc', 'pdfs/manual.pdf']);
    assert.deepEqual(result.unresolved, []);
});

test('reports temporary and invalid upload references, ignoring embedded images', () => {
    const result = collectReferences('<img src="blob:expired"><img src="data:image/png;base64,AAAA"><img src="/uploads/images/%ZZ.png">');
    assert.deepEqual(result.files, []);
    assert.deepEqual(result.unresolved, ['blob:expired', '/uploads/images/%ZZ.png']);
});

test('detects missing and empty files without writing or modifying content', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'manuais-uploads-'));
    try {
        fs.mkdirSync(path.join(root, 'images'));
        fs.writeFileSync(path.join(root, 'images', 'ok.png'), 'image');
        fs.writeFileSync(path.join(root, 'images', 'empty.png'), '');
        assert.deepEqual(inspectFiles(root, ['ok.png', 'empty.png', 'missing.png'].map(filename => ({ file: `images/${filename}` }))).map(result => result.state), ['available', 'empty-or-not-file', 'missing']);
        assert.throws(() => inspectFiles(root, [{ file: '../secret' }]), /Unsafe upload path/);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
