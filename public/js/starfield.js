/* Starfield canvas animation */
(function () {
  'use strict';
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let stars = [];
  const NUM_STARS = 180;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createStar() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.3,
      alpha: Math.random() * 0.6 + 0.2,
      speed: Math.random() * 0.002 + 0.001,
      phase: Math.random() * Math.PI * 2,
    };
  }

  function initStars() {
    stars = Array.from({ length: NUM_STARS }, createStar);
  }

  function draw(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      const a = s.alpha * (0.6 + 0.4 * Math.sin(time * s.speed + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(248,250,252,${a.toFixed(3)})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => {
    resize();
    initStars();
  });

  resize();
  initStars();
  requestAnimationFrame(draw);
}());
