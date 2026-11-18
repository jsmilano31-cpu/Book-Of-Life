export class AtmosphereView {
  constructor(reduced = false) {
    this.canvas = document.querySelector('#atmosphere');
    this.ctx = this.canvas.getContext('2d');
    this.reduced = reduced;
    this.paused = false;
    this.mode = 'intro';
    this.particles = [];
    this.last = 0;
    this.raf = 0;
    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    window.addEventListener('resize', this.resize, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(this.raf);
      else this.start();
    });
    this.resize();
    this.start();
  }
  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.7);
    this.canvas.width = Math.round(this.width * ratio);
    this.canvas.height = Math.round(this.height * ratio);
    this.ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.particles = Array.from({ length: this.width < 760 ? 26 : 57 }, () =>
      this.makeParticle(),
    );
  }
  makeParticle(burst = false) {
    return {
      x: burst ? this.width / 2 : Math.random() * this.width,
      y: burst ? this.height * 0.52 : Math.random() * this.height,
      vx: burst ? (Math.random() - 0.5) * 7 : Math.random() * 0.35 - 0.13,
      vy: burst ? (Math.random() - 0.5) * 6 : -(Math.random() * 0.25 + 0.09),
      size: burst ? 3 + Math.random() * 5 : 1 + Math.random() * 3,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.035,
      alpha: 0.2 + Math.random() * 0.5,
      petal: burst || Math.random() > 0.73,
      life: burst ? 180 + Math.random() * 120 : Infinity,
      burst,
    };
  }
  start() {
    cancelAnimationFrame(this.raf);
    this.last = 0;
    if (!this.reduced && !this.paused && !document.hidden && this.ctx)
      this.raf = requestAnimationFrame(this.frame);
    else this.ctx?.clearRect(0, 0, this.width, this.height);
  }
  setMode(mode) {
    this.mode = mode;
  }
  setPaused(paused) {
    this.paused = paused;
    this.start();
  }
  setReduced(reduced) {
    this.reduced = reduced;
    this.start();
  }
  burst() {
    if (this.reduced || this.paused) return;
    for (let i = 0; i < (this.width < 760 ? 60 : 130); i++)
      this.particles.push(this.makeParticle(true));
  }
  frame(time) {
    if (this.paused || this.reduced || document.hidden) return;
    const dt = this.last ? Math.min((time - this.last) / 16.667, 2) : 1;
    this.last = time;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    if (this.mode === 'intro') {
      for (let i = 0; i < 3; i++) {
        const x =
          this.width * (i * 0.45 - 0.13) +
          Math.sin(time * 0.00008 + i) * this.width * 0.15;
        const fog = ctx.createRadialGradient(
          x,
          this.height * 0.94,
          0,
          x,
          this.height * 0.94,
          this.width * 0.46,
        );
        fog.addColorStop(0, 'rgba(152,174,156,.045)');
        fog.addColorStop(1, 'rgba(140,165,150,0)');
        ctx.fillStyle = fog;
        ctx.fillRect(0, this.height * 0.55, this.width, this.height * 0.45);
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.particles) {
      p.x += (p.vx + Math.sin(time * 0.0003 + p.rotation) * 0.13) * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;
      p.life -= dt;
      if (p.burst) {
        p.vy += 0.006 * dt;
        p.vx *= 0.998;
        p.alpha *= 0.997;
      } else {
        if (p.y < -20) p.y = this.height + 20;
        if (p.x < -20) p.x = this.width + 20;
        if (p.x > this.width + 20) p.x = -20;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.alpha * (this.mode === 'book' ? 0.55 : 1);
      ctx.fillStyle = p.petal ? '#e8a44c' : '#efd39a';
      if (p.petal) {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.6, p.size * 1.45, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.shadowColor = '#e5b757';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    this.raf = requestAnimationFrame(this.frame);
  }
}
