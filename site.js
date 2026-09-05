/**
 * Sam Huang Portal · site.js (v20260905-bilingual-v5)
 * 高可靠純前端雙語切換引擎與卡片過濾
 */
(() => {
  document.documentElement.classList.add('js-ready');

  // 1. 年份自動化
  const year = document.querySelector('[data-current-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  // 2. 卡片觸控與點擊微反饋 (嚴格維持 querySelectorAll('.portal-card'))
  const cards = [...document.querySelectorAll('.portal-card')];
  cards.forEach((card) => {
    card.addEventListener('pointerdown', () => card.classList.add('is-pressed'));
    card.addEventListener('pointerup', () => card.classList.remove('is-pressed'));
    card.addEventListener('pointercancel', () => card.classList.remove('is-pressed'));
    card.addEventListener('pointerleave', () => card.classList.remove('is-pressed'));
  });

  // 3. 雙語架構與持久化 (Bilingual Engine)
  const STORAGE_KEY = 'portal_language';
  const NVM_HUB_KEY = 'nvm-hub-language';

  const CARD_LABELS = {
    zh: [
      '進入 NVM Knowledge Hub，可執行研究與白皮書入口',
      '進入多元遊戲大廳，可執行互動遊戲網站',
      '進入 E-Learning，可執行學習網站',
      '進入 Hardware Profile，可執行硬體網站',
      '查看 Secure Storage OIP Briefing Git 原始碼專案',
      '查看 TW Pulse Terminal Git 原始碼專案'
    ],
    en: [
      'Enter NVM Knowledge Hub, runnable research and whitepaper portal',
      'Enter Interactive Game Arcade, runnable interactive gaming platform',
      'Enter E-Learning, runnable modular learning platform',
      'Enter Hardware Profile, runnable hardware and workstation rig specifications',
      'View Secure Storage OIP Briefing Git repository',
      'View TW Pulse Terminal Git repository'
    ]
  };

  const getStoredLanguage = () => {
    try {
      return localStorage.getItem(STORAGE_KEY) || localStorage.getItem(NVM_HUB_KEY) || 'zh';
    } catch {
      return 'zh';
    }
  };

  window.setSiteLanguage = (lang, persist = true) => {
    const target = lang === 'en' ? 'en' : 'zh';
    document.documentElement.setAttribute('data-language', target);
    if (document.body) {
      document.body.setAttribute('data-language', target);
    }
    document.documentElement.lang = target === 'zh' ? 'zh-Hant' : 'en';

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, target);
        localStorage.setItem(NVM_HUB_KEY, target);
      } catch {}
    }

    const toggleBtn = document.getElementById('languageToggle');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-label', target === 'zh' ? 'Switch to English (切換至英文)' : '切換至繁體中文 (Switch to Traditional Chinese)');
    }

    cards.forEach((card, idx) => {
      if (CARD_LABELS[target] && CARD_LABELS[target][idx]) {
        card.setAttribute('aria-label', CARD_LABELS[target][idx]);
      }
    });

    window.dispatchEvent(new CustomEvent('portal:language-change', { detail: { language: target } }));
  };

  window.toggleLanguage = () => {
    const current = document.documentElement.getAttribute('data-language') || 'zh';
    window.setSiteLanguage(current === 'zh' ? 'en' : 'zh', true);
  };

  const toggleBtn = document.getElementById('languageToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.toggleLanguage();
    });
  }

  // 初始化語系
  window.setSiteLanguage(getStoredLanguage(), false);

  // 4. 直立測條工作台過濾 (Vertical Project Rail Filter)
  window.switchTab = (type) => {
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach((btn) => {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    });

    const activeBtn = document.getElementById(`tab-${type}`);
    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.setAttribute('aria-selected', 'true');
    }

    let visibleCount = 0;
    cards.forEach((card) => {
      const cardType = card.getAttribute('data-type');
      if (type === 'all' || cardType === type) {
        card.classList.remove('hidden');
        card.style.opacity = '0';
        card.style.transform = 'translateY(4px)';
        requestAnimationFrame(() => {
          card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        });
        visibleCount += 1;
      } else {
        card.classList.add('hidden');
      }
    });

    const countDisplay = document.getElementById('matrix-count');
    if (countDisplay) {
      countDisplay.textContent = visibleCount < 10 ? `0${visibleCount}` : String(visibleCount);
    }
  };
})();
