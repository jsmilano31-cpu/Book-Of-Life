import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const dist = resolve(import.meta.dirname, '../dist');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.ttf': 'font/ttf',
};

function byteRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, size - Number(match[2]));
  const end =
    match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  return start <= end ? { start, end } : null;
}

async function serveFile(request, response) {
  response.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, max-age=0',
  );
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return response.writeHead(405, { Allow: 'GET, HEAD' }).end();
  }

  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(request.url, 'http://localhost').pathname,
    );
  } catch {
    return response.writeHead(400).end();
  }

  const path = resolve(dist, pathname === '/' ? 'index.html' : '.' + pathname);
  if (!path.startsWith(dist + sep)) return response.writeHead(404).end();
  const file = await stat(path).catch(() => null);
  if (!file?.isFile()) return response.writeHead(404).end();

  response.setHeader(
    'Content-Type',
    types[extname(path)] ?? 'application/octet-stream',
  );
  response.setHeader('Accept-Ranges', 'bytes');

  let range;
  if (request.headers.range) {
    // Media playback can request individual byte ranges from the MP4.
    range = byteRange(request.headers.range, file.size);
    if (!range)
      return response
        .writeHead(416, { 'Content-Range': `bytes */${file.size}` })
        .end();
    response.setHeader(
      'Content-Range',
      `bytes ${range.start}-${range.end}/${file.size}`,
    );
  }

  response.setHeader(
    'Content-Length',
    range ? range.end - range.start + 1 : file.size,
  );
  response.writeHead(range ? 206 : 200);
  if (request.method === 'HEAD') return response.end();

  const stream = createReadStream(path, range ?? undefined);
  stream.on('error', () => response.destroy());
  response.on('close', () => stream.destroy());
  stream.pipe(response);
}

export function startPreview({ host = '127.0.0.1', port = 4173 } = {}) {
  const server = createServer((request, response) => {
    serveFile(request, response).catch(() => {
      if (response.headersSent) response.destroy();
      else response.writeHead(500).end();
    });
  });
  return new Promise((ready, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.removeListener('error', reject);
      ready(server);
    });
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const { values } = parseArgs({
      options: {
        host: { type: 'string', default: '127.0.0.1' },
        port: { type: 'string', default: '4173' },
      },
    });
    const server = await startPreview({
      host: values.host,
      port: Number(values.port),
    });
    console.log(
      `Beyond the Pages: http://${values.host}:${server.address().port}/`,
    );
    console.log('Development caching disabled. Press Ctrl+C to stop.');
  } catch (error) {
    console.error(`Could not start the preview: ${error.message}`);
    process.exitCode = 1;
  }
}
