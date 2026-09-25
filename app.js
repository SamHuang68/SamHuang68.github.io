/**
 * @fileoverview Sam Huang Project Portal ??Application Runtime
 * Semiconductor & Systems Portal with Interactive Silicon Canvas,
 * Bilingual i18n (ZH/EN), Card Specular Tracking, and Telemetry Counters.
 */

"use strict";

/* ??????????????????????????????????????????????????????????????????????????????
   ??閰 (BILINGUAL DICTIONARY - TRADITIONAL CHINESE / ENGLISH)
   ?????????????????????????????????????????????????????????????????????????????? */
const I18N = {
  zh: {
    brand_sub: "??擃?IP 繚 蝟餌絞?嗆?",
    nav_projects: "撠??拚",
    nav_philosophy: "?嗆??脣飛",
    status_online: "6 蝭暺停蝺?,
    hero_telemetry: "PROJECT PORTAL 繚 TAIWAN 2026 繚 SILICON ARCHITECTURE",
    hero_headline_1: "敺瑽???,
    hero_headline_2: "?啁?甇??瑁??頂蝯?,
    hero_mission: "?游? Silicon IP???典摮?Secure Storage嚗??AI ???嗆????芋?砍極蝔??祇??銵??嗚誑撖西??豢???撖阡?銵皞???,
    cta_explore: "?Ｙ揣撠?蝭暺?,
    cta_github: "GitHub 蝮質汗 ??,
    metric_nodes: "蝟餌絞蝭暺?(Nodes)",
    metric_live: "蝺?撖阡??? (Live Web)",
    metric_arcade: "銵???撘???(Engines)",
    metric_tracks: "憭??摮貊? (Tracks)",
    matrix_kicker: "ACTIVE PRODUCTION HUBS & CODEBASES",
    matrix_title: "?剖之?詨?撠??拚",
    matrix_subtitle: "瘥???暺??箏歇?澆?銝?蝥雁霅瑚??舐蝡?蝞頂蝯梧?瘨菔??脣?撠?????????啁隞???瑽?,
    badge_live: "?臬銵雯蝡?繚 LIVE WEB",
    badge_source: "??Git 撠? 繚 SOURCE ONLY",
    // NODE 01
    node01_domain: "SEMICONDUCTOR IP 繚 RESEARCH",
    node01_desc: "?游? Secure Storage?I ?誨?脰ˊ蝔??刻? NVM ?賜?詨極雿恕???游?撠??弦??嗚頂蝯勗??圾 OTP?TP?Flash ??PUF 蝑敹瑽?,
    node01_action: "?脣??擃霅???,
    open_hub: "?脣???Open Hub",
    // NODE 02
    node02_domain: "INTERACTIVE SYSTEMS 繚 ARCADE",
    node02_title: "憭??憭批輒",
    node02_desc: "瘨菔? 3D 璉撠????交芋?研儔?方?璈?隡??蝑?21 甈曆蜓憿???鈭???摩嚗?豢?函??垢擃??賢?敶Ｚ??唾?撖虫???,
    node02_action: "???璅⊥憭批輒",
    enter_arcade: "?脣憭批輒 Enter Arcade",
    // NODE 03
    node03_domain: "LEARNING ENGINE 繚 8 TRACKS",
    node03_desc: "?詨飛?凝蝛????摮詻?蝞?璁??隤????箇?航?嚗頠??瞍賊脣?隤摮貊?撘????嗆?蝞?撖虫???,
    node03_action: "???芯蜓摮貊?撘?",
    start_learning: "??摮貊? Start Learning",
    // NODE 04
    node04_domain: "HARDWARE 繚 ENGINEERING PROFILE",
    node04_desc: "AI 撌乩?蝡?Intel Core Ultra 9 285H嚗TX 5080 eGPU??6GB RAM ??啣??極蝔′擃??Ｚ??潛??臭??炎閬???????皜???,
    node04_action: "瑼Ｚ??祆?蝖祇??蔭",
    view_rig: "?亦?蝖祇? View Rig",
    // NODE 05
    node05_domain: "SECURE STORAGE 繚 OIP BRIEFING",
    node05_desc: "Secure Storage ?蝛 OIP ?銵????祇???蝣潦?銵陛?梯?蝖祇?摰?嗆?撖虫??閮′擃靽∩遙嚗oT嚗?閮擃?摰蝳艾?,
    node05_action: "?汗?銵澈?陛??,
    view_repo: "?亦???蝣?View Repo",
    // NODE 06
    node06_domain: "DATA INTERFACE 繚 TERMINAL",
    node06_desc: "隞亦?蝡臬隞方?敶?蝯?????閮??銵???Ｙ??? Python/Web 撠???憭??豢?瘚??擃?閮?摨衣??單?蝯垢?銵具?,
    node06_action: "瑼Ｚ? Python 蝯垢撖虫?",
    // PHILOSOPHY
    philo_kicker: "ENGINEERING MANIFESTO",
    philo_heading: "敺瑽?霅?嚗粥?啣隞乩蝙?函?????,
    philo_p1: "? Sam Huang嚗?啁撠釣?澆?撠? IP ?嗆????典摮′擃身閮??芯蜓摮貊?璅⊥蝟餌絞??銵?閰脣?舀?敶梁?銝??孵??????瑕??Ⅱ????嗉????葫閰虫???銝行?蝯?啁瘥犖?質撖行????頂蝯晞?,
    philo_p2: "敺?箄瓷?摮?銵??啁垢 96GB 憭批捆??AI ?刻??啣?嚗?澆?飛??璅??怨?摮貊?撘???銝??獢?臬????釭撌亦??賢???瑁?撖西???,
    footer_desc: "??擃?蝟餌絞撠??亙 繚 Silicon IP, Secure Storage & Systems 繚 Taiwan 2026",
    back_to_top: "??垢 TOP"
  },
  en: {
    brand_sub: "Silicon IP 繚 Systems Architecture",
    nav_projects: "Projects",
    nav_philosophy: "Philosophy",
    status_online: "6 Nodes Ready",
    hero_telemetry: "PROJECT PORTAL 繚 TAIWAN 2026 繚 SILICON ARCHITECTURE",
    hero_headline_1: "From Architecture",
    hero_headline_2: "To Verifiable Working Systems",
    hero_mission: "A unified technical portal synthesizing Silicon IP, Secure Storage, local AI acceleration, and interactive systems. Grounded in empirical evidence and production-grade execution.",
    cta_explore: "Explore Project Nodes",
    cta_github: "GitHub Overview ??,
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
    node01_domain: "SEMICONDUCTOR IP 繚 RESEARCH",
    node01_desc: "Comprehensive semiconductor research hub integrating Secure Storage, AI-era nodes, and NVM Whitepaper Studio. Rigorously analyzing OTP, MTP, eFlash, and PUF architectures.",
    node01_action: "Enter Research Portal",
    open_hub: "Open Hub ??,
    // NODE 02
    node02_domain: "INTERACTIVE SYSTEMS 繚 ARCADE",
    node02_title: "Interactive Game Arcade",
    node02_desc: "Interactive suite featuring 21 titles across 3D chess, strategy simulations, retro arcade, and brain teasers. Built purely on modern web canvas and Web Audio engines.",
    node02_action: "Launch Arcade Suite",
    enter_arcade: "Enter Arcade ??,
    // NODE 03
    node03_domain: "LEARNING ENGINE 繚 8 TRACKS",
    node03_desc: "Eight progressive study tracks: Taiwan Math, Calculus, Physics, Chemistry, CS, Japanese, TOEIC, and Mandarin, powered by adaptive memory algorithms.",
    node03_action: "Start Learning Engine",
    start_learning: "Start Learning ??,
    // NODE 04
    node04_domain: "HARDWARE 繚 ENGINEERING PROFILE",
    node04_desc: "Interactive hardware inventory detailing local Intel Core Ultra 9 285H AI rig, RTX 5080 eGPU dock, 96GB RAM dev workspace, and schedulable compute boundaries.",
    node04_action: "Inspect Hardware Rig",
    view_rig: "View Rig ??,
    // NODE 05
    node05_domain: "SECURE STORAGE 繚 OIP BRIEFING",
    node05_desc: "Open-source reference and briefing collateral for Secure Storage and TSMC OIP technical integration. Covering hardware Root of Trust (RoT) and memory security.",
    node05_action: "Browse Code & Briefings",
    view_repo: "View Repo ??,
    // NODE 06
    node06_domain: "DATA INTERFACE 繚 TERMINAL",
    node06_desc: "Open-source terminal synthesizing Taiwan market telemetry and indicator streams through modern terminal UX and Python REST data feeds.",
    node06_action: "Inspect Python CLI",
    // PHILOSOPHY
    philo_kicker: "ENGINEERING MANIFESTO",
    philo_heading: "From architecture and evidence to working systems.",
    philo_p1: "I am Sam Huang, an engineer based in Taiwan specializing in semiconductor IP architecture, secure memory design, and interactive simulation systems. Technology must transcend conceptual block diagrams to deliver verified, tangible implementations under real physical constraints.",
    philo_p2: "From non-volatile storage cell dynamics to 96GB local AI inference pipelines and multi-track educational engines, each project is a testament to rigorous engineering craft.",
    footer_desc: "Semiconductor & Systems Project Portal 繚 Silicon IP, Secure Storage & Systems 繚 Taiwan 2026",
    back_to_top: "TOP ??
  }
};

let currentLang = "zh";

/**
 * 靘?隤頂?湔?銝???data-i18n ??
 * @param {string} lang - 'zh' ??'en'
 */
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
    // 敹賜?梁?璅∪??
  }
}

/**
 * ????閮?豢??? */
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

/* ??????????????????????????????????????????????????????????????????????????????
   鈭株??擃縑?撣?(INTERACTIVE SILICON SIGNAL CANVAS)
   ?冽滓?脰??臭?瘚?蝎曄敦?凝撠??頝航?銵?蝯??株矽嚗?   ?????????????????????????????????????????????????????????????????????????????? */
function initSiliconCanvas() {
  const canvas = document.getElementById("silicon-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let animationFrameId = null;

  // 蝭暺??  const nodes = [];
  const maxNodes = 48;
  const connectDistance = 140;

  // 皛?鈭?摨扳?
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

    // ?湔蝭暺?蝵?    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      node.x += node.vx;
      node.y += node.vy;

      if (node.x < 0) node.x = width;
      if (node.x > width) node.x = 0;
      if (node.y < 0) node.y = height;
      if (node.y > height) node.y = 0;

      // ??曌???敺格???      const dxMouse = node.x - mouse.x;
      const dyMouse = node.y - mouse.y;
      const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
      if (distMouse < mouse.radius && distMouse > 0) {
        const force = (1 - distMouse / mouse.radius) * 1.5;
        node.x += (dxMouse / distMouse) * force;
        node.y += (dyMouse / distMouse) * force;
      }
    }

    // 蝜芾ˊ敺桀?蝺?? (Circuit Traces)
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

    // 蝜芾ˊ??擃?暺??    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color + node.baseAlpha + ")";
      ctx.fill();
    }

    animationFrameId = requestAnimationFrame(drawScene);
  }

  // 皛???
  window.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }, { passive: true });

  window.addEventListener("mouseleave", () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  // 蝭?質??⊿?蝷?  document.addEventListener("visibilitychange", () => {
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

/* ??????????????????????????????????????????????????????????????????????????????
   ?詨???? (TELEMETRY COUNTER ANIMATION)
   ?????????????????????????????????????????????????????????????????????????????? */
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
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(start + (end - start) * eased);
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  requestAnimationFrame(update);
}

/* ??????????????????????????????????????????????????????????????????????????????
   皛??⊿擃?餈質馱 (CARD SPECULAR GLOW TRACKING)
   ?????????????????????????????????????????????????????????????????????????????? */
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

/* ??????????????????????????????????????????????????????????????????????????????
   ?脣?????典?閬賢????(SCROLL REVEAL & HEADER MORPH)
   ?????????????????????????????????????????????????????????????????????????????? */
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

  // ?脣?瘛∪
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

/* ??????????????????????????????????????????????????????????????????????????????
   ?蝔??? (BOOTSTRAP)
   ?????????????????????????????????????????????????????????????????????????????? */
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
