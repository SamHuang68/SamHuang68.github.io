/**
 * @fileoverview 水晶晶圓光子水波紋、奈米電路脈衝與 3D 折射微特效 (Photonic Liquid Ripple & Circuit Pulses)
 * 模組化設計：獨立負責 Canvas 水波紋、曼哈頓電路光脈衝、卡片 3D 透視磁吸光斑、音效串接與準心光標
 */

(() => {
  'use strict';

  // 若使用者偏好減弱動態，直接退出不啟用任何高頻動畫
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  /**
   * 1. 互動式光子水波紋 + 曼哈頓電路光脈衝 Canvas
   */
  const initWaterRippleCanvas = () => {
    let canvas = document.getElementById('rippleCanvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'rippleCanvas';
      canvas.className = 'ripple-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.prepend(canvas);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    window.addEventListener('resize', resize, { passive: true });
    resize();

    // 波紋陣列與電路光脈衝陣列
    const ripples = [];
    const pulses = [];

    /**
     * 創建光子水波紋
     */
    const addRipple = (x, y, isHeavy = false) => {
      ripples.push({
        x,
        y,
        radius: isHeavy ? 6 : 2,
        maxRadius: isHeavy ? Math.min(width, height) * 0.28 : 65,
        alpha: isHeavy ? 0.65 : 0.28,
        speed: isHeavy ? 3.6 : 1.8,
        lineWidth: isHeavy ? 2.5 : 1.2,
        rings: isHeavy ? 3 : 1,
      });

      // 觸發音效
      if (isHeavy && window.SiliconAudio) {
        window.SiliconAudio.playDroplet();
      }

      if (!isAnimating) startLoop();
    };

    /**
     * 創建曼哈頓光子電路脈衝 (Manhattan Circuit Pulses)
     */
    const spawnPulse = () => {
      if (pulses.length >= 6) return;
      const startX = Math.random() * width;
      const startY = Math.random() * height;
      const isHorizontal = Math.random() > 0.5;
      pulses.push({
        x: startX,
        y: startY,
        vx: isHorizontal ? (Math.random() > 0.5 ? 2.5 : -2.5) : 0,
        vy: !isHorizontal ? (Math.random() > 0.5 ? 2.5 : -2.5) : 0,
        life: 0,
        maxLife: 60 + Math.random() * 80,
        length: 24 + Math.random() * 20,
        color: Math.random() > 0.3 ? 'rgba(15, 118, 110, ' : 'rgba(217, 119, 6, ',
      });
      if (!isAnimating) startLoop();
    };

    let isAnimating = false;
    let animId = null;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // A. 繪製光子水波紋
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed;
        r.alpha *= 0.965;

        for (let ring = 0; ring < r.rings; ring++) {
          const ringRadius = r.radius - ring * (r.speed * 4.5);
          if (ringRadius <= 0) continue;

          ctx.beginPath();
          ctx.arc(r.x, r.y, ringRadius, 0, Math.PI * 2);

          const grad = ctx.createRadialGradient(r.x, r.y, Math.max(0, ringRadius - 6), r.x, r.y, ringRadius + 4);
          grad.addColorStop(0, `rgba(15, 118, 110, 0)`);
          grad.addColorStop(0.5, `rgba(13, 148, 136, ${r.alpha * 0.8})`);
          grad.addColorStop(0.8, `rgba(217, 119, 6, ${r.alpha * 0.4})`);
          grad.addColorStop(1, `rgba(255, 255, 255, 0)`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = r.lineWidth;
          ctx.stroke();
        }

        if (r.radius >= r.maxRadius || r.alpha < 0.01) {
          ripples.splice(i, 1);
        }
      }

      // B. 繪製曼哈頓電路光脈衝
      for (let j = pulses.length - 1; j >= 0; j--) {
        const p = pulses[j];
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;

        const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.55;
        const tailX = p.x - p.vx * (p.length / 2.5);
        const tailY = p.y - p.vy * (p.length / 2.5);

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = `${p.color}${alpha})`;
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 頭部光亮光子點
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${alpha * 1.5})`;
        ctx.fill();

        if (p.life >= p.maxLife || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
          pulses.splice(j, 1);
        }
      }

      if (ripples.length > 0 || pulses.length > 0) {
        animId = requestAnimationFrame(render);
      } else {
        isAnimating = false;
      }
    };

    const startLoop = () => {
      if (!isAnimating) {
        isAnimating = true;
        animId = requestAnimationFrame(render);
      }
    };

    // 游標移動微波紋 (每隔 50px 產生微波)
    let lastMoveX = -999;
    let lastMoveY = -999;
    window.addEventListener(
      'pointermove',
      (e) => {
        const dist = Math.hypot(e.clientX - lastMoveX, e.clientY - lastMoveY);
        if (dist > 50) {
          lastMoveX = e.clientX;
          lastMoveY = e.clientY;
          addRipple(e.clientX, e.clientY, false);
        }
      },
      { passive: true },
    );

    // 點擊衝擊水波
    window.addEventListener(
      'pointerdown',
      (e) => {
        addRipple(e.clientX, e.clientY, true);
      },
      { passive: true },
    );

    // 每 2.5 秒隨機產生一顆電路光脈衝
    setInterval(spawnPulse, 2400);

    // 環境待機呼吸微波
    let idleTimer = null;
    const triggerIdleRipple = () => {
      const x = width * (0.3 + Math.random() * 0.4);
      const y = height * (0.3 + Math.random() * 0.4);
      addRipple(x, y, false);
      idleTimer = setTimeout(triggerIdleRipple, 4200);
    };
    idleTimer = setTimeout(triggerIdleRipple, 3000);

    const resetIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(triggerIdleRipple, 4200);
    };
    window.addEventListener('pointermove', resetIdle, { passive: true });
    window.addEventListener('pointerdown', resetIdle, { passive: true });
  };

  /**
   * 2. 卡片 3D 透視磁吸微傾斜與動態折射光斑
   */
  const initCardTiltAndSheen = () => {
    const cards = document.querySelectorAll('.portal-card');
    cards.forEach((card) => {
      let isHovered = false;

      card.addEventListener('pointerenter', () => {
        isHovered = true;
        if (window.SiliconAudio) window.SiliconAudio.playHover();
      });

      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const percentX = (x - centerX) / centerX;
        const percentY = (y - centerY) / centerY;

        const tiltX = -percentY * 3.2;
        const tiltY = percentX * 3.2;

        card.style.transform = `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) translateY(-4px)`;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });

      card.addEventListener('pointerleave', () => {
        isHovered = false;
        card.style.transform = '';
        card.style.removeProperty('--mouse-x');
        card.style.removeProperty('--mouse-y');
      });
    });
  };

  /**
   * 3. Tab 按鈕水波點擊微動效與音效
   */
  const initTabClickRipple = () => {
    const tabButtons = document.querySelectorAll('.project-rail-btn, .language-toggle, .hud-btn');
    tabButtons.forEach((btn) => {
      btn.addEventListener('pointerdown', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const ripple = document.createElement('span');
        ripple.className = 'tab-click-ripple';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;

        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);

        if (window.SiliconAudio) window.SiliconAudio.playClick();
      });
    });
  };

  // 當 DOM 準備完成時初始化所有微特效
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initWaterRippleCanvas();
      initCardTiltAndSheen();
      initTabClickRipple();
    });
  } else {
    initWaterRippleCanvas();
    initCardTiltAndSheen();
    initTabClickRipple();
  }
})();
