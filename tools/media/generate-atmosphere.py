"""Generate an original, seamless looping atmosphere video; no movie footage is used."""

import math
import random
import subprocess
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "dist" / "assets" / "video"
OUT.mkdir(parents=True, exist_ok=True)
WIDTH, HEIGHT, FPS, SECONDS = 640, 360, 24, 6
rng = random.Random(37)
particles = [
    (
        rng.random(),
        rng.random(),
        rng.uniform(1, 2.8),
        rng.uniform(0.2, 0.7),
        rng.randrange(1, 3),
    )
    for _ in range(36)
]
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
command = [
    ffmpeg,
    "-y",
    "-f",
    "rawvideo",
    "-vcodec",
    "rawvideo",
    "-pix_fmt",
    "rgb24",
    "-s",
    f"{WIDTH}x{HEIGHT}",
    "-r",
    str(FPS),
    "-i",
    "-",
    "-an",
    "-vcodec",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "28",
    "-preset",
    "slow",
    "-movflags",
    "+faststart",
    str(OUT / "atmosphere.mp4"),
]
process = subprocess.Popen(
    command, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE
)
for frame in range(FPS * SECONDS):
    phase = frame / (FPS * SECONDS)
    image = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0))
    fog = Image.new("RGB", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(fog)
    for i in range(4):
        x = WIDTH * (i / 3 - 0.1) + math.sin(phase * 2 * math.pi + i * 1.7) * 60
        y = HEIGHT * 0.95 + math.cos(phase * 2 * math.pi + i) * 16
        draw.ellipse(
            (x - 230, y - 48, x + 230, y + 48),
            fill=(16 + i * 3, 21 + i * 3, 19 + i * 2),
        )
    image = fog.filter(ImageFilter.GaussianBlur(28))
    draw = ImageDraw.Draw(image)
    for x0, y0, radius, opacity, speed in particles:
        x = ((x0 + 0.015 * math.sin(phase * 2 * math.pi)) % 1) * WIDTH
        y = ((y0 - phase * speed) % 1) * HEIGHT
        brightness = opacity * (0.65 + 0.35 * math.sin(phase * 2 * math.pi + x0 * 20))
        color = tuple(int(channel * brightness) for channel in (211, 161, 77))
        draw.ellipse(
            (x - radius, y - radius * 0.55, x + radius, y + radius * 0.55), fill=color
        )
    if frame == 0:
        image.save(OUT / "atmosphere-poster.webp", quality=85)
    process.stdin.write(image.tobytes())
process.stdin.close()
stderr = process.stderr.read().decode(errors="replace")
if process.wait() != 0:
    raise RuntimeError(stderr[-2000:])
print(
    f"Created {OUT / 'atmosphere.mp4'} ({(OUT / 'atmosphere.mp4').stat().st_size:,} bytes)"
)
