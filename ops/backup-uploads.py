import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import tarfile
from datetime import datetime, timezone


def create_backup(source, destination, keep=14):
    source = Path(source).resolve(strict=True)
    destination = Path(destination)
    if not (source / 'images').is_dir() or not (source / 'pdfs').is_dir():
        raise RuntimeError('Upload directories not found')
    destination.mkdir(mode=0o700, parents=True, exist_ok=True)
    destination.chmod(0o700)
    files = sorted(item for item in source.rglob('*') if item.is_file())
    if not files or any(item.is_symlink() for item in source.rglob('*')):
        raise RuntimeError('Empty storage or symbolic link detected')
    if shutil.disk_usage(destination).free < sum(item.stat().st_size for item in files) + 1024 ** 3:
        raise RuntimeError('Not enough disk space for a verified backup')
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    temporary = destination / ('.pending-' + stamp + '.tar.gz')
    final = destination / ('uploads-' + stamp + '.tar.gz')
    manifest = {}
    try:
        with temporary.open('xb') as output:
            temporary.chmod(0o600)
            with tarfile.open(fileobj=output, mode='w:gz') as archive:
                for item in files:
                    before = item.stat()
                    relative = item.relative_to(source).as_posix()
                    archive.add(item, arcname='uploads/' + relative, recursive=False)
                    with item.open('rb') as stream:
                        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
                    after = item.stat()
                    if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
                        raise RuntimeError('Upload changed during backup; retry required')
                    manifest[relative] = digest
                payload = json.dumps(manifest, sort_keys=True).encode()
                header = tarfile.TarInfo('manifest.json')
                header.size = len(payload)
                header.mode = 0o600
                archive.addfile(header, io.BytesIO(payload))
            output.flush()
            os.fsync(output.fileno())
        with tarfile.open(temporary, 'r:gz') as archive:
            for relative, expected in manifest.items():
                with archive.extractfile('uploads/' + relative) as stream:
                    if hashlib.file_digest(stream, 'sha256').hexdigest() != expected:
                        raise RuntimeError('Backup verification failed')
        temporary.replace(final)
        for previous in sorted(destination.glob('uploads-*.tar.gz'))[:-keep]:
            previous.unlink()
        return {'archive': final.name, 'files': len(files), 'verified': True}
    finally:
        temporary.unlink(missing_ok=True)


if __name__ == '__main__':
    os.umask(0o077)
    print(json.dumps(create_backup(
        '/etc/easypanel/projects/sistemas-redefort/manuais/uploads-persistent',
        '/root/fort-manuais-backups'
    )))
