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
    hero_mission: "整合 Silicon IP、安全儲存（Secure Storage）、本地 AI 運算架構與互動模擬工程的公開技術門戶。以實證數據與真實運行為準則。",
    cta_explore: "探索專案節點",
    cta_github: "GitHub 總覽 ↗",
    metric_nodes: "系統節點 (Nodes)",
    metric_live: "線上實體服務 (Live Web)",
    metric_arcade: "街機與對弈引擎 (Engines)",
    metric_tracks: "多軌研發學程 (Tracks)",
    matrix_kicker: "ACTIVE PRODUCTION HUBS & CODEBASES",
    matrix_title: "六大核心專案矩陣",
    matrix_subtitle: "每一個節點皆為已發布且持續維護之可獨立運算系統，涵蓋先進半導體、分散式運算到現代互動架構。",
    badge_live: "可執行網站 · LIVE WEB",
    badge_source: "僅 Git 專案 · SOURCE ONLY",
    // NODE 01
    node01_domain: "SEMICONDUCTOR IP · RESEARCH",
    node01_desc: "整合 Secure Storage、AI 時代先進製程應用與 NVM 白皮書工作室的完整半導體研究門戶。系統化拆解 OTP、MTP、eFlash 與 PUF 等核心架構。",
    node01_action: "進入半導體知識門戶",
    open_hub: "進入門戶 Open Hub",
    // NODE 02
    node02_domain: "INTERACTIVE SYSTEMS · ARCADE",
    node02_title: "多元遊戲大廳",
    node02_desc: "涵蓋 3D 棋盤對弈、策略模擬、復古街機與休閒益智等 21 款主題領域的互動遊戲合輯，全數採用純前端高效能圖形與音訊實作。",
    node02_action: "啟動遊戲模擬大廳",
    enter_arcade: "進入大廳 Enter Arcade",
    // NODE 03
    node03_domain: "LEARNING ENGINE · 8 TRACKS",
    node03_desc: "數學、微積分、物理、化學、計算機概論、日語、多益與臺灣華語，八軌整合的漸進式認知學習引擎與記憶演算法實作。",
    node03_action: "開啟自主學習引擎",
    start_learning: "開始學習 Start Learning",
    // NODE 04
    node04_domain: "HARDWARE · ENGINEERING PROFILE",
    node04_desc: "AI 工作站（Intel Core Ultra 9 285H）、RTX 5080 eGPU、96GB RAM 開發環境與工程硬體資產規格的可互動檢視紀錄與運算邊界清冊。",
    node04_action: "檢視本機硬體配置",
    view_rig: "查看硬體 View Rig",
    // NODE 05
    node05_domain: "SECURE STORAGE · OIP BRIEFING",
    node05_desc: "Secure Storage 與台積電 OIP 技術溝通的公開原始碼、技術簡報與硬體安全架構實作。探討硬體根信任（RoT）與記憶體資安防禦。",
    node05_action: "瀏覽技術庫與簡報",
    view_repo: "查看原始碼 View Repo",
    // NODE 06
    node06_domain: "DATA INTERFACE · TERMINAL",
    node06_desc: "以終端命令語彙重組台灣脈動資訊與技術數據介面的開源 Python/Web 專案。將多元數據流轉化為高資訊密度的即時終端儀表。",
    node06_action: "檢視 Python 終端實作",
    // PHILOSOPHY
    philo_kicker: "ENGINEERING MANIFESTO",
    philo_heading: "從架構與證據，走到可以使用的成果。",
    philo_p1: "我是 Sam Huang，在台灣專注於半導體 IP 架構、安全儲存硬體設計與自主學習模擬系統。技術不該只是投影片上的方塊圖，而應具備明確的物理限制考量、可重現的測試依據，並最終落地為每個人都能實機操作的系統。",
    philo_p2: "從矽智財的儲存胞行為、本地端 96GB 大容量 AI 推論環境，到兼具教學與娛樂的八軌學習引擎——每一項專案都是對「高品質工程落地」的執著實踐。",
    footer_desc: "半導體與系統專案入口 · Silicon IP, Secure Storage & Systems · Taiwan 2026",
    back_to_top: "回到頂端 TOP"
  },
  en: {
    brand_sub: "Silicon IP · Systems Architecture",
    nav_projects: "Projects",
    nav_philosophy: "Philosophy",
    status_online: "6 Nodes Ready",
    hero_telemetry: "PROJECT PORTAL · TAIWAN 2026 · SILICON ARCHITECTURE",
    hero_headline_1: "From Architecture",
    hero_headline_2: "To Verifiable Working Systems",
    hero_mission: "A unified technical portal synthesizing Silicon IP, Secure Storage, local AI acceleration, and interactive systems. Grounded in empirical evidence and production-grade execution.",
    cta_explore: "Explore Project Nodes",
    cta_github: "GitHub Overview ↗",
    metric_nodes: "Active System Nodes",
    metric_live: "Live Production Hubs",
    metric_arcade: "Interactive Arcade Engines",
    metric_tracks: "Research & Study Tracks",
    matrix_kicker: "ACTIVE PRODUCTION HUBS & CODEBASES",
    matrix_title: "Core Project Matrix",
    matrix_subtitle: "Each node represents an independently operating, maintained system spanning advanced semiconductor research to modern interactive architectures.",
    badge_live: "LIVE WEB PORTAL",
    badge_source: "SOURCE REPOSITORY ONLY",
    // NODE 01
    node01_domain: "SEMICONDUCTOR IP · RESEARCH",
    node01_desc: "Comprehensive semiconductor research hub integrating Secure Storage, AI-era nodes, and NVM Whitepaper Studio. Rigorously analyzing OTP, MTP, eFlash, and PUF architectures.",
    node01_action: "Enter Research Portal",
    open_hub: "Open Hub ↗",
    // NODE 02
    node02_domain: "INTERACTIVE SYSTEMS · ARCADE",
    node02_title: "Interactive Game Arcade",
    node02_desc: "Interactive suite featuring 21 titles across 3D chess, strategy simulations, retro arcade, and brain teasers. Built purely on modern web canvas and Web Audio engines.",
    node02_action: "Launch Arcade Suite",
    enter_arcade: "Enter Arcade ↗",
    // NODE 03
    node03_domain: "LEARNING ENGINE · 8 TRACKS",
    node03_desc: "Eight progressive study tracks: Taiwan Math, Calculus, Physics, Chemistry, CS, Japanese, TOEIC, and Mandarin, powered by adaptive memory algorithms.",
    node03_action: "Start Learning Engine",
    start_learning: "Start Learning ↗",
    // NODE 04
    node04_domain: "HARDWARE · ENGINEERING PROFILE",
    node04_desc: "Interactive hardware inventory detailing local Intel Core Ultra 9 285H AI rig, RTX 5080 eGPU dock, 96GB RAM dev workspace, and schedulable compute boundaries.",
    node04_action: "Inspect Hardware Rig",
    view_rig: "View Rig ↗",
    // NODE 05
    node05_domain: "SECURE STORAGE · OIP BRIEFING",
    node05_desc: "Open-source reference and briefing collateral for Secure Storage and TSMC OIP technical integration. Covering hardware Root of Trust (RoT) and memory security.",
    node05_action: "Browse Code & Briefings",
    view_repo: "View Repo ↗",
    // NODE 06
    node06_domain: "DATA INTERFACE · TERMINAL",
    node06_desc: "Open-source terminal synthesizing Taiwan market telemetry and indicator streams through modern terminal UX and Python REST data feeds.",
    node06_action: "Inspect Python CLI",
    // PHILOSOPHY
    philo_kicker: "ENGINEERING MANIFESTO",
    philo_heading: "From architecture and evidence to working systems.",
    philo_p1: "I am Sam Huang, an engineer based in Taiwan specializing in semiconductor IP architecture, secure memory design, and interactive simulation systems. Technology must transcend conceptual block diagrams to deliver verified, tangible implementations under real physical constraints.",
    philo_p2: "From non-volatile storage cell dynamics to 96GB local AI inference pipelines and multi-track educational engines, each project is a testament to rigorous engineering craft.",
    footer_desc: "Semiconductor & Systems Project Portal · Silicon IP, Secure Storage & Systems · Taiwan 2026",
    back_to_top: "TOP ↑"
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
        color: Math.random() > 0.4 ? "rgba(13, 148, 136, " : "rgba(37, 99, 235, "
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
          ctx.strokeStyle = `rgba(13, 148, 136, ${alpha})`;
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
