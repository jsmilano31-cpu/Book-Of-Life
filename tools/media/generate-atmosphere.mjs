import { execFile, spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, rmdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { parseArgs, promisify } from 'node:util';

const width = 640;
const height = 360;
const fps = 24;
const totalFrames = fps * 6;
const turn = 2 * Math.PI;
let seed = 37;

function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
}

const particles = Array.from({ length: 36 }, () => ({
  x: random(),
  y: random(),
  radius: 1 + random() * 1.8,
  opacity: 0.2 + random() * 0.5,
  speed: 1 + Math.floor(random() * 2),
}));

function renderFrame(frame) {
  const phase = frame / totalFrames;
  const angle = phase * turn;
  const image = Buffer.alloc(width * height * 3);

  // Periodic positions bring the fog and particles back to their starting point.
  for (let i = 0; i < 4; i++) {
    const centerX = width * (i / 3 - 0.1) + Math.sin(angle + i * 1.7) * 60;
    const centerY = height * 0.95 + Math.cos(angle + i) * 16;
    const horizontal = Float64Array.from({ length: width }, (_, x) =>
      Math.exp(-0.5 * ((x - centerX) / 140) ** 2),
    );

    for (let y = Math.max(0, Math.floor(centerY - 150)); y < height; y++) {
      const vertical = Math.exp(-0.5 * ((y - centerY) / 35) ** 2);
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 3;
        const strength = horizontal[x] * vertical;
        image[offset] += Math.round(strength * (10 + i * 2));
        image[offset + 1] += Math.round(strength * (14 + i * 2));
        image[offset + 2] += Math.round(strength * (12 + i * 2));
      }
    }
  }

  for (const p of particles) {
    const px = ((p.x + 1 + 0.015 * Math.sin(angle)) % 1) * width;
    const py = ((p.y + 2 - phase * p.speed) % 1) * height;
    const glow = p.opacity * (0.65 + 0.35 * Math.sin(angle + p.x * 20));
    for (
      let y = Math.max(0, Math.floor(py - p.radius));
      y < Math.min(height, py + p.radius);
      y++
    ) {
      for (
        let x = Math.max(0, Math.floor(px - p.radius));
        x < Math.min(width, px + p.radius);
        x++
      ) {
        const distance =
          ((x - px) / p.radius) ** 2 + ((y - py) / (p.radius * 0.55)) ** 2;
        if (distance >= 1) continue;
        const offset = (y * width + x) * 3;
        const strength = glow * (1 - distance * 0.6);
        image[offset] += Math.round(211 * strength);
        image[offset + 1] += Math.round(161 * strength);
        image[offset + 2] += Math.round(77 * strength);
      }
    }
  }
  return image;
}

function* frames() {
  for (let frame = 0; frame < totalFrames; frame++) yield renderFrame(frame);
}

const { values } = parseArgs({ options: { output: { type: 'string' } } });
const output = resolve(
  values.output ?? join(import.meta.dirname, '../../dist/media/video'),
);
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
const staging = await mkdtemp(join(tmpdir(), 'beyond-the-pages-media-'));
const video = 'atmosphere.mp4';
const poster = 'atmosphere-poster.webp';

try {
  const encoder = spawn(
    ffmpeg,
    [
      '-v',
      'error',
      '-y',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      '-s',
      `${width}x${height}`,
      '-framerate',
      String(fps),
      '-i',
      'pipe:0',
      '-an',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      '28',
      '-preset',
      'slow',
      '-movflags',
      '+faststart',
      join(staging, video),
    ],
    { stdio: ['pipe', 'ignore', 'inherit'] },
  );
  const encoded = new Promise((resolve, reject) => {
    encoder.on('error', reject);
    encoder.on('close', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`FFmpeg exited with status ${code}`)),
    );
  });
  await Promise.all([
    encoded,
    pipeline(Readable.from(frames()), encoder.stdin),
  ]);
  await promisify(execFile)(ffmpeg, [
    '-v',
    'error',
    '-y',
    '-i',
    join(staging, video),
    '-frames:v',
    '1',
    '-c:v',
    'libwebp',
    '-quality',
    '85',
    join(staging, poster),
  ]);

  await mkdir(output, { recursive: true });
  for (const file of [video, poster]) {
    const path = join(output, file);
    await copyFile(join(staging, file), path);
    console.log(`Created ${path} (${(await stat(path)).size} bytes)`);
  }
} catch (error) {
  console.error(
    error.code === 'ENOENT'
      ? 'FFmpeg is required to regenerate media. Install it or set FFMPEG to its executable path.'
      : error.message,
  );
  process.exitCode = 1;
} finally {
  // Remove the two known temporary files and the empty generator directory.
  await rm(join(staging, video), { force: true });
  await rm(join(staging, poster), { force: true });
  await rmdir(staging);
}
