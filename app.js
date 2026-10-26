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
    skip_projects: "跳至專案",
    home_label: "專案入口首頁",
    nav_label: "全域導覽",
    language_label: "語言切換",
    top_label: "回到頁首",
    command_label: "搜尋與指令",
    nav_projects: "專業",
    nav_philosophy: "Contact",
    status_online: "10 專案資源",
    hero_telemetry: "PROJECT PORTAL · TAIWAN 2026 · SILICON ARCHITECTURE",
    hero_headline_1: "從架構規劃",
    hero_headline_2: "到可探索的專案",
    hero_mission: "半導體知識、工程工具與互動作品，依專業或休閒探索。",
    cta_explore: "探索專案",
    cta_github: "Contact",
    metric_nodes: "專業",
    metric_live: "休閒",
    metric_arcade: "公開入口",
    metric_tracks: "需權限",
    matrix_kicker: "知識與工程",
    matrix_title: "專業",
    matrix_subtitle: "半導體、工程參考與學習資源。",
    badge_live: "公開網站",
    badge_source: "私人儲存庫",
    node01_domain: "SEMICONDUCTOR IP · RESEARCH",
    node01_desc: "透過 OTP、MTP、eFlash、PUF 與技術文獻，探索非揮發性記憶體及安全儲存。",
    node01_action: "記憶體與安全",
    open_hub: "Open Hub",
    node02_domain: "INTERACTIVE SYSTEMS · ARCADE",
    node02_title: "多元遊戲大廳",
    node02_desc: "在瀏覽器探索棋盤、策略、空間益智與街機遊戲。",
    node02_action: "瀏覽器遊戲",
    enter_arcade: "Enter Arcade",
    node03_domain: "數理 · 程式 · 語言",
    node03_desc: "數理、程式與語言的互動練習及學習資源。",
    node03_action: "學習",
    start_learning: "Start Learning",
    node04_domain: "HARDWARE · ENGINEERING PROFILE",
    node04_desc: "開發工作站、硬體規格與本機算力配置參考。",
    node04_action: "硬體",
    view_rig: "View Rig",
    node07_domain: "SEMICONDUCTOR FAB · PROCESS HUB",
    node07_title: "Semiconductor Knowledge Hub",
    node07_desc: "從 FEOL、BEOL 到 CMOS 等整合技術，探索晶圓製造、製程整合與先進封裝。",
    node07_action: "半導體製程",
    node09_domain: "BROWSER MUSIC · CREATION STUDIO",
    node09_title: "光汐工作站",
    node09_desc: "在瀏覽器探索音色、演奏與編曲的音樂工作站。",
    node09_action: "音樂工作站",
    node10_domain: "GAME DATA · BUILD SIMULATOR",
    node10_title: "聖休亞瑞典藏中樞",
    node10_desc: "暗黑破壞神 II：獄火重生的配裝模擬，以及技能、裝備與符文之語資料入口。",
    node10_action: "D2R 資料",
    node05_domain: "私人簡報 · 本機展示",
    node05_desc: "Secure Storage／OIP 私人技術簡報與本機展示工作區，整理硬體信任根（RoT）及非揮發性記憶體安全參考架構。",
    node05_action: "私人簡報",
    view_repo: "需 GitHub 存取權限",
    node06_domain: "私人介面原型 · 模擬資料",
    node06_desc: "私人模擬資料介面原型，非目前 Stock Terminal，沒有真實行情服務；需 GitHub 存取權限。",
    node06_tag_modules: "私人原型",
    node06_tag_data: "模擬資料",
    node06_tag_prototype: "介面原型",
    node06_action: "模擬資料",
    node08_title: "光榮武將臉譜（私人）",
    node08_domain: "武將臉譜 · 私人典藏",
    node08_desc: "私人武將臉譜典藏，限擁有者登入；本頁僅提供入口。",
    node08_action: "私人典藏",
    badge_private_site: "私人網站",
    owner_login: "限擁有者登入",
    philo_kicker: "CONTACT",
    philo_heading: "Sam Huang",
    philo_p1: "透過公開 GitHub 個人頁查看專案紀錄與原始碼。",
    philo_p2: "作品涵蓋公開網站、私人簡報與介面原型；私人資源仍需權限。",
    footer_desc: "半導體 · 工程 · 互動專案",
    back_to_top: "TOP",
    page_title: "半導體與系統｜專案入口",
    page_description: "知識、工程、學習、音樂與遊戲，依專業與休閒整理入口。",
    brand_title: "專案入口",
    nav_leisure: "休閒",
    leisure_kicker: "音樂與遊戲",
    leisure_title: "休閒",
    leisure_subtitle: "聲音探索、瀏覽器遊戲與 D2R 資料工具。",
    private_title: "私人工作區",
    private_note: "需存取權限，以下資源僅供具權限者使用。",
    contact_github: "GitHub 個人頁",
    footer_title: "專案入口",
    scroll_projects: "往下探索專案",
    node01_role: "記憶體與安全",
    node07_role: "半導體製程",
    node03_role: "學習",
    node04_role: "硬體",
    node09_role: "音樂工作站",
    node02_role: "瀏覽器遊戲",
    node10_role: "D2R 資料",
    node05_role: "私人簡報",
    node06_role: "模擬資料",
    node08_role: "私人典藏",
    node01_tag0: "OTP / MTP",
    node01_tag1: "eFlash",
    node01_tag2: "PUF",
    node07_tag0: "FEOL / BEOL",
    node07_tag1: "製程整合",
    node07_tag2: "封裝",
    node03_tag0: "數理",
    node03_tag1: "程式",
    node03_tag2: "語言",
    node04_tag0: "工作站",
    node04_tag1: "硬體規格",
    node04_tag2: "本機算力",
    node09_tag0: "音色設計",
    node09_tag1: "演奏",
    node09_tag2: "編曲",
    node02_tag0: "棋盤",
    node02_tag1: "策略",
    node02_tag2: "益智",
    node10_tag0: "技能",
    node10_tag1: "裝備",
    node10_tag2: "符文之語",
    node05_tag0: "安全儲存",
    node05_tag1: "NVM",
    node05_tag2: "私人",
    node06_tag0: "模擬資料",
    node06_tag1: "原型",
    node06_tag2: "私人",
    node08_tag0: "武將臉譜",
    node08_tag1: "私人典藏",
    lang_zh: "繁中"
  },
  en: {
    brand_sub: "Silicon IP · Systems Architecture",
    skip_projects: "Skip to projects",
    home_label: "Project portal home",
    nav_label: "Main navigation",
    language_label: "Language",
    top_label: "Back to top",
    command_label: "Search & commands",
    nav_projects: "Professional",
    nav_philosophy: "Contact",
    status_online: "10 Resources",
    hero_telemetry: "PROJECT PORTAL · TAIWAN 2026 · SILICON ARCHITECTURE",
    hero_headline_1: "From Architecture",
    hero_headline_2: "To Working Projects",
    hero_mission: "Semiconductor knowledge, engineering tools and interactive projects. Browse by Professional or Leisure.",
    cta_explore: "Explore projects",
    cta_github: "Contact",
    metric_nodes: "Professional",
    metric_live: "Leisure",
    metric_arcade: "Public",
    metric_tracks: "Restricted",
    matrix_kicker: "KNOWLEDGE & ENGINEERING",
    matrix_title: "Professional",
    matrix_subtitle: "Semiconductors, engineering references and learning resources.",
    badge_live: "PUBLIC WEBSITE",
    badge_source: "PRIVATE REPOSITORY",
    node01_domain: "SEMICONDUCTOR IP · RESEARCH",
    node01_desc: "Explore non-volatile memory and secure storage through OTP, MTP, eFlash, PUF and technical literature.",
    node01_action: "MEMORY & SECURITY",
    open_hub: "Open Hub",
    node02_domain: "INTERACTIVE SYSTEMS · ARCADE",
    node02_title: "Interactive Game Arcade",
    node02_desc: "Board games, strategy, spatial puzzles and arcade experiences in the browser.",
    node02_action: "BROWSER GAMES",
    enter_arcade: "Enter Arcade",
    node03_domain: "STEM · COMPUTING · LANGUAGES",
    node03_desc: "Interactive practice and learning resources across STEM, computing and languages.",
    node03_action: "LEARNING",
    start_learning: "Start Learning",
    node04_domain: "HARDWARE · ENGINEERING PROFILE",
    node04_desc: "Development workstations, hardware specifications and local compute references.",
    node04_action: "HARDWARE",
    view_rig: "View Rig",
    node07_domain: "SEMICONDUCTOR FAB · PROCESS HUB",
    node07_title: "Semiconductor Knowledge Hub",
    node07_desc: "Wafer fabrication, process integration and advanced packaging, from FEOL and BEOL to CMOS and beyond.",
    node07_action: "SEMICONDUCTOR PROCESS",
    node09_domain: "BROWSER MUSIC · CREATION STUDIO",
    node09_title: "Guangxi Studio",
    node09_desc: "A browser music workstation for exploring sound, playing and arranging musical ideas.",
    node09_action: "MUSIC STUDIO",
    node10_domain: "GAME DATA · BUILD SIMULATOR",
    node10_title: "D2R Sanctuary Codex",
    node10_desc: "Build simulation and references for Diablo II: Resurrected skills, equipment and runewords.",
    node10_action: "D2R REFERENCE",
    node05_domain: "PRIVATE BRIEFINGS · LOCAL DEMOS",
    node05_desc: "Private Secure Storage/OIP briefings and a local demo workspace for hardware Root of Trust and NVM security reference architectures.",
    node05_action: "PRIVATE BRIEFINGS",
    view_repo: "GitHub Access Required",
    node06_domain: "PRIVATE UI PROTOTYPE · SIMULATED DATA",
    node06_desc: "A private simulated-data interface prototype, separate from the current Stock Terminal. No live market data; GitHub access required.",
    node06_tag_modules: "Private prototype",
    node06_tag_data: "Simulated Data",
    node06_tag_prototype: "Interface Prototype",
    node06_action: "SIMULATED DATA",
    node08_title: "Portrait Archive (Private)",
    node08_domain: "PORTRAITS · PRIVATE COLLECTION",
    node08_desc: "Private character portrait collection. Owner sign-in required; this page provides only the entry point.",
    node08_action: "PRIVATE ARCHIVE",
    badge_private_site: "PRIVATE SITE",
    owner_login: "Owner sign-in required",
    philo_kicker: "CONTACT",
    philo_heading: "Sam Huang",
    philo_p1: "Project notes and source repositories are available through the public GitHub profile.",
    philo_p2: "Projects span public websites, private briefings and interface prototypes. Private resources require permission.",
    footer_desc: "Semiconductors · Engineering · Interactive projects",
    back_to_top: "TOP",
    page_title: "Semiconductor & Systems | Project Portal",
    page_description: "Knowledge, engineering, learning, music and games — organized into Professional and Leisure.",
    brand_title: "PROJECT PORTAL",
    nav_leisure: "Leisure",
    leisure_kicker: "MUSIC & GAMES",
    leisure_title: "Leisure",
    leisure_subtitle: "Sound exploration, browser games and D2R reference tools.",
    private_title: "Private workspace",
    private_note: "Access required. These resources are for authorized users only.",
    contact_github: "GitHub profile",
    footer_title: "PROJECT PORTAL",
    scroll_projects: "SCROLL TO PROJECTS",
    node01_role: "MEMORY & SECURITY",
    node07_role: "SEMICONDUCTOR PROCESS",
    node03_role: "LEARNING",
    node04_role: "HARDWARE",
    node09_role: "MUSIC STUDIO",
    node02_role: "BROWSER GAMES",
    node10_role: "D2R REFERENCE",
    node05_role: "PRIVATE BRIEFINGS",
    node06_role: "SIMULATED DATA",
    node08_role: "PRIVATE ARCHIVE",
    node01_tag0: "OTP / MTP",
    node01_tag1: "eFlash",
    node01_tag2: "PUF",
    node07_tag0: "FEOL / BEOL",
    node07_tag1: "Process integration",
    node07_tag2: "Packaging",
    node03_tag0: "STEM",
    node03_tag1: "Computing",
    node03_tag2: "Languages",
    node04_tag0: "Workstations",
    node04_tag1: "Hardware specs",
    node04_tag2: "Local compute",
    node09_tag0: "Sound design",
    node09_tag1: "Playing",
    node09_tag2: "Arrangement",
    node02_tag0: "Board games",
    node02_tag1: "Strategy",
    node02_tag2: "Puzzles",
    node10_tag0: "Skills",
    node10_tag1: "Equipment",
    node10_tag2: "Runewords",
    node05_tag0: "Secure storage",
    node05_tag1: "NVM",
    node05_tag2: "Private",
    node06_tag0: "Simulated data",
    node06_tag1: "Prototype",
    node06_tag2: "Private",
    node08_tag0: "Portraits",
    node08_tag1: "Private archive",
    lang_zh: "ZH"
  }
};

let currentLang = "en";

function applyLanguage(lang, persist = true) {
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

  document.title = dict.page_title;
  document.querySelector('meta[name="description"]').content = dict.page_description;
  document.querySelector('meta[property="og:title"]').content = dict.page_title;
  document.querySelector('meta[property="og:description"]').content = dict.page_description;
  if (persist) {
    try { localStorage.setItem('portal_language_choice_v1', JSON.stringify({language:lang,source:'explicit'})); } catch {}
    const url=new URL(location.href);url.searchParams.set('lang',lang);history.replaceState(null,'',url);
  }
}

window.toggleLanguage = () => applyLanguage(currentLang === "zh" ? "en" : "zh");

function initLanguage() {
  const query=new URLSearchParams(location.search).get('lang');
  if(query==='en'||query==='zh')currentLang=query;
  else {
    try {const saved=JSON.parse(localStorage.getItem('portal_language_choice_v1'));if(saved?.source==='explicit'&&(saved.language==='en'||saved.language==='zh'))currentLang=saved.language;} catch {}
  }
  applyLanguage(currentLang, false);

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
  const categoryLinks = header.querySelectorAll(".category-link");
  const currentCategory = () => {
    const aliases = { "#knowledge":"#professional", "#engineering":"#professional", "#creative":"#leisure", "#philosophy":"#contact", "#about":"#contact" };
    const target = aliases[location.hash] || location.hash;
    categoryLinks.forEach(link => {
      if (link.getAttribute("href") === target) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };
  window.addEventListener("hashchange", currentCategory);
  currentCategory();
  const revealPhilosophy = () => {
    if (["#philosophy", "#contact", "#about"].includes(location.hash)) {
      document.querySelector("#contact .philosophy-disclosure").open = true;
      document.getElementById("contact").scrollIntoView();
    }
  };
  document.querySelectorAll('a[href="#contact"]').forEach(link => link.addEventListener("click", () => {
    document.querySelector("#contact .philosophy-disclosure").open = true;
  }));
  window.addEventListener("hashchange", revealPhilosophy);
  revealPhilosophy();
  // Align published bookmarks after the original web fonts set the header height.
  document.fonts.ready.then(() => requestAnimationFrame(() => {
    if (["#knowledge", "#engineering", "#creative"].includes(location.hash)) {
      document.documentElement.style.setProperty("--header-height", header.getBoundingClientRect().height + "px");
      document.querySelector(location.hash).scrollIntoView();
    }
  }));
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
