/**
 * @fileoverview 水晶晶圓光子水波紋與 3D 折射微特效 (Photonic Liquid Ripple & 3D Specular Sheen)
 * 模組化設計：獨立負責 Canvas 水波紋物理動態、卡片 3D 透視磁吸光斑與 Tab 點擊漣漪
 * 符合規範：支援 prefers-reduced-motion 降級、零外溢位、高幀率 RAF 渲染
 */

(() => {
  'use strict';

  // 若使用者偏好減弱動態，直接退出不啟用任何高頻動畫
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  /**
   * 1. 互動式光子水波紋 (Photonic Liquid Ripples Canvas)
   */
  const initWaterRippleCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.id = 'rippleCanvas';
    canvas.className = 'ripple-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

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

    // 波紋粒子陣列
    const ripples = [];

    /**
     * 創建一道光子水波紋
     * @param {number} x - 觸發座標 X
     * @param {number} y - 觸發座標 Y
     * @param {boolean} isHeavy - 是否為大波紋（點擊觸發）
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
        hue: isHeavy ? 175 : 185, // 青綠與電路藍微色相
      });
      if (!isAnimating) startLoop();
    };

    let isAnimating = false;
    let animId = null;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed;
        r.alpha *= 0.965; // 柔和指數淡出

        for (let ring = 0; ring < r.rings; ring++) {
          const ringRadius = r.radius - ring * (r.speed * 4.5);
          if (ringRadius <= 0) continue;

          ctx.beginPath();
          ctx.arc(r.x, r.y, ringRadius, 0, Math.PI * 2);

          // 光子干涉漸變環形：外緣帶有極光青，內緣帶微弱琥珀金折射
          const grad = ctx.createRadialGradient(r.x, r.y, Math.max(0, ringRadius - 6), r.x, r.y, ringRadius + 4);
          grad.addColorStop(0, `rgba(15, 118, 110, 0)`);
          grad.addColorStop(0.5, `rgba(13, 148, 136, ${r.alpha * 0.8})`);
          grad.addColorStop(0.8, `rgba(217, 119, 6, ${r.alpha * 0.4})`);
          grad.addColorStop(1, `rgba(255, 255, 255, 0)`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = r.lineWidth;
          ctx.stroke();
        }

        // 若半徑達上限或透明度極低，移除該波紋
        if (r.radius >= r.maxRadius || r.alpha < 0.01) {
          ripples.splice(i, 1);
        }
      }

      if (ripples.length > 0) {
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

    // 游標移動微波紋 (滑鼠滑過時每隔 45px 產生一顆輕柔水波)
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

    // 點擊衝擊水波 (任意點擊產生同心圓光子衝擊波)
    window.addEventListener(
      'pointerdown',
      (e) => {
        addRipple(e.clientX, e.clientY, true);
      },
      { passive: true },
    );

    // 環境待機呼吸微波 (若無操作每 4 秒在晶片區域隨機泛起微波)
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
   * 2. 卡片 3D 透視磁吸微傾斜與動態折射光斑 (3D Magnetic Tilt & Caustic Sheen)
   */
  const initCardTiltAndSheen = () => {
    const cards = document.querySelectorAll('.portal-card');
    cards.forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 計算相對於卡片中心的座標 (-1 到 1)
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const percentX = (x - centerX) / centerX;
        const percentY = (y - centerY) / centerY;

        // 微角度傾斜 (最大 3.5 度)
        const tiltX = -percentY * 3.5;
        const tiltY = percentX * 3.5;

        card.style.transform = `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) translateY(-4px)`;

        // 更新 CSS 變數供折射鏡面光斑使用
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });

      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
        card.style.removeProperty('--mouse-x');
        card.style.removeProperty('--mouse-y');
      });
    });
  };

  /**
   * 3. Tab 按鈕水波點擊微動效 (Tab Liquid Ripple)
   */
  const initTabClickRipple = () => {
    const tabButtons = document.querySelectorAll('.project-rail-btn, .language-toggle');
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
