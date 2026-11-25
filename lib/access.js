import { timingSafeEqual, createHash } from 'node:crypto';

export function createAccessPolicy({ port, remoteOrigin, password }) {
  const localOrigin = 'http://127.0.0.1:' + port;
  let remote;
  if (remoteOrigin) {
    const url = new URL(remoteOrigin);
    if (url.protocol !== 'https:' || url.origin !== remoteOrigin || url.username || url.password || !url.hostname.endsWith('.ts.net')) throw new Error('MAX_REMOTE_ORIGIN deve ser uma origem HTTPS do Tailscale, sem barra final.');
    if (typeof password !== 'string' || password.length < 24) throw new Error('Defina MAX_REMOTE_PASSWORD com pelo menos 24 caracteres aleatórios.');
    remote = url;
  }
  const digest = value => createHash('sha256').update(value).digest();
  const expected = remote ? digest('max:' + password) : null;
  function authorize(headers) {
    const host = headers.host;
    const isRemote = Boolean(remote && host === remote.host);
    if (!isRemote && host !== '127.0.0.1:' + port) return { status: 403 };
    // Authenticate even if a proxy rewrites the Host to loopback.
    // Once remote mode is enabled, every request requires authentication.
    if (remote) {
      const raw = headers.authorization || '';
      const supplied = raw.startsWith('Basic ') && raw.length < 4096 ? Buffer.from(raw.slice(6), 'base64').toString('utf8') : '';
      if (!timingSafeEqual(digest(supplied), expected)) return { status: 401 };
    }
    return { status: 200, origin: isRemote ? remote.origin : localOrigin };
  }
  return { authorize };
}
