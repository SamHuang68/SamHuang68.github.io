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
    skip_projects: "跳至主要專案矩陣",
    home_label: "Sam Huang 首頁",
    nav_label: "全域導覽",
    language_label: "語言切換",
    top_label: "回到頁首",
    command_label: "搜尋與指令",
    nav_projects: "專案矩陣",
    nav_philosophy: "架構哲學",
    status_online: "10 專案資源",
    hero_telemetry: "PROJECT PORTAL · TAIWAN 2026 · SILICON ARCHITECTURE",
    hero_headline_1: "從架構規劃",
    hero_headline_2: "到真正可執行的系統",
    hero_mission: "整合 Silicon IP、安全儲存（Secure Storage）、本地 AI 運算架構與互動模擬工程的公開技術門戶，以實證數據與真實運行為準則。",
    cta_explore: "探索專案節點",
    cta_github: "GitHub 總覽 ↗",
    metric_nodes: "Project Nodes",
    metric_live: "Live Hubs",
    metric_arcade: "Engines",
    metric_tracks: "Study Tracks",
    matrix_kicker: "[01 // REPOSITORIES & HUBS]",
    matrix_title: "十大核心專案矩陣",
    matrix_subtitle: "七個公開網站與三個私人專案資源，涵蓋半導體製造、非揮發性記憶體、本機 AI 算力、互動介面、瀏覽器音樂創作與遊戲資料工具。",
    badge_live: "LIVE WEB PORTAL",
    badge_source: "私人儲存庫",
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
    // NODE 07
    node07_domain: "SEMICONDUCTOR FAB · PROCESS HUB",
    node07_title: "Semiconductor Knowledge Hub",
    node07_desc: "從沙子到晶片的完整晶圓製造旅程，涵蓋 FEOL/BEOL 模組、CMOS/FinFET/GAA 整合、良率量測與 CoWoS/SoIC 先進封裝。",
    node07_action: "NODE://SEMI-HUB",
    // NODE 09
    node09_domain: "BROWSER MUSIC · CREATION STUDIO",
    node09_title: "光汐工作站",
    node09_desc: "在瀏覽器完成音色設計、演奏、八軌編曲、混音與母帶；作品保存在本機瀏覽器，可匯出 WAV、MIDI 與作品包。",
    node09_action: "NODE://GUANGXI-STUDIO",
    // NODE 10
    node10_domain: "GAME DATA · BUILD SIMULATOR",
    node10_title: "聖休亞瑞典藏中樞",
    node10_desc: "暗黑破壞神 II：獄火重生的繁體中文配裝模擬器與資料庫；屬性、技能與裝備由遊戲資料表計算，含套裝、符文之語、MF 與減傷配裝、斷點與聖杯追蹤。",
    node10_action: "NODE://D2R-CODEX",
    // NODE 05
    node05_domain: "私人簡報 · 本機展示",
    node05_desc: "Secure Storage／OIP 私人技術簡報與本機展示工作區，整理硬體信任根（RoT）及非揮發性記憶體安全參考架構。",
    node05_action: "NODE://OIP-BRIEFING",
    view_repo: "需 GitHub 存取權限",
    // NODE 06
    node06_domain: "私人介面原型 · 模擬資料",
    node06_desc: "私人終端介面原型，包含 13 個模組，僅使用模擬資料展示台灣市場觀測介面；未提供真實行情服務。",
    node06_tag_modules: "13 個模組",
    node06_tag_data: "模擬資料",
    node06_tag_prototype: "介面原型",
    node06_action: "NODE://TW-PULSE",
    // NODE 08：私人臉譜網站
    node08_title: "光榮武將臉譜（私人）",
    node08_domain: "武將臉譜 · 私人典藏",
    node08_desc: "光榮武將臉譜私人網站，限擁有者登入後使用；此公開主頁僅提供入口。",
    node08_action: "私人典藏入口",
    badge_private_site: "私人網站",
    owner_login: "限擁有者登入",
    // PHILOSOPHY
    philo_kicker: "ENGINEERING MANIFESTO",
    philo_heading: "從架構與證據，走到可以使用的成果。",
    philo_p1: "我是 Sam Huang，在台灣專注於半導體 IP 架構、安全儲存硬體設計與自主學習模擬系統。",
    philo_p2: "專案涵蓋已發布網站、私人技術簡報與介面原型。",
    footer_desc: "半導體與系統專案入口 · Silicon IP, Secure Storage & Systems · Taiwan 2026",
    back_to_top: "TOP"
  },
  en: {
    brand_sub: "Silicon IP · Systems Architecture",
    skip_projects: "Skip to project matrix",
    home_label: "Sam Huang home",
    nav_label: "Main navigation",
    language_label: "Language",
    top_label: "Back to top",
    command_label: "Search & commands",
    nav_projects: "Projects",
    nav_philosophy: "Philosophy",
    status_online: "10 Resources",
    hero_telemetry: "PROJECT PORTAL · TAIWAN 2026 · SILICON ARCHITECTURE",
    hero_headline_1: "From Architecture",
    hero_headline_2: "To Verifiable Working Systems",
    hero_mission: "A unified technical portal for Silicon IP, Secure Storage, local AI compute, and interactive systems—grounded in empirical evidence.",
    cta_explore: "Explore Project Nodes",
    cta_github: "GitHub Overview ↗",
    metric_nodes: "Project Nodes",
    metric_live: "Live Hubs",
    metric_arcade: "Engines",
    metric_tracks: "Study Tracks",
    matrix_kicker: "[01 // REPOSITORIES & HUBS]",
    matrix_title: "Core Project Matrix",
    matrix_subtitle: "Seven public websites and three private project resources spanning semiconductor manufacturing, NVM IP, local AI compute, interactive systems, in-browser music creation, and game data tools.",
    badge_live: "LIVE WEB PORTAL",
    badge_source: "PRIVATE REPOSITORY",
    // NODE 01
    node01_domain: "SEMICONDUCTOR IP · RESEARCH",
    node01_desc: "Semiconductor research portal for Secure Storage and advanced nodes, covering OTP, MTP, eFlash, and PUF IP.",
    node01_action: "NODE://NVM-HUB",
    open_hub: "Open Hub",
    // NODE 02
    node02_domain: "INTERACTIVE SYSTEMS · ARCADE",
    node02_title: "Interactive Game Arcade",
    node02_desc: "21 playable web titles across 3D chess, tabletop strategy, spatial puzzles, and arcade action.",
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
    // NODE 07
    node07_domain: "SEMICONDUCTOR FAB · PROCESS HUB",
    node07_title: "Semiconductor Knowledge Hub",
    node07_desc: "The journey from sand to silicon: covering FEOL/BEOL process modules, CMOS/FinFET/GAA integration, yield metrology, and CoWoS/SoIC advanced packaging.",
    node07_action: "NODE://SEMI-HUB",
    // NODE 09
    node09_domain: "BROWSER MUSIC · CREATION STUDIO",
    node09_title: "Guangxi Studio",
    node09_desc: "An in-browser music workstation for sound design, live playing, eight-track arrangement, mixing, and mastering; projects stay in the browser and export to WAV, MIDI, and project bundles.",
    node09_action: "NODE://GUANGXI-STUDIO",
    // NODE 10
    node10_domain: "GAME DATA · BUILD SIMULATOR",
    node10_title: "D2R Sanctuary Codex",
    node10_desc: "A Traditional Chinese build simulator and database for Diablo II: Resurrected; stats, skills, and gear are computed from the game's own data tables, with set bonuses, runewords, MF and damage-reduction builds, breakpoints, and a Holy Grail tracker.",
    node10_action: "NODE://D2R-CODEX",
    // NODE 05
    node05_domain: "PRIVATE BRIEFINGS · LOCAL DEMOS",
    node05_desc: "Private Secure Storage/OIP briefings and a local demo workspace for hardware Root of Trust and NVM security reference architectures.",
    node05_action: "NODE://OIP-BRIEFING",
    view_repo: "GitHub Access Required",
    // NODE 06
    node06_domain: "PRIVATE UI PROTOTYPE · SIMULATED DATA",
    node06_desc: "Private terminal interface prototype with 13 modules and simulated data only; it does not provide a live market data service.",
    node06_tag_modules: "13 Modules",
    node06_tag_data: "Simulated Data",
    node06_tag_prototype: "Interface Prototype",
    node06_action: "NODE://TW-PULSE",
    // NODE 08：私人臉譜網站
    node08_title: "光榮武將臉譜（私人）",
    node08_domain: "武將臉譜 · 私人典藏",
    node08_desc: "光榮武將臉譜私人網站，限擁有者登入後使用；此公開主頁僅提供入口。",
    node08_action: "私人典藏入口",
    badge_private_site: "私人網站",
    owner_login: "限擁有者登入",
    // PHILOSOPHY
    philo_kicker: "ENGINEERING MANIFESTO",
    philo_heading: "From architecture and evidence to working systems.",
    philo_p1: "I am Sam Huang, an engineer in Taiwan specializing in semiconductor IP architecture and secure memory systems.",
    philo_p2: "Projects span published websites, private technical briefings, and interface prototypes.",
    footer_desc: "Semiconductor & Systems Project Portal · Silicon IP, Secure Storage & Systems · Taiwan 2026",
    back_to_top: "TOP"
  }
};

let currentLang = "zh";

function applyLanguage(lang) {
  const dict = I18N[lang];
  if (!dict) return;
  currentLang = lang;

  document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
  document.documentElement.setAttribute("data-lang", lang);

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key] !== undefined) {
      el.textContent = dict[key];
    }
  });

  document.querySelectorAll("[data-i18n-label]").forEach((el) => {
    el.setAttribute("aria-label", dict[el.dataset.i18nLabel]);
  });
  document.querySelectorAll(".node-card").forEach((card) => {
    const title = card.querySelector(".node-headline").textContent;
    const actionLabel = dict[card.dataset.actionI18n] ?? (card.querySelector(".badge-source") ? dict.view_repo : (lang === "zh" ? "開啟網站" : "Open website"));
    card.setAttribute("aria-label", `${title} — ${actionLabel}`);
  });
  document.dispatchEvent(new Event("portal-languagechange"));

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

window.toggleLanguage = () => applyLanguage(currentLang === "zh" ? "en" : "zh");

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
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

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
    animationFrameId = null;
    if (motionPreference.matches || document.hidden) return;
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

  function updateMotion() {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    canvas.style.display = motionPreference.matches ? "none" : "";
    if (!motionPreference.matches && !document.hidden) {
      animationFrameId = requestAnimationFrame(drawScene);
    }
  }
  document.addEventListener("visibilitychange", updateMotion);
  motionPreference.addEventListener("change", updateMotion);
  window.addEventListener("resize", resizeCanvas, { passive: true });
  resizeCanvas();
  updateMotion();
}

function initTelemetryCounters() {
  const targets = document.querySelectorAll("[data-count]");
  if (!targets.length) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    targets.forEach((el) => {
      const targetValue = parseInt(el.getAttribute("data-count"), 10);
      if (!isNaN(targetValue)) el.textContent = String(targetValue);
    });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const targetValue = parseInt(el.getAttribute("data-count"), 10);
        if (!isNaN(targetValue)) {
          animateValue(el, 0, targetValue, 900);
          observer.unobserve(el);
        }
      }
    });
  }, { threshold: 0.4 });

  targets.forEach((el) => observer.observe(el));
}

function animateValue(element, start, end, duration) {
  const startTime = performance.now();
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  function update(now) {
    if (motionPreference.matches) {
      element.textContent = String(end);
      return;
    }
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

function initNavigation() {
  const header = document.getElementById("site-header");
  new ResizeObserver(() => {
    document.documentElement.style.setProperty("--header-height", header.getBoundingClientRect().height + "px");
  }).observe(header);
  const revealPhilosophy = () => {
    if (location.hash === "#philosophy") {
      document.querySelector(".philosophy-disclosure").open = true;
      document.getElementById("philosophy").scrollIntoView();
    }
  };
  document.querySelector('a[href="#philosophy"]').addEventListener("click", () => {
    document.querySelector(".philosophy-disclosure").open = true;
  });
  window.addEventListener("hashchange", revealPhilosophy);
  revealPhilosophy();
  document.querySelectorAll(".node-card").forEach(card => {
    card.addEventListener("focus", () => requestAnimationFrame(() => {
      if (document.activeElement !== card) return;
      const title = card.querySelector(".node-headline").getBoundingClientRect();
      const obstruction = getComputedStyle(header).position === "sticky" ? header.getBoundingClientRect().bottom : 0;
      if (title.top < obstruction || title.bottom > window.innerHeight) {
        card.scrollIntoView({ block: "start", behavior: "instant" });
      }
    }));
  });
  document.getElementById("commandTrigger").addEventListener("click", event => window.openCommandPalette(event.currentTarget));
}

function bootstrap() {
  initLanguage();
  initNavigation();
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
