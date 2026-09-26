/**
 * @fileoverview Sam Huang Project Portal — Application Runtime
 * Semiconductor & Systems Portal with Interactive Silicon Canvas,
 * Bilingual i18n (ZH/EN), Card Specular Tracking, and Telemetry Counters.
 */

"use strict";

/* ══════════════════════════════════════════════════════════════════════════════
   雙語詞典 (BILINGUAL DICTIONARY - TRADITIONAL CHINESE / ENGLISH)
   ══════════════════════════════════════════════════════════════════════════════ */
const I18N = {
  zh: {
    brand_sub: "半導體 IP · 系統架構",
    nav_projects: "專案矩陣",
    nav_philosophy: "架構哲學",
    status_online: "6 節點就緒",
    hero_telemetry: "PROJECT PORTAL · TAIWAN 2026 · SILICON ARCHITECTURE",
    hero_headline_1: "從架構規劃",
    hero_headline_2: "到真正可執行的系統",
    hero_mission: "整合 Silicon IP、安全儲存（Secure Storage）、本地 AI 運算架構與互動模擬工程的公開技術門戶，以實證數據與真實運行為準則。",
    cta_explore: "探索專案節點",
    cta_github: "GitHub 總覽 ↗",
    metric_nodes: "Active Nodes",
    metric_live: "Live Hubs",
    metric_arcade: "Engines",
    metric_tracks: "Study Tracks",
    matrix_kicker: "[01 // REPOSITORIES & HUBS]",
    matrix_title: "六大核心專案矩陣",
    matrix_subtitle: "每個節點皆為已發布且獨立運作之系統，涵蓋先進半導體、本機 AI 算力與現代互動架構。",
    badge_live: "LIVE WEB PORTAL",
    badge_source: "SOURCE REPOSITORY ONLY",
    // NODE 01
    node01_domain: "SEMICONDUCTOR IP · RESEARCH",
    node01_desc: "整合 Secure Storage、先進製程與白皮書工作室的半導體門戶，系統化拆解 OTP、MTP、eFlash 與 PUF 架構。",
    node01_action: "NODE://NVM-HUB",
    open_hub: "Open Hub",
    // NODE 02
    node02_domain: "INTERACTIVE SYSTEMS · ARCADE",
    node02_title: "多元遊戲大廳",
    node02_desc: "涵蓋 3D 棋盤、策略牌桌、空間益智與街機冒險等 21 款互動遊戲，全數以純前端圖形與合成音訊打造。",
    node02_action: "NODE://ARCADE-SUITE",
    enter_arcade: "Enter Arcade",
    // NODE 03
    node03_domain: "LEARNING ENGINE · 8 TRACKS",
    node03_desc: "整合數學、微積分、理化、計概、日語、多益與臺灣華語八大軌道，搭載 FSRS 自適應記憶排程演算法。",
    node03_action: "NODE://E-LEARNING",
    start_learning: "Start Learning",
    // NODE 04
    node04_domain: "HARDWARE · ENGINEERING PROFILE",
    node04_desc: "記錄 Core Ultra 9 285H、RTX 5080 eGPU 與 96GB DDR5 開發環境，提供可檢索的硬體規格與本機算力清冊。",
    node04_action: "NODE://HARDWARE-RIG",
    view_rig: "View Rig",
    // NODE 05
    node05_domain: "SECURE STORAGE · OIP BRIEFING",
    node05_desc: "公開 Secure Storage 與台積電 OIP 技術簡報及參考架構，聚焦硬體信任根（RoT）與非揮發性記憶體防禦。",
    node05_action: "NODE://OIP-BRIEFING",
    view_repo: "View Repo",
    // NODE 06
    node06_domain: "DATA INTERFACE · TERMINAL",
    node06_desc: "以現代終端機語彙重構台灣即時脈動與市場指標的開源工具，將多源數據串流轉化為高密度觀測面板。",
    node06_action: "NODE://TW-PULSE",
    // PHILOSOPHY
    philo_kicker: "ENGINEERING MANIFESTO",
    philo_heading: "從架構與證據，走到可以使用的成果。",
    philo_p1: "我是 Sam Huang，在台灣專注於半導體 IP 架構、安全儲存硬體設計與自主學習模擬系統。",
    philo_p2: "每一項專案都是對「高品質工程落地」的執著實踐。",
    footer_desc: "半導體與系統專案入口 · Silicon IP, Secure Storage & Systems · Taiwan 2026",
    back_to_top: "TOP"
  },
  en: {
    brand_sub: "Silicon IP · Systems Architecture",
    nav_projects: "Projects",
    nav_philosophy: "Philosophy",
    status_online: "6 Nodes Ready",
    hero_telemetry: "PROJECT PORTAL · TAIWAN 2026 · SILICON ARCHITECTURE",
    hero_headline_1: "From Architecture",
    hero_headline_2: "To Verifiable Working Systems",
    hero_mission: "A unified technical portal for Silicon IP, Secure Storage, local AI compute, and interactive systems—grounded in empirical evidence.",
    cta_explore: "Explore Project Nodes",
    cta_github: "GitHub Overview ↗",
    metric_nodes: "Active Nodes",
    metric_live: "Live Hubs",
    metric_arcade: "Engines",
    metric_tracks: "Study Tracks",
    matrix_kicker: "[01 // REPOSITORIES & HUBS]",
    matrix_title: "Core Project Matrix",
    matrix_subtitle: "Independently operating systems spanning semiconductor IP research, local AI compute, and interactive web engines.",
    badge_live: "LIVE WEB PORTAL",
    badge_source: "SOURCE REPOSITORY ONLY",
    // NODE 01
    node01_domain: "SEMICONDUCTOR IP · RESEARCH",
    node01_desc: "Semiconductor research portal for Secure Storage and advanced nodes, covering OTP, MTP, eFlash, and PUF IP.",
    node01_action: "NODE://NVM-HUB",
    open_hub: "Open Hub",
    // NODE 02
    node02_domain: "INTERACTIVE SYSTEMS · ARCADE",
    node02_title: "Interactive Game Arcade",
    node02_desc: "Twenty-one playable titles across 3D chess, tabletop strategy, spatial puzzles, and arcade action on web canvas.",
    node02_action: "NODE://ARCADE-SUITE",
    enter_arcade: "Enter Arcade",
    // NODE 03
    node03_domain: "LEARNING ENGINE · 8 TRACKS",
    node03_desc: "Eight progressive tracks across STEM, CS, Japanese, TOEIC, and Mandarin, driven by FSRS memory scheduling.",
    node03_action: "NODE://E-LEARNING",
    start_learning: "Start Learning",
    // NODE 04
    node04_domain: "HARDWARE · ENGINEERING PROFILE",
    node04_desc: "Hardware inventory for the Core Ultra 9 285H workstation, RTX 5080 eGPU dock, and 96GB DDR5 local AI rig.",
    node04_action: "NODE://HARDWARE-RIG",
    view_rig: "View Rig",
    // NODE 05
    node05_domain: "SECURE STORAGE · OIP BRIEFING",
    node05_desc: "Reference architecture and TSMC OIP briefing collateral focused on hardware Root of Trust and NVM security.",
    node05_action: "NODE://OIP-BRIEFING",
    view_repo: "View Repo",
    // NODE 06
    node06_domain: "DATA INTERFACE · TERMINAL",
    node06_desc: "Python and web telemetry terminal synthesizing real-time Taiwan market indicators into a high-density CLI view.",
    node06_action: "NODE://TW-PULSE",
    // PHILOSOPHY
    philo_kicker: "ENGINEERING MANIFESTO",
    philo_heading: "From architecture and evidence to working systems.",
    philo_p1: "I am Sam Huang, an engineer in Taiwan specializing in semiconductor IP architecture and secure memory systems.",
    philo_p2: "Every node is built as a verifiable, production-grade implementation.",
    footer_desc: "Semiconductor & Systems Project Portal · Silicon IP, Secure Storage & Systems · Taiwan 2026",
    back_to_top: "TOP"
  }
};

let currentLang = "zh";

function applyLanguage(lang) {
  const dict = I18N[lang];
  if (!dict) return;

  document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
  document.documentElement.setAttribute("data-lang", lang);

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key] !== undefined) {
      el.textContent = dict[key];
    }
  });

  document.querySelectorAll(".lang-switch-btn").forEach((btn) => {
    const isTarget = btn.getAttribute("data-target-lang") === lang;
    btn.classList.toggle("active", isTarget);
    btn.setAttribute("aria-pressed", String(isTarget));
  });

  try {
    localStorage.setItem("sh_portal_lang", lang);
  } catch {
    // 忽略隱私模式限制
  }
}

function initLanguage() {
  try {
    const saved = localStorage.getItem("sh_portal_lang");
    if (saved === "en" || saved === "zh") {
      currentLang = saved;
    }
  } catch {
    currentLang = "zh";
  }

  applyLanguage(currentLang);

  document.querySelectorAll(".lang-switch-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-target-lang");
      if (target && target !== currentLang) {
        currentLang = target;
        applyLanguage(currentLang);
      }
    });
  });
}

function initSiliconCanvas() {
  const canvas = document.getElementById("silicon-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let animationFrameId = null;

  const nodes = [];
  const maxNodes = 48;
  const connectDistance = 140;

  const mouse = { x: -9999, y: -9999, radius: 160 };

  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.parentElement.getBoundingClientRect();
    width = rect.width;
    height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    initNodes();
  }

  function initNodes() {
    nodes.length = 0;
    const count = Math.min(Math.floor((width * height) / 24000), maxNodes);

    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 1.8 + 1.2,
        baseAlpha: Math.random() * 0.3 + 0.15,
        color: Math.random() > 0.4 ? "rgba(37, 99, 235, " : "rgba(100, 116, 139, "
      });
    }
  }

  function drawScene() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      node.x += node.vx;
      node.y += node.vy;

      if (node.x < 0) node.x = width;
      if (node.x > width) node.x = 0;
      if (node.y < 0) node.y = height;
      if (node.y > height) node.y = 0;

      const dxMouse = node.x - mouse.x;
      const dyMouse = node.y - mouse.y;
      const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
      if (distMouse < mouse.radius && distMouse > 0) {
        const force = (1 - distMouse / mouse.radius) * 1.5;
        node.x += (dxMouse / distMouse) * force;
        node.y += (dyMouse / distMouse) * force;
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < connectDistance) {
          const alpha = (1 - dist / connectDistance) * 0.18;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(37, 99, 235, ${alpha * 0.75})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color + node.baseAlpha + ")";
      ctx.fill();
    }

    animationFrameId = requestAnimationFrame(drawScene);
  }

  window.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }, { passive: true });

  window.addEventListener("mouseleave", () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(animationFrameId);
    } else {
      animationFrameId = requestAnimationFrame(drawScene);
    }
  });

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    canvas.style.display = "none";
    return;
  }

  window.addEventListener("resize", resizeCanvas, { passive: true });
  resizeCanvas();
  drawScene();
}

function initTelemetryCounters() {
  const targets = document.querySelectorAll("[data-count]");
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const targetValue = parseInt(el.getAttribute("data-count"), 10);
        if (!isNaN(targetValue)) {
          animateValue(el, 0, targetValue, 1300);
          observer.unobserve(el);
        }
      }
    });
  }, { threshold: 0.4 });

  targets.forEach((el) => observer.observe(el));
}

function animateValue(element, start, end, duration) {
  const startTime = performance.now();
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(start + (end - start) * eased);
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  requestAnimationFrame(update);
}

function initCardSpecularGlow() {
  const cards = document.querySelectorAll(".node-card");
  cards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    });
  });
}

function initScrollInteractions() {
  const header = document.getElementById("site-header");
  let ticking = false;

  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        if (header) {
          header.classList.toggle("scrolled", window.scrollY > 40);
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  const revealElements = document.querySelectorAll(".reveal");
  if (!revealElements.length) return;

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  revealElements.forEach((el) => revealObserver.observe(el));
}

function bootstrap() {
  initLanguage();
  initSiliconCanvas();
  initTelemetryCounters();
  initCardSpecularGlow();
  initScrollInteractions();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
